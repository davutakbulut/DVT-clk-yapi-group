import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface OverviewRow {
  readonly key: string;
  readonly count: number;
}

export interface AnalyticsOverview {
  readonly days: number;
  readonly sessions: number;
  readonly pageviews: number;
  readonly avgPageviews: number;
  readonly byDay: readonly { day: string; sessions: number; pageviews: number }[];
  readonly topPages: readonly OverviewRow[];
  readonly referrers: readonly OverviewRow[];
  readonly aiHosts: readonly OverviewRow[];
  readonly devices: readonly OverviewRow[];
  readonly locales: readonly OverviewRow[];
  readonly exits: readonly OverviewRow[];
}

const fail = (message: string) => err(appError('external_service', message, { module: 'analytics' }));

function tally<T>(rows: readonly T[], pick: (r: T) => string | null | undefined, limit = 10): OverviewRow[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = pick(r);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Genel bakış (staff okur): son N gün oturum/pageview, günlük seri, sayfalar, kaynak türü (AI ayrı), cihaz, dil, çıkış sayfaları. */
export async function loadOverview(days = 30): Promise<Result<AnalyticsOverview>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [sessions, pageviews] = await Promise.all([
    client.data.from('analytics_sessions').select('id, started_at, device, locale, referrer_kind, referrer_host, exit_path, pageview_count').gte('started_at', since).limit(20_000),
    client.data.from('analytics_pageviews').select('path, viewed_at').gte('viewed_at', since).limit(50_000),
  ]);
  const failure = sessions.error ?? pageviews.error;
  if (failure) return fail(failure.message);
  const s = sessions.data ?? [];
  const p = pageviews.data ?? [];
  const byDayMap = new Map<string, { sessions: number; pageviews: number }>();
  for (const r of s) {
    const d = r.started_at.slice(0, 10);
    byDayMap.set(d, { sessions: (byDayMap.get(d)?.sessions ?? 0) + 1, pageviews: byDayMap.get(d)?.pageviews ?? 0 });
  }
  for (const r of p) {
    const d = r.viewed_at.slice(0, 10);
    byDayMap.set(d, { sessions: byDayMap.get(d)?.sessions ?? 0, pageviews: (byDayMap.get(d)?.pageviews ?? 0) + 1 });
  }
  return ok({
    days,
    sessions: s.length,
    pageviews: p.length,
    avgPageviews: s.length > 0 ? Math.round((p.length / s.length) * 10) / 10 : 0,
    byDay: [...byDayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
    topPages: tally(p, (r) => r.path, 15),
    referrers: tally(s, (r) => r.referrer_kind, 7),
    aiHosts: tally(s.filter((r) => r.referrer_kind === 'ai'), (r) => r.referrer_host, 10),
    devices: tally(s, (r) => r.device, 3),
    locales: tally(s, (r) => r.locale, 2),
    exits: tally(s, (r) => r.exit_path, 10),
  });
}

export interface AnalyticsConfig {
  readonly enabled: boolean;
  readonly sampleRate: number;
  readonly ga4Id: string;
  readonly adsId: string;
  readonly metaPixelId: string;
}

export async function writeAnalyticsConfig(config: AnalyticsConfig, updatedBy: string): Promise<Result<void>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { error } = await client.data.from('site_settings').update({ value: { enabled: config.enabled, sample_rate: config.sampleRate, ga4_id: config.ga4Id, ads_id: config.adsId, meta_pixel_id: config.metaPixelId }, updated_by: updatedBy }).eq('key', 'analytics.config');
  if (error) return fail(error.message);
  return ok(undefined);
}
