'use server';

import { randomUUID } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox, dbErrorKey, localized, publishColumns, publishSchema, readPublishedAt, slugMap } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { rateLimit } from '@/core/rate-limit';
import { DONE, failed, type ActionState } from '@/lib/formState';
import type { Json } from '@/types/database';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const ADMINS = ['super_admin', 'admin'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const short = z.string().trim().max(300).optional().or(z.literal(''));
const long = z.string().max(40000).optional().or(z.literal(''));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(''));
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));

function fail(what: string, error: { code?: string; message: string }): ActionState {
  logger.error(what, { module: 'corporate', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

type Table = 'team_members' | 'clients' | 'certificates' | 'job_postings' | 'faqs';
const TAG: Record<Table, (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]> = { team_members: CACHE_TAGS.corporate, clients: CACHE_TAGS.corporate, certificates: CACHE_TAGS.corporate, job_postings: CACHE_TAGS.corporate, faqs: CACHE_TAGS.faqs };

async function remove(table: Table, formData: FormData, backTo: string): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from(table).delete().eq('id', id.data);
  if (error) logger.error('Silinemedi', { module: 'corporate', table, code: error.code, message: error.message });
  revalidateTag(TAG[table]);
  redirect(backTo);
}

async function move(table: Exclude<Table, 'job_postings'>, formData: FormData): Promise<void> {
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
  if (error) logger.error('Siralanamadi', { module: 'corporate', table, code: error.code, message: error.message });
  revalidateTag(TAG[table]);
}

// ── Ekip
const teamSchema = publishSchema.extend({
  fullName: z.string().trim().min(2).max(120),
  positionTr: short,
  positionEn: short,
  bioTr: long,
  bioEn: long,
  photoId: uuid,
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  linkedinUrl: z.string().trim().url().startsWith('https://').max(300).optional().or(z.literal('')),
  publishEn: z.boolean(),
  reviewedEn: z.boolean(),
});

export async function saveTeamMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = teamSchema.safeParse({ ...Object.fromEntries(formData), publishEn: checkbox(formData, 'publishEn'), reviewedEn: checkbox(formData, 'reviewedEn') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const existing = v.id ? await readPublishedAt(client.data, 'team_members', v.id) : null;
  // "Başlık" kolonu position (publishable 'position'): EN yayın için EN unvan gerekir
  const publish = publishColumns(v, { titleEn: v.positionEn ?? '', hasSlug: false, reviewerId: gate.data.id }, existing);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });
  const row = { full_name: v.fullName, position: localized(v.positionTr, v.positionEn), bio: localized(v.bioTr, v.bioEn), photo_id: v.photoId || null, email: v.email || null, linkedin_url: v.linkedinUrl || null, ...publish.columns };
  let id = v.id || '';
  if (id) {
    const { error } = await client.data.from('team_members').update(row).eq('id', id);
    if (error) return fail('Ekip uyesi kaydedilemedi', error);
  } else {
    const { data, error } = await client.data.from('team_members').insert(row).select('id').single();
    if (error) return fail('Ekip uyesi kaydedilemedi', error);
    id = data.id;
  }
  revalidateTag(CACHE_TAGS.corporate);
  revalidateTag(CACHE_TAGS.blog);
  if (!v.id) redirect(`/admin/team/${id}`);
  return DONE;
}
export async function deleteTeamMember(formData: FormData) {
  return remove('team_members', formData, '/admin/team');
}
export async function moveTeamMember(formData: FormData) {
  return move('team_members', formData);
}

// ── Referans logoları
const clientSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1).max(120),
  logoId: uuid,
  websiteUrl: z.string().trim().url().max(300).optional().or(z.literal('')),
  sectorTr: short,
  sectorEn: short,
  isFeatured: z.boolean(),
  isActive: z.boolean(),
});

export async function saveClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = clientSchema.safeParse({ ...Object.fromEntries(formData), isFeatured: checkbox(formData, 'isFeatured'), isActive: checkbox(formData, 'isActive') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = { name: v.name, logo_id: v.logoId || null, website_url: v.websiteUrl || null, sector: localized(v.sectorTr, v.sectorEn), is_featured: v.isFeatured, is_active: v.isActive };
  const { error } = v.id ? await client.data.from('clients').update(row).eq('id', v.id) : await client.data.from('clients').insert(row);
  if (error) return fail('Referans kaydedilemedi', error);
  revalidateTag(CACHE_TAGS.corporate);
  return DONE;
}
export async function deleteClient(formData: FormData) {
  return remove('clients', formData, '/admin/references');
}
export async function moveClient(formData: FormData) {
  return move('clients', formData);
}

// ── Belgeler
const certificateSchema = publishSchema.extend({
  titleTr: z.string().trim().min(1).max(200),
  titleEn: short,
  issuer: short,
  certificateNo: short,
  descriptionTr: long,
  descriptionEn: long,
  imageId: uuid,
  documentId: uuid,
  issuedOn: date,
  validUntil: date,
  publishEn: z.boolean(),
  reviewedEn: z.boolean(),
});

export async function saveCertificate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = certificateSchema.safeParse({ ...Object.fromEntries(formData), publishEn: checkbox(formData, 'publishEn'), reviewedEn: checkbox(formData, 'reviewedEn') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  if (v.issuedOn && v.validUntil && v.validUntil < v.issuedOn) return failed('validation', { validUntil: 'validation' });
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const existing = v.id ? await readPublishedAt(client.data, 'certificates', v.id) : null;
  const publish = publishColumns(v, { titleEn: v.titleEn ?? '', hasSlug: false, reviewerId: gate.data.id }, existing);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });
  const row = { title: localized(v.titleTr, v.titleEn), issuer: v.issuer || null, certificate_no: v.certificateNo || null, description: localized(v.descriptionTr, v.descriptionEn), image_id: v.imageId || null, document_id: v.documentId || null, issued_on: v.issuedOn || null, valid_until: v.validUntil || null, ...publish.columns };
  let id = v.id || '';
  if (id) {
    const { error } = await client.data.from('certificates').update(row).eq('id', id);
    if (error) return fail('Belge kaydedilemedi', error);
  } else {
    const { data, error } = await client.data.from('certificates').insert(row).select('id').single();
    if (error) return fail('Belge kaydedilemedi', error);
    id = data.id;
  }
  revalidateTag(CACHE_TAGS.corporate);
  if (!v.id) redirect(`/admin/certificates/${id}`);
  return DONE;
}
export async function deleteCertificate(formData: FormData) {
  return remove('certificates', formData, '/admin/certificates');
}
export async function moveCertificate(formData: FormData) {
  return move('certificates', formData);
}

// ── Kariyer ilanları
const jobSchema = publishSchema.extend({
  titleTr: z.string().trim().min(1).max(200),
  titleEn: short,
  departmentTr: short,
  departmentEn: short,
  locationTr: short,
  locationEn: short,
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship']),
  descriptionTr: long,
  descriptionEn: long,
  requirementsTr: long,
  requirementsEn: long,
  applicationDeadline: date,
  isOpen: z.boolean(),
  seoTitleTr: short,
  seoTitleEn: short,
  seoDescriptionTr: short,
  seoDescriptionEn: short,
  publishEn: z.boolean(),
  reviewedEn: z.boolean(),
});

export async function saveJobPosting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = jobSchema.safeParse({ ...Object.fromEntries(formData), isOpen: checkbox(formData, 'isOpen'), publishEn: checkbox(formData, 'publishEn'), reviewedEn: checkbox(formData, 'reviewedEn') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const slug = slugMap({ slugTr: v.slugTr, slugEn: v.slugEn, titleTr: v.titleTr });
  const existing = v.id ? await readPublishedAt(client.data, 'job_postings', v.id) : null;
  const publish = publishColumns(v, { titleEn: v.titleEn ?? '', slugEn: slug['en'] ?? null, hasSlug: true, reviewerId: gate.data.id }, existing);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });
  const row = {
    slug,
    title: localized(v.titleTr, v.titleEn),
    department: localized(v.departmentTr, v.departmentEn),
    location: localized(v.locationTr, v.locationEn),
    employment_type: v.employmentType,
    description: localized(v.descriptionTr, v.descriptionEn),
    requirements: localized(v.requirementsTr, v.requirementsEn),
    application_deadline: v.applicationDeadline || null,
    is_open: v.isOpen,
    seo_title: localized(v.seoTitleTr, v.seoTitleEn),
    seo_description: localized(v.seoDescriptionTr, v.seoDescriptionEn),
    ...publish.columns,
  };
  let id = v.id || '';
  if (id) {
    const { error } = await client.data.from('job_postings').update(row).eq('id', id);
    if (error) return fail('Ilan kaydedilemedi', error);
  } else {
    const { data, error } = await client.data.from('job_postings').insert(row).select('id').single();
    if (error) return fail('Ilan kaydedilemedi', error);
    id = data.id;
  }
  revalidateTag(CACHE_TAGS.corporate);
  if (!v.id) redirect(`/admin/careers/${id}`);
  return DONE;
}
export async function deleteJobPosting(formData: FormData) {
  return remove('job_postings', formData, '/admin/careers');
}

export async function updateApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(['new', 'reviewing', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']), internalNotes: z.string().trim().max(4000).optional().or(z.literal('')) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.from('job_applications').update({ status: parsed.data.status, internal_notes: parsed.data.internalNotes || null, reviewed_by: gate.data.id }).eq('id', parsed.data.id);
  if (error) return fail('Basvuru guncellenemedi', error);
  return DONE;
}

// ── SSS
const faqSchema = publishSchema.extend({
  questionTr: z.string().trim().min(3).max(300),
  questionEn: short,
  answerTr: long,
  answerEn: long,
  entity: z.string().regex(/^(service|product|project|solution):[0-9a-f-]{36}$/).optional().or(z.literal('')),
  publishEn: z.boolean(),
  reviewedEn: z.boolean(),
});

export async function saveFaq(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = faqSchema.safeParse({ ...Object.fromEntries(formData), publishEn: checkbox(formData, 'publishEn'), reviewedEn: checkbox(formData, 'reviewedEn') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const existing = v.id ? await readPublishedAt(client.data, 'faqs', v.id) : null;
  const publish = publishColumns(v, { titleEn: v.questionEn ?? '', hasSlug: false, reviewerId: gate.data.id }, existing);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });
  const [entityType, entityId] = v.entity ? v.entity.split(':') : [null, null];
  const row = { question: localized(v.questionTr, v.questionEn), answer: localized(v.answerTr, v.answerEn), entity_type: entityType, entity_id: entityId, ...publish.columns };
  const { error } = v.id ? await client.data.from('faqs').update(row).eq('id', v.id) : await client.data.from('faqs').insert(row);
  if (error) return fail('SSS kaydedilemedi', error);
  revalidateTag(CACHE_TAGS.faqs);
  revalidateTag(CACHE_TAGS.services);
  return DONE;
}
export async function deleteFaq(formData: FormData) {
  return remove('faqs', formData, '/admin/faq');
}
export async function moveFaq(formData: FormData) {
  return move('faqs', formData);
}

// ── Ziyaretçi: iş başvurusu (CV → private-documents/cv/<uuid>.<ext>, RLS dar INSERT politikası; kayıt security definer RPC)
const applicationSchema = z.object({
  jobPostingId: z.string().uuid(),
  locale: z.enum(['tr', 'en']),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(24).optional().or(z.literal('')),
  coverLetter: z.string().trim().max(6000).optional().or(z.literal('')),
  consentKvkk: z.literal(true),
  website: z.literal(''),
});
const CV_MAX = 5 * 1024 * 1024;

function cvExtension(bytes: Buffer, declared: string): 'pdf' | 'doc' | 'docx' | null {
  if (bytes.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && /wordprocessingml|\.docx$/i.test(declared)) return 'docx';
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && /msword|\.doc$/i.test(declared)) return 'doc';
  return null;
}

export async function submitApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = applicationSchema.safeParse({ ...Object.fromEntries(formData), consentKvkk: checkbox(formData, 'consentKvkk'), website: String(formData.get('website') ?? '') });
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === 'website')) return DONE;
    return failed('validation', issues(parsed.error));
  }
  const v = parsed.data;
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() ?? '';
  const limit = await rateLimit(`application:${ip || 'unknown'}`, 3, 3600);
  if (!limit.allowed) return failed('rateLimited');
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  let cvPath: string | null = null;
  const file = formData.get('cv');
  if (file instanceof File && file.size > 0) {
    if (file.size > CV_MAX) return failed('fileSize', { cv: 'validation' });
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = cvExtension(bytes, `${file.type} ${file.name}`);
    if (!ext) return failed('fileType', { cv: 'validation' });
    cvPath = `cv/${randomUUID()}.${ext}`;
    const contentType = ext === 'pdf' ? 'application/pdf' : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/msword';
    const { error } = await client.data.storage.from('private-documents').upload(cvPath, bytes, { contentType, upsert: false });
    if (error) {
      logger.error('CV yuklenemedi', { module: 'corporate', message: error.message });
      return failed('unexpected');
    }
  }
  const { error } = await client.data.rpc('submit_job_application', {
    p: { job_posting_id: v.jobPostingId, locale: v.locale, full_name: v.fullName, email: v.email, phone: v.phone || null, cover_letter: v.coverLetter || null, cv_path: cvPath, consent_kvkk: true } as Json,
  });
  if (error) {
    logger.error('Basvuru kaydedilemedi', { module: 'corporate', code: error.code, message: error.message });
    return failed(error.code === '22023' ? 'validation' : 'unexpected');
  }
  return DONE;
}
