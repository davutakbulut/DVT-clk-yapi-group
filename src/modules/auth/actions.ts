'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser, isAppRole, isStaffRole, safeReturnUrl } from '@/core/auth';
import { mailAllowed, passwordSignIn, replacePassword, sendRecovery, signUpWithPassword } from '@/core/auth/authFlow';
import { endSession, getSessionToken, setSessionCookie } from '@/core/auth/session';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { clientIp } from '@/core/request/clientIp';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { fieldErrorsFrom, forgotSchema, loginSchema, profileSchema, registerSchema, resetSchema, type AuthFormState } from './domain/schemas';

const MODULE = 'auth';

async function localePath(pathname: '/' | '/login' | '/account' | '/reset-password'): Promise<string> {
  const locale = (await getLocale()) as Locale;
  return getPathname({ locale, href: pathname });
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const h = await headers();
  // K-104 eşiği (e-posta 10, IP 30 başarısız / 15 dk) akışın içinde
  const res = await passwordSignIn(parsed.data.email, parsed.data.password, { ip: clientIp(h), userAgent: h.get('user-agent') });
  if (!res.ok) {
    logger.warn('Giriş başarısız', { module: MODULE, reason: res.error });
    return { ok: false, error: res.error };
  }
  await setSessionCookie(res.data.token);
  // Üye → hesabım; personel → panel. next= varsa ve güvenliyse o kazanır.
  // redirect() DEĞİL: action içindeki 303 yönlendirmesinde Set-Cookie tarayıcıya bazen işlenmeden RSC gezinmesi başlıyor
  // (E2E yakaladı). Çerez bu 200 yanıtla yazılır; istemci tam sayfa yönlendirmesi yapar, JS'siz durumda giriş sayfası
  // oturumu görüp kendisi yönlendirir.
  const role = res.data.role;
  const fallback = role && isAppRole(role) && isStaffRole(role) ? '/admin' : await localePath('/account');
  return { ok: true, done: true, redirectTo: safeReturnUrl(parsed.data.next, fallback) };
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  if (!(await mailAllowed('signup', parsed.data.email, clientIp(await headers())))) return { ok: false, error: 'rateLimited' }; // K-104: onay e-postası kotası
  const res = await signUpWithPassword({ ...parsed.data, locale: (await getLocale()) as Locale, next: await localePath('/account') });
  if (!res.ok) {
    logger.warn('Kayıt başarısız', { module: MODULE, message: res.error.message });
    return { ok: false, error: 'unexpected' };
  }
  // Var olan e-postada da aynı yanıt: hesap varlığı sızdırılmaz.
  return { ok: true, done: true };
}

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  // K-104: e-posta başına 3/saat, IP başına 10/saat; aşımda da aynı yanıt (adres varlığı sızmaz)
  if (!(await mailAllowed('recovery', parsed.data.email, clientIp(await headers())))) return { ok: true, done: true };
  const res = await sendRecovery({ email: parsed.data.email, locale: (await getLocale()) as Locale, next: await localePath('/reset-password') });
  if (!res.ok) logger.warn('Şifre sıfırlama isteği başarısız', { module: MODULE, message: res.error.message });
  // Adres kayıtlı olsun olmasın aynı mesaj.
  return { ok: true, done: true };
}

/** Sıfırlama/davet bağlantısıyla açılan oturumda yeni şifre; diğer cihazlardaki oturumlar kapanır. */
export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error) };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'sessionExpired' };
  const res = await replacePassword(user.id, parsed.data.password, await getSessionToken());
  if (!res.ok) {
    logger.warn('Şifre güncellenemedi', { module: MODULE, message: res.error.message });
    return { ok: false, error: 'unexpected' };
  }
  const client = await createServerClient();
  if (client.ok) await client.data.from('profiles').update({ must_change_password: false }).eq('id', user.id);
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

/** Yalnız bu cihazın oturumu kapanır (paralel E2E işçileri aynı hesapla çalışır; kullanıcı için de beklenen bu). */
export async function signOut(): Promise<void> {
  await endSession();
  redirect(await localePath('/'));
}
