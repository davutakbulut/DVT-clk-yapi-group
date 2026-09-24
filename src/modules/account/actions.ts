'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentUser } from '@/core/auth';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { fieldErrorsFrom, type AuthFormState } from '@/modules/auth';
import { DELETE_CONFIRM_WORDS, MESSAGE_KINDS } from './domain/types';
import { rateLimit } from '@/core/rate-limit';

const MODULE = 'account';
const AUTH_MULT = Math.max(1, Number(process.env['AUTH_RATE_LIMIT'] ?? 1) || 1); // E2E aynı IP'den çok giriş yapar → LEAD_RATE_LIMIT gibi yükseltilir

const text = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

/** Talebe mesaj / revizyon / iptal isteği (RPC customer_lead_message: yalnız kendi talebi; satışa bildirim + şirkete e-posta). */
export async function sendLeadMessage(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z.object({ leadId: z.string().uuid(), kind: z.enum(MESSAGE_KINDS), body: z.string().trim().min(3, 'validation').max(4000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: 'sessionExpired' };
  if (!(await rateLimit(`clm:${me.id}`, 5 * AUTH_MULT, 3600)).allowed) return { ok: false, error: 'rateLimited' }; // K-104 (DB'de de aynı eşik)
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };
  const { error } = await client.data.rpc('customer_lead_message', { p_lead_id: parsed.data.leadId, p_kind: parsed.data.kind, p_body: parsed.data.body });
  if (error) { logger.warn('Müşteri mesajı gönderilemedi', { module: MODULE, code: error.code }); return { ok: false, error: 'unexpected' }; }
  return { ok: true, done: true };
}
/** Firma bilgileri (customers.profile_id = auth.uid(); RPC upsert_my_customer) */
export async function saveMyCustomer(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z.object({
    type: z.enum(['individual', 'corporate']),
    full_name: text(120), company_title: text(200), tax_office: text(80),
    tax_id: z.string().trim().regex(/^\d{10,11}$/, 'validation').optional().or(z.literal('')),
    address: text(400), city: text(60), district: text(60),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'validation').optional().or(z.literal('')),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };
  const { error } = await client.data.rpc('upsert_my_customer', { p: parsed.data });
  if (error) { logger.error('Firma bilgisi kaydedilemedi', { module: MODULE, code: error.code }); return { ok: false, error: 'unexpected' }; }
  return { ok: true, done: true };
}
/** Şifre değiştirme: mevcut şifreyle yeniden doğrulama + updateUser */
export async function changePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z.object({ current: z.string().min(1, 'validation'), password: z.string().min(8, 'passwordShort').max(128), passwordConfirm: z.string() })
    .refine((v) => v.password === v.passwordConfirm, { path: ['passwordConfirm'], message: 'passwordMismatch' }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'sessionExpired' };
  if (!(await rateLimit(`pw:${user.id}`, 5 * AUTH_MULT, 3600)).allowed) return { ok: false, error: 'rateLimited' }; // K-104
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };
  const check = await client.data.auth.signInWithPassword({ email: user.email, password: parsed.data.current });
  if (check.error) return { ok: false, error: 'invalidCredentials', fieldErrors: { current: 'invalidCredentials' } };
  const { error } = await client.data.auth.updateUser({ password: parsed.data.password });
  if (error) { logger.warn('Şifre güncellenemedi', { module: MODULE, status: error.status }); return { ok: false, error: 'unexpected' }; }
  return { ok: true, done: true };
}
/** E-posta değiştirme: yeni adrese onay bağlantısı gider (Supabase "secure email change" ayarına göre eski adrese de). */
export async function changeEmail(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email: z.string().trim().email('emailInvalid').max(254), current: z.string().min(1, 'validation') }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'sessionExpired' };
  if (!(await rateLimit(`email:${user.id}`, 3 * AUTH_MULT, 3600)).allowed) return { ok: false, error: 'rateLimited' }; // K-104: iki adrese onay maili
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };
  const check = await client.data.auth.signInWithPassword({ email: user.email, password: parsed.data.current });
  if (check.error) return { ok: false, error: 'invalidCredentials', fieldErrors: { current: 'invalidCredentials' } };
  const { error } = await client.data.auth.updateUser({ email: parsed.data.email });
  if (error) { logger.warn('E-posta değiştirilemedi', { module: MODULE, status: error.status }); return { ok: false, error: error.status === 429 ? 'rateLimited' : 'unexpected' }; }
  return { ok: true, done: true };
}
/** Hesap silme (RPC delete_my_account; personel silinemez): "SİL" onayı → oturum kapanır → ana sayfa. */
export async function deleteMyAccount(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const confirm = String(formData.get('confirm') ?? '').trim().toLocaleUpperCase('tr');
  if (!(DELETE_CONFIRM_WORDS as readonly string[]).includes(confirm)) return { ok: false, error: 'validation', fieldErrors: { confirm: 'validation' } };
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };
  const { error } = await client.data.rpc('delete_my_account');
  if (error) { logger.error('Hesap silinemedi', { module: MODULE, code: error.code }); return { ok: false, error: 'unexpected' }; }
  await client.data.auth.signOut({ scope: 'local' });
  const locale = (await getLocale()) as Locale;
  redirect(getPathname({ locale, href: '/' }));
}
/** Sepeti hesaba kaydet (profiles.saved_basket; RLS own update). En fazla 50 kalem. */
export async function saveBasketToAccount(items: unknown): Promise<{ readonly ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || !Array.isArray(items) || items.length > 50) return { ok: false };
  const client = await createServerClient();
  if (!client.ok) return { ok: false };
  const { error } = await client.data.from('profiles').update({ saved_basket: items as never }).eq('id', user.id);
  return { ok: !error };
}
/** Konfigürasyon adı (own configurations for all). */
export async function renameMyConfiguration(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z.object({ id: z.string().uuid(), name: z.string().trim().min(1, 'validation').max(120) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };
  const { error } = await client.data.from('configurations').update({ name: parsed.data.name }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'unexpected' };
  return { ok: true, done: true };
}
/** Arşivle / arşivden çıkar (status archived ↔ saved; satışa/talebe dönüşmüşlere dokunulmaz). */
export async function archiveMyConfiguration(formData: FormData): Promise<void> {
  const parsed = z.object({ id: z.string().uuid(), archived: z.enum(['0', '1']) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  await client.data.from('configurations').update({ status: parsed.data.archived === '1' ? 'archived' : 'saved' }).eq('id', parsed.data.id).in('status', ['saved', 'archived']);
}
/** Bildirimleri okundu işaretle (RPC mark_notifications_read: yalnız kendi / rolünün). */
export async function markMyNotificationsRead(formData: FormData): Promise<void> {
  const ids = formData.getAll('id').map(String).filter((v) => z.string().uuid().safeParse(v).success);
  if (ids.length === 0) return;
  const client = await createServerClient();
  if (!client.ok) return;
  await client.data.rpc('mark_notifications_read', { p_ids: ids });
}
