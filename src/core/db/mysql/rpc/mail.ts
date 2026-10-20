// Toplu e-posta RPC'leri (K-108/K-109 → K-116): 0057'deki plpgsql fonksiyonlarının MariaDB karşılığı.
// Hepsi SECURITY DEFINER'dı (mail_campaign_stats hariç): rol denetimi burada, bağlantı erişim kurallarını atlar.
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { rateLimit } from '@/core/rate-limit';
import { ACCESS } from '../access.generated';
import type { Actor } from '../pool';
import { toDbTimestamp } from '../rest/values';
import { hasRole, RpcError, type RpcHandler } from './registry';

type Row = Record<string, unknown>;
const select = async <T = Row>(conn: PoolConnection, sql: string, params: unknown[] = []) => (await conn.query<RowDataPacket[]>(sql, params))[0] as T[];
const exec = async (conn: PoolConnection, sql: string, params: unknown[] = []) => (await conn.query<ResultSetHeader>(sql, params))[0];

// ── PostgreSQL ifadelerinin JS karşılıkları ─────────────────────────────────────────────────────────────────────────
/** jsonb ->> : metin dışı değer JSON metni olur, null → null. */
const txt = (v: unknown): string | null => (v == null ? null : typeof v === 'string' ? v : JSON.stringify(v));
/** btrim yalnız boşluk kırpar (trim() sekme/satır sonunu da alırdı). */
const btrim = (s: string) => s.replace(/^ +| +$/g, '');
const nullif = (s: string) => (s === '' ? null : s);
/** left(): kod noktası sayar. */
const left = (s: string, n: number) => [...s].slice(0, n).join('');
const isObject = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v);
/** pg_column_size(jsonb) yaklaşığı: JSON metninin bayt boyu. */
const jsonSize = (v: unknown) => Buffer.byteLength(JSON.stringify(v ?? null));
/** Postgres lower() eşleniği; 'tr' olsaydı I → ı olur, adres deseni düşerdi. */
const lowerEmail = (s: string) => s.toLocaleLowerCase('en');
const dbMs = (s: string) => Date.parse(`${s.slice(0, 23).replace(' ', 'T')}Z`);

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
function uuid(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw new RpcError('22P02', `invalid input syntax for type uuid: "${String(v).slice(0, 64)}"`);
  return v;
}

function timestamptz(v: unknown): string | null {
  if (v == null) return null;
  try {
    return toDbTimestamp(String(v));
  } catch {
    throw new RpcError('22007', `invalid input syntax for type timestamp with time zone: "${String(v).slice(0, 64)}"`);
  }
}

// PostgREST: 42501 oturumsuzda 401, oturumluda 403.
const denied = (actor: Actor, message: string) => new RpcError('42501', message, actor.kind === 'anon' ? 401 : 403);
const invalid = (message: string) => new RpcError('22023', message);
const notFound = (message: string) => new RpcError('P0002', message, 404);

/** app_private.require_mail_admin; anon'a EXECUTE hiç verilmemişti (0057 revoke). service_role da yönetici değildir. */
function requireMailAdmin(actor: Actor, fn: string): string | null {
  if (actor.kind === 'anon') throw denied(actor, `permission denied for function ${fn}`);
  if (!hasRole(actor, 'super_admin', 'admin')) throw denied(actor, `${fn}: yetki yok`);
  return actor.kind === 'user' ? actor.userId : null;
}

// ── Kitle çözümü (app_private.mail_audience) ─────────────────────────────────────────────────────────────────────────
type Source = 'customer' | 'lead' | 'manual';
interface Recipient {
  readonly email: string;
  readonly full_name: string | null;
  readonly company: string | null;
  readonly source: Source;
  readonly suppressed: boolean;
}

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const TEST_DOMAIN_RE = /(@|\.)example\.(com|net|org)$/;
const TEST_TLD_RE = /\.(test|example|invalid|localhost)$/;
const CHUNK = 1000;

/**
 * Aynı adres bir kez (öncelik: müşteri → talep → elle); anonimleştirilmiş, pasif, izinsiz, bozuk ve test alanı adresler dışarıda.
 * İl TAM eşleşme: sütun harmanlaması büyük/küçük harf ve aksan duyarsız ('izmir' = 'İzmir') → utf8mb4_bin.
 */
async function mailAudience(conn: PoolConnection, p: unknown): Promise<Recipient[]> {
  const a = isObject(p) ? p : {};
  const segments = Array.isArray(a['segments']) ? (a['segments'] as unknown[]) : [];
  const has = (s: string) => segments.includes(s);
  const city = nullif(btrim(txt(a['city']) ?? ''));
  const cityCond = (col: string) => (city == null ? '' : ` AND ${col} COLLATE utf8mb4_bin = ?`);
  const cityParam = city == null ? [] : [city];
  const pool: { email: string | null; full_name: string | null; company: string | null; source: Source }[] = [];

  if (has('customers_corporate') || has('customers_individual')) {
    const rows = await select<{ email: string; full_name: string | null; company: string | null }>(
      conn,
      `SELECT LOWER(TRIM(c.email)) AS email, LEFT(COALESCE(NULLIF(TRIM(c.contact_person), ''), NULLIF(TRIM(c.full_name), '')), 160) AS full_name,
              LEFT(NULLIF(TRIM(c.company_title), ''), 200) AS company
         FROM customers c
        WHERE c.is_active AND c.anonymized_at IS NULL AND c.email IS NOT NULL
          AND ((c.type = 'corporate' AND ?) OR (c.type = 'individual' AND c.marketing_consent AND ?))${cityCond('c.city')}`,
      [has('customers_corporate'), has('customers_individual'), ...cityParam],
    );
    for (const r of rows) pool.push({ ...r, source: 'customer' });
  }
  if (has('leads')) {
    const rows = await select<{ email: string; full_name: string | null; company: string | null }>(
      conn,
      `SELECT LOWER(TRIM(l.email)) AS email, LEFT(NULLIF(TRIM(l.full_name), ''), 160) AS full_name, LEFT(NULLIF(TRIM(l.company), ''), 200) AS company
         FROM leads l
        WHERE l.consent_marketing AND l.anonymized_at IS NULL AND l.email IS NOT NULL${cityCond('l.city')}`,
      cityParam,
    );
    for (const r of rows) pool.push({ ...r, source: 'lead' });
  }
  // Elle liste yalnız "izin alındı" onayıyla sayılır (6563 / İYS, K-108)
  if (Array.isArray(a['manual']) && txt(a['manual_attested']) === 'true') {
    for (const e of a['manual'] as unknown[]) {
      const email = isObject(e) ? txt(e['email']) : null;
      pool.push({
        email: email == null ? null : lowerEmail(btrim(email)),
        full_name: nullif(btrim(left(isObject(e) ? (txt(e['name']) ?? '') : '', 160))),
        company: null,
        source: 'manual',
      });
    }
  }

  const uniq = new Map<string, Omit<Recipient, 'suppressed'>>();
  for (const r of pool) {
    const email = r.email;
    if (email == null || uniq.has(email) || !EMAIL_RE.test(email) || email.length > 254 || TEST_DOMAIN_RE.test(email) || TEST_TLD_RE.test(email)) continue;
    uniq.set(email, { email, full_name: r.full_name, company: r.company, source: r.source });
  }

  const emails = [...uniq.keys()];
  const suppressed = new Set<string>();
  for (let i = 0; i < emails.length; i += CHUNK) {
    const rows = await select<{ email: string }>(conn, 'SELECT email FROM mail_suppressions WHERE email IN (?)', [emails.slice(i, i + CHUNK)]);
    for (const r of rows) suppressed.add(lowerEmail(r.email));
  }
  return [...uniq.values()].map((r) => ({ ...r, suppressed: suppressed.has(r.email) }));
}

// ── RPC'ler ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const mail_audience_preview: RpcHandler = async (conn, actor, args) => {
  requireMailAdmin(actor, 'mail_audience_preview');
  const p = args['p'];
  if (jsonSize(p) > 262144) throw invalid('mail_audience_preview: kitle çok büyük');
  const all = await mailAudience(conn, p);
  const open = all.filter((r) => !r.suppressed);
  const bySource = (s: Source) => open.filter((r) => r.source === s).length;
  return {
    total: open.length,
    suppressed: all.length - open.length,
    customer: bySource('customer'),
    lead: bySource('lead'),
    manual: bySource('manual'),
    sample: [...open]
      .sort((x, y) => (x.email < y.email ? -1 : x.email > y.email ? 1 : 0))
      .slice(0, 20)
      .map((r) => ({ email: r.email, name: r.full_name, company: r.company, source: r.source })),
  };
};

const mail_audience_cities: RpcHandler = async (conn, actor) => {
  requireMailAdmin(actor, 'mail_audience_cities');
  // DISTINCT harmanlamayla 'İzmir' ile 'izmir'i birleştirirdi; PostgreSQL ayırır → ikili karşılaştırma
  const rows = await select<{ city: string }>(
    conn,
    `SELECT DISTINCT TRIM(c.city) COLLATE utf8mb4_bin AS city FROM customers c
      WHERE c.email IS NOT NULL AND c.anonymized_at IS NULL AND NULLIF(TRIM(c.city), '') IS NOT NULL
     UNION
     SELECT DISTINCT TRIM(l.city) COLLATE utf8mb4_bin FROM leads l
      WHERE l.email IS NOT NULL AND l.anonymized_at IS NULL AND l.consent_marketing AND NULLIF(TRIM(l.city), '') IS NOT NULL`,
  );
  return [...new Set(rows.map((r) => r.city))].sort(new Intl.Collator('tr').compare);
};

const save_mail_campaign: RpcHandler = async (conn, actor, args) => {
  const uid = requireMailAdmin(actor, 'save_mail_campaign');
  const p = isObject(args['p']) ? args['p'] : {};
  let id = uuid(nullif(txt(p['id']) ?? ''));
  const audience = isObject(p['audience']) ? p['audience'] : {};
  if (jsonSize(args['p']) > 300000) throw invalid('save_mail_campaign: gövde çok büyük');
  if (Array.isArray(audience['manual']) && audience['manual'].length > 2000) throw invalid('save_mail_campaign: elle liste en çok 2000 adres');
  const field = (k: string) => btrim(txt(p[k]) ?? '');
  const values = [field('name'), nullif(txt(p['locale']) ?? '') ?? 'tr', field('subject'), field('preheader'), txt(p['body']) ?? '', field('cta_label'), field('cta_url'), JSON.stringify(audience)];

  if (id == null) {
    const [row] = await select<{ id: string }>(
      conn,
      'INSERT INTO mail_campaigns (name, locale, subject, preheader, body, cta_label, cta_url, audience, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [...values, uid],
    );
    id = row!.id;
  } else {
    const [cur] = await select<{ status: string }>(conn, 'SELECT status FROM mail_campaigns WHERE id = ? FOR UPDATE', [id]);
    if (!cur) throw notFound('save_mail_campaign: kampanya yok');
    if (cur.status !== 'draft') throw invalid('save_mail_campaign: yalnız taslak düzenlenir');
    await exec(conn, 'UPDATE mail_campaigns SET name = ?, locale = ?, subject = ?, preheader = ?, body = ?, cta_label = ?, cta_url = ?, audience = ? WHERE id = ?', [...values, id]);
  }
  return id;
};

/** Yalnız taslak silinir: gönderilmiş kampanyanın alıcı satırları "listeden çık" bağlantılarını taşır. */
const delete_mail_campaign: RpcHandler = async (conn, actor, args) => {
  requireMailAdmin(actor, 'delete_mail_campaign');
  const res = await exec(conn, "DELETE FROM mail_campaigns WHERE id = ? AND status = 'draft'", [uuid(args['p_id'])]);
  if (res.affectedRows === 0) throw invalid('delete_mail_campaign: yalnız taslak silinir');
  return null;
};

const duplicate_mail_campaign: RpcHandler = async (conn, actor, args) => {
  const uid = requireMailAdmin(actor, 'duplicate_mail_campaign');
  const [row] = await select<{ id: string }>(
    conn,
    `INSERT INTO mail_campaigns (name, locale, subject, preheader, body, cta_label, cta_url, audience, created_by)
     SELECT LEFT(TRIM(?), 120), c.locale, c.subject, c.preheader, c.body, c.cta_label, c.cta_url, c.audience, ? FROM mail_campaigns c WHERE c.id = ?
     RETURNING id`,
    [txt(args['p_name']), uid, uuid(args['p_id'])],
  );
  if (!row) throw notFound('duplicate_mail_campaign: kampanya yok');
  return row.id;
};

/** Alıcı listesi başlatma ANINDA dondurulur (engelli adres girmez); gönderimi cron yapar. */
const start_mail_campaign: RpcHandler = async (conn, actor, args) => {
  const uid = requireMailAdmin(actor, 'start_mail_campaign');
  const now = Date.now();
  const id = uuid(args['p_id']);
  const at = timestamptz(args['p_at']);
  const [c] = await select<{ status: string; audience: unknown; subject_len: number; body_len: number }>(
    conn,
    'SELECT status, audience, CHAR_LENGTH(TRIM(subject)) AS subject_len, CHAR_LENGTH(TRIM(body)) AS body_len FROM mail_campaigns WHERE id = ? FOR UPDATE',
    [id],
  );
  if (!c) throw notFound('start_mail_campaign: kampanya yok');
  if (c.status !== 'draft') throw invalid('start_mail_campaign: yalnız taslak başlatılır');
  if (c.subject_len < 3 || c.body_len < 10) throw invalid('start_mail_campaign: konu ve metin gerekli');
  if (at != null && dbMs(at) > now + 90 * 86_400_000) throw invalid('start_mail_campaign: tarih en çok 90 gün ileri');

  const list = (await mailAudience(conn, c.audience)).filter((r) => !r.suppressed);
  if (list.length === 0) throw invalid('start_mail_campaign: alıcı yok');
  if (list.length > 10000) throw invalid('start_mail_campaign: alıcı sınırı (10000)');
  for (let i = 0; i < list.length; i += CHUNK) {
    const rows = list.slice(i, i + CHUNK).map((r) => [id, r.email, r.full_name, r.company, r.source]);
    await exec(conn, 'INSERT INTO mail_campaign_recipients (campaign_id, email, full_name, company, source) VALUES ?', [rows]);
  }
  const later = at != null && dbMs(at) > now;
  await exec(conn, 'UPDATE mail_campaigns SET status = ?, scheduled_at = ?, started_by = ? WHERE id = ?', [later ? 'scheduled' : 'sending', later ? at : null, uid, id]);
  return list.length;
};

/** pause · resume · cancel (bekleyenler atlanır) · retry (başarısızlar yeniden kuyruğa). Yeni durumu döner. */
const set_mail_campaign_state: RpcHandler = async (conn, actor, args) => {
  requireMailAdmin(actor, 'set_mail_campaign_state');
  const now = new Date();
  const id = uuid(args['p_id']);
  const action = txt(args['p_action']);
  const [c] = await select<{ status: string; scheduled_at: string | null }>(conn, 'SELECT status, scheduled_at FROM mail_campaigns WHERE id = ? FOR UPDATE', [id]);
  if (!c) throw notFound('set_mail_campaign_state: kampanya yok');
  const status = c.status;
  let next: string;
  if (action === 'pause' && (status === 'sending' || status === 'scheduled')) {
    next = 'paused';
  } else if (action === 'resume' && status === 'paused') {
    next = c.scheduled_at != null && dbMs(c.scheduled_at) > now.getTime() ? 'scheduled' : 'sending';
  } else if (action === 'cancel' && ['scheduled', 'sending', 'paused'].includes(status)) {
    next = 'cancelled';
    await exec(conn, "UPDATE mail_campaign_recipients SET status = 'skipped', error = 'cancelled', locked_at = NULL WHERE campaign_id = ? AND status IN ('pending', 'sending')", [id]);
    await exec(conn, 'UPDATE mail_campaigns SET finished_at = ? WHERE id = ?', [toDbTimestamp(now), id]);
  } else if (action === 'retry' && ['sent', 'sending', 'paused'].includes(status)) {
    const res = await exec(conn, "UPDATE mail_campaign_recipients SET status = 'pending', error = NULL, locked_at = NULL WHERE campaign_id = ? AND status = 'failed'", [id]);
    if (res.affectedRows === 0) throw invalid('set_mail_campaign_state: başarısız alıcı yok');
    next = status === 'sent' ? 'sending' : status;
    await exec(conn, 'UPDATE mail_campaigns SET finished_at = NULL WHERE id = ?', [id]);
  } else {
    throw invalid(`set_mail_campaign_state: ${action ?? '<NULL>'} bu durumda (${status}) uygulanamaz`);
  }
  await exec(conn, 'UPDATE mail_campaigns SET status = ? WHERE id = ?', [next, id]);
  return next;
};

/** SECURITY INVOKER'dı: satırları çağıranın okuma kuralı süzer (yalnız super_admin/admin görür). */
const mail_campaign_stats: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw denied(actor, 'permission denied for function mail_campaign_stats');
  const rule = actor.kind === 'user' ? ACCESS['mail_campaign_recipients']!.user.select : 'TRUE';
  if (rule == null) return [];
  const raw = args['p_ids'];
  if (raw != null && !Array.isArray(raw)) throw new RpcError('22P02', `malformed array literal: "${String(raw).slice(0, 64)}"`);
  const ids = raw == null ? null : raw.map(uuid).filter((v): v is string => v != null);
  if (ids?.length === 0) return [];
  const rows = await select(
    conn,
    `SELECT r.campaign_id, COUNT(*) AS total, SUM(r.status IN ('pending', 'sending')) AS pending, SUM(r.status = 'sent') AS sent,
            SUM(r.status = 'failed') AS failed, SUM(r.status = 'skipped') AS skipped, SUM(r.unsubscribed_at IS NOT NULL) AS unsubscribed
       FROM mail_campaign_recipients r
      WHERE (${rule})${ids ? ' AND r.campaign_id IN (?)' : ''}
      GROUP BY r.campaign_id`,
    ids ? [ids] : [],
  );
  const n = (v: unknown) => Number(v ?? 0);
  return rows.map((r) => ({ campaign_id: r['campaign_id'], total: n(r['total']), pending: n(r['pending']), sent: n(r['sent']), failed: n(r['failed']), skipped: n(r['skipped']), unsubscribed: n(r['unsubscribed']) }));
};

/** Engel listesine elle ekleme (geri dönen ileti, telefonla gelen "göndermeyin" isteği). */
const add_mail_suppression: RpcHandler = async (conn, actor, args) => {
  const uid = requireMailAdmin(actor, 'add_mail_suppression');
  const email = lowerEmail(btrim(txt(args['p_email']) ?? ''));
  const reason = txt(args['p_reason']);
  if (!EMAIL_RE.test(email) || email.length > 254) throw invalid('add_mail_suppression: e-posta');
  // NULL neden PostgreSQL'de "not in" denetiminden geçer, NOT NULL kısıtına (23502) takılır — aynı davranış
  if (reason != null && !['manual', 'bounced', 'complaint'].includes(reason)) throw invalid('add_mail_suppression: neden');
  // ON DUPLICATE KEY UPDATE değişmeyen satırda da denetim tetikleyicisini çalıştırır (ON CONFLICT DO NOTHING çalıştırmazdı)
  const [found] = await select<{ id: string }>(conn, 'SELECT id FROM mail_suppressions WHERE email = ? FOR UPDATE', [email]);
  if (found) return found.id;
  const [row] = await select<{ id: string }>(conn, 'INSERT INTO mail_suppressions (email, reason, note, created_by) VALUES (?, ?, ?, ?) RETURNING id', [
    email,
    reason,
    nullif(btrim(left(txt(args['p_note']) ?? '', 300))),
    uid,
  ]);
  return row!.id;
};

/** Kişinin KENDİ isteğiyle çıktığı kayıt panelden kaldırılamaz (yeniden izin alınmadan gönderim yapılamaz). */
const remove_mail_suppression: RpcHandler = async (conn, actor, args) => {
  requireMailAdmin(actor, 'remove_mail_suppression');
  const res = await exec(conn, "DELETE FROM mail_suppressions WHERE id = ? AND reason <> 'unsubscribed'", [uuid(args['p_id'])]);
  if (res.affectedRows === 0) throw invalid('remove_mail_suppression: kayıt yok ya da kişinin kendi isteği');
  return null;
};

/**
 * Anonim "listeden çık" (K-104): parametre sabit boyutlu uuid; bilinmeyen anahtar false döner (anahtar denemesi sızdırmaz).
 * Engel kaydı + talep/müşteri pazarlama izinleri geri alınır.
 */
const mail_unsubscribe: RpcHandler = async (conn, _actor, args) => {
  // Kapı (require_gate) gereksiz: veritabanına dışarıdan doğrudan çağrı yolu yok.
  // shortcut: eşik süreç içi sayaç (app_private.throttle tablosu taşınmadı), süreç başına 300/10 dk; çok süreçte Upstash ya da DB tablosu.
  if (!(await rateLimit('unsub:global', 300, 600)).allowed) throw new RpcError('P0429', 'rate_limited: unsub:global');
  const token = uuid(args['p_token']);
  if (token == null) return false;
  const [r] = await select<{ email: string; campaign_id: string }>(conn, 'SELECT email, campaign_id FROM mail_campaign_recipients WHERE token = ?', [token]);
  if (!r) return false;
  const [s] = await select<{ reason: string }>(conn, 'SELECT reason FROM mail_suppressions WHERE email = ? FOR UPDATE', [r.email]);
  if (!s) await exec(conn, "INSERT INTO mail_suppressions (email, reason, campaign_id) VALUES (?, 'unsubscribed', ?)", [r.email, r.campaign_id]);
  else if (s.reason !== 'unsubscribed') await exec(conn, "UPDATE mail_suppressions SET reason = 'unsubscribed', campaign_id = ? WHERE email = ?", [r.campaign_id, r.email]);
  await exec(conn, 'UPDATE mail_campaign_recipients SET unsubscribed_at = COALESCE(unsubscribed_at, ?) WHERE token = ?', [toDbTimestamp(new Date()), token]);
  await exec(conn, 'UPDATE leads SET consent_marketing = FALSE WHERE consent_marketing AND LOWER(TRIM(email)) COLLATE utf8mb4_bin = ?', [r.email]);
  await exec(conn, 'UPDATE customers SET marketing_consent = FALSE WHERE marketing_consent AND LOWER(TRIM(email)) COLLATE utf8mb4_bin = ?', [r.email]);
  return true;
};

/** Panelden şablon testi: oturumdaki yöneticinin adresine örnek verili ileti kuyruğa (gönderimi kuyruk işçisi yapar). */
const enqueue_test_email: RpcHandler = async (conn, actor, args) => {
  if (!hasRole(actor, 'super_admin', 'admin')) throw denied(actor, 'enqueue_test_email: yetki yok');
  const uid = actor.kind === 'user' ? actor.userId : null;
  const [u] = await select<{ email: string | null }>(conn, 'SELECT email FROM users WHERE id = ?', [uid]);
  const email = u?.email ?? null;
  if (email == null) throw invalid('enqueue_test_email: e-posta yok');
  const payload = {
    ref_no: 'TLP-TEST-0001',
    full_name: 'Test Kullanıcı',
    service: 'Test hizmeti',
    message: 'Bu bir test gönderimidir.',
    email,
    phone: '',
    company: '',
    subject: 'Test',
    body: 'Test gövdesi',
    admin_path: '/admin',
  };
  const [row] = await select<{ id: string }>(
    conn,
    "INSERT INTO email_queue (template_key, to_email, locale, payload, priority, related_type) VALUES (?, ?, ?, ?, 1, 'test') RETURNING id",
    [txt(args['p_template_key']), email, txt(args['p_locale']) ?? 'tr', JSON.stringify(payload)],
  );
  return row!.id;
};

export const MAIL_RPCS: Record<string, RpcHandler> = {
  mail_campaign_stats,
  start_mail_campaign,
  set_mail_campaign_state,
  save_mail_campaign,
  duplicate_mail_campaign,
  delete_mail_campaign,
  mail_audience_preview,
  mail_audience_cities,
  mail_unsubscribe,
  enqueue_test_email,
  add_mail_suppression,
  remove_mail_suppression,
};
