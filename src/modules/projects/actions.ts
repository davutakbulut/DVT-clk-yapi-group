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

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const short = z.string().trim().max(300).optional().or(z.literal(''));
const long = z.string().max(40000).optional().or(z.literal(''));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(''));
const num = z.coerce.number().positive().optional().or(z.literal(''));
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));
const DRAWINGS = ['konut', 'cati', 'kentsel', 'endustri', 'betonarme', 'epoksi', 'alcipan', 'tadilat', 'peyzaj', 'proje'] as const;
const ids = (formData: FormData, name: string) => formData.getAll(name).map(String).filter((v) => z.string().uuid().safeParse(v).success);

function fail(what: string, error: { code?: string; message: string }): ActionState {
  logger.error(what, { module: 'projects', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

async function replaceRelations(client: ServerDbClient, table: 'project_images' | 'project_category_relations' | 'service_projects', projectId: string, rows: Record<string, unknown>[]) {
  const del = await client.from(table).delete().eq('project_id', projectId);
  if (del.error) return del.error;
  if (rows.length === 0) return null;
  const ins = await client.from(table).insert(rows as never);
  return ins.error;
}

const projectSchema = publishSchema.extend({
  titleTr: z.string().trim().min(1).max(200),
  titleEn: short,
  excerptTr: short,
  excerptEn: short,
  bodyTr: long,
  bodyEn: long,
  locationTr: short,
  locationEn: short,
  clientName: short,
  areaM2: num,
  tonnage: num,
  startedOn: date,
  completedOn: date,
  phase: z.enum(['completed', 'ongoing', 'design']).default('completed'),
  year: z.coerce.number().int().min(1990).max(2100).optional().or(z.literal('')),
  durationTr: short,
  durationEn: short,
  drawingKey: z.enum(DRAWINGS).optional().or(z.literal('')),
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

export async function saveProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = projectSchema.safeParse({ ...Object.fromEntries(formData), isFeatured: checkbox(formData, 'isFeatured'), noindex: checkbox(formData, 'noindex'), publishEn: checkbox(formData, 'publishEn'), reviewedEn: checkbox(formData, 'reviewedEn') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  if (v.startedOn && v.completedOn && v.completedOn < v.startedOn) return failed('validation', { completedOn: 'validation' });
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const slug = slugMap({ slugTr: v.slugTr, slugEn: v.slugEn, titleTr: v.titleTr });
  const existingPublishedAt = v.id ? await readPublishedAt(client.data, 'projects', v.id) : null;
  const publish = publishColumns(v, { titleEn: v.titleEn ?? '', slugEn: slug['en'] ?? null, hasSlug: true, reviewerId: gate.data.id }, existingPublishedAt);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });

  const row = {
    slug,
    title: localized(v.titleTr, v.titleEn),
    excerpt: localized(v.excerptTr, v.excerptEn),
    body: localized(v.bodyTr, v.bodyEn),
    location: localized(v.locationTr, v.locationEn),
    client_name: v.clientName || null,
    area_m2: v.areaM2 === '' || v.areaM2 === undefined ? null : v.areaM2,
    tonnage: v.tonnage === '' || v.tonnage === undefined ? null : v.tonnage,
    started_on: v.startedOn || null,
    completed_on: v.completedOn || null,
    phase: v.phase,
    year: v.year === '' || v.year === undefined ? null : v.year,
    duration_label: localized(v.durationTr, v.durationEn),
    drawing_key: v.drawingKey || null,
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
    const { error } = await client.data.from('projects').update(row).eq('id', id);
    if (error) return fail('Proje kaydedilemedi', error);
  } else {
    const { data, error } = await client.data.from('projects').insert(row).select('id').single();
    if (error) return fail('Proje kaydedilemedi', error);
    id = data.id;
  }
  const relErr =
    (await replaceRelations(client.data, 'project_images', id, ids(formData, 'gallery').map((media_id, i) => ({ project_id: id, media_id, sort_order: i + 1 })))) ??
    (await replaceRelations(client.data, 'project_category_relations', id, ids(formData, 'categories').map((category_id) => ({ project_id: id, category_id })))) ??
    (await replaceRelations(client.data, 'service_projects', id, ids(formData, 'services').map((service_id) => ({ project_id: id, service_id }))));
  if (relErr) return fail('Proje iliskileri kaydedilemedi', relErr);

  revalidateTag(CACHE_TAGS.projects);
  revalidateTag(CACHE_TAGS.services);
  if (!v.id) redirect(`/admin/projects/${id}`);
  return DONE;
}

export async function deleteProject(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('projects').delete().eq('id', id.data);
  if (error) {
    logger.error('Proje silinemedi', { module: 'projects', code: error.code, message: error.message });
    return;
  }
  revalidateTag(CACHE_TAGS.projects);
  revalidateTag(CACHE_TAGS.services);
  redirect('/admin/projects');
}

async function move(table: 'projects' | 'project_categories', formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { data } = await client.data.from(table).select('id').order('sort_order', { ascending: true, nullsFirst: false }).order('created_at');
  const list = (data ?? []).map((r) => r.id);
  const index = list.indexOf(id.data);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target]!, list[index]!];
  const { error } = await client.data.rpc('reorder_content', { p_table: table, p_ids: list });
  if (error) logger.error('Sıralanamadı', { module: 'projects', table, code: error.code, message: error.message });
  revalidateTag(CACHE_TAGS.projects);
}

export async function moveProject(formData: FormData): Promise<void> {
  return move('projects', formData);
}

export async function moveCategory(formData: FormData): Promise<void> {
  return move('project_categories', formData);
}

const categorySchema = z.object({
  id: uuid,
  nameTr: z.string().trim().min(1).max(120),
  nameEn: short,
  slugTr: z.string().trim().max(80).optional().or(z.literal('')),
  slugEn: z.string().trim().max(80).optional().or(z.literal('')),
  descriptionTr: short,
  descriptionEn: short,
  drawingKey: z.enum(DRAWINGS).optional().or(z.literal('')),
  isActive: z.boolean(),
});

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = categorySchema.safeParse({ ...Object.fromEntries(formData), isActive: checkbox(formData, 'isActive') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = { slug: slugMap({ slugTr: v.slugTr, slugEn: v.slugEn, titleTr: v.nameTr }), name: localized(v.nameTr, v.nameEn), description: localized(v.descriptionTr, v.descriptionEn), drawing_key: v.drawingKey || null, is_active: v.isActive };
  const { error } = v.id ? await client.data.from('project_categories').update(row).eq('id', v.id) : await client.data.from('project_categories').insert(row);
  if (error) return fail('Kategori kaydedilemedi', error);
  revalidateTag(CACHE_TAGS.projects);
  return DONE;
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('project_categories').delete().eq('id', id.data);
  if (error) logger.error('Kategori silinemedi', { module: 'projects', code: error.code, message: error.message });
  revalidateTag(CACHE_TAGS.projects);
}
