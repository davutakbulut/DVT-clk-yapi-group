import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { AccountShell, requireMember, SecuritySection } from '@/modules/account/server';

interface Props { readonly params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Account' });
  return { title: t('tabs.security'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/account/security', en: '/account/security' }) };
}
/** Hesabım · security (K-103). Kapı: requireMember; gerçek sınır RLS. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireMember(locale as Locale, '/account/security');
  const t = await getTranslations('Account');
  return (
    <AccountShell active="security" lead={t('security.lead')}>
      <ModuleBoundary module="account/security"><SecuritySection user={user} /></ModuleBoundary>
    </AccountShell>
  );
}
