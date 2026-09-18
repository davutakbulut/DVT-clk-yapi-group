import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { isVisibleIn, publishedSlugs, slugFor, type Publishable } from '@/core/content';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { MediaAsset } from '@/core/storage';
import { isLocalizedText, pickLocale } from '@/lib/localized';

const MEDIA_SELECT = 'storage_bucket, storage_path, width, height, blur_data_url, alt, variants';
type MediaRow = { storage_bucket: string; storage_path: string; width: number | null; height: number | null; blur_data_url: string | null; alt: unknown; variants: unknown };
const rec = (v: unknown): Record<string, string> => (isLocalizedText(v) ? (v as Record<string, string>) : {});
const lt = (v: unknown) => (isLocalizedText(v) ? v : {});
const media = (m: MediaRow | null): MediaAsset | null => (m ? { bucket: m.storage_bucket, path: m.storage_path, width: m.width, height: m.height, blurDataUrl: m.blur_data_url, alt: rec(m.alt), variants: rec(m.variants) } : null);

export interface TeamMemberData {
  readonly id: string;
  readonly name: string;
  readonly position: string;
  readonly bio: string;
  readonly linkedinUrl: string | null;
  readonly photo: MediaAsset | null;
}

export interface ClientData {
  readonly id: string;
  readonly name: string;
  readonly websiteUrl: string | null;
  readonly sector: string;
  readonly isFeatured: boolean;
  readonly logo: MediaAsset | null;
}

export interface CertificateData {
  readonly id: string;
  readonly title: string;
  readonly issuer: string | null;
  readonly certificateNo: string | null;
  readonly description: string;
  readonly issuedOn: string | null;
  readonly validUntil: string | null;
  readonly image: MediaAsset | null;
  readonly document: MediaAsset | null;
}

export interface JobPostingData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly department: string;
  readonly location: string;
  readonly employmentType: string;
  readonly description: string;
  readonly requirements: string;
  readonly applicationDeadline: string | null;
  readonly isOpen: boolean;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly seo: { readonly title: string | null; readonly description: string | null };
  readonly alternates: { readonly tr: string | null; readonly en: string | null };
}

export interface FaqData {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

async function fetchTeam(locale: string): Promise<Result<TeamMemberData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('team_members').select(`id, full_name, position, bio, linkedin_url, status, published_locales, published_at, photo:media_library!team_members_photo_id_fkey(${MEDIA_SELECT})`).eq('status', 'published').contains('published_locales', [locale]).order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'corporate' }));
  return ok(data.filter((r) => isVisibleIn(r as Publishable, locale)).map((r) => ({ id: r.id, name: r.full_name, position: pickLocale(lt(r.position), locale), bio: pickLocale(lt(r.bio), locale), linkedinUrl: r.linkedin_url, photo: media(r.photo as MediaRow | null) })));
}

async function fetchClients(locale: string): Promise<Result<ClientData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('clients').select(`id, name, website_url, sector, is_featured, logo:media_library!clients_logo_id_fkey(${MEDIA_SELECT})`).eq('is_active', true).order('is_featured', { ascending: false }).order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'corporate' }));
  return ok(data.map((r) => ({ id: r.id, name: r.name, websiteUrl: r.website_url, sector: pickLocale(lt(r.sector), locale), isFeatured: r.is_featured, logo: media(r.logo as MediaRow | null) })));
}

async function fetchCertificates(locale: string): Promise<Result<CertificateData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('certificates').select(`id, title, issuer, certificate_no, description, issued_on, valid_until, status, published_locales, published_at, image:media_library!certificates_image_id_fkey(${MEDIA_SELECT}), document:media_library!certificates_document_id_fkey(${MEDIA_SELECT})`).eq('status', 'published').contains('published_locales', [locale]).order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'corporate' }));
  return ok(
    data
      .filter((r) => isVisibleIn(r as Publishable, locale))
      .map((r) => ({ id: r.id, title: pickLocale(lt(r.title), locale), issuer: r.issuer, certificateNo: r.certificate_no, description: pickLocale(lt(r.description), locale), issuedOn: r.issued_on, validUntil: r.valid_until, image: media(r.image as MediaRow | null), document: media(r.document as MediaRow | null) }))
      .filter((c) => c.title),
  );
}

const JOB_SELECT = 'id, slug, title, department, location, employment_type, description, requirements, application_deadline, is_open, status, published_locales, published_at, updated_at, seo_title, seo_description';
type JobRow = {
  id: string;
  slug: unknown;
  title: unknown;
  department: unknown;
  location: unknown;
  employment_type: string;
  description: unknown;
  requirements: unknown;
  application_deadline: string | null;
  is_open: boolean;
  status: string;
  published_locales: string[];
  published_at: string | null;
  updated_at: string;
  seo_title: unknown;
  seo_description: unknown;
};

function toJob(r: JobRow, locale: string): JobPostingData | null {
  if (!isVisibleIn(r as Publishable, locale)) return null;
  const slug = slugFor(r.slug, locale);
  const title = pickLocale(lt(r.title), locale);
  if (!slug || !title) return null;
  return {
    id: r.id,
    slug,
    title,
    department: pickLocale(lt(r.department), locale),
    location: pickLocale(lt(r.location), locale),
    employmentType: r.employment_type,
    description: pickLocale(lt(r.description), locale),
    requirements: pickLocale(lt(r.requirements), locale),
    applicationDeadline: r.application_deadline,
    isOpen: r.is_open && (!r.application_deadline || r.application_deadline >= new Date().toISOString().slice(0, 10)),
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
    seo: { title: pickLocale(lt(r.seo_title), locale) || null, description: pickLocale(lt(r.seo_description), locale) || null },
    alternates: { tr: r.published_locales.includes('tr') ? slugFor(r.slug, 'tr') : null, en: r.published_locales.includes('en') ? slugFor(r.slug, 'en') : null },
  };
}

async function fetchJobPostings(locale: string): Promise<Result<JobPostingData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('job_postings').select(JOB_SELECT).eq('status', 'published').contains('published_locales', [locale]).order('published_at', { ascending: false });
  if (error) return err(appError('external_service', error.message, { module: 'corporate' }));
  return ok((data as unknown as JobRow[]).flatMap((r) => toJob(r, locale) ?? []));
}

async function fetchJobPostingBySlug(locale: string, slug: string): Promise<Result<JobPostingData | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('job_postings').select(JOB_SELECT).eq(`slug->>${locale}`, slug).contains('published_locales', [locale]).maybeSingle();
  if (error) return err(appError('external_service', error.message, { module: 'corporate' }));
  return ok(data ? toJob(data as unknown as JobRow, locale) : null);
}

async function fetchJobSlugs(locale: string): Promise<string[]> {
  const client = createPublicClient();
  if (!client.ok) return [];
  return publishedSlugs(client.data, 'job_postings', locale);
}

export async function resolveOldJobSlug(locale: string, oldSlug: string): Promise<string | null> {
  const client = createPublicClient();
  if (!client.ok) return null;
  const { data } = await client.data.rpc('resolve_old_slug', { p_entity_type: 'job_posting', p_locale: locale, p_old_slug: oldSlug });
  return typeof data === 'string' && data ? data : null;
}

/** Genel SSS (entity_type null) ya da bir varlığın SSS'leri; yalnız o dilde yayında olanlar. */
async function fetchFaqs(locale: string, entityType: string | null, entityId: string | null): Promise<Result<FaqData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  let query = client.data.from('faqs').select('id, question, answer, status, published_locales, published_at').eq('status', 'published').contains('published_locales', [locale]).order('sort_order');
  query = entityType && entityId ? query.eq('entity_type', entityType).eq('entity_id', entityId) : query.is('entity_type', null);
  const { data, error } = await query;
  if (error) return err(appError('external_service', error.message, { module: 'corporate' }));
  return ok(data.filter((r) => isVisibleIn(r as Publishable, locale)).map((r) => ({ id: r.id, question: pickLocale(lt(r.question), locale), answer: pickLocale(lt(r.answer), locale) })).filter((f) => f.question && f.answer));
}

export const getCachedTeam = cached(fetchTeam, ['corporate', 'team'], { tags: [CACHE_TAGS.corporate, CACHE_TAGS.media] });
export const getCachedClients = cached(fetchClients, ['corporate', 'clients'], { tags: [CACHE_TAGS.corporate, CACHE_TAGS.media] });
export const getCachedCertificates = cached(fetchCertificates, ['corporate', 'certificates'], { tags: [CACHE_TAGS.corporate, CACHE_TAGS.media] });
export const getCachedJobPostings = cached(fetchJobPostings, ['corporate', 'jobs'], { tags: [CACHE_TAGS.corporate] });
export const getCachedJobPostingBySlug = cached(fetchJobPostingBySlug, ['corporate', 'job'], { tags: [CACHE_TAGS.corporate] });
export const getCachedJobSlugs = cached(fetchJobSlugs, ['corporate', 'job-slugs'], { tags: [CACHE_TAGS.corporate] });
export const getCachedFaqs = cached(fetchFaqs, ['corporate', 'faqs'], { tags: [CACHE_TAGS.faqs] });
