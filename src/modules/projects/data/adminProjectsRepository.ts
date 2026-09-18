import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';

export interface AdminProjectRow {
  readonly id: string;
  readonly title: LocalizedText;
  readonly slug: LocalizedText;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly is_featured: boolean;
  readonly location: LocalizedText;
  readonly completed_on: string | null;
}

export interface AdminProject extends AdminProjectRow {
  readonly excerpt: LocalizedText;
  readonly body: LocalizedText;
  readonly client_name: string | null;
  readonly area_m2: number | null;
  readonly tonnage: number | null;
  readonly started_on: string | null;
  readonly cover_image_id: string | null;
  readonly og_image_id: string | null;
  readonly seo_title: LocalizedText;
  readonly seo_description: LocalizedText;
  readonly focus_keyword: LocalizedText;
  readonly canonical_url: string | null;
  readonly noindex: boolean;
  readonly reviewedEn: boolean;
  readonly gallery: readonly string[];
  readonly categoryIds: readonly string[];
  readonly serviceIds: readonly string[];
}

export interface AdminCategory {
  readonly id: string;
  readonly slug: LocalizedText;
  readonly name: LocalizedText;
  readonly description: LocalizedText;
  readonly is_active: boolean;
  readonly sort_order: number | null;
}

export interface Choice {
  readonly id: string;
  readonly label: string;
}

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const LIST = 'id, title, slug, status, published_locales, is_featured, location, completed_on';

export async function listProjectsForAdmin(): Promise<Result<AdminProjectRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('projects').select(LIST).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) return err(appError('external_service', error.message, { module: 'projects' }));
  return ok(data.map((r) => ({ ...r, title: lt(r.title), slug: lt(r.slug), location: lt(r.location) })));
}

export async function listCategoriesForAdmin(): Promise<Result<AdminCategory[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('project_categories').select('id, slug, name, description, is_active, sort_order').order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'projects' }));
  return ok(data.map((c) => ({ ...c, slug: lt(c.slug), name: lt(c.name), description: lt(c.description) })));
}

/** Form seçenekleri: görseller, kategoriler, hizmetler (etiketler TR). */
export async function listProjectChoices(): Promise<Result<{ images: { id: string; path: string; mime: string }[]; categories: Choice[]; services: Choice[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [images, categories, services] = await Promise.all([
    client.data.from('media_library').select('id, storage_path, mime_type').like('mime_type', 'image/%').order('created_at', { ascending: false }).limit(500),
    client.data.from('project_categories').select('id, name').order('sort_order', { ascending: true, nullsFirst: false }),
    client.data.from('services').select('id, title').order('sort_order', { ascending: true, nullsFirst: false }),
  ]);
  const failure = images.error ?? categories.error ?? services.error;
  if (failure) return err(appError('external_service', failure.message, { module: 'projects' }));
  return ok({
    images: (images.data ?? []).map((m) => ({ id: m.id, path: m.storage_path, mime: m.mime_type })),
    categories: (categories.data ?? []).map((c) => ({ id: c.id, label: lt(c.name)['tr'] ?? '' })),
    services: (services.data ?? []).map((s) => ({ id: s.id, label: lt(s.title)['tr'] ?? '' })),
  });
}

export async function getProjectForAdmin(id: string): Promise<Result<AdminProject | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [project, images, cats, svcs] = await Promise.all([
    client.data.from('projects').select(`${LIST}, excerpt, body, client_name, area_m2, tonnage, started_on, cover_image_id, og_image_id, seo_title, seo_description, focus_keyword, canonical_url, noindex, translation_meta`).eq('id', id).maybeSingle(),
    client.data.from('project_images').select('media_id').eq('project_id', id).order('sort_order'),
    client.data.from('project_category_relations').select('category_id').eq('project_id', id),
    client.data.from('service_projects').select('service_id').eq('project_id', id),
  ]);
  const failure = project.error ?? images.error ?? cats.error ?? svcs.error;
  if (failure) return err(appError('external_service', failure.message, { module: 'projects' }));
  if (!project.data) return ok(null);
  const r = project.data;
  const meta = (r.translation_meta ?? {}) as { en?: { reviewed?: boolean } };
  return ok({
    ...r,
    title: lt(r.title),
    slug: lt(r.slug),
    location: lt(r.location),
    excerpt: lt(r.excerpt),
    body: lt(r.body),
    area_m2: r.area_m2 === null ? null : Number(r.area_m2),
    tonnage: r.tonnage === null ? null : Number(r.tonnage),
    seo_title: lt(r.seo_title),
    seo_description: lt(r.seo_description),
    focus_keyword: lt(r.focus_keyword),
    reviewedEn: meta.en?.reviewed === true,
    gallery: (images.data ?? []).map((i) => i.media_id),
    categoryIds: (cats.data ?? []).map((c) => c.category_id),
    serviceIds: (svcs.data ?? []).map((s) => s.service_id),
  });
}
