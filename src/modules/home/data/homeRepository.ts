import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { Publishable } from '@/core/content';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';
import { readStats } from '../domain/stats';

export interface MediaRef {
  readonly id: string;
  readonly bucket: string;
  readonly path: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly blur: string | null;
  readonly alt: Readonly<Record<string, string>>;
  readonly variants: Readonly<Record<string, string>>;
}

export interface HeroData {
  readonly desktopVideo: MediaRef | null;
  readonly mobileVideo: MediaRef | null;
  readonly desktopPoster: MediaRef | null;
  readonly mobilePoster: MediaRef | null;
  readonly durationSeconds: number | null;
  readonly headline: LocalizedText;
  readonly subheadline: LocalizedText;
  readonly ctaLabel: LocalizedText;
  readonly ctaPath: string | null;
}

export interface AboutStat {
  readonly value: string;
  readonly label: LocalizedText;
}

export interface AboutData extends Publishable {
  readonly eyebrow: LocalizedText;
  readonly title: LocalizedText;
  readonly body: LocalizedText;
  readonly image: MediaRef | null;
  readonly stats: readonly AboutStat[];
}

const MEDIA_SELECT = 'id, storage_bucket, storage_path, width, height, blur_data_url, alt, variants';
type MediaRow = { id: string; storage_bucket: string; storage_path: string; width: number | null; height: number | null; blur_data_url: string | null; alt: unknown; variants: unknown };

export function toMediaRef(row: MediaRow | null | undefined): MediaRef | null {
  if (!row) return null;
  return {
    id: row.id,
    bucket: row.storage_bucket,
    path: row.storage_path,
    width: row.width,
    height: row.height,
    blur: row.blur_data_url,
    alt: rec(row.alt),
    variants: rec(row.variants),
  };
}
const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const rec = (v: unknown): Record<string, string> => (isLocalizedText(v) ? (v as Record<string, string>) : {});

async function fetchHero(): Promise<Result<HeroData | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('hero_media')
    .select(`duration_seconds, headline, subheadline, cta_label, cta_path,
      desktop_video:media_library!hero_media_desktop_video_id_fkey(${MEDIA_SELECT}),
      mobile_video:media_library!hero_media_mobile_video_id_fkey(${MEDIA_SELECT}),
      desktop_poster:media_library!hero_media_desktop_poster_id_fkey(${MEDIA_SELECT}),
      mobile_poster:media_library!hero_media_mobile_poster_id_fkey(${MEDIA_SELECT})`)
    .eq('is_active', true)
    .maybeSingle();
  if (error) return err(appError('external_service', error.message, { module: 'home' }));
  if (!data) return ok(null);
  return ok({
    desktopVideo: toMediaRef(data.desktop_video as MediaRow | null),
    mobileVideo: toMediaRef(data.mobile_video as MediaRow | null),
    desktopPoster: toMediaRef(data.desktop_poster as MediaRow | null),
    mobilePoster: toMediaRef(data.mobile_poster as MediaRow | null),
    durationSeconds: data.duration_seconds === null ? null : Number(data.duration_seconds),
    headline: lt(data.headline),
    subheadline: lt(data.subheadline),
    ctaLabel: lt(data.cta_label),
    ctaPath: data.cta_path,
  });
}

async function fetchAbout(): Promise<Result<AboutData | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('about_content').select(`eyebrow, title, body, stats, status, published_locales, published_at, image:media_library!about_content_image_id_fkey(${MEDIA_SELECT})`).eq('key', 'main').maybeSingle();
  if (error) return err(appError('external_service', error.message, { module: 'home' }));
  if (!data) return ok(null);
  const stats = readStats(data.stats);
  return ok({ eyebrow: lt(data.eyebrow), title: lt(data.title), body: lt(data.body), image: toMediaRef(data.image as MediaRow | null), stats, status: data.status, published_locales: data.published_locales, published_at: data.published_at });
}

export const getCachedHero = cached(fetchHero, ['home', 'hero'], { tags: [CACHE_TAGS.hero, CACHE_TAGS.media] });
export const getCachedAbout = cached(fetchAbout, ['home', 'about'], { tags: [CACHE_TAGS.about, CACHE_TAGS.media] });
