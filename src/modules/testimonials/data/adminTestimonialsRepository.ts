import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';

export interface AdminTestimonial {
  readonly id: string;
  readonly source: string;
  readonly external_id: string | null;
  readonly author_name: string;
  readonly author_title: LocalizedText;
  readonly company: string | null;
  readonly avatar_url: string | null;
  readonly rating: number;
  readonly body: LocalizedText;
  readonly original_locale: string | null;
  readonly is_verified: boolean;
  readonly is_featured: boolean;
  readonly service_id: string | null;
  readonly project_id: string | null;
  readonly product_id: string | null;
  readonly reviewed_on: string | null;
  readonly status: string;
  readonly created_at: string;
  readonly linkedLabel: string;
}

export interface Choice {
  readonly id: string;
  readonly label: string;
}

export interface SyncRun {
  readonly id: string;
  readonly started_at: string;
  readonly finished_at: string | null;
  readonly status: string;
  readonly fetched_count: number;
  readonly inserted_count: number;
  readonly updated_count: number;
  readonly error: string | null;
}

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const fail = (message: string) => err(appError('external_service', message, { module: 'testimonials' }));
export type TestimonialStatusFilter = 'all' | 'pending' | 'published' | 'rejected' | 'archived';

export async function listTestimonialsForAdmin(status: TestimonialStatusFilter): Promise<Result<AdminTestimonial[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let q = client.data
    .from('testimonials')
    .select('id, source, external_id, author_name, author_title, company, avatar_url, rating, body, original_locale, is_verified, is_featured, service_id, project_id, product_id, reviewed_on, status, created_at, service:services(title), project:projects(title), product:products(name)')
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return fail(error.message);
  const label = (r: { service: unknown; project: unknown; product: unknown }) => {
    const s = (r.service as { title?: unknown } | null)?.title;
    const p = (r.project as { title?: unknown } | null)?.title;
    const pr = (r.product as { name?: unknown } | null)?.name;
    return [lt(s)['tr'], lt(p)['tr'], lt(pr)['tr']].filter(Boolean).join(' · ');
  };
  return ok(data.map((r) => ({ ...r, author_title: lt(r.author_title), body: lt(r.body), linkedLabel: label(r) })));
}

export async function listTestimonialChoices(): Promise<Result<{ services: Choice[]; projects: Choice[]; products: Choice[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [services, projects, products] = await Promise.all([
    client.data.from('services').select('id, title').order('sort_order', { ascending: true, nullsFirst: false }),
    client.data.from('projects').select('id, title').order('sort_order', { ascending: true, nullsFirst: false }).limit(300),
    client.data.from('products').select('id, name').order('sort_order', { ascending: true, nullsFirst: false }).limit(300),
  ]);
  const failure = services.error ?? projects.error ?? products.error;
  if (failure) return fail(failure.message);
  return ok({
    services: (services.data ?? []).map((s) => ({ id: s.id, label: lt(s.title)['tr'] ?? '' })),
    projects: (projects.data ?? []).map((p) => ({ id: p.id, label: lt(p.title)['tr'] ?? '' })),
    products: (products.data ?? []).map((p) => ({ id: p.id, label: lt(p.name)['tr'] ?? '' })),
  });
}

export async function listSyncRuns(): Promise<Result<SyncRun[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('review_sync_runs').select('id, started_at, finished_at, status, fetched_count, inserted_count, updated_count, error').order('started_at', { ascending: false }).limit(10);
  if (error) return fail(error.message);
  return ok(data);
}

/** Panel ayarı; anahtar gizli (is_public=false) — yalnız personel okur. API anahtarı DB'de değil, ortam değişkeninde. */
export async function readGooglePlaceSetting(): Promise<Result<{ placeId: string; apiKeyConfigured: boolean }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('site_settings').select('value').eq('key', 'reviews.google_place_id').maybeSingle();
  if (error) return fail(error.message);
  const v = data?.value;
  return ok({ placeId: typeof v === 'string' ? v : '', apiKeyConfigured: Boolean((process.env['GOOGLE_PLACES_API_KEY'] ?? '').trim()) });
}
