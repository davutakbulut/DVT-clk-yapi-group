'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox, dbErrorKey, localized, publishColumns, publishSchema, readPublishedAt, slugMap } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import type { Json } from '@/types/database';
import { parseSteps } from './domain/processSteps';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const short = z.string().trim().max(300).optional().or(z.literal(''));
const long = z.string().max(40000).optional().or(z.literal(''));
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));
const ICONS = ['building', 'factory', 'warehouse', 'roof', 'hammer', 'ruler', 'layers', 'wrench'] as const;
const DRAWINGS = ['konut', 'cati', 'kentsel', 'endustri', 'betonarme', 'epoksi', 'alcipan', 'tadilat', 'peyzaj', 'proje'] as const;
const lines = (s: string | undefined) => (s ?? '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12);

const schema = publishSchema.extend({
  titleTr: z.string().trim().min(1).max(200),
  titleEn: short,
  excerptTr: short,
  excerptEn: short,
  bodyTr: long,
  bodyEn: long,
  stepsTr: long,
  stepsEn: long,
  icon: z.enum(ICONS).optional().or(z.literal('')),
  groupKey: z.enum(['steel', 'engineering', 'construction']).default('steel'),
  drawingKey: z.enum(DRAWINGS).optional().or(z.literal('')),
  highlightsTr: long,
  highlightsEn: long,
  projectCategoryId: uuid,
  coverImageId: uuid,
  ogImageId: uuid,
  isFeatured: z.boolean(),
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

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = schema.safeParse({
    ...Object.fromEntries(formData),
    isFeatured: checkbox(formData, 'isFeatured'),
    noindex: checkbox(formData, 'noindex'),
    publishEn: checkbox(formData, 'publishEn'),
    reviewedEn: checkbox(formData, 'reviewedEn'),
  });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const gallery = formData.getAll('gallery').map(String).filter((id) => z.string().uuid().safeParse(id).success);
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const slug = slugMap({ slugTr: v.slugTr, slugEn: v.slugEn, titleTr: v.titleTr });
  const existingPublishedAt = v.id ? await readPublishedAt(client.data, 'services', v.id) : null;
  const publish = publishColumns(v, { titleEn: v.titleEn ?? '', slugEn: slug['en'] ?? null, hasSlug: true, reviewerId: gate.data.id }, existingPublishedAt);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });

  const row = {
    slug,
    title: localized(v.titleTr, v.titleEn),
    excerpt: localized(v.excerptTr, v.excerptEn),
    body: localized(v.bodyTr, v.bodyEn),
    process_steps: parseSteps(v.stepsTr ?? '', v.stepsEn ?? '') as unknown as Json,
    icon: v.icon || null,
    group_key: v.groupKey,
    drawing_key: v.drawingKey || null,
    highlights: { ...(lines(v.highlightsTr).length ? { tr: lines(v.highlightsTr) } : {}), ...(lines(v.highlightsEn).length ? { en: lines(v.highlightsEn) } : {}) } as unknown as Json,
    project_category_id: v.projectCategoryId || null,
    cover_image_id: v.coverImageId || null,
    og_image_id: v.ogImageId || null,
    is_featured: v.isFeatured,
    seo_title: localized(v.seoTitleTr, v.seoTitleEn),
    seo_description: localized(v.seoDescriptionTr, v.seoDescriptionEn),
    focus_keyword: localized(v.focusKeywordTr, v.focusKeywordEn),
    canonical_url: v.canonicalUrl || null,
    noindex: v.noindex,
    ...publish.columns,
  };

  let id = v.id || '';
  if (id) {
    const { error } = await client.data.from('services').update(row).eq('id', id);
    if (error) return fail(error);
  } else {
    const { data, error } = await client.data.from('services').insert(row).select('id').single();
    if (error) return fail(error);
    id = data.id;
  }

  // Galeri: sıra = seçim sırası. Sil-yaz: küçük liste, tek kaynaktan.
  const del = await client.data.from('service_images').delete().eq('service_id', id);
  if (del.error) return fail(del.error);
  if (gallery.length > 0) {
    const ins = await client.data.from('service_images').insert(gallery.map((media_id, i) => ({ service_id: id, media_id, sort_order: i + 1 })));
    if (ins.error) return fail(ins.error);
  }
  revalidateTag(CACHE_TAGS.services);
  revalidateTag(CACHE_TAGS.menus);
  if (!v.id) redirect(`/admin/services/${id}`);
  return DONE;
}

function fail(error: { code?: string; message: string }): ActionState {
  logger.error('Hizmet kaydedilemedi', { module: 'services', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

export async function deleteService(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('services').delete().eq('id', id.data);
  if (error) {
    logger.error('Hizmet silinemedi', { module: 'services', code: error.code, message: error.message });
    return;
  }
  revalidateTag(CACHE_TAGS.services);
  revalidateTag(CACHE_TAGS.menus);
  redirect('/admin/services');
}

/** ↑/↓: sıralı id listesi okunur, iki komşu yer değiştirir, tek RPC ile yazılır (0017 reorder_content). */
export async function moveService(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { data } = await client.data.from('services').select('id').order('sort_order', { ascending: true, nullsFirst: false }).order('created_at');
  const ids = (data ?? []).map((r) => r.id);
  const index = ids.indexOf(id.data);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  const { error } = await client.data.rpc('reorder_content', { p_table: 'services', p_ids: ids });
  if (error) {
    logger.error('Hizmet sıralanamadı', { module: 'services', code: error.code, message: error.message });
    return;
  }
  revalidateTag(CACHE_TAGS.services);
  revalidateTag(CACHE_TAGS.menus);
}
