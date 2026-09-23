'use server';

import { clientIp as requestIp } from '@/core/request/clientIp';
import { createHash } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox, dbErrorKey } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { rateLimit } from '@/core/rate-limit';
import { DONE, failed, type ActionState } from '@/lib/formState';
import type { Json } from '@/types/database';
import { leadFormSchema, parseBasketItems, parseOptions } from './domain/leadSchema';

const SALES = ['super_admin', 'admin', 'sales'] as const;
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));

function fail(what: string, error: { code?: string; message: string }): ActionState {
  logger.error(what, { module: 'leads', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

async function clientIp(): Promise<string> {
  return requestIp(await headers());
}

/** Ziyaretçi formu → submit_lead RPC (güvenilir bağlam). Bal küpü + IP başına 5/10 dk hız sınırı. */
export async function submitLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = leadFormSchema.safeParse({ ...Object.fromEntries(formData), consentKvkk: checkbox(formData, 'consentKvkk'), consentMarketing: checkbox(formData, 'consentMarketing'), website: String(formData.get('website') ?? '') });
  if (!parsed.success) {
    // Bal küpü doluysa bot: sessizce "başarılı" (spam'e ipucu verme)
    if (parsed.error.issues.some((i) => i.path[0] === 'website')) return { ...DONE, data: { ref: 'TLP-0000-0000' } };
    return failed('validation', issues(parsed.error));
  }
  const v = parsed.data;
  const ip = await clientIp();
  // Varsayılan 10 dakikada 5; E2E (aynı IP, çok proje) LEAD_RATE_LIMIT ile yükseltir
  const limit = await rateLimit(`lead:${ip || 'unknown'}`, Number(process.env['LEAD_RATE_LIMIT'] ?? 5) || 5, 600);
  if (!limit.allowed) return failed('rateLimited');
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const formExtras: Record<string, string> = {};
  for (const [k, val] of [['project_type', v.projectType], ['budget', v.budget], ['timeline', v.timeline]] as const) if (val) formExtras[k] = val;
  const utm: Record<string, string> = {};
  for (const [k, val] of [['source', v.utmSource], ['medium', v.utmMedium], ['campaign', v.utmCampaign]] as const) if (val) utm[k] = val;
  const { data, error } = await client.data.rpc('submit_lead', {
    p: {
      source: v.source,
      locale: v.locale,
      full_name: v.fullName,
      company: v.company || null,
      email: v.email || null,
      phone: v.phone || null,
      city: v.city || null,
      subject: v.subject || null,
      message: v.message || null,
      service_id: v.serviceId || null,
      form_data: formExtras,
      consent_kvkk: true,
      consent_marketing: v.consentMarketing,
      utm,
      page_url: v.pageUrl || null,
      items: parseBasketItems(v.items),
      configuration_token: v.configurationToken || null,
      ip_masked: ip ? createHash('sha256').update(ip.replace(/\.\d+$/, '.0')).digest('hex').slice(0, 16) : null,
    } as Json,
  });
  if (error) {
    logger.error('Talep kaydedilemedi', { module: 'leads', code: error.code, message: error.message });
    return failed(error.code === '22023' ? 'validation' : 'unexpected');
  }
  const ref = (data as { ref_no?: string } | null)?.ref_no ?? '';
  return { ...DONE, data: { ref } };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'in_review', 'quoted', 'won', 'lost']),
  assignedTo: z.string().uuid().optional().or(z.literal('')),
  quotedAmount: z.coerce.number().min(0).optional().or(z.literal('')),
  quotedCurrency: z.enum(['TRY', 'USD', 'EUR']).optional().or(z.literal('')),
  lostReason: z.string().trim().max(500).optional().or(z.literal('')),
});

export async function updateLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(SALES);
  if (!gate.ok) return failed('forbidden');
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data
    .from('leads')
    .update({ status: v.status, assigned_to: v.assignedTo || null, quoted_amount: v.quotedAmount === '' || v.quotedAmount === undefined ? null : v.quotedAmount, quoted_currency: v.quotedCurrency || null, lost_reason: v.status === 'lost' ? v.lostReason || null : null })
    .eq('id', v.id);
  if (error) return fail('Talep guncellenemedi', error);
  revalidatePath('/admin/leads/[id]', 'page');
  return DONE;
}

export async function addLeadNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(SALES);
  if (!gate.ok) return failed('forbidden');
  const parsed = z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(4000), pinned: z.boolean() }).safeParse({ ...Object.fromEntries(formData), pinned: checkbox(formData, 'pinned') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.from('lead_notes').insert({ lead_id: parsed.data.id, body: parsed.data.body, is_pinned: parsed.data.pinned, author_id: gate.data.id });
  if (error) return fail('Not eklenemedi', error);
  revalidatePath('/admin/leads/[id]', 'page');
  return DONE;
}

export async function replyLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(SALES);
  if (!gate.ok) return failed('forbidden');
  const parsed = z.object({ id: z.string().uuid(), subject: z.string().trim().min(2).max(200), body: z.string().trim().min(2).max(10000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.rpc('reply_lead', { p_lead_id: parsed.data.id, p_subject: parsed.data.subject, p_body: parsed.data.body });
  if (error) return fail('Cevap gonderilemedi', error);
  revalidatePath('/admin/leads/[id]', 'page');
  return DONE;
}

export async function saveQuoteFormOptions(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(['super_admin', 'admin']);
  if (!gate.ok) return failed('forbidden');
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const value = {
    project_types: parseOptions(String(formData.get('projectTypes') ?? '')),
    budgets: parseOptions(String(formData.get('budgets') ?? '')),
    timelines: parseOptions(String(formData.get('timelines') ?? '')),
  } as unknown as Json;
  const { error } = await client.data.from('site_settings').update({ value }).eq('key', 'quote_form.options');
  if (error) return fail('Form secenekleri kaydedilemedi', error);
  revalidateTag(CACHE_TAGS.siteSettings);
  return DONE;
}

const templateSchema = z.object({
  id: z.string().uuid(),
  subjectTr: z.string().trim().min(1).max(200),
  subjectEn: z.string().trim().max(200).optional().or(z.literal('')),
  bodyTr: z.string().trim().min(1).max(20000),
  bodyEn: z.string().trim().max(20000).optional().or(z.literal('')),
  isActive: z.boolean(),
});

export async function saveMailTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(['super_admin', 'admin']);
  if (!gate.ok) return failed('forbidden');
  const parsed = templateSchema.safeParse({ ...Object.fromEntries(formData), isActive: checkbox(formData, 'isActive') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const subject: Record<string, string> = { tr: v.subjectTr, ...(v.subjectEn ? { en: v.subjectEn } : {}) };
  const body: Record<string, string> = { tr: v.bodyTr, ...(v.bodyEn ? { en: v.bodyEn } : {}) };
  const { error } = await client.data.from('email_templates').update({ subject, body, is_active: v.isActive }).eq('id', v.id);
  if (error) return fail('Sablon kaydedilemedi', error);
  return DONE;
}

export async function sendTestMail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(['super_admin', 'admin']);
  if (!gate.ok) return failed('forbidden');
  const key = z.string().regex(/^[a-z][a-z0-9_.]*$/).safeParse(formData.get('key'));
  if (!key.success) return failed('validation');
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.rpc('enqueue_test_email', { p_template_key: key.data, p_locale: 'tr' });
  if (error) return fail('Test maili kuyruga alinamadi', error);
  return DONE;
}
