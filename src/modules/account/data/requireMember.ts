import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser, type CurrentUser } from '@/core/auth';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { AccountHref } from '../domain/types';

/** Kapı (K-14): oturum yoksa girişe, dönüş adresiyle. Gerçek sınır RLS. */
export async function requireMember(locale: Locale, next: AccountHref): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user) return user;
  redirect(`${getPathname({ locale, href: '/login' })}?next=${encodeURIComponent(getPathname({ locale, href: next }))}`);
}
