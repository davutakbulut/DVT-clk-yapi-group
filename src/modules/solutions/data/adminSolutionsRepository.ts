import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';
import { readAdvantages, readComparison, type Advantage, type Comparison } from '../domain/solutionLines';

export interface AdminSolutionRow {
  readonly id: string;
  readonly title: LocalizedText;
  readonly slug: LocalizedText;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly sort_order: number | null;
  readonly updated_at: string;
  readonly serviceTitle: string;
  /** Kapak küçük resmi için medya gömüsü (liste, K-87). */
  readonly thumb?: { readonly storage_path: string; readonly variants: unknown } | null;
}

export interface AdminSolution extends Omit<AdminSolutionRow, 'serviceTitle'> {
  readonly service_id: string | null;
  readonly hero_summary: LocalizedText;
  readonly problem: LocalizedText;
  readonly comparison: Comparison;
  readonly advantages: readonly Advantage[];
  readonly technical_basis: LocalizedText;
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

export interface Choice {
  readonly id: string;
  readonly label: string;
}

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const LIST = 'id, title, slug, status, published_locales, sort_order, updated_at';
const fail = (message: string) => err(appError('external_service', message, { module: 'solutions' }));

export async function listSolutionsForAdmin(): Promise<Result<AdminSolutionRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('solutions').select(`${LIST}, service:services(title), thumb:media_library!solutions_cover_image_id_fkey(storage_path, variants)`).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at');
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, title: lt(r.title), slug: lt(r.slug), serviceTitle: lt((r.service as { title?: unknown } | null)?.title)['tr'] ?? '' })));
}

export async function listSolutionChoices(): Promise<Result<{ images: { id: string; path: string; mime: string }[]; services: Choice[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [images, services] = await Promise.all([
    client.data.from('media_library').select('id, storage_path, mime_type').like('mime_type', 'image/%').order('created_at', { ascending: false }).limit(500),
    client.data.from('services').select('id, title').order('sort_order', { ascending: true, nullsFirst: false }),
  ]);
  const failure = images.error ?? services.error;
  if (failure) return fail(failure.message);
  return ok({
    images: (images.data ?? []).map((m) => ({ id: m.id, path: m.storage_path, mime: m.mime_type })),
    services: (services.data ?? []).map((s) => ({ id: s.id, label: lt(s.title)['tr'] ?? '' })),
  });
}

export async function getSolutionForAdmin(id: string): Promise<Result<AdminSolution | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('solutions')
    .select(`${LIST}, service_id, hero_summary, problem, comparison, advantages, technical_basis, cta, cover_image_id, og_image_id, seo_title, seo_description, focus_keyword, canonical_url, noindex, translation_meta`)
    .eq('id', id)
    .maybeSingle();
  if (error) return fail(error.message);
  if (!data) return ok(null);
  const meta = (data.translation_meta ?? {}) as { en?: { reviewed?: boolean } };
  const cta = (typeof data.cta === 'object' && data.cta !== null ? data.cta : {}) as { title?: unknown; lead?: unknown; button?: unknown };
  return ok({
    ...data,
    title: lt(data.title),
    slug: lt(data.slug),
    hero_summary: lt(data.hero_summary),
    problem: lt(data.problem),
    comparison: readComparison(data.comparison),
    advantages: readAdvantages(data.advantages),
    technical_basis: lt(data.technical_basis),
    cta: { title: lt(cta.title), lead: lt(cta.lead), button: lt(cta.button) },
    seo_title: lt(data.seo_title),
    seo_description: lt(data.seo_description),
    focus_keyword: lt(data.focus_keyword),
    reviewedEn: meta.en?.reviewed === true,
  });
}
