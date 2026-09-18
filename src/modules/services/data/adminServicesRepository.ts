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
}

export interface MediaChoice {
  readonly id: string;
  readonly path: string;
  readonly mime: string;
}

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const LIST = 'id, title, slug, status, published_locales, is_featured, sort_order, updated_at';

export async function listServicesForAdmin(): Promise<Result<AdminServiceRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('services').select(LIST).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at');
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
    client.data.from('services').select(`${LIST}, excerpt, body, process_steps, icon, cover_image_id, og_image_id, seo_title, seo_description, focus_keyword, canonical_url, noindex, translation_meta`).eq('id', id).maybeSingle(),
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
