import 'server-only';
import { getSiteUrl, isSiteIndexable } from '@/core/config/site';
import type { ServiceDbClient } from '@/core/db/createServiceClient';
import { createServiceClient } from '@/core/db/createServiceClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { logger } from '@/core/observability/logger';

export interface IndexNowSummary {
  readonly candidates: number;
  readonly submitted: number;
  readonly status: number | null;
  readonly since: string | null;
}

export const INDEXNOW_JOB_KEY = 'indexnow';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10000;

/** Anahtar yalnız ortam değişkeninden (Vercel): 8–128 hex/alfasayısal. Yoksa özellik kapalı. */
export function readIndexNowKey(): string {
  const k = (process.env['INDEXNOW_KEY'] ?? '').trim();
  return /^[A-Za-z0-9-]{8,128}$/.test(k) ? k : '';
}

/** sitemap.xml → {loc, lastmod}[] (basit regex; kendi çıktımız, XML kütüphanesi gerekmez). */
export function parseSitemap(xml: string): { url: string; lastmod: string | null }[] {
  const out: { url: string; lastmod: string | null }[] = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = m[1] ?? '';
    const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(block)?.[1]?.trim() ?? null;
    out.push({ url: loc, lastmod });
  }
  return out;
}

/** Son koşudan beri değişen (lastmod) URL'ler; ilk koşuda (since yok) tümü. lastmod'suz URL'ler yalnız ilk koşuda gider. */
export function selectChanged(entries: readonly { url: string; lastmod: string | null }[], since: string | null): string[] {
  if (!since) return entries.map((e) => e.url).slice(0, MAX_URLS);
  const t = Date.parse(since);
  return entries.filter((e) => e.lastmod && Date.parse(e.lastmod) > t).map((e) => e.url).slice(0, MAX_URLS);
}

/**
 * IndexNow (02-SEO): sitemap'teki değişen URL'ler Bing/Yandex/Seznam/Naver ortak ucuna tek istekle gönderilir (Google desteklemez).
 * Cron'da service-role, panelde admin oturumu (K-56 deseni). Site indekslenebilir değilse (staging) gönderim yapılmaz.
 */
export async function submitIndexNow(db: ServiceDbClient, fetcher: typeof fetch = fetch): Promise<Result<IndexNowSummary>> {
  const started = Date.now();
  const key = readIndexNowKey();
  const finish = async (result: Result<IndexNowSummary>) => {
    await db.from('cron_heartbeats').upsert(
      { job_key: INDEXNOW_JOB_KEY, expected_interval_seconds: 7200, last_run_at: new Date().toISOString(), last_status: result.ok ? 'ok' : 'error', last_error: result.ok ? null : result.error.message, last_duration_ms: Date.now() - started },
      { onConflict: 'job_key' },
    );
    return result;
  };
  if (!key) return err(appError('not_configured', 'INDEXNOW_KEY yok', { module: 'jobs/indexnow' }));
  if (!isSiteIndexable()) return err(appError('not_configured', 'Site indekslenebilir degil', { module: 'jobs/indexnow' }));
  const origin = getSiteUrl();
  const { data: hb } = await db.from('cron_heartbeats').select('last_run_at, last_status').eq('job_key', INDEXNOW_JOB_KEY).maybeSingle();
  const since = hb?.last_status === 'ok' ? (hb.last_run_at ?? null) : null;
  let xml: string;
  try {
    const res = await fetcher(new URL('/sitemap.xml', origin), { headers: { accept: 'application/xml' } });
    if (!res.ok) return finish(err(appError('external_service', `sitemap ${res.status}`, { module: 'jobs/indexnow' })));
    xml = await res.text();
  } catch (e) {
    return finish(err(appError('external_service', e instanceof Error ? e.message : 'sitemap', { module: 'jobs/indexnow' })));
  }
  const entries = parseSitemap(xml);
  const urls = selectChanged(entries, since);
  if (urls.length === 0) return finish(ok({ candidates: entries.length, submitted: 0, status: null, since }));
  try {
    const res = await fetcher(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: origin.host, key, keyLocation: new URL('/api/indexnow-key', origin).toString(), urlList: urls }),
    });
    if (res.status >= 400) {
      logger.warn('IndexNow reddetti', { module: 'jobs/indexnow', status: res.status, count: urls.length });
      return finish(err(appError('external_service', `indexnow ${res.status}`, { module: 'jobs/indexnow' })));
    }
    return finish(ok({ candidates: entries.length, submitted: urls.length, status: res.status, since }));
  } catch (e) {
    return finish(err(appError('external_service', e instanceof Error ? e.message : 'indexnow', { module: 'jobs/indexnow' })));
  }
}

export async function runIndexNowJob(): Promise<Result<IndexNowSummary>> {
  const client = createServiceClient();
  if (!client.ok) return client;
  return submitIndexNow(client.data);
}
