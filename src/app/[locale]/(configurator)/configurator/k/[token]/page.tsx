import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { rateLimit } from '@/core/rate-limit';
import { clientIp } from '@/core/request/clientIp';
import type { Locale } from '@/i18n/routing';
import { getConfigurationByToken, SharedConfigurationView } from '@/modules/configurator/server';

interface Props { readonly params: Promise<{ locale: string; token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Configurator' });
  return { title: t('shared.title'), robots: { index: false } };
}

/** Paylaşım sayfası (K-30: token = yetki belgesi): model + metraj, paylaşılan fiyat, yeni sürüm, teklif formu, yazdır. K-104: token tarama sınırı. */
export default async function SharedConfigurationPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale as Locale);
  if (!(await rateLimit(`share:${clientIp(await headers())}`, 60, 60)).allowed) notFound();
  const config = await getConfigurationByToken(token);
  if (!config) notFound();
  return (
    <ModuleBoundary module="configurator">
      <SharedConfigurationView config={config} token={token} locale={locale} />
    </ModuleBoundary>
  );
}
