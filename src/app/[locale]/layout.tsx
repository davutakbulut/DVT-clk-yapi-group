import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { getSiteUrl } from '@/core/config/site';
import { routing } from '@/i18n/routing';
import { fontClassNames } from '@/ui/fonts';
import '@/styles/globals.css';

interface Props {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Meta' });

  return {
    metadataBase: getSiteUrl(),
    title: { default: t('siteName'), template: t('titleTemplate') },
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
