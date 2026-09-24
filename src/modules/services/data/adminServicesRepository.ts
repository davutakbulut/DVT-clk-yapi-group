import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';
import { readSteps, type ProcessStep } from '../domain/processSteps';

export interface AdminServiceRow {
  readonly id: string;
  readonly title: LocalizedText;
  readonly slug: LocalizedText;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly is_featured: boolean;
  readonly sort_order: number | null;
  readonly updated_at: string;
  /** Kapak küçük resmi için medya gömüsü (liste, K-87). */
  readonly thumb?: { readonly storage_path: string; readonly variants: unknown } | null;
}

export interface AdminService extends AdminServiceRow {
  readonly excerpt: LocalizedText;
  readonly body: LocalizedText;
  readonly process_steps: readonly ProcessStep[];
  readonly icon: string | null;
  readonly cover_image_id: string | null;
  readonly og_image_id: string | null;
  readonly seo_title: LocalizedText;
  readonly seo_description: LocalizedText;
  readonly focus_keyword: LocalizedText;
  readonly canonical_url: string | null;
  readonly noindex: boolean;
  readonly reviewedEn: boolean;
  readonly gallery: readonly string[];
  /** K-106 */
  readonly group_key: string;
  readonly drawing_key: string | null;
  readonly highlights: LocalizedText;
  readonly project_category_id: string | null;
}

export interface MediaChoice {
  readonly id: string;
  readonly path: string;
  readonly mime: string;
}

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
/** highlights jsonb {"tr": [..]} → form metni (satır başına madde) */
function highlightLines(v: unknown): LocalizedText {
  const o = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of ['tr', 'en']) if (Array.isArray(o[k])) out[k] = (o[k] as unknown[]).filter((x): x is string => typeof x === 'string').join('\n');
  return out;
}
/** Hizmet formu için proje kategorisi seçenekleri */
export async function listProjectCategoryChoices(): Promise<{ id: string; label: string }[]> {
  const client = await createServerClient();
  if (!client.ok) return [];
  const { data } = await client.data.from('project_categories').select('id, name').order('sort_order', { ascending: true, nullsFirst: false });
  return (data ?? []).map((c) => ({ id: c.id, label: lt(c.name)['tr'] ?? '' }));
}
const LIST = 'id, title, slug, status, published_locales, is_featured, sort_order, updated_at';

export async function listServicesForAdmin(): Promise<Result<AdminServiceRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('services').select(`${LIST}, thumb:media_library!services_cover_image_id_fkey(storage_path, variants)`).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at');
  if (error) return err(appError('external_service', error.message, { module: 'services' }));
  return ok(data.map((r) => ({ ...r, title: lt(r.title), slug: lt(r.slug) })));
}

export async function listImageChoices(): Promise<Result<MediaChoice[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('media_library').select('id, storage_path, mime_type').like('mime_type', 'image/%').order('created_at', { ascending: false }).limit(500);
  if (error) return err(appError('external_service', error.message, { module: 'services' }));
  return ok(data.map((m) => ({ id: m.id, path: m.storage_path, mime: m.mime_type })));
}

export async function getServiceForAdmin(id: string): Promise<Result<AdminService | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [service, images] = await Promise.all([
    client.data.from('services').select(`${LIST}, excerpt, body, process_steps, icon, cover_image_id, og_image_id, seo_title, seo_description, focus_keyword, canonical_url, noindex, translation_meta, group_key, drawing_key, highlights, project_category_id`).eq('id', id).maybeSingle(),
    client.data.from('service_images').select('media_id, sort_order').eq('service_id', id).order('sort_order'),
  ]);
  const failure = service.error ?? images.error;
  if (failure) return err(appError('external_service', failure.message, { module: 'services' }));
  if (!service.data) return ok(null);
  const r = service.data;
  const meta = (r.translation_meta ?? {}) as { en?: { reviewed?: boolean } };
  return ok({
    ...r,
    title: lt(r.title),
    slug: lt(r.slug),
    highlights: highlightLines(r.highlights),
    excerpt: lt(r.excerpt),
    body: lt(r.body),
    process_steps: readSteps(r.process_steps),
    seo_title: lt(r.seo_title),
    seo_description: lt(r.seo_description),
    focus_keyword: lt(r.focus_keyword),
    reviewedEn: meta.en?.reviewed === true,
    gallery: (images.data ?? []).map((i) => i.media_id),
  });
}
