import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ModuleBoundary } from '@/core/errors';
import { JsonLd, organizationJsonLd } from '@/core/seo';
import { RouteAlternatesProvider } from '@/i18n/RouteAlternates';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { CookieBanner } from '@/modules/consent';
import { Footer, Header } from '@/modules/navigation';
import { ThirdPartyScripts, Tracker } from '@/modules/analytics';
import { BasketProvider } from '@/modules/quote-basket';
import { getPublicSettings } from '@/modules/site-settings';
import { getErrorPage, getLegalPage } from '@/modules/static-pages';
import { WhatsAppButton } from '@/modules/whatsapp';
import { SiteLoader } from '@/ui/SiteLoader';
import { SITE_LOADER_BOOT } from '@/ui/siteLoaderShared';
import { Container } from '@/ui/Container';

interface Props {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

// Çatı: her parça kendi <ModuleBoundary> içinde — footer verisi gelmezse yalnız footer kaybolur, sayfa değil.
export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [a11y, settings, cookiePolicy] = await Promise.all([getTranslations('A11y'), getPublicSettings(), getLegalPage('cookie-policy', locale)]);
  const siteName = pickLocale(settings.siteName, locale, { fallback: 'tr' });
  const organization = organizationJsonLd({
    name: siteName,
    description: pickLocale(settings.seoDescription, locale) || null,
    phone: settings.contact.phone,
    email: settings.contact.email,
    address: pickLocale(settings.contact.address, locale) || null,
    sameAs: settings.socialLinks.map((l) => l.url),
    locale,
  });
  const cookieTexts = settings.cookieBanner?.[locale] ?? settings.cookieBanner?.['tr'] ?? null;

  // Bakım modu (K-43 ile birlikte): ön yüz tek sayfa; panel etkilenmez. Metin static_pages.maintenance + ek mesaj.
  if (settings.maintenance.enabled) {
    const [page, tm] = await Promise.all([getErrorPage('maintenance', locale), getTranslations('Maintenance')]);
    const extra = pickLocale(settings.maintenance.message, locale);
    return (
      <main id="main-content" className="grid min-h-dvh place-items-center">
        <Container className="grid max-w-[var(--prose-max)] gap-4 py-[var(--section-y)] text-center">
          <p className="label-mono text-[var(--color-accent-text)]">{siteName}</p>
          <h1>{page?.title ?? tm('title')}</h1>
          <p className="text-[var(--color-text-muted)]">{page?.body || tm('body')}</p>
          {extra ? <p>{extra}</p> : null}
        </Container>
      </main>
    );
  }

  return (
    <RouteAlternatesProvider>
      <BasketProvider>
      {/* İlk giriş yükleyicisi: betik boyamadan önce sınıfı koyar; katman varsayılan gizlidir (JS yoksa hiç görünmez) */}
      <script dangerouslySetInnerHTML={{ __html: SITE_LOADER_BOOT }} />
      <SiteLoader label={a11y('loading')} siteName={siteName} />
      <JsonLd data={organization} />
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
      {cookieTexts ? (
        <ModuleBoundary module="consent">
          <CookieBanner texts={cookieTexts} policyAvailable={cookiePolicy !== null} />
        </ModuleBoundary>
      ) : null}
      {settings.analytics.enabled ? (
        <ModuleBoundary module="analytics/tracker">
          <Tracker locale={locale} enabled sampleRate={settings.analytics.sampleRate} />
          <ThirdPartyScripts ga4Id={settings.analytics.ga4Id} adsId={settings.analytics.adsId} metaPixelId={settings.analytics.metaPixelId} />
        </ModuleBoundary>
      ) : null}
      </BasketProvider>
    </RouteAlternatesProvider>
  );
}
