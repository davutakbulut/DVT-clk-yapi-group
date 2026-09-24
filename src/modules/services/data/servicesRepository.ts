import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { isVisibleIn, publishedSlugs, slugFor, type Publishable } from '@/core/content';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { MediaAsset } from '@/core/storage';
import { isLocalizedText, pickLocale } from '@/lib/localized';

export interface ServiceCardData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly icon: string | null;
  readonly isFeatured: boolean;
  readonly cover: MediaAsset | null;
  /** K-106: grup, teknik çizim, öne çıkanlar, "Projeleri gör" kategorisi */
  readonly group: 'steel' | 'engineering' | 'construction';
  readonly drawing: string | null;
  readonly highlights: readonly string[];
  readonly projectCategorySlug: string | null;
}

export interface ServiceImage extends MediaAsset {
  readonly caption: string | null;
}

export interface ServiceProjectRef {
  readonly slug: string;
  readonly title: string;
  readonly location: string | null;
  readonly cover: MediaAsset | null;
}

export interface ServiceDetailData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly body: string;
  readonly icon: string | null;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly processSteps: readonly { readonly title: string; readonly description: string }[];
  readonly seo: { readonly title: string | null; readonly description: string | null; readonly canonicalUrl: string | null; readonly noindex: boolean; readonly ogImage: Pick<MediaAsset, 'bucket' | 'path' | 'width' | 'height'> | null };
  readonly alternates: { readonly tr: string | null; readonly en: string | null };
  readonly cover: MediaAsset | null;
  readonly images: readonly ServiceImage[];
  readonly projects: readonly ServiceProjectRef[];
  readonly faqs: readonly { readonly question: string; readonly answer: string }[];
}

const MEDIA_SELECT = 'storage_bucket, storage_path, width, height, blur_data_url, alt, variants';
type MediaRow = { storage_bucket: string; storage_path: string; width: number | null; height: number | null; blur_data_url: string | null; alt: unknown; variants: unknown };
type RpcMedia = { bucket: string; path: string; width: number | null; height: number | null; alt?: string | null; blur?: string | null; variants?: unknown } | null;

const rec = (v: unknown): Record<string, string> => (isLocalizedText(v) ? (v as Record<string, string>) : {});
/** highlights jsonb {"tr": [...], "en": [...]} → o dilin listesi (yoksa TR) */
function highlightsFor(v: unknown, locale: string): string[] {
  if (typeof v !== 'object' || v === null) return [];
  const o = v as Record<string, unknown>;
  const pick = (k: string) => (Array.isArray(o[k]) ? (o[k] as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '') : null);
  return pick(locale) ?? pick('tr') ?? [];
}

function rpcMedia(m: RpcMedia, locale: string): MediaAsset | null {
  if (!m) return null;
  return { bucket: m.bucket, path: m.path, width: m.width, height: m.height, variants: rec(m.variants), blurDataUrl: m.blur ?? null, alt: m.alt ? { [locale]: m.alt } : {} };
}

async function fetchServiceList(locale: string): Promise<Result<ServiceCardData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('services')
    .select(`id, slug, title, excerpt, icon, is_featured, status, published_locales, published_at, group_key, drawing_key, highlights, cover:media_library!services_cover_image_id_fkey(${MEDIA_SELECT}), project_category:project_categories(slug, is_active)`)
    .eq('status', 'published')
    .contains('published_locales', [locale])
    .order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'services' }));
  const items: ServiceCardData[] = [];
  for (const row of data) {
    if (!isVisibleIn(row as Publishable, locale)) continue;
    const slug = slugFor(row.slug, locale);
    const title = pickLocale(isLocalizedText(row.title) ? row.title : {}, locale);
    if (!slug || !title) continue;
    const cover = row.cover as MediaRow | null;
    items.push({
      id: row.id,
      slug,
      title,
      excerpt: pickLocale(isLocalizedText(row.excerpt) ? row.excerpt : {}, locale),
      icon: row.icon,
      isFeatured: row.is_featured,
      cover: cover ? { bucket: cover.storage_bucket, path: cover.storage_path, width: cover.width, height: cover.height, blurDataUrl: cover.blur_data_url, alt: rec(cover.alt), variants: rec(cover.variants) } : null,
      group: row.group_key === 'engineering' || row.group_key === 'construction' ? row.group_key : 'steel',
      drawing: row.drawing_key,
      highlights: highlightsFor(row.highlights, locale),
      projectCategorySlug: (() => { const c = row.project_category as { slug: unknown; is_active: boolean } | null; return c && c.is_active ? slugFor(c.slug, locale) : null; })(),
    });
  }
  return ok(items);
}

async function fetchServiceBySlug(locale: string, slug: string): Promise<Result<ServiceDetailData | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('get_service_by_slug', { p_locale: locale, p_slug: slug });
  if (error) return err(appError('external_service', error.message, { module: 'services' }));
  if (!data || typeof data !== 'object') return ok(null);
  const d = data as Record<string, unknown>;
  const seo = (d['seo'] ?? {}) as { title?: string | null; description?: string | null; canonical_url?: string | null; noindex?: boolean; og_image?: { bucket: string; path: string; width: number | null; height: number | null } | null };
  const images = ((d['images'] ?? []) as (NonNullable<RpcMedia> & { caption?: string | null })[]).map((m) => ({ ...rpcMedia(m, locale)!, caption: m.caption ?? null }));
  const projects = ((d['projects'] ?? []) as { slug: string | null; title: string | null; location?: string | null; cover: RpcMedia }[])
    .filter((p): p is { slug: string; title: string; location?: string | null; cover: RpcMedia } => Boolean(p.slug && p.title))
    .map((p) => ({ slug: p.slug, title: p.title, location: p.location ?? null, cover: rpcMedia(p.cover, locale) }));
  const faqs = ((d['faqs'] ?? []) as { question: string | null; answer: string | null }[]).filter((f): f is { question: string; answer: string } => Boolean(f.question && f.answer));
  return ok({
    id: String(d['id']),
    slug: String(d['slug'] ?? ''),
    title: String(d['title'] ?? ''),
    excerpt: String(d['excerpt'] ?? ''),
    body: String(d['body'] ?? ''),
    icon: (d['icon'] as string | null) ?? null,
    publishedAt: (d['published_at'] as string | null) ?? null,
    updatedAt: String(d['updated_at'] ?? ''),
    processSteps: ((d['process_steps'] ?? []) as { title: string | null; description: string | null }[]).map((s) => ({ title: s.title ?? '', description: s.description ?? '' })),
    seo: { title: seo.title ?? null, description: seo.description ?? null, canonicalUrl: seo.canonical_url ?? null, noindex: seo.noindex === true, ogImage: seo.og_image ?? null },
    alternates: (d['alternates'] as { tr: string | null; en: string | null }) ?? { tr: null, en: null },
    cover: rpcMedia((d['cover'] as RpcMedia) ?? null, locale),
    images,
    projects,
    faqs,
  });
}

async function fetchServiceSlugs(locale: string): Promise<string[]> {
  const client = createPublicClient();
  if (!client.ok) return [];
  return publishedSlugs(client.data, 'services', locale);
}

/** Eski slug → yeni slug (K-15: 308). Bulunamazsa null. */
export async function resolveOldServiceSlug(locale: string, oldSlug: string): Promise<string | null> {
  const client = createPublicClient();
  if (!client.ok) return null;
  const { data } = await client.data.rpc('resolve_old_slug', { p_entity_type: 'service', p_locale: locale, p_old_slug: oldSlug });
  return typeof data === 'string' && data ? data : null;
}

export const getCachedServiceList = cached(fetchServiceList, ['services', 'list'], { tags: [CACHE_TAGS.services, CACHE_TAGS.media] });
export const getCachedServiceBySlug = cached(fetchServiceBySlug, ['services', 'detail'], { tags: [CACHE_TAGS.services, CACHE_TAGS.projects, CACHE_TAGS.faqs, CACHE_TAGS.media] });
export const getCachedServiceSlugs = cached(fetchServiceSlugs, ['services', 'slugs'], { tags: [CACHE_TAGS.services] });
