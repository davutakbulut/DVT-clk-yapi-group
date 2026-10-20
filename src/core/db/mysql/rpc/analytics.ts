// Analitik, hata takibi ve yönlendirme RPC'leri (0010/0035/0037/0052 → K-116). ingest_analytics, report_error,
// record_redirect_hit DEFINER + K-104 kapısıydı: kapı düştü (dışarıdan PostgREST yok), boyut ve eşik aynen.
// web_vitals_summary INVOKER'dı → web_vitals çağıranın RLS'iyle okunur.
import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { toDbTimestamp } from '../rest/values';
import { at, dateOrNull, elements, left, md5, pgLower, readable, textAt, tsOrNull } from './contentHelpers';
import { btrim, charLen, dbNow, denied, exec, invalid, isObject, jsonSize, noExecute, nullif, select, toInt, toUuid, type Row } from './pgCast';
import { hasRole, RpcError, throttle, type RpcHandler } from './registry';

const ts = (v: string | null) => tsOrNull(v, toDbTimestamp);

// ---------------------------------------------------------------- yönlendirme isabeti

const recordRedirectHit: RpcHandler = async (conn, _actor, args) => {
  const path = args['p_path'];
  if (path == null || charLen(String(path)) > 500) return null;
  await throttle(conn, 'redirect:global', 600, 600);
  // source_path harmanlaması büyük/küçük harf duyarsız: PostgreSQL'deki tam eşleşme için ikili karşılaştırma
  await exec(conn, 'UPDATE redirects SET hit_count = hit_count + 1, last_hit_at = UTC_TIMESTAMP(6) WHERE source_path = ? AND BINARY source_path = ? AND is_active', [String(path), String(path)]);
  return null;
};

// ---------------------------------------------------------------- hata raporu

/** app_private.error_fingerprint: sayılar ve uuid'ler maskelenir → "Kayıt 42" ile "Kayıt 77" aynı satır. */
export function errorFingerprint(source: string, module: string, message: string, stack: string | null): string {
  const msg = pgLower(message).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>').replace(/\d+/g, '#');
  return md5(`${source}|${module}|${msg}|${(stack ?? '').split('\n')[0]}`);
}

async function reportErrorImpl(conn: PoolConnection, p: Row): Promise<Row> {
  const t = (k: string) => textAt(p, k);
  let source = nullif(t('source')) ?? 'client';
  const mod = left(nullif(t('module')) ?? 'unknown', 80)!;
  let level = nullif(t('level')) ?? 'error';
  const message = left(nullif(btrim(t('message') ?? '')) ?? '(mesaj yok)', 1000)!;
  const stack = left(t('stack'), 8000);
  const visitor = left(t('visitor'), 64);
  if (!['client', 'server', 'edge', 'cron'].includes(source)) source = 'client';
  if (!['warn', 'error', 'fatal'].includes(level)) level = 'error';
  const fp = errorFingerprint(source, mod, message, stack);
  // p->'context' JSON null ise null kalır (coalesce yalnız eksik anahtarı '{}' yapar)
  const last = 'context' in p ? p['context'] : {};

  const [found] = await select<{ id: string; resolved: number; visitors: unknown }>(
    conn,
    "SELECT id, resolved_at IS NOT NULL AS resolved, COALESCE(JSON_EXTRACT(context, '$.visitors'), JSON_ARRAY()) AS visitors FROM error_logs WHERE fingerprint = ?",
    [fp],
  );
  if (!found) {
    const [row] = await select<{ id: string }>(
      conn,
      `INSERT INTO error_logs (fingerprint, module, source, level, code, message, stack, path, status_code, ip_masked, user_agent, context, occurrences, affected_users)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?) RETURNING id`,
      [fp, mod, source, level, left(t('code'), 40), message, stack, left(t('path'), 500), toInt(t('status_code')), left(t('ip_masked'), 64), left(t('user_agent'), 300),
        JSON.stringify({ visitors: visitor == null ? [] : [visitor], last }), visitor == null ? 0 : 1],
    );
    return { id: row!.id, new: true };
  }
  const raw = typeof found.visitors === 'string' ? (JSON.parse(found.visitors) as unknown) : found.visitors;
  const visitors = Array.isArray(raw) ? [...raw] : [];
  if (visitor != null && !visitors.includes(visitor) && visitors.length < 50) visitors.push(visitor);
  await exec(
    conn,
    `UPDATE error_logs SET occurrences = occurrences + 1, last_seen_at = UTC_TIMESTAMP(6), path = COALESCE(?, path), stack = COALESCE(?, stack),
            user_agent = COALESCE(?, user_agent), context = ?, affected_users = ?, resolved_at = NULL, resolved_by = NULL WHERE id = ?`,
    [left(t('path'), 500), stack, left(t('user_agent'), 300), JSON.stringify({ visitors, last }), visitors.length, found.id],
  );
  return { id: found.id, new: false, reopened: Boolean(found.resolved) };
}

const reportError: RpcHandler = async (conn, _actor, args) => {
  let p = args['p'];
  if (jsonSize(p) > 16384) throw invalid('report_error: gövde çok büyük');
  if (isObject(p) && jsonSize(p['context']) > 4096) {
    p = Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'context'));
  }
  await throttle(conn, 'error:global', 600, 600);
  return reportErrorImpl(conn, isObject(p) ? p : {});
};

// ---------------------------------------------------------------- izleyici verisi

/** app_private.analytics_salt: yoksa üretip ayara yazar (satır yoksa her çağrıda yeni tuz — PostgreSQL'deki gibi). */
async function analyticsSalt(conn: PoolConnection): Promise<string> {
  const [row] = await select<{ value: unknown }>(conn, "SELECT value FROM site_settings WHERE `key` = 'analytics.salt'");
  const v = row?.value;
  const current = v == null ? null : nullif(typeof v === 'string' ? v : JSON.stringify(v));
  if (current) return current;
  const fresh = randomUUID();
  await exec(conn, "UPDATE site_settings SET value = ? WHERE `key` = 'analytics.salt'", [JSON.stringify(fresh)]);
  return fresh;
}

const DECIMAL_RE = /^\d+(\.\d+)?$/;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

async function ingestAnalyticsImpl(conn: PoolConnection, p: Row): Promise<Row> {
  const now = dbNow();
  const s = at(p, 'session');
  const st = (k: string) => textAt(s, k);
  const sid = toUuid(nullif(st('id')));
  const device = st('device');
  // `device not in (…)` null'da NULL döner → yükseltilmez, ekleme NOT NULL hatası verir (PostgreSQL ile aynı)
  if (sid == null || (device != null && !['mobile', 'tablet', 'desktop'].includes(device))) throw invalid('ingest_analytics: session');
  if ((nullif(st('visitor')) ?? '') === '') throw invalid('ingest_analytics: visitor');
  let locale = nullif(st('locale'));
  if (locale != null && locale !== 'tr' && locale !== 'en') locale = null;
  const hash = md5(`${await analyticsSalt(conn)}:${st('visitor')}`);
  const kind = st('referrer_kind');
  const utm = at(s, 'utm');

  await exec(
    conn,
    `INSERT INTO analytics_sessions (id, visitor_hash, device, browser, os, country, locale, referrer_host, referrer_kind, utm, landing_path, ip_masked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE last_seen_at = ?`,
    [sid, hash, device, left(st('browser'), 60), left(st('os'), 60), left(st('country'), 2), locale, left(st('referrer_host'), 200),
      kind != null && ['direct', 'search', 'social', 'ai', 'referral', 'ads', 'email'].includes(kind) ? kind : 'direct',
      JSON.stringify(utm === undefined ? {} : utm), left(st('landing_path'), 500), left(st('ip_masked'), 64), now],
  );

  // Tek tek INSERT uzak veritabanında yüzlerce gidiş-dönüş olurdu: her dizi tek çok satırlı ifade (sıra aynı → aynı sonuç)
  let exit: string | null = null;
  const pvs: unknown[][] = [];
  for (const pv of elements(p['pageviews']).slice(0, 50)) {
    const t = (k: string) => textAt(pv, k);
    if (nullif(t('path')) == null) continue;
    const loc = t('locale');
    pvs.push([toUuid(nullif(t('id'))) ?? randomUUID(), sid, left(t('path'), 500), loc === 'tr' || loc === 'en' ? loc : null, ts(t('viewed_at')) ?? now,
      clamp(toInt(t('duration_ms')) ?? 0, 0, 86400000), clamp(toInt(t('max_scroll_pct')) ?? 0, 0, 100), toInt(t('viewport_w')), toInt(t('viewport_h'))]);
    exit = left(t('path'), 500);
  }
  if (pvs.length) {
    await exec(
      conn,
      `INSERT INTO analytics_pageviews (id, session_id, path, locale, viewed_at, duration_ms, max_scroll_pct, viewport_w, viewport_h) VALUES ${pvs.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
       ON DUPLICATE KEY UPDATE duration_ms = GREATEST(COALESCE(duration_ms, VALUES(duration_ms)), VALUES(duration_ms)),
                               max_scroll_pct = GREATEST(COALESCE(max_scroll_pct, VALUES(max_scroll_pct)), VALUES(max_scroll_pct))`,
      pvs.flat(),
    );
  }

  const evs: { pv: string | null; row: unknown[] }[] = [];
  for (const ev of elements(p['events']).slice(0, 200)) {
    const t = (k: string) => textAt(ev, k);
    if (nullif(t('type')) == null || nullif(t('path')) == null) continue;
    const pct = (k: string) => {
      const v = t(k);
      return v != null && DECIMAL_RE.test(v) ? Math.min(Number(v), 100) : null;
    };
    const payload = at(ev, 'payload');
    evs.push({
      pv: toUuid(nullif(t('pageview_id'))),
      row: [sid, left(t('type'), 40), left(t('path'), 500), device, pct('x_pct'), pct('y_pct'), left(t('selector'), 200), left(t('element_text'), 80),
        JSON.stringify(payload === undefined ? {} : payload), ts(t('occurred_at')) ?? now],
    });
  }
  if (evs.length) {
    // pageview_id yalnız bu oturumun görüntülemesiyse bağlanır
    const wanted = [...new Set(evs.map((e) => e.pv).filter((x): x is string => x != null))];
    const known = new Set(wanted.length ? (await select<{ id: string }>(conn, `SELECT id FROM analytics_pageviews WHERE session_id = ? AND id IN (${wanted.map(() => '?').join(', ')})`, [sid, ...wanted])).map((r) => r.id) : []);
    await exec(
      conn,
      `INSERT INTO analytics_events (pageview_id, session_id, type, path, device, x_pct, y_pct, selector, element_text, payload, occurred_at) VALUES ${evs.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
      evs.flatMap((e) => [e.pv != null && known.has(e.pv) ? e.pv : null, ...e.row]),
    );
  }

  const vts: unknown[][] = [];
  for (const vt of elements(p['vitals']).slice(0, 20)) {
    const t = (k: string) => textAt(vt, k);
    const metric = t('metric');
    const value = t('value');
    // `metric not in (…) or not (value ~ …)`: null karşılaştırması NULL → atlanmaz (PostgreSQL üç değerli mantığı)
    if ((metric != null && !['LCP', 'CLS', 'INP', 'TTFB', 'FCP'].includes(metric)) || (value != null && !DECIMAL_RE.test(value))) continue;
    const rating = t('rating');
    vts.push([sid, left(t('path'), 500), device, metric, value == null ? null : Number(value), rating != null && ['good', 'needs_improvement', 'poor'].includes(rating) ? rating : null]);
  }
  if (vts.length) await exec(conn, `INSERT INTO web_vitals (session_id, path, device, metric, value, rating) VALUES ${vts.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}`, vts.flat());

  const fms: unknown[][] = [];
  for (const fm of elements(p['forms']).slice(0, 50)) {
    const t = (k: string) => textAt(fm, k);
    if (nullif(t('form_key')) == null || nullif(t('field_name')) == null) continue;
    const count = (k: string) => Math.max(0, toInt(t(k)) ?? 0);
    fms.push([left(t('form_key'), 60), left(t('field_name'), 60), device, now.slice(0, 10), count('focus'), count('abandon'), count('error'), count('time_ms')]);
  }
  if (fms.length) {
    await exec(
      conn,
      `INSERT INTO form_analytics (form_key, field_name, device, day, focus_count, abandon_count, error_count, total_time_ms) VALUES ${fms.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
       ON DUPLICATE KEY UPDATE focus_count = focus_count + VALUES(focus_count), abandon_count = abandon_count + VALUES(abandon_count),
                               error_count = error_count + VALUES(error_count), total_time_ms = total_time_ms + VALUES(total_time_ms)`,
      fms.flat(),
    );
  }

  await exec(
    conn,
    'UPDATE analytics_sessions SET last_seen_at = ?, pageview_count = (SELECT COUNT(*) FROM analytics_pageviews pv WHERE pv.session_id = ?), exit_path = COALESCE(?, exit_path) WHERE id = ?',
    [now, sid, exit, sid],
  );
  return { pageviews: pvs.length, events: evs.length };
}

const ingestAnalytics: RpcHandler = async (conn, _actor, args) => {
  const p = args['p'];
  if (jsonSize(p) > 262144) throw invalid('ingest_analytics: gövde çok büyük');
  await throttle(conn, 'analytics:global', 3000, 600);
  return ingestAnalyticsImpl(conn, isObject(p) ? p : {});
};

// ---------------------------------------------------------------- gece özeti ve temizlik

const aggregateAnalyticsDay: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw noExecute(actor, 'aggregate_analytics_day');
  // is_trusted_context() = service_role
  if (actor.kind !== 'service' && !hasRole(actor, 'super_admin', 'admin')) throw denied(actor, 'aggregate_analytics_day: yetki yok');
  const day = dateOrNull(args['p_day']);
  await exec(conn, 'DELETE FROM heatmap_aggregates WHERE day = ?', [day]);
  const heat = await exec(
    conn,
    `INSERT INTO heatmap_aggregates (path, device, day, kind, bucket_x, bucket_y, hits)
     SELECT e.path, e.device, ?, e.type, LEAST(FLOOR(e.x_pct), 99), FLOOR(e.y_pct), COUNT(*)
       FROM analytics_events e
      WHERE e.occurred_at >= ? AND e.occurred_at < ? + INTERVAL 1 DAY
        AND e.type IN ('click', 'rage_click', 'dead_click', 'attention') AND e.x_pct IS NOT NULL AND e.y_pct IS NOT NULL
      GROUP BY e.path, e.device, e.type, LEAST(FLOOR(e.x_pct), 99), FLOOR(e.y_pct)`,
    [day, day, day],
  );
  await exec(conn, 'DELETE FROM scroll_depth_aggregates WHERE day = ?', [day]);
  const scroll = await exec(
    conn,
    `INSERT INTO scroll_depth_aggregates (path, device, day, views, reached_25, reached_50, reached_75, reached_100)
     SELECT pv.path, s.device, ?, COUNT(*), COUNT(IF(pv.max_scroll_pct >= 25, 1, NULL)), COUNT(IF(pv.max_scroll_pct >= 50, 1, NULL)),
            COUNT(IF(pv.max_scroll_pct >= 75, 1, NULL)), COUNT(IF(pv.max_scroll_pct >= 100, 1, NULL))
       FROM analytics_pageviews pv JOIN analytics_sessions s ON s.id = pv.session_id
      WHERE pv.viewed_at >= ? AND pv.viewed_at < ? + INTERVAL 1 DAY
      GROUP BY pv.path, s.device`,
    [day, day, day],
  );
  return { heatmap_rows: heat.affectedRows, scroll_rows: scroll.affectedRows };
};

const purgeOldAnalytics: RpcHandler = async (conn, actor, args) => {
  if (actor.kind !== 'service') throw noExecute(actor, 'purge_old_analytics');
  const keep = Math.max(toInt(args['p_keep_days'] == null ? '60' : String(args['p_keep_days']))!, 7);
  await exec(conn, 'DELETE FROM web_vitals WHERE recorded_at < UTC_TIMESTAMP(6) - INTERVAL ? DAY', [keep]);
  // pageviews + events + vitals CASCADE ile düşer; sayı yalnız oturumlar (get diagnostics row_count gibi)
  const res = await exec(conn, 'DELETE FROM analytics_sessions WHERE started_at < UTC_TIMESTAMP(6) - INTERVAL ? DAY', [keep]);
  return res.affectedRows;
};

// ---------------------------------------------------------------- Web Vitals özeti

const webVitalsSummary: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw noExecute(actor, 'web_vitals_summary');
  const from = dateOrNull(args['p_from']);
  const to = dateOrNull(args['p_to']);
  const w = 'PARTITION BY v.path, v.metric';
  return select(
    conn,
    `SELECT path, metric, samples, ROUND(p75, 4) AS p75, good, needs_improvement, poor FROM (
       SELECT v.path, v.metric, COUNT(*) OVER (${w}) AS samples, PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY v.value) OVER (${w}) AS p75,
              COUNT(IF(v.rating = 'good', 1, NULL)) OVER (${w}) AS good, COUNT(IF(v.rating = 'needs_improvement', 1, NULL)) OVER (${w}) AS needs_improvement,
              COUNT(IF(v.rating = 'poor', 1, NULL)) OVER (${w}) AS poor, ROW_NUMBER() OVER (${w}) AS rn
         FROM ${readable(actor, 'web_vitals')} v WHERE v.recorded_at >= ? AND v.recorded_at < ? + INTERVAL 1 DAY) x
      WHERE rn = 1`,
    [from, to],
  );
};

/**
 * evaluate_funnel (0036, SECURITY INVOKER): sıralı huni — her adımda, önceki adıma ulaşmış oturumların ondan SONRA bu adıma
 * ulaştığı ilk an. Çağıranın okuma kuralı uygulanır (analytics_* yalnız personel); anonim çalıştıramaz (EXECUTE yok).
 */
const evaluateFunnel: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw noExecute(actor, 'evaluate_funnel');
  const funnelId = toUuid(args['p_funnel_id']);
  const from = dateOrNull(args['p_from']);
  const to = dateOrNull(args['p_to']);
  if (funnelId == null || from == null || to == null) throw new RpcError('22P02', 'invalid input syntax');
  const steps = await select<{ seq: number; name: unknown; match_type: string; match_value: string }>(
    conn,
    `SELECT seq, name, match_type, match_value FROM ${readable(actor, 'funnel_steps')} fs WHERE funnel_id = ? ORDER BY seq`,
    [funnelId],
  );
  let reach: Map<string, string> | null = null; // oturum → ulaştığı an (önceki adım)
  let total = 0;
  const out: { seq: number; name: unknown; sessions: number; rate_pct: number }[] = [];
  for (const step of steps) {
    const hits =
      step.match_type === 'event'
        ? await select<{ s: string; ts: string }>(
            conn,
            `SELECT session_id AS s, occurred_at AS ts FROM ${readable(actor, 'analytics_events')} e WHERE occurred_at >= ? AND occurred_at < ? + INTERVAL 1 DAY
               AND (BINARY type = ? OR (type = 'conversion' AND BINARY JSON_UNQUOTE(JSON_EXTRACT(payload, '$.form')) = ?))`,
            [from, to, step.match_value, step.match_value],
          )
        : await select<{ s: string; ts: string }>(
            conn,
            `SELECT session_id AS s, viewed_at AS ts FROM ${readable(actor, 'analytics_pageviews')} pv WHERE viewed_at >= ? AND viewed_at < ? + INTERVAL 1 DAY
               AND ${step.match_type === 'path' ? 'BINARY path = ?' : "BINARY path LIKE CONCAT(?, '%')"}`,
            [from, to, step.match_value],
          );
    const next = new Map<string, string>();
    for (const { s, ts } of hits) {
      if (s == null) continue;
      if (reach) {
        const prev = reach.get(s);
        if (prev == null || !(ts > prev)) continue; // zaman metinleri aynı biçimde → sözlük sırası = zaman sırası
      }
      const cur = next.get(s);
      if (cur == null || ts < cur) next.set(s, ts);
    }
    if (reach == null) total = next.size;
    reach = next;
    out.push({ seq: step.seq, name: step.name, sessions: next.size, rate_pct: total > 0 ? Math.round((next.size * 1000) / total) / 10 : 0 });
  }
  return { steps: out, entered: total };
};

export const ANALYTICS_RPCS: Readonly<Record<string, RpcHandler>> = {
  evaluate_funnel: evaluateFunnel,
  record_redirect_hit: recordRedirectHit,
  report_error: reportError,
  ingest_analytics: ingestAnalytics,
  aggregate_analytics_day: aggregateAnalyticsDay,
  purge_old_analytics: purgeOldAnalytics,
  web_vitals_summary: webVitalsSummary,
};
