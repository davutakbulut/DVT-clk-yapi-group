import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const fail = (message: string) => err(appError('external_service', message, { module: 'corporate' }));

export interface MediaChoice {
  readonly id: string;
  readonly path: string;
  readonly mime: string;
}

export interface AdminTeamMember {
  readonly id: string;
  readonly full_name: string;
  readonly position: LocalizedText;
  readonly bio: LocalizedText;
  readonly photo_id: string | null;
  readonly email: string | null;
  readonly linkedin_url: string | null;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly reviewedEn: boolean;
}

export interface AdminClient {
  readonly id: string;
  readonly name: string;
  readonly logo_id: string | null;
  readonly website_url: string | null;
  readonly sector: LocalizedText;
  readonly is_featured: boolean;
  readonly is_active: boolean;
}

export interface AdminCertificate {
  readonly id: string;
  readonly title: LocalizedText;
  readonly issuer: string | null;
  readonly certificate_no: string | null;
  readonly description: LocalizedText;
  readonly image_id: string | null;
  readonly document_id: string | null;
  readonly issued_on: string | null;
  readonly valid_until: string | null;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly reviewedEn: boolean;
}

export interface AdminJobPosting {
  readonly id: string;
  readonly slug: LocalizedText;
  readonly title: LocalizedText;
  readonly department: LocalizedText;
  readonly location: LocalizedText;
  readonly employment_type: string;
  readonly description: LocalizedText;
  readonly requirements: LocalizedText;
  readonly application_deadline: string | null;
  readonly is_open: boolean;
  readonly seo_title: LocalizedText;
  readonly seo_description: LocalizedText;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly reviewedEn: boolean;
}

export interface AdminApplication {
  readonly id: string;
  readonly full_name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly cover_letter: string | null;
  readonly cv_bucket: string;
  readonly cv_path: string | null;
  readonly status: string;
  readonly internal_notes: string | null;
  readonly locale: string;
  readonly created_at: string;
  readonly retention_until: string;
  readonly postingTitle: string;
  readonly cvUrl: string | null;
}

export interface AdminFaq {
  readonly id: string;
  readonly question: LocalizedText;
  readonly answer: LocalizedText;
  readonly entity_type: string | null;
  readonly entity_id: string | null;
  readonly sort_order: number;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly reviewedEn: boolean;
  readonly entityLabel: string;
}

const reviewed = (meta: unknown) => ((meta ?? {}) as { en?: { reviewed?: boolean } }).en?.reviewed === true;

export async function listMediaChoices(kind: 'image' | 'document'): Promise<Result<MediaChoice[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('media_library').select('id, storage_path, mime_type').like('mime_type', kind === 'image' ? 'image/%' : 'application/%').order('created_at', { ascending: false }).limit(500);
  if (error) return fail(error.message);
  return ok(data.map((m) => ({ id: m.id, path: m.storage_path, mime: m.mime_type })));
}

export async function listTeamForAdmin(): Promise<Result<AdminTeamMember[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('team_members').select('id, full_name, position, bio, photo_id, email, linkedin_url, status, published_locales, translation_meta').order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, position: lt(r.position), bio: lt(r.bio), reviewedEn: reviewed(r.translation_meta) })));
}

export async function getTeamMemberForAdmin(id: string): Promise<Result<AdminTeamMember | null>> {
  const list = await listTeamForAdmin();
  return list.ok ? ok(list.data.find((m) => m.id === id) ?? null) : list;
}

export async function listClientsForAdmin(): Promise<Result<AdminClient[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('clients').select('id, name, logo_id, website_url, sector, is_featured, is_active').order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, sector: lt(r.sector) })));
}

export async function listCertificatesForAdmin(): Promise<Result<AdminCertificate[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('certificates').select('id, title, issuer, certificate_no, description, image_id, document_id, issued_on, valid_until, status, published_locales, translation_meta').order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, title: lt(r.title), description: lt(r.description), reviewedEn: reviewed(r.translation_meta) })));
}

export async function getCertificateForAdmin(id: string): Promise<Result<AdminCertificate | null>> {
  const list = await listCertificatesForAdmin();
  return list.ok ? ok(list.data.find((c) => c.id === id) ?? null) : list;
}

export async function listJobPostingsForAdmin(): Promise<Result<AdminJobPosting[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('job_postings').select('id, slug, title, department, location, employment_type, description, requirements, application_deadline, is_open, seo_title, seo_description, status, published_locales, translation_meta').order('created_at', { ascending: false });
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, slug: lt(r.slug), title: lt(r.title), department: lt(r.department), location: lt(r.location), description: lt(r.description), requirements: lt(r.requirements), seo_title: lt(r.seo_title), seo_description: lt(r.seo_description), reviewedEn: reviewed(r.translation_meta) })));
}

export async function getJobPostingForAdmin(id: string): Promise<Result<AdminJobPosting | null>> {
  const list = await listJobPostingsForAdmin();
  return list.ok ? ok(list.data.find((j) => j.id === id) ?? null) : list;
}

/** Başvurular: yalnız super_admin/admin (RLS). CV bağlantısı 10 dakikalık imzalı URL (private bucket, staff okur). */
export async function listApplicationsForAdmin(status: string | null): Promise<Result<AdminApplication[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let query = client.data.from('job_applications').select('id, full_name, email, phone, cover_letter, cv_bucket, cv_path, status, internal_notes, locale, created_at, retention_until, posting:job_postings(title)').order('created_at', { ascending: false }).limit(300);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return fail(error.message);
  const out: AdminApplication[] = [];
  for (const r of data) {
    let cvUrl: string | null = null;
    if (r.cv_path) {
      const { data: signed } = await client.data.storage.from(r.cv_bucket).createSignedUrl(r.cv_path, 600);
      cvUrl = signed?.signedUrl ?? null;
    }
    out.push({ ...r, postingTitle: lt((r.posting as { title?: unknown } | null)?.title)['tr'] ?? '', cvUrl });
  }
  return ok(out);
}

export async function listFaqsForAdmin(): Promise<Result<AdminFaq[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [faqs, services, products, projects, solutions] = await Promise.all([
    client.data.from('faqs').select('id, question, answer, entity_type, entity_id, sort_order, status, published_locales, translation_meta').order('entity_type', { ascending: true, nullsFirst: true }).order('sort_order'),
    client.data.from('services').select('id, title'),
    client.data.from('products').select('id, name'),
    client.data.from('projects').select('id, title'),
    client.data.from('solutions').select('id, title'),
  ]);
  if (faqs.error) return fail(faqs.error.message);
  const labels = new Map<string, string>();
  for (const s of services.data ?? []) labels.set(`service:${s.id}`, lt(s.title)['tr'] ?? '');
  for (const p of products.data ?? []) labels.set(`product:${p.id}`, lt(p.name)['tr'] ?? '');
  for (const p of projects.data ?? []) labels.set(`project:${p.id}`, lt(p.title)['tr'] ?? '');
  for (const s of solutions.data ?? []) labels.set(`solution:${s.id}`, lt(s.title)['tr'] ?? '');
  return ok(faqs.data.map((f) => ({ ...f, question: lt(f.question), answer: lt(f.answer), reviewedEn: reviewed(f.translation_meta), entityLabel: f.entity_type && f.entity_id ? `${f.entity_type}: ${labels.get(`${f.entity_type}:${f.entity_id}`) ?? '?'}` : '' })));
}

export async function listFaqEntityChoices(): Promise<Result<{ value: string; label: string }[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [services, products, projects, solutions] = await Promise.all([
    client.data.from('services').select('id, title').order('sort_order', { ascending: true, nullsFirst: false }),
    client.data.from('products').select('id, name').order('created_at'),
    client.data.from('projects').select('id, title').order('created_at'),
    client.data.from('solutions').select('id, title').order('created_at'),
  ]);
  const out: { value: string; label: string }[] = [];
  for (const s of services.data ?? []) out.push({ value: `service:${s.id}`, label: `Hizmet: ${lt(s.title)['tr'] ?? ''}` }); // static-ok: admin seçenek etiketi
  for (const p of products.data ?? []) out.push({ value: `product:${p.id}`, label: `Ürün: ${lt(p.name)['tr'] ?? ''}` }); // static-ok: admin seçenek etiketi
  for (const p of projects.data ?? []) out.push({ value: `project:${p.id}`, label: `Proje: ${lt(p.title)['tr'] ?? ''}` }); // static-ok: admin seçenek etiketi
  for (const s of solutions.data ?? []) out.push({ value: `solution:${s.id}`, label: `Çözüm: ${lt(s.title)['tr'] ?? ''}` }); // static-ok: admin seçenek etiketi
  return ok(out);
}
