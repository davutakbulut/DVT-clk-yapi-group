'use server';

import { clientIp } from '@/core/request/clientIp';
import { headers } from 'next/headers';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox, dbErrorKey, localized } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { syncGoogleReviews } from '@/core/jobs/reviewSync';
import { logger } from '@/core/observability/logger';
import { rateLimit } from '@/core/rate-limit';
import { DONE, failed, type ActionState } from '@/lib/formState';
import type { Json } from '@/types/database';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const ADMINS = ['super_admin', 'admin'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const short = z.string().trim().max(200).optional().or(z.literal(''));
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));
const ADMIN_PATH = '/admin/testimonials';

function bump() {
  revalidateTag(CACHE_TAGS.testimonials);
  revalidatePath(ADMIN_PATH);
}

// ── Ziyaretçi yorumu (site): bal küpü + hız sınırı + security definer RPC → pending (K-08, K-56)
const visitorSchema = z.object({
  locale: z.enum(['tr', 'en']),
  authorName: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(2000),
  serviceId: uuid,
  projectId: uuid,
  productId: uuid,
  consentKvkk: z.literal(true),
  website: z.literal(''),
});

async function maskedIp(): Promise<string> {
  const raw = clientIp(await headers());
  if (!raw) return '';
  return raw.includes(':') ? raw.split(':').slice(0, 4).join(':') + '::' : raw.split('.').slice(0, 3).join('.') + '.0';
}

export async function submitTestimonial(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = visitorSchema.safeParse({ ...Object.fromEntries(formData), consentKvkk: checkbox(formData, 'consentKvkk'), website: String(formData.get('website') ?? '') });
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === 'website')) return DONE; // bot: sessizce "başarılı"
    return failed('validation', issues(parsed.error));
  }
  const v = parsed.data;
  const ip = await maskedIp();
  const limit = await rateLimit(`testimonial:${ip || 'unknown'}`, Number(process.env['LEAD_RATE_LIMIT'] ?? 3) || 3, 3600);
  if (!limit.allowed) return failed('rateLimited');
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.rpc('submit_testimonial', {
    p: { author_name: v.authorName, company: v.company || null, rating: v.rating, body: v.body, locale: v.locale, service_id: v.serviceId || null, project_id: v.projectId || null, product_id: v.productId || null, consent_kvkk: true, ip_masked: ip || null } as Json,
  });
  if (error) {
    logger.warn('Ziyaretci yorumu reddedildi', { module: 'testimonials', code: error.code, message: error.message });
    return failed(error.code === '22023' ? 'validation' : 'unexpected');
  }
  revalidatePath(ADMIN_PATH);
  return DONE;
}

// ── Panel: elle yorum (manual) oluştur/düzenle. Google kaynaklı satırda yalnız durum/öne çıkan/bağlantı değişir (salt-okunur metin).
const adminSchema = z.object({
  id: uuid,
  authorName: z.string().trim().min(2).max(120),
  authorTitleTr: short,
  authorTitleEn: short,
  company: short,
  rating: z.coerce.number().int().min(1).max(5),
  bodyTr: z.string().trim().max(4000).optional().or(z.literal('')),
  bodyEn: z.string().trim().max(4000).optional().or(z.literal('')),
  reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  serviceId: uuid,
  projectId: uuid,
  productId: uuid,
  isFeatured: z.boolean(),
  isVerified: z.boolean(),
  status: z.enum(['pending', 'published', 'rejected', 'archived']),
});

export async function saveTestimonial(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = adminSchema.safeParse({ ...Object.fromEntries(formData), isFeatured: checkbox(formData, 'isFeatured'), isVerified: checkbox(formData, 'isVerified') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const links = { service_id: v.serviceId || null, project_id: v.projectId || null, product_id: v.productId || null, is_featured: v.isFeatured, status: v.status };
  if (v.id) {
    const { data: current } = await client.data.from('testimonials').select('source').eq('id', v.id).maybeSingle();
    if (!current) return failed('validation', { id: 'validation' });
    const editable = current.source === 'google' ? links : { ...links, author_name: v.authorName, author_title: localized(v.authorTitleTr, v.authorTitleEn), company: v.company || null, rating: v.rating, body: localized(v.bodyTr, v.bodyEn), reviewed_on: v.reviewedOn || null, is_verified: v.isVerified };
    const { error } = await client.data.from('testimonials').update(editable).eq('id', v.id);
    if (error) return fail(error);
  } else {
    if (!v.bodyTr && !v.bodyEn) return failed('validation', { bodyTr: 'validation' });
    const { error } = await client.data.from('testimonials').insert({ source: 'manual', author_name: v.authorName, author_title: localized(v.authorTitleTr, v.authorTitleEn), company: v.company || null, rating: v.rating, body: localized(v.bodyTr, v.bodyEn), original_locale: v.bodyTr ? 'tr' : 'en', reviewed_on: v.reviewedOn || null, is_verified: v.isVerified, ...links });
    if (error) return fail(error);
  }
  bump();
  return DONE;
}

function fail(error: { code?: string; message: string }): ActionState {
  logger.error('Yorum kaydedilemedi', { module: 'testimonials', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

/** Liste satırı: Onayla / Reddet / Arşivle (JS'siz form). */
export async function setTestimonialStatus(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  const status = z.enum(['pending', 'published', 'rejected', 'archived']).safeParse(formData.get('status'));
  if (!id.success || !status.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('testimonials').update({ status: status.data }).eq('id', id.data);
  if (error) logger.error('Yorum durumu degistirilemedi', { module: 'testimonials', code: error.code, message: error.message });
  bump();
}

export async function deleteTestimonial(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('testimonials').delete().eq('id', id.data);
  if (error) logger.error('Yorum silinemedi', { module: 'testimonials', code: error.code, message: error.message });
  bump();
}

export async function moveTestimonial(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { data } = await client.data.from('testimonials').select('id').order('sort_order', { ascending: true, nullsFirst: false }).order('created_at');
  const ids = (data ?? []).map((r) => r.id);
  const index = ids.indexOf(id.data);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  const { error } = await client.data.rpc('reorder_content', { p_table: 'testimonials', p_ids: ids });
  if (error) logger.error('Yorum siralanamadi', { module: 'testimonials', code: error.code, message: error.message });
  bump();
}

// ── Google Places senkronu (yalnız admin): Place ID ayarı + "şimdi senkronla"
export async function saveGooglePlaceId(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const parsed = z.object({ placeId: z.string().trim().max(200).regex(/^[A-Za-z0-9_-]*$/) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', { placeId: 'validation' });
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.from('site_settings').update({ value: parsed.data.placeId as Json, updated_by: gate.data.id }).eq('key', 'reviews.google_place_id');
  if (error) return failed(dbErrorKey(error.code));
  revalidatePath(ADMIN_PATH);
  return DONE;
}

export async function syncGoogleReviewsNow(): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const result = await syncGoogleReviews(client.data);
  bump();
  if (!result.ok) return failed(result.error.code === 'not_configured' ? 'notConfigured' : 'unexpected');
  return { ...DONE, data: { fetched: String(result.data.fetched), inserted: String(result.data.inserted), updated: String(result.data.updated) } };
}
