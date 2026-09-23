'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox, dbErrorKey, localized, publishColumns, publishSchema, readPublishedAt, slugMap } from '@/core/content/adminContent';
import { createServerClient, type ServerDbClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import type { Json } from '@/types/database';
import { parseFacts, parseList, parseNumberList, writeOptions } from './domain/productConfig';
import { parseSpecs, parseVariants } from './domain/productLines';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const short = z.string().trim().max(300).optional().or(z.literal(''));
const long = z.string().max(40000).optional().or(z.literal(''));
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));
const ids = (formData: FormData, name: string) => formData.getAll(name).map(String).filter((v) => z.string().uuid().safeParse(v).success);

function fail(what: string, error: { code?: string; message: string }): ActionState {
  logger.error(what, { module: 'products', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

async function replaceChildren(client: ServerDbClient, table: 'product_images' | 'product_specs' | 'product_variants' | 'product_documents', productId: string, rows: Record<string, unknown>[]) {
  const del = await client.from(table).delete().eq('product_id', productId);
  if (del.error) return del.error;
  if (rows.length === 0) return null;
  const ins = await client.from(table).insert(rows as never);
  return ins.error;
}

const productSchema = publishSchema.extend({
  nameTr: z.string().trim().min(1).max(200),
  nameEn: short,
  shortTr: short,
  shortEn: short,
  descriptionTr: long,
  descriptionEn: long,
  usageTr: long,
  usageEn: long,
  categoryId: uuid,
  serviceId: uuid,
  coverImageId: uuid,
  ogImageId: uuid,
  isFeatured: z.boolean(),
  specsTr: long,
  specsEn: long,
  variants: long,
  grades: short,
  lengthsM: short,
  customLength: z.boolean(),
  unit: z.string().trim().max(20).optional().or(z.literal('')),
  factsTr: long,
  factsEn: long,
  seoTitleTr: short,
  seoTitleEn: short,
  seoDescriptionTr: short,
  seoDescriptionEn: short,
  focusKeywordTr: short,
  focusKeywordEn: short,
  canonicalUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  noindex: z.boolean(),
  publishEn: z.boolean(),
  reviewedEn: z.boolean(),
});
const DOC_TYPES = ['datasheet', 'certificate', 'installation_guide', 'other'] as const;

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = productSchema.safeParse({ ...Object.fromEntries(formData), isFeatured: checkbox(formData, 'isFeatured'), customLength: checkbox(formData, 'customLength'), noindex: checkbox(formData, 'noindex'), publishEn: checkbox(formData, 'publishEn'), reviewedEn: checkbox(formData, 'reviewedEn') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const slug = slugMap({ slugTr: v.slugTr, slugEn: v.slugEn, titleTr: v.nameTr });
  const existing = v.id ? await readPublishedAt(client.data, 'products', v.id) : null;
  const publish = publishColumns(v, { titleEn: v.nameEn ?? '', slugEn: slug['en'] ?? null, hasSlug: true, reviewerId: gate.data.id }, existing);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });

  const row = {
    slug,
    name: localized(v.nameTr, v.nameEn),
    short_description: localized(v.shortTr, v.shortEn),
    description: localized(v.descriptionTr, v.descriptionEn),
    usage_areas: localized(v.usageTr, v.usageEn),
    category_id: v.categoryId || null,
    service_id: v.serviceId || null,
    cover_image_id: v.coverImageId || null,
    og_image_id: v.ogImageId || null,
    is_featured: v.isFeatured,
    options: writeOptions({ grades: parseList(v.grades ?? ''), lengthsM: parseNumberList(v.lengthsM ?? ''), customLength: v.customLength, unit: v.unit || null }) as Json,
    facts: parseFacts(v.factsTr ?? '', v.factsEn ?? '') as unknown as Json,
    seo_title: localized(v.seoTitleTr, v.seoTitleEn),
    seo_description: localized(v.seoDescriptionTr, v.seoDescriptionEn),
    focus_keyword: localized(v.focusKeywordTr, v.focusKeywordEn),
    canonical_url: v.canonicalUrl || null,
    noindex: v.noindex,
    ...publish.columns,
  };
  let id = v.id || '';
  if (id) {
    const { error } = await client.data.from('products').update(row).eq('id', id);
    if (error) return fail('Urun kaydedilemedi', error);
  } else {
    const { data, error } = await client.data.from('products').insert(row).select('id').single();
    if (error) return fail('Urun kaydedilemedi', error);
    id = data.id;
  }

  // Belgeler: en çok 6 satır (docMedia_i, docTitleTr_i, docTitleEn_i, docType_i)
  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < 6; i++) {
    const media = formData.get(`docMedia_${i}`);
    const titleTr = String(formData.get(`docTitleTr_${i}`) ?? '').trim();
    const type = String(formData.get(`docType_${i}`) ?? 'datasheet');
    if (typeof media !== 'string' || !z.string().uuid().safeParse(media).success || !titleTr) continue;
    const titleEn = String(formData.get(`docTitleEn_${i}`) ?? '').trim();
    docs.push({ product_id: id, media_id: media, title: localized(titleTr, titleEn), doc_type: DOC_TYPES.includes(type as (typeof DOC_TYPES)[number]) ? type : 'other', locales: titleEn ? ['tr', 'en'] : ['tr'], sort_order: docs.length + 1 });
  }
  const specs = parseSpecs(v.specsTr ?? '', v.specsEn ?? '').map((s, i) => ({ product_id: id, group_name: s.group as Json, name: s.name as Json, value: s.value as Json, unit: s.unit, sort_order: i + 1 }));
  const variants = parseVariants(v.variants ?? '').map((x, i) => ({ product_id: id, size_label: x.sizeLabel, width_mm: x.widthMm, height_mm: x.heightMm, thickness_mm: x.thicknessMm, length_mm: x.lengthMm, kg_per_m: x.kgPerM, stock_code: x.stockCode, variant_group: (x.variantGroup ? { tr: x.variantGroup } : {}) as Json, props: x.props as Json, sort_order: i + 1 }));
  const relErr =
    (await replaceChildren(client.data, 'product_images', id, ids(formData, 'gallery').map((media_id, i) => ({ product_id: id, media_id, sort_order: i + 1 })))) ??
    (await replaceChildren(client.data, 'product_specs', id, specs)) ??
    (await replaceChildren(client.data, 'product_variants', id, variants)) ??
    (await replaceChildren(client.data, 'product_documents', id, docs));
  if (relErr) return fail('Urun alt kayitlari kaydedilemedi', relErr);

  revalidateTag(CACHE_TAGS.products);
  if (!v.id) redirect(`/admin/products/${id}`);
  return DONE;
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('products').delete().eq('id', id.data);
  if (error) logger.error('Urun silinemedi', { module: 'products', code: error.code, message: error.message });
  revalidateTag(CACHE_TAGS.products);
  redirect('/admin/products');
}

async function move(table: 'products' | 'product_categories', formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  let query = client.data.from(table).select('id, parent_id' as never).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at');
  const { data } = await query;
  let list = ((data ?? []) as unknown as { id: string; parent_id?: string | null }[]);
  if (table === 'product_categories') {
    const me = list.find((r) => r.id === id.data);
    list = list.filter((r) => (r.parent_id ?? null) === (me?.parent_id ?? null));
  }
  const order = list.map((r) => r.id);
  const index = order.indexOf(id.data);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return;
  [order[index], order[target]] = [order[target]!, order[index]!];
  query = query;
  const { error } = await client.data.rpc('reorder_content', { p_table: table, p_ids: order });
  if (error) logger.error('Siralanamadi', { module: 'products', table, code: error.code, message: error.message });
  revalidateTag(CACHE_TAGS.products);
}
export async function moveProduct(formData: FormData) {
  return move('products', formData);
}
export async function moveProductCategory(formData: FormData) {
  return move('product_categories', formData);
}

const categorySchema = z.object({
  id: uuid,
  nameTr: z.string().trim().min(1).max(120),
  nameEn: short,
  slugTr: z.string().trim().max(80).optional().or(z.literal('')),
  slugEn: z.string().trim().max(80).optional().or(z.literal('')),
  descriptionTr: short,
  descriptionEn: short,
  parentId: uuid,
  imageId: uuid,
  isActive: z.boolean(),
});

export async function saveProductCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = categorySchema.safeParse({ ...Object.fromEntries(formData), isActive: checkbox(formData, 'isActive') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  if (v.id && v.parentId && v.id === v.parentId) return failed('validation', { parentId: 'validation' });
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = { slug: slugMap({ slugTr: v.slugTr, slugEn: v.slugEn, titleTr: v.nameTr }), name: localized(v.nameTr, v.nameEn), description: localized(v.descriptionTr, v.descriptionEn), parent_id: v.parentId || null, image_id: v.imageId || null, is_active: v.isActive };
  const { error } = v.id ? await client.data.from('product_categories').update(row).eq('id', v.id) : await client.data.from('product_categories').insert(row);
  if (error) return fail('Kategori kaydedilemedi', error);
  revalidateTag(CACHE_TAGS.products);
  return DONE;
}

export async function deleteProductCategory(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('product_categories').delete().eq('id', id.data);
  if (error) logger.error('Kategori silinemedi', { module: 'products', code: error.code, message: error.message });
  revalidateTag(CACHE_TAGS.products);
}
