import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';
import { readSpecs, type SpecRow, type VariantRow } from '../domain/productLines';
import { readFacts, readOptions, readProps, type Fact, type ProductOptions } from '../domain/productConfig';

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const fail = (message: string) => err(appError('external_service', message, { module: 'products' }));

export interface AdminProductRow {
  readonly id: string;
  readonly name: LocalizedText;
  readonly slug: LocalizedText;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly is_featured: boolean;
  readonly categoryName: string;
  /** Kapak küçük resmi için medya gömüsü (liste, K-87). */
  readonly thumb?: { readonly storage_path: string; readonly variants: unknown } | null;
}

export interface AdminProductDocument {
  readonly media_id: string;
  readonly title: LocalizedText;
  readonly doc_type: string;
}

export interface AdminProduct extends AdminProductRow {
  readonly short_description: LocalizedText;
  readonly description: LocalizedText;
  readonly usage_areas: LocalizedText;
  readonly category_id: string | null;
  readonly service_id: string | null;
  readonly cover_image_id: string | null;
  readonly og_image_id: string | null;
  readonly seo_title: LocalizedText;
  readonly seo_description: LocalizedText;
  readonly focus_keyword: LocalizedText;
  readonly canonical_url: string | null;
  readonly noindex: boolean;
  readonly reviewedEn: boolean;
  readonly gallery: readonly string[];
  readonly specs: readonly SpecRow[];
  readonly variants: readonly VariantRow[];
  readonly options: ProductOptions;
  readonly facts: readonly Fact[];
  readonly documents: readonly AdminProductDocument[];
}

export interface AdminProductCategory {
  readonly id: string;
  readonly slug: LocalizedText;
  readonly name: LocalizedText;
  readonly description: LocalizedText;
  readonly parent_id: string | null;
  readonly image_id: string | null;
  readonly is_active: boolean;
  /** Kapak küçük resmi için medya gömüsü (liste, K-87). */
  readonly thumb?: { readonly storage_path: string; readonly variants: unknown } | null;
}

export interface Choice {
  readonly id: string;
  readonly label: string;
}

const LIST = 'id, name, slug, status, published_locales, is_featured';

export async function listProductsForAdmin(): Promise<Result<AdminProductRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('products').select(`${LIST}, category:product_categories(name), thumb:media_library!products_cover_image_id_fkey(storage_path, variants)`).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, name: lt(r.name), slug: lt(r.slug), categoryName: lt((r.category as { name?: unknown } | null)?.name)['tr'] ?? '' })));
}

export async function listProductChoices(): Promise<Result<{ images: { id: string; path: string; mime: string }[]; documents: { id: string; path: string; mime: string }[]; categories: Choice[]; services: Choice[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [images, documents, categories, services] = await Promise.all([
    client.data.from('media_library').select('id, storage_path, mime_type').like('mime_type', 'image/%').order('created_at', { ascending: false }).limit(500),
    client.data.from('media_library').select('id, storage_path, mime_type').like('mime_type', 'application/%').order('created_at', { ascending: false }).limit(300),
    client.data.from('product_categories').select('id, name, parent_id').order('sort_order', { ascending: true, nullsFirst: false }),
    client.data.from('services').select('id, title').order('sort_order', { ascending: true, nullsFirst: false }),
  ]);
  const failure = images.error ?? documents.error ?? categories.error ?? services.error;
  if (failure) return fail(failure.message);
  const cats = categories.data ?? [];
  const nameOf = (id: string | null): string => (id ? (lt(cats.find((c) => c.id === id)?.name)['tr'] ?? '') : '');
  return ok({
    images: (images.data ?? []).map((m) => ({ id: m.id, path: m.storage_path, mime: m.mime_type })),
    documents: (documents.data ?? []).map((m) => ({ id: m.id, path: m.storage_path, mime: m.mime_type })),
    categories: cats.map((c) => ({ id: c.id, label: c.parent_id ? `${nameOf(c.parent_id)} › ${lt(c.name)['tr'] ?? ''}` : (lt(c.name)['tr'] ?? '') })),
    services: (services.data ?? []).map((s) => ({ id: s.id, label: lt(s.title)['tr'] ?? '' })),
  });
}

export async function getProductForAdmin(id: string): Promise<Result<AdminProduct | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [product, images, specs, variants, documents] = await Promise.all([
    client.data.from('products').select(`${LIST}, short_description, description, usage_areas, options, facts, category_id, service_id, cover_image_id, og_image_id, seo_title, seo_description, focus_keyword, canonical_url, noindex, translation_meta, category:product_categories(name)`).eq('id', id).maybeSingle(),
    client.data.from('product_images').select('media_id').eq('product_id', id).order('sort_order'),
    client.data.from('product_specs').select('group_name, name, value, unit').eq('product_id', id).order('sort_order'),
    client.data.from('product_variants').select('size_label, width_mm, height_mm, thickness_mm, length_mm, kg_per_m, stock_code, variant_group, props').eq('product_id', id).order('sort_order'),
    client.data.from('product_documents').select('media_id, title, doc_type').eq('product_id', id).order('sort_order'),
  ]);
  const failure = product.error ?? images.error ?? specs.error ?? variants.error ?? documents.error;
  if (failure) return fail(failure.message);
  if (!product.data) return ok(null);
  const r = product.data;
  const meta = (r.translation_meta ?? {}) as { en?: { reviewed?: boolean } };
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return ok({
    ...r,
    name: lt(r.name),
    slug: lt(r.slug),
    short_description: lt(r.short_description),
    description: lt(r.description),
    usage_areas: lt(r.usage_areas),
    seo_title: lt(r.seo_title),
    seo_description: lt(r.seo_description),
    focus_keyword: lt(r.focus_keyword),
    categoryName: lt((r.category as { name?: unknown } | null)?.name)['tr'] ?? '',
    reviewedEn: meta.en?.reviewed === true,
    gallery: (images.data ?? []).map((i) => i.media_id),
    specs: readSpecs(specs.data ?? []),
    variants: (variants.data ?? []).map((v) => ({ sizeLabel: v.size_label, widthMm: num(v.width_mm), heightMm: num(v.height_mm), thicknessMm: num(v.thickness_mm), lengthMm: num(v.length_mm), kgPerM: num(v.kg_per_m), stockCode: v.stock_code, variantGroup: (typeof v.variant_group === 'object' && v.variant_group !== null ? ((v.variant_group as Record<string, string>)['tr'] ?? null) : null), props: readProps(v.props) })),
    options: readOptions(r.options),
    facts: readFacts(r.facts),
    documents: (documents.data ?? []).map((d) => ({ media_id: d.media_id, title: lt(d.title), doc_type: d.doc_type })),
  });
}

export async function listProductCategoriesForAdmin(): Promise<Result<AdminProductCategory[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('product_categories').select('id, slug, name, description, parent_id, image_id, is_active, thumb:media_library!product_categories_image_id_fkey(storage_path, variants)').order('parent_id', { ascending: true, nullsFirst: true }).order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return fail(error.message);
  return ok(data.map((c) => ({ ...c, slug: lt(c.slug), name: lt(c.name), description: lt(c.description) })));
}
