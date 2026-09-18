import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export type Device = 'mobile' | 'tablet' | 'desktop';

export interface HeatCell {
  readonly x: number;
  readonly y: number;
  readonly hits: number;
}
export interface HeatmapData {
  readonly paths: readonly string[];
  readonly clicks: readonly HeatCell[];
  readonly attention: readonly HeatCell[];
  readonly maxY: number;
  readonly scroll: { views: number; reached25: number; reached50: number; reached75: number; reached100: number } | null;
  readonly rage: readonly { selector: string; hits: number }[];
  readonly dead: readonly { selector: string; hits: number }[];
}

export interface FunnelRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly is_active: boolean;
  readonly steps: readonly { id: string; seq: number; name: string; match_type: string; match_value: string }[];
}
export interface FunnelResult {
  readonly entered: number;
  readonly steps: readonly { seq: number; name: string; sessions: number; rate_pct: number }[];
}

export interface FormFieldStat {
  readonly form: string;
  readonly field: string;
  readonly device: string;
  readonly focus: number;
  readonly abandon: number;
  readonly errors: number;
  readonly avgMs: number;
  readonly abandonPct: number;
}

export interface Transition {
  readonly from: string;
  readonly to: string;
  readonly count: number;
}
export interface JourneyData {
  readonly landing: readonly { path: string; count: number }[];
  readonly transitions: readonly Transition[];
  readonly exits: readonly { path: string; views: number; exits: number; exitPct: number }[];
}

const fail = (message: string) => err(appError('external_service', message, { module: 'analytics' }));

/** Sıcaklık haritası (özet tablolar, 06-ANALYTICS): tık/dikkat hücreleri, scroll eşikleri, öfke/ölü tık seçicileri (ham olaydan, aralık içi). */
export async function loadHeatmap(input: { readonly path: string | null; readonly device: Device; readonly from: string; readonly to: string }): Promise<Result<HeatmapData>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data: pathRows, error: pathErr } = await client.data.from('scroll_depth_aggregates').select('path').gte('day', input.from).lte('day', input.to).limit(2000);
  if (pathErr) return fail(pathErr.message);
  const paths = [...new Set((pathRows ?? []).map((r) => r.path))].sort();
  const path = input.path ?? paths[0] ?? null;
  if (!path) return ok({ paths, clicks: [], attention: [], maxY: 0, scroll: null, rage: [], dead: [] });
  const [heat, scroll, events] = await Promise.all([
    client.data.from('heatmap_aggregates').select('kind, bucket_x, bucket_y, hits').eq('path', path).eq('device', input.device).gte('day', input.from).lte('day', input.to).limit(20_000),
    client.data.from('scroll_depth_aggregates').select('views, reached_25, reached_50, reached_75, reached_100').eq('path', path).eq('device', input.device).gte('day', input.from).lte('day', input.to),
    client.data.from('analytics_events').select('type, selector').eq('path', path).eq('device', input.device).in('type', ['rage_click', 'dead_click']).gte('occurred_at', `${input.from}T00:00:00Z`).lte('occurred_at', `${input.to}T23:59:59Z`).limit(5000),
  ]);
  const failure = heat.error ?? scroll.error ?? events.error;
  if (failure) return fail(failure.message);
  const merge = (kind: string) => {
    const m = new Map<string, HeatCell>();
    for (const r of heat.data ?? []) {
      if (r.kind !== kind) continue;
      const k = `${r.bucket_x}:${r.bucket_y}`;
      const prev = m.get(k);
      m.set(k, { x: r.bucket_x, y: r.bucket_y, hits: (prev?.hits ?? 0) + r.hits });
    }
    return [...m.values()];
  };
  const clicks = merge('click');
  const attention = merge('attention');
  const tally = (type: string) => {
    const m = new Map<string, number>();
    for (const e of events.data ?? []) if (e.type === type) m.set(e.selector ?? '?', (m.get(e.selector ?? '?') ?? 0) + 1);
    return [...m.entries()].map(([selector, hits]) => ({ selector, hits })).sort((a, b) => b.hits - a.hits).slice(0, 10);
  };
  const s = (scroll.data ?? []).reduce((a, r) => ({ views: a.views + r.views, reached25: a.reached25 + r.reached_25, reached50: a.reached50 + r.reached_50, reached75: a.reached75 + r.reached_75, reached100: a.reached100 + r.reached_100 }), { views: 0, reached25: 0, reached50: 0, reached75: 0, reached100: 0 });
  return ok({ paths, clicks, attention, maxY: Math.max(0, ...clicks.map((c) => c.y), ...attention.map((c) => c.y)), scroll: s.views > 0 ? s : null, rage: tally('rage_click'), dead: tally('dead_click') });
}

export async function listFunnels(): Promise<Result<FunnelRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('funnels').select('id, name, description, is_active, steps:funnel_steps(id, seq, name, match_type, match_value)').order('created_at');
  if (error) return fail(error.message);
  return ok(data.map((f) => ({ ...f, steps: [...(f.steps ?? [])].sort((a, b) => a.seq - b.seq) })));
}

export async function evaluateFunnel(id: string, from: string, to: string): Promise<Result<FunnelResult>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('evaluate_funnel', { p_funnel_id: id, p_from: from, p_to: to });
  if (error) return fail(error.message);
  const d = (data ?? {}) as { entered?: number; steps?: { seq: number; name: string; sessions: number; rate_pct: number | string }[] };
  return ok({ entered: d.entered ?? 0, steps: (d.steps ?? []).map((s) => ({ ...s, rate_pct: Number(s.rate_pct) })) });
}

/** Form analizi: alan bazında toplamlar (aralık); terk oranı = terk / (odak + terk). */
export async function loadFormStats(from: string, to: string): Promise<Result<FormFieldStat[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('form_analytics').select('form_key, field_name, device, focus_count, abandon_count, error_count, total_time_ms').gte('day', from).lte('day', to).limit(10_000);
  if (error) return fail(error.message);
  const m = new Map<string, { focus: number; abandon: number; errors: number; ms: number }>();
  for (const r of data) {
    const k = `${r.form_key}|${r.field_name}|${r.device}`;
    const p = m.get(k) ?? { focus: 0, abandon: 0, errors: 0, ms: 0 };
    m.set(k, { focus: p.focus + r.focus_count, abandon: p.abandon + r.abandon_count, errors: p.errors + r.error_count, ms: p.ms + Number(r.total_time_ms) });
  }
  return ok(
    [...m.entries()]
      .map(([k, v]) => {
        const [form, field, device] = k.split('|') as [string, string, string];
        const touches = v.focus + v.abandon;
        return { form, field, device, focus: v.focus, abandon: v.abandon, errors: v.errors, avgMs: touches > 0 ? Math.round(v.ms / touches) : 0, abandonPct: touches > 0 ? Math.round((v.abandon / touches) * 1000) / 10 : 0 };
      })
      .sort((a, b) => b.abandonPct - a.abandonPct || b.focus - a.focus),
  );
}

/** Yolculuk: oturum içi ardışık pageview geçişleri (ham veri, aralık), giriş sayfaları, çıkış oranı. */
export async function loadJourneys(from: string, to: string): Promise<Result<JourneyData>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('analytics_pageviews').select('session_id, path, viewed_at').gte('viewed_at', `${from}T00:00:00Z`).lte('viewed_at', `${to}T23:59:59Z`).order('viewed_at').limit(50_000);
  if (error) return fail(error.message);
  const bySession = new Map<string, string[]>();
  for (const r of data) bySession.set(r.session_id, [...(bySession.get(r.session_id) ?? []), r.path]);
  const landing = new Map<string, number>();
  const trans = new Map<string, number>();
  const views = new Map<string, number>();
  const exits = new Map<string, number>();
  for (const paths of bySession.values()) {
    landing.set(paths[0]!, (landing.get(paths[0]!) ?? 0) + 1);
    paths.forEach((p, i) => {
      views.set(p, (views.get(p) ?? 0) + 1);
      const next = paths[i + 1];
      if (next && next !== p) trans.set(`${p} ${next}`, (trans.get(`${p} ${next}`) ?? 0) + 1);
      if (!next) exits.set(p, (exits.get(p) ?? 0) + 1);
    });
  }
  return ok({
    landing: [...landing.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    transitions: [...trans.entries()].map(([k, count]) => { const [f, t] = k.split(' ') as [string, string]; return { from: f, to: t, count }; }).sort((a, b) => b.count - a.count).slice(0, 25),
    exits: [...views.entries()].map(([path, v]) => ({ path, views: v, exits: exits.get(path) ?? 0, exitPct: Math.round(((exits.get(path) ?? 0) / v) * 1000) / 10 })).filter((r) => r.views >= 3).sort((a, b) => b.exitPct - a.exitPct).slice(0, 15),
  });
}
