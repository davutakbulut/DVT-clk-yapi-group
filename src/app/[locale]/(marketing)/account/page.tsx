import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { AccountOverview, AccountShell, requireMember } from '@/modules/account/server';

interface Props { readonly params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Auth' });
  return { title: t('accountTitle'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/account', en: '/account' }) };
}
/** Hesabım özeti (K-103). Kapı (K-14): middleware yalnız yönlendirir; asıl kontrol requireMember, gerçek sınır RLS. */
export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireMember(locale as Locale, '/account');
  const t = await getTranslations('Account');
  return (
    <AccountShell active="overview" title={t('overview.welcome', { name: user.fullName || user.email })} lead={t('overview.lead')}>
      <ModuleBoundary module="account/overview"><AccountOverview user={user} /></ModuleBoundary>
    </AccountShell>
  );
}
