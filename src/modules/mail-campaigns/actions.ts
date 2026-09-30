'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { getSiteUrl } from '@/core/config/site';
import { checkbox, dbErrorKey } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { bulkMailSettingsSchema, campaignVariables, unsubscribeUrls } from '@/core/mail/bulkSettings';
import { sendWithFallback } from '@/core/mail/provider';
import { renderCampaignMail } from '@/core/mail/render';
import { logger } from '@/core/observability/logger';
import { rateLimit } from '@/core/rate-limit';
import { DONE, failed, type ActionState } from '@/lib/formState';
import { getSendingOverview, previewAudience, type AudiencePreview } from './data/adminCampaignsRepository';
import { CAMPAIGN_SEGMENTS, campaignSchema, parseManualList, SUPPRESSION_REASONS, type CampaignAudience, type CampaignSegment } from './domain/types';

// Toplu gönderim geri alınamaz ve firmanın gönderici itibarını etkiler → yalnız yönetici (K-108). RPC'ler de aynı rolü denetler.
const ADMINS = ['super_admin', 'admin'] as const;
const ADMIN_PATH = '/admin/campaigns';
const MODULE = 'mail-campaigns';

function readAudience(formData: FormData, city: string, manualList: string): { readonly audience: CampaignAudience; readonly invalid: readonly string[]; readonly duplicates: number } {
  const chosen = formData.getAll('segments').map(String);
  const segments = CAMPAIGN_SEGMENTS.filter((s): s is CampaignSegment => chosen.includes(s));
  const manual = parseManualList(manualList);
  return { audience: { segments, ...(city ? { city } : {}), manual: manual.recipients, manual_attested: checkbox(formData, 'manualAttested') }, invalid: manual.invalid, duplicates: manual.duplicates };
}

function parseCampaign(formData: FormData) {
  return campaignSchema.safeParse({
    id: formData.get('id') ?? '', name: formData.get('name') ?? '', locale: formData.get('locale') ?? 'tr', subject: formData.get('subject') ?? '', preheader: formData.get('preheader') ?? '',
    body: formData.get('body') ?? '', ctaLabel: formData.get('ctaLabel') ?? '', ctaUrl: formData.get('ctaUrl') ?? '', city: formData.get('city') ?? '', manualList: formData.get('manualList') ?? '',
  });
}

/** Taslağı kaydeder (yeni → kampanya sayfasına yönlenir). Taslak dışı kampanya RPC'de reddedilir. */
export async function saveCampaign(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const parsed = parseCampaign(formData);
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const { audience } = readAudience(formData, v.city, v.manualList);
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { data, error } = await client.data.rpc('save_mail_campaign', {
    p: { id: v.id || '', name: v.name, locale: v.locale, subject: v.subject, preheader: v.preheader, body: v.body, cta_label: v.ctaLabel, cta_url: v.ctaUrl, audience } as never,
  });
  if (error || !data) {
    logger.error('Kampanya kaydedilemedi', { module: MODULE, code: error?.code, message: error?.message });
    return failed(dbErrorKey(error?.code));
  }
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/${data}`);
  if (!v.id) redirect(`${ADMIN_PATH}/${data}`);
  return DONE;
}

export interface AudienceState {
  readonly ok: boolean;
  readonly error?: 'forbidden' | 'validation' | 'unexpected';
  readonly preview?: AudiencePreview;
  readonly invalid?: readonly string[];
  readonly duplicates?: number;
}

/** "Alıcıları hesapla": formdaki (kaydedilmemiş olabilir) kitleyi çözer; hiçbir şey yazmaz. */
export async function computeAudience(_prev: AudienceState, formData: FormData): Promise<AudienceState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return { ok: false, error: 'forbidden' };
  const city = String(formData.get('city') ?? '').trim().slice(0, 80);
  const manualList = String(formData.get('manualList') ?? '').slice(0, 200_000);
  const { audience, invalid, duplicates } = readAudience(formData, city, manualList);
  const result = await previewAudience(audience);
  if (!result.ok) {
    logger.error('Kitle hesaplanamadi', { module: MODULE, message: result.error.message });
    return { ok: false, error: 'unexpected' };
  }
  return { ok: true, preview: result.data, invalid, duplicates };
}

export interface TestSendState {
  readonly ok: boolean;
  readonly error?: 'forbidden' | 'validation' | 'unexpected' | 'rateLimited' | 'notConfigured' | 'sendFailed';
  readonly to?: string;
  readonly detail?: string;
}

const testSchema = z.object({ testEmail: z.string().trim().email().max(254), subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(20000) });

/** Test iletisi: formdaki içerik, örnek alıcı değerleriyle HEMEN gönderilir (kuyruğa girmez). Kişi başı 10 dakikada 10 test. */
export async function sendTestCampaign(_prev: TestSendState, formData: FormData): Promise<TestSendState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return { ok: false, error: 'forbidden' };
  const parsed = testSchema.safeParse({ testEmail: formData.get('testEmail') || gate.data.email, subject: formData.get('subject') ?? '', body: formData.get('body') ?? '' });
  const content = parseCampaign(formData);
  if (!parsed.success || !content.success) return { ok: false, error: 'validation' };
  const limit = await rateLimit(`campaign-test:${gate.data.id}`, 10, 600);
  if (!limit.allowed) return { ok: false, error: 'rateLimited' };
  const overview = await getSendingOverview();
  if (!overview.ok) return { ok: false, error: 'unexpected' };
  if (!overview.data.providerConfigured) return { ok: false, error: 'notConfigured' };
  const v = content.data;
  const settings = overview.data.settings;
  const siteUrl = getSiteUrl().origin;
  const links = unsubscribeUrls(siteUrl, v.locale, '00000000-0000-4000-8000-000000000000'); // örnek anahtar: kimseyi listeden çıkarmaz
  const rendered = renderCampaignMail({
    subject: v.subject, preheader: v.preheader, body: v.body, ctaLabel: v.ctaLabel, ctaUrl: v.ctaUrl,
    variables: campaignVariables({ email: parsed.data.testEmail, full_name: gate.data.fullName || null, company: null }, settings, v.locale),
    siteName: overview.data.siteName[v.locale], siteUrl, footer: settings.footer[v.locale] || settings.footer.tr,
    unsubscribeLabel: settings.unsubscribe_label[v.locale] || settings.unsubscribe_label.tr || links.page, unsubscribeUrl: links.page,
  });
  const outcome = await sendWithFallback({ ...rendered, to: parsed.data.testEmail, ...(settings.reply_to ? { replyTo: settings.reply_to } : {}) });
  if (!outcome.ok) {
    logger.warn('Test iletisi gonderilemedi', { module: MODULE, error: outcome.error });
    return { ok: false, error: 'sendFailed', detail: (outcome.error ?? '').slice(0, 200) };
  }
  return { ok: true, to: parsed.data.testEmail };
}

export interface StartState {
  readonly ok: boolean;
  readonly error?: 'forbidden' | 'validation' | 'unexpected' | 'noRecipients' | 'noContent' | 'confirm';
  readonly count?: number;
}

/** Başlat / zamanla: "onaylıyorum" kutusu zorunlu. Tarih boşsa hemen; doluysa İstanbul saatiyle o anda. */
export async function startCampaign(_prev: StartState, formData: FormData): Promise<StartState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return { ok: false, error: 'forbidden' };
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, error: 'validation' };
  if (!checkbox(formData, 'confirm')) return { ok: false, error: 'confirm' };
  const when = String(formData.get('scheduledAt') ?? '').trim();
  let at: string | null = null;
  if (when) {
    // datetime-local saat dilimsizdir; panel İstanbul saatiyle çalışır (UTC+3, yaz saati yok)
    const parsed = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when) ? new Date(`${when}:00+03:00`) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now() - 60_000) return { ok: false, error: 'validation' };
    at = parsed.toISOString();
  }
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'unexpected' };
  const { data, error } = await client.data.rpc('start_mail_campaign', at ? { p_id: id.data, p_at: at } : { p_id: id.data });
  if (error) {
    if (/alıcı yok/.test(error.message)) return { ok: false, error: 'noRecipients' };
    if (/konu ve metin/.test(error.message)) return { ok: false, error: 'noContent' };
    logger.error('Kampanya baslatilamadi', { module: MODULE, code: error.code, message: error.message });
    return { ok: false, error: error.code === '42501' ? 'forbidden' : 'unexpected' };
  }
  logger.info('Kampanya baslatildi', { module: MODULE, campaign: id.data, recipients: data, by: gate.data.id, scheduled: at });
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/${id.data}`);
  return { ok: true, count: Number(data ?? 0) };
}

const stateSchema = z.object({ id: z.string().uuid(), action: z.enum(['pause', 'resume', 'cancel', 'retry']) });

/** Duraklat · sürdür · iptal · başarısızları yeniden dene (JS'siz form). */
export async function changeCampaignState(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const parsed = stateSchema.safeParse({ id: formData.get('id'), action: formData.get('action') });
  if (!parsed.success) return;
  if (parsed.data.action === 'cancel' && !checkbox(formData, 'confirm')) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.rpc('set_mail_campaign_state', { p_id: parsed.data.id, p_action: parsed.data.action });
  if (error) logger.error('Kampanya durumu degistirilemedi', { module: MODULE, code: error.code, message: error.message });
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/${parsed.data.id}`);
}

export async function duplicateCampaign(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const parsed = z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(120) }).safeParse({ id: formData.get('id'), name: formData.get('name') });
  if (!parsed.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { data, error } = await client.data.rpc('duplicate_mail_campaign', { p_id: parsed.data.id, p_name: parsed.data.name });
  if (error || !data) {
    logger.error('Kampanya kopyalanamadi', { module: MODULE, code: error?.code, message: error?.message });
    return;
  }
  revalidatePath(ADMIN_PATH);
  redirect(`${ADMIN_PATH}/${data}`);
}

export async function deleteCampaign(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.rpc('delete_mail_campaign', { p_id: id.data });
  if (error) {
    logger.error('Kampanya silinemedi', { module: MODULE, code: error.code, message: error.message });
    return;
  }
  revalidatePath(ADMIN_PATH);
  redirect(ADMIN_PATH);
}

const suppressionSchema = z.object({ email: z.string().trim().email().max(254), reason: z.enum(SUPPRESSION_REASONS).exclude(['unsubscribed']), note: z.string().trim().max(300) });

export async function addSuppression(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const parsed = suppressionSchema.safeParse({ email: formData.get('email') ?? '', reason: formData.get('reason') ?? 'manual', note: formData.get('note') ?? '' });
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.rpc('add_mail_suppression', { p_email: parsed.data.email, p_reason: parsed.data.reason, p_note: parsed.data.note });
  if (error) {
    logger.error('Engel kaydi eklenemedi', { module: MODULE, code: error.code, message: error.message });
    return failed(dbErrorKey(error.code));
  }
  revalidatePath(`${ADMIN_PATH}/suppressions`);
  revalidatePath(ADMIN_PATH);
  return DONE;
}

export async function removeSuppression(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.rpc('remove_mail_suppression', { p_id: id.data });
  if (error) logger.error('Engel kaydi kaldirilamadi', { module: MODULE, code: error.code, message: error.message });
  revalidatePath(`${ADMIN_PATH}/suppressions`);
  revalidatePath(ADMIN_PATH);
}

const settingsForm = z.object({
  hourlyLimit: z.coerce.number().int().min(1).max(5000),
  batchSize: z.coerce.number().int().min(1).max(50),
  replyTo: z.string().trim().email().max(254).or(z.literal('')),
  nameFallbackTr: z.string().trim().max(60), nameFallbackEn: z.string().trim().max(60),
  footerTr: z.string().trim().max(1000), footerEn: z.string().trim().max(1000),
  unsubscribeLabelTr: z.string().trim().min(2).max(60), unsubscribeLabelEn: z.string().trim().max(60),
});

/** Gönderim ayarları: site_settings 'mail.bulk' (herkese açık DEĞİL). */
export async function saveBulkSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const parsed = settingsForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const value = bulkMailSettingsSchema.parse({
    hourly_limit: v.hourlyLimit, batch_size: v.batchSize, reply_to: v.replyTo,
    name_fallback: { tr: v.nameFallbackTr, en: v.nameFallbackEn }, footer: { tr: v.footerTr, en: v.footerEn }, unsubscribe_label: { tr: v.unsubscribeLabelTr, en: v.unsubscribeLabelEn },
  });
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.from('site_settings').upsert({ key: 'mail.bulk', value: value as never, is_public: false, updated_by: gate.data.id }, { onConflict: 'key' });
  if (error) {
    logger.error('Gonderim ayarlari kaydedilemedi', { module: MODULE, code: error.code, message: error.message });
    return failed(dbErrorKey(error.code));
  }
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/settings`);
  return DONE;
}
