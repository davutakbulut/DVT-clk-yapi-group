import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { AccountShell, requireMember, ProfileSection } from '@/modules/account/server';

interface Props { readonly params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Account' });
  return { title: t('tabs.profile'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/account/profile', en: '/account/profile' }) };
}
/** Hesabım · profile (K-103). Kapı: requireMember; gerçek sınır RLS. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireMember(locale as Locale, '/account/profile');
  const t = await getTranslations('Account');
  return (
    <AccountShell active="profile" lead={t('profile.lead')}>
      <ModuleBoundary module="account/profile"><ProfileSection user={user} /></ModuleBoundary>
    </AccountShell>
  );
}
