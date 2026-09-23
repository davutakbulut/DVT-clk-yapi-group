import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { AccountShell, requireMember, QuotesList } from '@/modules/account/server';

interface Props { readonly params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Account' });
  return { title: t('tabs.quotes'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/account/quotes', en: '/account/quotes' }) };
}
/** Hesabım · quotes (K-103). Kapı: requireMember; gerçek sınır RLS. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireMember(locale as Locale, '/account/quotes');
  const t = await getTranslations('Account');
  return (
    <AccountShell active="quotes" lead={t('quotes.lead')}>
      <ModuleBoundary module="account/quotes"><QuotesList /></ModuleBoundary>
    </AccountShell>
  );
}
