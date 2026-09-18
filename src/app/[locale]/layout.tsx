import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { getSiteUrl } from '@/core/config/site';
import { getPublicSettings } from '@/modules/site-settings';
import { pickLocale } from '@/lib/localized';
import { routing } from '@/i18n/routing';
import { fontClassNames } from '@/ui/fonts';
import '@/styles/globals.css';

interface Props {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

// K-46 emniyet kemeri: etiketli önbellek düşürülmese bile (ör. footer'daki yıl, elle DB düzenlemesi) sayfalar en geç
// bir saatte kendini yeniler. Etiket düşürme (revalidateTag) anında yenilemeyi sağlar; bu yalnız üst sınır.
export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: 'Meta' }), getPublicSettings()]);
  const siteName = pickLocale(settings.siteName, locale, { fallback: 'tr' }) || t('siteName');
  const description = pickLocale(settings.seoDescription, locale) || undefined;
  const v = settings.seoVerification;

  return {
    metadataBase: getSiteUrl(),
    title: { default: siteName, template: `%s · ${siteName}` },
    description,
    openGraph: { siteName, locale: locale === 'tr' ? 'tr_TR' : 'en_US', type: 'website' },
    twitter: { card: 'summary_large_image' },
    verification: { ...(v.google ? { google: v.google } : {}), ...(v.yandex ? { yandex: v.yandex } : {}), ...(v.bing ? { other: { 'msvalidate.01': v.bing } } : {}) },
  };
}

// Bilinçli olarak İNCE: error.tsx kendi segmentinin layout'unu yakalayamaz. Burada fırlayan hata
// köke (global-error) düşer; bu yüzden veri çekimi (marketing)/layout.tsx'e iner.
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} data-surface="site" className={fontClassNames}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
