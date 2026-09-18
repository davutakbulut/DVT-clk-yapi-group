import 'server-only';
import { createServiceClient, type ServiceDbClient } from '@/core/db/createServiceClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { logger } from '@/core/observability/logger';
import type { Json } from '@/types/database';
import { mapGoogleReviews } from './googleReviews';

export interface ReviewSyncSummary {
  readonly fetched: number;
  readonly inserted: number;
  readonly updated: number;
  readonly placeRating: number | null;
  readonly placeCount: number | null;
}

/** Cron'da service-role, panelde admin oturumu — ikisi de aynı istemci tipidir; RLS yalnız ikincisinde geçerlidir. */
type Db = ServiceDbClient;

/** Place ID: panel ayarı (site_settings.reviews.google_place_id) > GOOGLE_PLACE_ID ortam değişkeni. */
export async function readGooglePlaceId(db: Db): Promise<string> {
  const { data } = await db.from('site_settings').select('value').eq('key', 'reviews.google_place_id').maybeSingle();
  const v = data?.value;
  const fromDb = typeof v === 'string' ? v.trim() : '';
  return fromDb || (process.env['GOOGLE_PLACE_ID'] ?? '').trim();
}

/**
 * Google yorumlarını çeker ve testimonials'a "salt-okunur" yazar: yeni yorum pending (insan yayınlar, K-08),
 * var olan yorumun metni/puanı/avatarı güncellenir, durumu ve bağlantıları korunur. Koşu review_sync_runs'a düşer.
 * `db` cron'da service-role, panelde admin oturumudur (RLS: admin yazabilir).
 */
export async function syncGoogleReviews(db: Db, fetcher: typeof fetch = fetch): Promise<Result<ReviewSyncSummary>> {
  const apiKey = (process.env['GOOGLE_PLACES_API_KEY'] ?? '').trim();
  const placeId = await readGooglePlaceId(db);
  if (!apiKey || !placeId) return err(appError('not_configured', 'GOOGLE_PLACES_API_KEY ya da Place ID yok', { module: 'reviews' }));

  const { data: run } = await db.from('review_sync_runs').insert({ status: 'running' }).select('id').single();
  const finish = async (status: 'success' | 'partial' | 'failed', counts: { fetched: number; inserted: number; updated: number }, error?: string) => {
    if (!run) return;
    await db.from('review_sync_runs').update({ status, finished_at: new Date().toISOString(), fetched_count: counts.fetched, inserted_count: counts.inserted, updated_count: counts.updated, error: error ?? null }).eq('id', run.id);
  };

  let payload: unknown;
  try {
    const res = await fetcher(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=tr`, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'reviews,rating,userRatingCount' },
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      await finish('failed', { fetched: 0, inserted: 0, updated: 0 }, `HTTP ${res.status}: ${text}`);
      return err(appError('external_service', `Google Places ${res.status}`, { module: 'reviews' }));
    }
    payload = await res.json();
  } catch (cause) {
    await finish('failed', { fetched: 0, inserted: 0, updated: 0 }, cause instanceof Error ? cause.message : 'fetch');
    return err(appError('external_service', 'Google Places istegi basarisiz', { module: 'reviews', cause }));
  }

  const summary = mapGoogleReviews(payload);
  let inserted = 0;
  let updated = 0;
  let failures = 0;
  for (const r of summary.reviews) {
    const { data: existing } = await db.from('testimonials').select('id').eq('source', 'google').eq('external_id', r.externalId).maybeSingle();
    const common = { author_name: r.authorName, avatar_url: r.avatarUrl, rating: r.rating, body: r.body as Json, original_locale: r.originalLocale, reviewed_on: r.reviewedOn, is_verified: true };
    const result = existing
      ? await db.from('testimonials').update(common).eq('id', existing.id)
      : await db.from('testimonials').insert({ ...common, source: 'google', external_id: r.externalId, status: 'pending' });
    if (result.error) {
      failures += 1;
      logger.warn('Google yorumu yazilamadi', { module: 'reviews', code: result.error.code, message: result.error.message });
      continue;
    }
    if (existing) updated += 1;
    else inserted += 1;
  }
  const counts = { fetched: summary.reviews.length, inserted, updated };
  await finish(failures === 0 ? 'success' : 'partial', counts, failures > 0 ? `${failures} satir yazilamadi` : undefined);
  return ok({ ...counts, placeRating: summary.rating, placeCount: summary.userRatingCount });
}

/** Cron girişi (K-56): service-role yalnız burada; heartbeat bırakır. */
export async function runReviewSyncJob(): Promise<Result<ReviewSyncSummary>> {
  const started = Date.now();
  const client = createServiceClient();
  if (!client.ok) return client;
  const result = await syncGoogleReviews(client.data);
  await client.data.from('cron_heartbeats').upsert(
    { job_key: 'review_sync', expected_interval_seconds: 129600, last_run_at: new Date().toISOString(), last_status: result.ok ? 'ok' : 'error', last_error: result.ok ? null : result.error.message, last_duration_ms: Date.now() - started },
    { onConflict: 'job_key' },
  );
  return result;
}
