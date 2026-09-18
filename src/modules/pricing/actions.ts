'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox, dbErrorKey, localized, publishColumns, publishSchema, readPublishedAt, slugMap } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import type { Json } from '@/types/database';
import { parsePresets, parsePriceRows } from './domain/priceLines';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const ADMINS = ['super_admin', 'admin'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const short = z.string().trim().max(300).optional().or(z.literal(''));
const long = z.string().max(40000).optional().or(z.literal(''));
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));

const guideSchema = publishSchema.extend({
  titleTr: z.string().trim().min(1).max(200),
  titleEn: short,
  serviceId: uuid,
  introTr: long,
  introEn: long,
  factorsTr: long,
  factorsEn: long,
  formulaTr: long,
  formulaEn: long,
  // 0002 CHECK: TR uyarı zorunlu — "tahmini aralıktır, kesin teklif keşif sonrası verilir"
  disclaimerTr: z.string().trim().min(10).max(1000),
  disclaimerEn: z.string().trim().max(1000).optional().or(z.literal('')),
  quantityUnit: z.enum(['ton', 'kg', 'm2', 'm', 'piece']),
  quantityPresets: z.string().max(200).optional().or(z.literal('')),
  vatIncluded: z.boolean(),
  staleAfterDays: z.coerce.number().int().min(1).max(3650).default(90),
  rowsTr: long,
  rowsEn: long,
  ogImageId: uuid,
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

export async function savePriceGuide(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = guideSchema.safeParse({ ...Object.fromEntries(formData), vatIncluded: checkbox(formData, 'vatIncluded'), noindex: checkbox(formData, 'noindex'), publishEn: checkbox(formData, 'publishEn'), reviewedEn: checkbox(formData, 'reviewedEn') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  // Satırlardaki malzeme kodları → id; bilinmeyen kod → satır alanında doğrulama hatası (sessizce fiyatsız kalmasın)
  const lines = parsePriceRows(v.rowsTr ?? '', v.rowsEn ?? '');
  const codes = Array.from(new Set(lines.flatMap((l) => (l.materialCode ? [l.materialCode] : []))));
  const materialIds = new Map<string, string>();
  if (codes.length > 0) {
    const { data, error } = await client.data.from('material_prices').select('id, code').in('code', codes);
    if (error) return fail(error);
    for (const m of data) materialIds.set(m.code, m.id);
    if (codes.some((c) => !materialIds.has(c))) return failed('validation', { rowsTr: 'validation' });
  }

  const slug = slugMap({ slugTr: v.slugTr, slugEn: v.slugEn, titleTr: v.titleTr });
  const existingPublishedAt = v.id ? await readPublishedAt(client.data, 'price_guides', v.id) : null;
  const publish = publishColumns(v, { titleEn: v.titleEn ?? '', slugEn: slug['en'] ?? null, hasSlug: true, reviewerId: gate.data.id }, existingPublishedAt);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });

  const row = {
    slug,
    title: localized(v.titleTr, v.titleEn),
    service_id: v.serviceId || null,
    intro: localized(v.introTr, v.introEn),
    factors: localized(v.factorsTr, v.factorsEn),
    formula: localized(v.formulaTr, v.formulaEn),
    disclaimer: localized(v.disclaimerTr, v.disclaimerEn),
    quantity_unit: v.quantityUnit,
    quantity_presets: parsePresets(v.quantityPresets ?? ''),
    vat_included: v.vatIncluded,
    stale_after_days: v.staleAfterDays,
    og_image_id: v.ogImageId || null,
    seo_title: localized(v.seoTitleTr, v.seoTitleEn),
    seo_description: localized(v.seoDescriptionTr, v.seoDescriptionEn),
    focus_keyword: localized(v.focusKeywordTr, v.focusKeywordEn),
    canonical_url: v.canonicalUrl || null,
    noindex: v.noindex,
    ...publish.columns,
  };

  let id = v.id || '';
  if (id) {
    const { error } = await client.data.from('price_guides').update(row).eq('id', id);
    if (error) return fail(error);
  } else {
    const { data, error } = await client.data.from('price_guides').insert(row).select('id').single();
    if (error) return fail(error);
    id = data.id;
  }
  // Satırlar sil-yaz (küçük liste, tek kaynak) — 0026 tetikleyicisi prices_updated_at'i yeniler
  const del = await client.data.from('price_guide_rows').delete().eq('price_guide_id', id);
  if (del.error) return fail(del.error);
  if (lines.length > 0) {
    const ins = await client.data.from('price_guide_rows').insert(
      lines.map((l, i) => ({ price_guide_id: id, system_type: l.systemType as Json, description: l.description as Json, material_price_id: l.materialCode ? (materialIds.get(l.materialCode) ?? null) : null, min_factor: l.minFactor, max_factor: l.maxFactor, sort_order: i + 1 })),
    );
    if (ins.error) return fail(ins.error);
  }
  revalidateTag(CACHE_TAGS.pricing);
  if (!v.id) redirect(`/admin/pricing/${id}`);
  return DONE;
}

function fail(error: { code?: string; message: string }): ActionState {
  logger.error('Fiyat rehberi kaydedilemedi', { module: 'pricing', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

export async function deletePriceGuide(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('price_guides').delete().eq('id', id.data);
  if (error) {
    logger.error('Fiyat rehberi silinemedi', { module: 'pricing', code: error.code, message: error.message });
    return;
  }
  revalidateTag(CACHE_TAGS.pricing);
  redirect('/admin/pricing');
}

export async function movePriceGuide(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { data } = await client.data.from('price_guides').select('id').order('sort_order', { ascending: true, nullsFirst: false }).order('created_at');
  const ids = (data ?? []).map((r) => r.id);
  const index = ids.indexOf(id.data);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  const { error } = await client.data.rpc('reorder_content', { p_table: 'price_guides', p_ids: ids });
  if (error) {
    logger.error('Fiyat rehberi siralanamadi', { module: 'pricing', code: error.code, message: error.message });
    return;
  }
  revalidateTag(CACHE_TAGS.pricing);
}

// ── Malzeme fiyatları (fiyatın TEK kaynağı, 0008): yalnız admin; değişiklik geçmişe düşer, rehber tazelenir (0026).
const materialSchema = z.object({
  id: uuid,
  code: z.string().trim().regex(/^[A-Z0-9][A-Z0-9_-]{1,39}$/),
  nameTr: z.string().trim().min(1).max(200),
  nameEn: short,
  category: z.enum(['steel', 'panel', 'labor', 'fastener', 'coating', 'other']),
  unit: z.enum(['kg', 'ton', 'm2', 'm', 'piece', 'hour']),
  unitPrice: z.coerce.number().min(0).max(1_000_000_000),
  currency: z.enum(['TRY', 'USD', 'EUR']),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
});

export async function saveMaterialPrice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const raw = Object.fromEntries(formData);
  const parsed = materialSchema.safeParse({ ...raw, code: String(raw['code'] ?? '').toUpperCase(), unitPrice: String(raw['unitPrice'] ?? '').replace(',', '.') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = { code: v.code, name: localized(v.nameTr, v.nameEn), category: v.category, unit: v.unit, unit_price: v.unitPrice, currency: v.currency, note: v.note || null, updated_by: gate.data.id, ...(v.validFrom ? { valid_from: v.validFrom } : {}) };
  const result = v.id ? await client.data.from('material_prices').update(row).eq('id', v.id) : await client.data.from('material_prices').insert(row);
  if (result.error) {
    logger.error('Malzeme fiyati kaydedilemedi', { module: 'pricing', code: result.error.code, message: result.error.message });
    return failed(dbErrorKey(result.error.code));
  }
  revalidateTag(CACHE_TAGS.pricing);
  revalidatePath('/admin/pricing/materials');
  return DONE;
}

export async function deleteMaterialPrice(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('material_prices').delete().eq('id', id.data);
  if (error) {
    logger.error('Malzeme fiyati silinemedi', { module: 'pricing', code: error.code, message: error.message });
    return;
  }
  revalidateTag(CACHE_TAGS.pricing);
  revalidatePath('/admin/pricing/materials');
}
