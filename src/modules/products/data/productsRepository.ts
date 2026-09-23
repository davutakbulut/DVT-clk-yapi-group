import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { isVisibleIn, publishedSlugs, slugFor, type Publishable } from '@/core/content';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { MediaAsset } from '@/core/storage';
import { isLocalizedText, pickLocale } from '@/lib/localized';
import { readFacts, readOptions, readProps, type PropKey, type ProductOptions } from '../domain/productConfig';

export interface ProductCategoryRef {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly parentId: string | null;
  readonly image: MediaAsset | null;
}

export interface ProductCardData {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly isFeatured: boolean;
  readonly cover: MediaAsset | null;
  readonly category: { readonly id: string; readonly slug: string; readonly name: string } | null;
  /** Aktif ölçü/varyant sayısı (kartta "N ölçü" rozeti). */
  readonly variantCount: number;
}

export interface ProductVariant {
  readonly id: string;
  readonly sizeLabel: string;
  readonly widthMm: number | null;
  readonly heightMm: number | null;
  readonly thicknessMm: number | null;
  readonly lengthMm: number | null;
  readonly kgPerM: number | null;
  readonly stockCode: string | null;
  readonly group: string | null;
  readonly props: Partial<Record<PropKey, number>>;
}

export interface ProductDetailData {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly usageAreas: string;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly seo: { readonly title: string | null; readonly description: string | null; readonly canonicalUrl: string | null; readonly noindex: boolean; readonly ogImage: Pick<MediaAsset, 'bucket' | 'path' | 'width' | 'height'> | null };
  readonly alternates: { readonly tr: string | null; readonly en: string | null };
  readonly cover: MediaAsset | null;
  readonly category: { readonly id: string; readonly slug: string; readonly name: string } | null;
  readonly service: { readonly slug: string; readonly title: string } | null;
  readonly images: readonly MediaAsset[];
  readonly specs: readonly { readonly group: string; readonly name: string; readonly value: string; readonly unit: string | null }[];
  readonly variants: readonly ProductVariant[];
  /** Seçici seçenekleri ve başlık altı gerçekler (K-88). */
  readonly options: ProductOptions;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
  readonly documents: readonly { readonly title: string; readonly docType: string; readonly bucket: string; readonly path: string; readonly sizeBytes: number | null }[];
  readonly projects: readonly { readonly slug: string; readonly title: string }[];
  readonly faqs: readonly { readonly question: string; readonly answer: string }[];
}

const MEDIA_SELECT = 'storage_bucket, storage_path, width, height, blur_data_url, alt, variants';
type MediaRow = { storage_bucket: string; storage_path: string; width: number | null; height: number | null; blur_data_url: string | null; alt: unknown; variants: unknown };
type RpcMedia = { bucket: string; path: string; width: number | null; height: number | null; alt?: string | null; blur?: string | null; variants?: unknown } | null;
const rec = (v: unknown): Record<string, string> => (isLocalizedText(v) ? (v as Record<string, string>) : {});
const lt = (v: unknown) => (isLocalizedText(v) ? v : {});
const rowMedia = (m: MediaRow | null): MediaAsset | null => (m ? { bucket: m.storage_bucket, path: m.storage_path, width: m.width, height: m.height, blurDataUrl: m.blur_data_url, alt: rec(m.alt), variants: rec(m.variants) } : null);
const rpcMedia = (m: RpcMedia, locale: string): MediaAsset | null => (m ? { bucket: m.bucket, path: m.path, width: m.width, height: m.height, variants: rec(m.variants), blurDataUrl: m.blur ?? null, alt: m.alt ? { [locale]: m.alt } : {} } : null);
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function fetchCategories(locale: string): Promise<Result<ProductCategoryRef[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('product_categories').select(`id, slug, name, description, parent_id, image:media_library!product_categories_image_id_fkey(${MEDIA_SELECT})`).eq('is_active', true).order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'products' }));
  const out: ProductCategoryRef[] = [];
  for (const c of data) {
    const slug = slugFor(c.slug, locale);
    const name = pickLocale(lt(c.name), locale);
    if (slug && name) out.push({ id: c.id, slug, name, description: pickLocale(lt(c.description), locale), parentId: c.parent_id, image: rowMedia(c.image as MediaRow | null) });
  }
  return ok(out);
}

type ListRow = { id: string; slug: unknown; name: unknown; short_description: unknown; is_featured: boolean; status: string; published_locales: string[]; published_at: string | null; cover: MediaRow | null; category: { id: string; slug: unknown; name: unknown; is_active: boolean } | null; variants: { is_active: boolean }[] | null };

async function fetchProductList(locale: string): Promise<Result<ProductCardData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('products')
    .select(`id, slug, name, short_description, is_featured, status, published_locales, published_at, cover:media_library!products_cover_image_id_fkey(${MEDIA_SELECT}), category:product_categories(id, slug, name, is_active), variants:product_variants(is_active)`)
    .eq('status', 'published')
    .contains('published_locales', [locale])
    .order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'products' }));
  const items: ProductCardData[] = [];
  for (const row of data as unknown as ListRow[]) {
    if (!isVisibleIn(row as Publishable, locale)) continue;
    const slug = slugFor(row.slug, locale);
    const name = pickLocale(lt(row.name), locale);
    if (!slug || !name) continue;
    const cSlug = row.category?.is_active ? slugFor(row.category.slug, locale) : null;
    const cName = row.category ? pickLocale(lt(row.category.name), locale) : '';
    items.push({ id: row.id, slug, name, shortDescription: pickLocale(lt(row.short_description), locale), isFeatured: row.is_featured, cover: rowMedia(row.cover), category: row.category && cSlug && cName ? { id: row.category.id, slug: cSlug, name: cName } : null, variantCount: (row.variants ?? []).filter((v) => v.is_active).length });
  }
  return ok(items);
}

async function fetchProductBySlug(locale: string, slug: string): Promise<Result<ProductDetailData | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('get_product_by_slug', { p_locale: locale, p_slug: slug });
  if (error) return err(appError('external_service', error.message, { module: 'products' }));
  if (!data || typeof data !== 'object') return ok(null);
  const d = data as Record<string, unknown>;
  const seo = (d['seo'] ?? {}) as { title?: string | null; description?: string | null; canonical_url?: string | null; noindex?: boolean; og_image?: { bucket: string; path: string; width: number | null; height: number | null } | null };
  const category = d['category'] as { id: string; slug: string | null; name: string | null } | null;
  const service = d['service'] as { slug: string | null; title: string | null } | null;
  return ok({
    id: String(d['id']),
    slug: String(d['slug'] ?? ''),
    name: String(d['name'] ?? ''),
    shortDescription: String(d['short_description'] ?? ''),
    description: String(d['description'] ?? ''),
    usageAreas: String(d['usage_areas'] ?? ''),
    publishedAt: (d['published_at'] as string | null) ?? null,
    updatedAt: String(d['updated_at'] ?? ''),
    seo: { title: seo.title ?? null, description: seo.description ?? null, canonicalUrl: seo.canonical_url ?? null, noindex: seo.noindex === true, ogImage: seo.og_image ?? null },
    alternates: (d['alternates'] as { tr: string | null; en: string | null }) ?? { tr: null, en: null },
    cover: rpcMedia((d['cover'] as RpcMedia) ?? null, locale),
    category: category?.slug && category.name ? { id: category.id, slug: category.slug, name: category.name } : null,
    service: service?.slug && service.title ? { slug: service.slug, title: service.title } : null,
    images: ((d['images'] ?? []) as NonNullable<RpcMedia>[]).map((m) => rpcMedia(m, locale)!),
    specs: ((d['specs'] ?? []) as { group: string | null; name: string | null; value: string | null; unit: string | null }[]).map((s) => ({ group: s.group ?? '', name: s.name ?? '', value: s.value ?? '', unit: s.unit })),
    variants: ((d['variants'] ?? []) as Record<string, unknown>[]).map((v) => ({ id: String(v['id']), sizeLabel: String(v['size_label'] ?? ''), widthMm: num(v['width_mm']), heightMm: num(v['height_mm']), thicknessMm: num(v['thickness_mm']), lengthMm: num(v['length_mm']), kgPerM: num(v['kg_per_m']), stockCode: (v['stock_code'] as string | null) ?? null, group: typeof v['variant_group'] === 'string' && v['variant_group'] ? v['variant_group'] : null, props: readProps(v['props']) })),
    options: readOptions(d['options']),
    facts: readFacts(d['facts']).map((f) => ({ label: pickLocale(f.label, locale), value: pickLocale(f.value, locale) })).filter((f) => f.label || f.value),
    documents: ((d['documents'] ?? []) as { title: string | null; doc_type: string; bucket: string; path: string; size_bytes: number | null }[]).filter((x) => x.title).map((x) => ({ title: x.title!, docType: x.doc_type, bucket: x.bucket, path: x.path, sizeBytes: x.size_bytes })),
    projects: ((d['projects'] ?? []) as { slug: string | null; title: string | null }[]).filter((p): p is { slug: string; title: string } => Boolean(p.slug && p.title)),
    faqs: ((d['faqs'] ?? []) as { question: string | null; answer: string | null }[]).filter((f): f is { question: string; answer: string } => Boolean(f.question && f.answer)),
  });
}

async function fetchProductSlugs(locale: string): Promise<string[]> {
  const client = createPublicClient();
  if (!client.ok) return [];
  return publishedSlugs(client.data, 'products', locale);
}

export async function resolveOldProductSlug(locale: string, oldSlug: string): Promise<string | null> {
  const client = createPublicClient();
  if (!client.ok) return null;
  const { data } = await client.data.rpc('resolve_old_slug', { p_entity_type: 'product', p_locale: locale, p_old_slug: oldSlug });
  return typeof data === 'string' && data ? data : null;
}

export const getCachedProductCategories = cached(fetchCategories, ['products', 'categories'], { tags: [CACHE_TAGS.products, CACHE_TAGS.media] });
export const getCachedProductList = cached(fetchProductList, ['products', 'list'], { tags: [CACHE_TAGS.products, CACHE_TAGS.media] });
export const getCachedProductBySlug = cached(fetchProductBySlug, ['products', 'detail'], { tags: [CACHE_TAGS.products, CACHE_TAGS.services, CACHE_TAGS.projects, CACHE_TAGS.faqs, CACHE_TAGS.media] });
export const getCachedProductSlugs = cached(fetchProductSlugs, ['products', 'slugs'], { tags: [CACHE_TAGS.products] });
