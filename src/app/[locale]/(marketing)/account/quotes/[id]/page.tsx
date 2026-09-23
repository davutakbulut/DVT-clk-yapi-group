import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import type { Locale } from '@/i18n/routing';
import { AccountShell, QuoteDetail, requireMember } from '@/modules/account/server';

interface Props { readonly params: Promise<{ locale: string; id: string }> }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Account' });
  return { title: t('quotes.detail'), robots: { index: false } };
}
/** Hesabım · talep detayı (K-103): kalemler, yazışma, mesaj/revizyon/iptal. Başkasının talebi RLS'de görünmez → 404. */
export default async function Page({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  if (!UUID.test(id)) notFound();
  await requireMember(locale as Locale, '/account/quotes');
  const t = await getTranslations('Account');
  return (
    <AccountShell active="quotes" title={t('quotes.detail')}>
      <ModuleBoundary module="account/quote"><QuoteDetail id={id} /></ModuleBoundary>
    </AccountShell>
  );
}
