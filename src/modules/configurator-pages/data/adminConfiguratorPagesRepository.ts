import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';
import { readFaqs, readPairs, type FaqItem, type TitledItem } from '../domain/types';

export interface AdminGuideRow {
  readonly id: string;
  readonly configurator_key: string;
  readonly title: LocalizedText;
  readonly slug: LocalizedText;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly sort_order: number | null;
  readonly updated_at: string;
  readonly thumb?: { readonly storage_path: string; readonly variants: unknown } | null;
}
export interface AdminGuide extends AdminGuideRow {
  readonly hero_summary: LocalizedText;
  readonly body: LocalizedText;
  readonly benefits: readonly TitledItem[];
  readonly steps: readonly TitledItem[];
  readonly faqs: readonly FaqItem[];
  readonly cta: { readonly title: LocalizedText; readonly lead: LocalizedText; readonly button: LocalizedText };
  readonly cover_image_id: string | null;
  readonly og_image_id: string | null;
  readonly seo_title: LocalizedText;
  readonly seo_description: LocalizedText;
  readonly focus_keyword: LocalizedText;
  readonly canonical_url: string | null;
  readonly noindex: boolean;
  readonly reviewedEn: boolean;
}
const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const LIST = 'id, configurator_key, title, slug, status, published_locales, sort_order, updated_at';
const fail = (m: string) => err(appError('external_service', m, { module: 'configurator-pages' }));

export async function listGuidesForAdmin(): Promise<Result<AdminGuideRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('configurator_pages').select(`${LIST}, thumb:media_library!configurator_pages_cover_image_id_fkey(storage_path, variants)`).order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, title: lt(r.title), slug: lt(r.slug) })));
}
export async function listGuideImageChoices(): Promise<{ id: string; path: string; mime: string }[]> {
  const client = await createServerClient();
  if (!client.ok) return [];
  const { data } = await client.data.from('media_library').select('id, storage_path, mime_type').like('mime_type', 'image/%').order('created_at', { ascending: false }).limit(500);
  return (data ?? []).map((m) => ({ id: m.id, path: m.storage_path, mime: m.mime_type }));
}
export async function getGuideForAdmin(id: string): Promise<Result<AdminGuide | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('configurator_pages').select(`${LIST}, hero_summary, body, benefits, steps, faqs, cta, cover_image_id, og_image_id, seo_title, seo_description, focus_keyword, canonical_url, noindex, translation_meta`).eq('id', id).maybeSingle();
  if (error) return fail(error.message);
  if (!data) return ok(null);
  const meta = (data.translation_meta ?? {}) as { en?: { reviewed?: boolean } };
  const cta = (typeof data.cta === 'object' && data.cta !== null ? data.cta : {}) as { title?: unknown; lead?: unknown; button?: unknown };
  return ok({ ...data, title: lt(data.title), slug: lt(data.slug), hero_summary: lt(data.hero_summary), body: lt(data.body), benefits: readPairs(data.benefits), steps: readPairs(data.steps), faqs: readFaqs(data.faqs), cta: { title: lt(cta.title), lead: lt(cta.lead), button: lt(cta.button) }, seo_title: lt(data.seo_title), seo_description: lt(data.seo_description), focus_keyword: lt(data.focus_keyword), reviewedEn: meta.en?.reviewed === true });
}
