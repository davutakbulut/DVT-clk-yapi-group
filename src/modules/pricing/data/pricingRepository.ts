import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { isVisibleIn, publishedSlugs, slugFor, type Publishable } from '@/core/content';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { MediaAsset } from '@/core/storage';
import { isLocalizedText, pickLocale } from '@/lib/localized';

export interface PriceGuideCardData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly intro: string;
  readonly quantityUnit: string;
  readonly pricesUpdatedAt: string | null;
}

export interface PriceGuideRowData {
  readonly id: string;
  readonly systemType: string;
  readonly description: string;
  readonly minFactor: number;
  readonly maxFactor: number;
  readonly unitPrice: number | null;
  readonly currency: string | null;
  readonly unit: string | null;
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
}

export interface PriceGuideDetailData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly intro: string;
  readonly factors: string;
  readonly formula: string;
  readonly disclaimer: string;
  readonly quantityUnit: string;
  readonly quantityPresets: readonly number[];
  readonly vatIncluded: boolean;
  readonly pricesUpdatedAt: string | null;
  readonly isStale: boolean;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly seo: { readonly title: string | null; readonly description: string | null; readonly canonicalUrl: string | null; readonly noindex: boolean; readonly ogImage: Pick<MediaAsset, 'bucket' | 'path' | 'width' | 'height'> | null };
  readonly alternates: { readonly tr: string | null; readonly en: string | null };
  readonly service: { readonly slug: string; readonly title: string } | null;
  readonly rows: readonly PriceGuideRowData[];
  readonly faqs: readonly { readonly question: string; readonly answer: string }[];
}

const rec = (v: unknown): Record<string, string> => (isLocalizedText(v) ? (v as Record<string, string>) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

async function fetchPriceGuideList(locale: string): Promise<Result<PriceGuideCardData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('price_guides')
    .select('id, slug, title, intro, quantity_unit, prices_updated_at, status, published_locales, published_at')
    .eq('status', 'published')
    .contains('published_locales', [locale])
    .order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'pricing' }));
  const items: PriceGuideCardData[] = [];
  for (const row of data) {
    if (!isVisibleIn(row as Publishable, locale)) continue;
    const slug = slugFor(row.slug, locale);
    const title = pickLocale(rec(row.title), locale);
    if (!slug || !title) continue;
    items.push({ id: row.id, slug, title, intro: pickLocale(rec(row.intro), locale), quantityUnit: row.quantity_unit, pricesUpdatedAt: row.prices_updated_at });
  }
  return ok(items);
}

async function fetchPriceGuideBySlug(locale: string, slug: string): Promise<Result<PriceGuideDetailData | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('get_price_guide_by_slug', { p_locale: locale, p_slug: slug });
  if (error) return err(appError('external_service', error.message, { module: 'pricing' }));
  if (!data || typeof data !== 'object') return ok(null);
  const d = data as Record<string, unknown>;
  const seo = (d['seo'] ?? {}) as { title?: string | null; description?: string | null; canonical_url?: string | null; noindex?: boolean; og_image?: { bucket: string; path: string; width: number | null; height: number | null } | null };
  const service = d['service'] as { slug: string | null; title: string | null } | null;
  const rows = ((d['rows'] ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r['id']),
    systemType: str(r['system_type']),
    description: str(r['description']),
    minFactor: Number(r['min_factor'] ?? 1),
    maxFactor: Number(r['max_factor'] ?? 1),
    unitPrice: numOrNull(r['unit_price']),
    currency: (r['currency'] as string | null) ?? null,
    unit: (r['unit'] as string | null) ?? null,
    minPrice: numOrNull(r['min_price']),
    maxPrice: numOrNull(r['max_price']),
  }));
  const faqs = ((d['faqs'] ?? []) as { question: string | null; answer: string | null }[]).filter((f): f is { question: string; answer: string } => Boolean(f.question && f.answer));
  return ok({
    id: String(d['id']),
    slug: str(d['slug']),
    title: str(d['title']),
    intro: str(d['intro']),
    factors: str(d['factors']),
    formula: str(d['formula']),
    disclaimer: str(d['disclaimer']),
    quantityUnit: str(d['quantity_unit']) || 'ton',
    quantityPresets: Array.isArray(d['quantity_presets']) ? (d['quantity_presets'] as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0) : [],
    vatIncluded: d['vat_included'] === true,
    pricesUpdatedAt: (d['prices_updated_at'] as string | null) ?? null,
    isStale: d['is_stale'] === true,
    publishedAt: (d['published_at'] as string | null) ?? null,
    updatedAt: str(d['updated_at']),
    seo: { title: seo.title ?? null, description: seo.description ?? null, canonicalUrl: seo.canonical_url ?? null, noindex: seo.noindex === true, ogImage: seo.og_image ?? null },
    alternates: (d['alternates'] as { tr: string | null; en: string | null }) ?? { tr: null, en: null },
    service: service?.slug && service.title ? { slug: service.slug, title: service.title } : null,
    rows,
    faqs,
  });
}

async function fetchPriceGuideSlugs(locale: string): Promise<string[]> {
  const client = createPublicClient();
  if (!client.ok) return [];
  return publishedSlugs(client.data, 'price_guides', locale);
}

/** Eski slug → yeni slug (K-15: 308). Bulunamazsa null. */
export async function resolveOldPriceGuideSlug(locale: string, oldSlug: string): Promise<string | null> {
  const client = createPublicClient();
  if (!client.ok) return null;
  const { data } = await client.data.rpc('resolve_old_slug', { p_entity_type: 'price_guide', p_locale: locale, p_old_slug: oldSlug });
  return typeof data === 'string' && data ? data : null;
}

export const getCachedPriceGuideList = cached(fetchPriceGuideList, ['pricing', 'list'], { tags: [CACHE_TAGS.pricing] });
export const getCachedPriceGuideBySlug = cached(fetchPriceGuideBySlug, ['pricing', 'detail'], { tags: [CACHE_TAGS.pricing, CACHE_TAGS.services, CACHE_TAGS.faqs, CACHE_TAGS.media] });
export const getCachedPriceGuideSlugs = cached(fetchPriceGuideSlugs, ['pricing', 'slugs'], { tags: [CACHE_TAGS.pricing] });
