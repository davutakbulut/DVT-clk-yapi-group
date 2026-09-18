'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser, safeReturnUrl } from '@/core/auth';
import { getSiteUrl } from '@/core/config/site';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { fieldErrorsFrom, forgotSchema, loginSchema, mapAuthError, profileSchema, registerSchema, resetSchema, type AuthFormState } from './domain/schemas';

const MODULE = 'auth';

async function localePath(pathname: '/' | '/login' | '/account' | '/reset-password'): Promise<string> {
  const locale = (await getLocale()) as Locale;
  return getPathname({ locale, href: pathname });
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };

  const { error } = await client.data.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    logger.warn('Giriş başarısız', { module: MODULE, code: error.code, status: error.status });
    return { ok: false, error: mapAuthError(error.message, error.status) };
  }
  // Üye → hesabım; personel → panel. next= varsa ve güvenliyse o kazanır.
  const user = await getCurrentUser();
  const fallback = user?.isStaff ? '/admin' : await localePath('/account');
  redirect(safeReturnUrl(parsed.data.next, fallback));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };

  const next = await localePath('/account');
  const { error } = await client.data.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName }, emailRedirectTo: `${getSiteUrl().origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    logger.warn('Kayıt başarısız', { module: MODULE, code: error.code, status: error.status });
    return { ok: false, error: mapAuthError(error.message, error.status) };
  }
  // Var olan e-postada da aynı yanıt: hesap varlığı sızdırılmaz.
  return { ok: true, done: true };
}

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };

  const next = await localePath('/reset-password');
  const { error } = await client.data.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${getSiteUrl().origin}/auth/callback?next=${encodeURIComponent(next)}` });
  if (error && error.status === 429) return { ok: false, error: 'rateLimited' };
  if (error) logger.warn('Şifre sıfırlama isteği başarısız', { module: MODULE, code: error.code });
  // Adres kayıtlı olsun olmasın aynı mesaj.
  return { ok: true, done: true };
}

export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };

  const { error } = await client.data.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logger.warn('Şifre güncellenemedi', { module: MODULE, code: error.code, status: error.status });
    return { ok: false, error: mapAuthError(error.message, error.status) };
  }
  const userId = (await client.data.auth.getUser()).data.user?.id;
  if (userId) await client.data.from('profiles').update({ must_change_password: false }).eq('id', userId);
  return { ok: true, done: true };
}

export async function updateProfile(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'sessionExpired' };
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };

  // RLS: yalnız kendi satırı; rol/aktiflik tetikleyiciyle korunur (guard_profile_privileges).
  const { error } = await client.data
    .from('profiles')
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null, preferred_locale: parsed.data.preferredLocale })
    .eq('id', user.id);
  if (error) {
    logger.error('Profil güncellenemedi', { module: MODULE, code: error.code });
    return { ok: false, error: 'unexpected' };
  }
  return { ok: true, done: true };
}

export async function signOut(): Promise<void> {
  const client = await createServerClient();
  if (client.ok) await client.data.auth.signOut();
  redirect(await localePath('/'));
}
