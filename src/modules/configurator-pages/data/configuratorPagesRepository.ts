import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { isVisibleIn, publishedSlugs, slugFor, type Publishable } from '@/core/content';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { MediaAsset } from '@/core/storage';
import { isLocalizedText, pickLocale } from '@/lib/localized';
import { CONFIGURATOR_KEYS, type ConfiguratorKey } from '../domain/types';

export interface GuideCardData {
  readonly id: string;
  readonly key: ConfiguratorKey;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly cover: MediaAsset | null;
}
export interface GuideDetailData {
  readonly id: string;
  readonly key: ConfiguratorKey;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly benefits: readonly { readonly title: string; readonly description: string }[];
  readonly steps: readonly { readonly title: string; readonly description: string }[];
  readonly faqs: readonly { readonly question: string; readonly answer: string }[];
  readonly cta: { readonly title: string; readonly lead: string; readonly button: string };
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly seo: { readonly title: string | null; readonly description: string | null; readonly canonicalUrl: string | null; readonly noindex: boolean; readonly ogImage: Pick<MediaAsset, 'bucket' | 'path' | 'width' | 'height'> | null };
  readonly alternates: { readonly tr: string | null; readonly en: string | null };
  readonly cover: MediaAsset | null;
}

const MEDIA_SELECT = 'storage_bucket, storage_path, width, height, blur_data_url, alt, variants';
type MediaRow = { storage_bucket: string; storage_path: string; width: number | null; height: number | null; blur_data_url: string | null; alt: unknown; variants: unknown };
type RpcMedia = { bucket: string; path: string; width: number | null; height: number | null; alt?: string | null; blur?: string | null; variants?: unknown } | null;
const rec = (v: unknown): Record<string, string> => (isLocalizedText(v) ? (v as Record<string, string>) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const keyOf = (v: unknown): ConfiguratorKey => ((CONFIGURATOR_KEYS as readonly string[]).includes(String(v)) ? (v as ConfiguratorKey) : 'hall');
function rpcMedia(m: RpcMedia, locale: string): MediaAsset | null {
  if (!m) return null;
  return { bucket: m.bucket, path: m.path, width: m.width, height: m.height, variants: rec(m.variants), blurDataUrl: m.blur ?? null, alt: m.alt ? { [locale]: m.alt } : {} };
}

async function fetchGuideList(locale: string): Promise<Result<GuideCardData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('configurator_pages')
    .select(`id, configurator_key, slug, title, hero_summary, status, published_locales, published_at, cover:media_library!configurator_pages_cover_image_id_fkey(${MEDIA_SELECT})`)
    .eq('status', 'published').contains('published_locales', [locale]).order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'configurator-pages' }));
  const items: GuideCardData[] = [];
  for (const row of data) {
    if (!isVisibleIn(row as Publishable, locale)) continue;
    const slug = slugFor(row.slug, locale); const title = pickLocale(rec(row.title), locale);
    if (!slug || !title) continue;
    const cover = row.cover as MediaRow | null;
    items.push({ id: row.id, key: keyOf(row.configurator_key), slug, title, summary: pickLocale(rec(row.hero_summary), locale), cover: cover ? { bucket: cover.storage_bucket, path: cover.storage_path, width: cover.width, height: cover.height, blurDataUrl: cover.blur_data_url, alt: rec(cover.alt), variants: rec(cover.variants) } : null });
  }
  return ok(items);
}
async function fetchGuideBySlug(locale: string, slug: string): Promise<Result<GuideDetailData | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('get_configurator_page_by_slug', { p_locale: locale, p_slug: slug });
  if (error) return err(appError('external_service', error.message, { module: 'configurator-pages' }));
  if (!data || typeof data !== 'object') return ok(null);
  const d = data as Record<string, unknown>;
  const seo = (d['seo'] ?? {}) as { title?: string | null; description?: string | null; canonical_url?: string | null; noindex?: boolean; og_image?: { bucket: string; path: string; width: number | null; height: number | null } | null };
  const cta = (d['cta'] ?? {}) as { title?: string | null; lead?: string | null; button?: string | null };
  const pairs = (v: unknown) => ((v ?? []) as { title: string | null; description: string | null }[]).map((a) => ({ title: a.title ?? '', description: a.description ?? '' }));
  return ok({
    id: String(d['id']), key: keyOf(d['configurator_key']), slug: str(d['slug']), title: str(d['title']), summary: str(d['hero_summary']), body: str(d['body']),
    benefits: pairs(d['benefits']), steps: pairs(d['steps']),
    faqs: ((d['faqs'] ?? []) as { question: string | null; answer: string | null }[]).filter((f): f is { question: string; answer: string } => Boolean(f.question && f.answer)),
    cta: { title: cta.title ?? '', lead: cta.lead ?? '', button: cta.button ?? '' },
    publishedAt: (d['published_at'] as string | null) ?? null, updatedAt: str(d['updated_at']),
    seo: { title: seo.title ?? null, description: seo.description ?? null, canonicalUrl: seo.canonical_url ?? null, noindex: seo.noindex === true, ogImage: seo.og_image ?? null },
    alternates: (d['alternates'] as { tr: string | null; en: string | null }) ?? { tr: null, en: null },
    cover: rpcMedia((d['cover'] as RpcMedia) ?? null, locale),
  });
}
async function fetchGuideSlugs(locale: string): Promise<string[]> {
  const client = createPublicClient();
  if (!client.ok) return [];
  return publishedSlugs(client.data, 'configurator_pages', locale);
}
export async function resolveOldGuideSlug(locale: string, oldSlug: string): Promise<string | null> {
  const client = createPublicClient();
  if (!client.ok) return null;
  const { data } = await client.data.rpc('resolve_old_slug', { p_entity_type: 'configurator_page', p_locale: locale, p_old_slug: oldSlug });
  return typeof data === 'string' && data ? data : null;
}
export const getCachedGuideList = cached(fetchGuideList, ['configurator-pages', 'list'], { tags: [CACHE_TAGS.configuratorPages, CACHE_TAGS.media] });
export const getCachedGuideBySlug = cached(fetchGuideBySlug, ['configurator-pages', 'detail'], { tags: [CACHE_TAGS.configuratorPages, CACHE_TAGS.media] });
export const getCachedGuideSlugs = cached(fetchGuideSlugs, ['configurator-pages', 'slugs'], { tags: [CACHE_TAGS.configuratorPages] });
