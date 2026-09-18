import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ModuleBoundary } from '@/core/errors';
import { RouteAlternatesProvider } from '@/i18n/RouteAlternates';
import type { Locale } from '@/i18n/routing';
import { Footer, Header } from '@/modules/navigation';
import { WhatsAppButton } from '@/modules/whatsapp';

interface Props {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

// Çatı: her parça kendi <ModuleBoundary> içinde — footer verisi gelmezse yalnız footer kaybolur, sayfa değil.
export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const a11y = await getTranslations('A11y');

  return (
    <RouteAlternatesProvider>
      <a href="#main-content" className="skip-link">
        {a11y('skipToContent')}
      </a>
      <ModuleBoundary module="navigation/header">
        <Header locale={locale} />
      </ModuleBoundary>
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <ModuleBoundary module="navigation/footer">
        <Footer locale={locale} />
      </ModuleBoundary>
      <ModuleBoundary module="whatsapp">
        <WhatsAppButton locale={locale} />
      </ModuleBoundary>
    </RouteAlternatesProvider>
  );
}
