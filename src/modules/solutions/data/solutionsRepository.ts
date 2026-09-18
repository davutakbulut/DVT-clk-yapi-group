import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { isVisibleIn, publishedSlugs, slugFor, type Publishable } from '@/core/content';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { MediaAsset } from '@/core/storage';
import { isLocalizedText, pickLocale } from '@/lib/localized';

export interface SolutionCardData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly serviceId: string | null;
  readonly cover: MediaAsset | null;
}

export interface SolutionProjectRef {
  readonly slug: string;
  readonly title: string;
  readonly location: string | null;
  readonly cover: MediaAsset | null;
}

export interface SolutionDetailData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly problem: string;
  readonly comparison: { readonly alternative: string; readonly rows: readonly { readonly criterion: string; readonly steel: string; readonly alternative: string }[] };
  readonly advantages: readonly { readonly title: string; readonly description: string }[];
  readonly technicalBasis: string;
  readonly cta: { readonly title: string; readonly lead: string; readonly button: string };
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly seo: { readonly title: string | null; readonly description: string | null; readonly canonicalUrl: string | null; readonly noindex: boolean; readonly ogImage: Pick<MediaAsset, 'bucket' | 'path' | 'width' | 'height'> | null };
  readonly alternates: { readonly tr: string | null; readonly en: string | null };
  readonly cover: MediaAsset | null;
  readonly service: { readonly slug: string; readonly title: string } | null;
  readonly projects: readonly SolutionProjectRef[];
  readonly faqs: readonly { readonly question: string; readonly answer: string }[];
}

const MEDIA_SELECT = 'storage_bucket, storage_path, width, height, blur_data_url, alt, variants';
type MediaRow = { storage_bucket: string; storage_path: string; width: number | null; height: number | null; blur_data_url: string | null; alt: unknown; variants: unknown };
type RpcMedia = { bucket: string; path: string; width: number | null; height: number | null; alt?: string | null; blur?: string | null; variants?: unknown } | null;

const rec = (v: unknown): Record<string, string> => (isLocalizedText(v) ? (v as Record<string, string>) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function rpcMedia(m: RpcMedia, locale: string): MediaAsset | null {
  if (!m) return null;
  return { bucket: m.bucket, path: m.path, width: m.width, height: m.height, variants: rec(m.variants), blurDataUrl: m.blur ?? null, alt: m.alt ? { [locale]: m.alt } : {} };
}

async function fetchSolutionList(locale: string): Promise<Result<SolutionCardData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('solutions')
    .select(`id, slug, title, hero_summary, service_id, status, published_locales, published_at, cover:media_library!solutions_cover_image_id_fkey(${MEDIA_SELECT})`)
    .eq('status', 'published')
    .contains('published_locales', [locale])
    .order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'solutions' }));
  const items: SolutionCardData[] = [];
  for (const row of data) {
    if (!isVisibleIn(row as Publishable, locale)) continue;
    const slug = slugFor(row.slug, locale);
    const title = pickLocale(rec(row.title), locale);
    if (!slug || !title) continue;
    const cover = row.cover as MediaRow | null;
    items.push({
      id: row.id,
      slug,
      title,
      summary: pickLocale(rec(row.hero_summary), locale),
      serviceId: row.service_id,
      cover: cover ? { bucket: cover.storage_bucket, path: cover.storage_path, width: cover.width, height: cover.height, blurDataUrl: cover.blur_data_url, alt: rec(cover.alt), variants: rec(cover.variants) } : null,
    });
  }
  return ok(items);
}

async function fetchSolutionBySlug(locale: string, slug: string): Promise<Result<SolutionDetailData | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('get_solution_by_slug', { p_locale: locale, p_slug: slug });
  if (error) return err(appError('external_service', error.message, { module: 'solutions' }));
  if (!data || typeof data !== 'object') return ok(null);
  const d = data as Record<string, unknown>;
  const seo = (d['seo'] ?? {}) as { title?: string | null; description?: string | null; canonical_url?: string | null; noindex?: boolean; og_image?: { bucket: string; path: string; width: number | null; height: number | null } | null };
  const cmp = (d['comparison'] ?? {}) as { alternative?: string | null; rows?: { criterion: string | null; steel: string | null; alternative: string | null }[] };
  const cta = (d['cta'] ?? {}) as { title?: string | null; lead?: string | null; button?: string | null };
  const service = d['service'] as { slug: string | null; title: string | null } | null;
  const projects = ((d['projects'] ?? []) as { slug: string | null; title: string | null; location?: string | null; cover: RpcMedia }[])
    .filter((p): p is { slug: string; title: string; location?: string | null; cover: RpcMedia } => Boolean(p.slug && p.title))
    .map((p) => ({ slug: p.slug, title: p.title, location: p.location ?? null, cover: rpcMedia(p.cover, locale) }));
  const faqs = ((d['faqs'] ?? []) as { question: string | null; answer: string | null }[]).filter((f): f is { question: string; answer: string } => Boolean(f.question && f.answer));
  return ok({
    id: String(d['id']),
    slug: str(d['slug']),
    title: str(d['title']),
    summary: str(d['hero_summary']),
    problem: str(d['problem']),
    comparison: { alternative: cmp.alternative ?? '', rows: (cmp.rows ?? []).map((r) => ({ criterion: r.criterion ?? '', steel: r.steel ?? '', alternative: r.alternative ?? '' })) },
    advantages: ((d['advantages'] ?? []) as { title: string | null; description: string | null }[]).map((a) => ({ title: a.title ?? '', description: a.description ?? '' })),
    technicalBasis: str(d['technical_basis']),
    cta: { title: cta.title ?? '', lead: cta.lead ?? '', button: cta.button ?? '' },
    publishedAt: (d['published_at'] as string | null) ?? null,
    updatedAt: str(d['updated_at']),
    seo: { title: seo.title ?? null, description: seo.description ?? null, canonicalUrl: seo.canonical_url ?? null, noindex: seo.noindex === true, ogImage: seo.og_image ?? null },
    alternates: (d['alternates'] as { tr: string | null; en: string | null }) ?? { tr: null, en: null },
    cover: rpcMedia((d['cover'] as RpcMedia) ?? null, locale),
    service: service?.slug && service.title ? { slug: service.slug, title: service.title } : null,
    projects,
    faqs,
  });
}

async function fetchSolutionSlugs(locale: string): Promise<string[]> {
  const client = createPublicClient();
  if (!client.ok) return [];
  return publishedSlugs(client.data, 'solutions', locale);
}

/** Eski slug → yeni slug (K-15: 308). Bulunamazsa null. */
export async function resolveOldSolutionSlug(locale: string, oldSlug: string): Promise<string | null> {
  const client = createPublicClient();
  if (!client.ok) return null;
  const { data } = await client.data.rpc('resolve_old_slug', { p_entity_type: 'solution', p_locale: locale, p_old_slug: oldSlug });
  return typeof data === 'string' && data ? data : null;
}

export const getCachedSolutionList = cached(fetchSolutionList, ['solutions', 'list'], { tags: [CACHE_TAGS.solutions, CACHE_TAGS.media] });
export const getCachedSolutionBySlug = cached(fetchSolutionBySlug, ['solutions', 'detail'], { tags: [CACHE_TAGS.solutions, CACHE_TAGS.services, CACHE_TAGS.projects, CACHE_TAGS.faqs, CACHE_TAGS.media] });
export const getCachedSolutionSlugs = cached(fetchSolutionSlugs, ['solutions', 'slugs'], { tags: [CACHE_TAGS.solutions] });
