import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { BlogSection } from '@/modules/blog';
import { ApplicationSection, CategoryStrip, ConfiguratorSection, ContactSection, HeroSection, MaterialsSection, WhySteelSection } from '@/modules/home';
import { ProjectsSection } from '@/modules/projects';
import { FieldVideosSection } from '@/modules/field-videos';
import { TestimonialsSection } from '@/modules/testimonials';
import { getPublicSettings, isModuleEnabled } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getPublicSettings();
  const description = pickLocale(settings.seoDescription, locale);
  return { ...(description ? { description } : {}), alternates: buildAlternates(locale as Locale, { tr: '/', en: '/' }) };
}

// Bölüm sırası (K-111, 01-PUBLIC-PAGES): hero → ürün grubu şeridi → 01 malzeme → 02 uygulama → 03 neden çelik + süreç → 04 konfigüratör →
// 05 projeler → 06 saha → 07 yorumlar → 08 blog → iletişim bandı. Her biri kendi sınırında; kapalı modülün bölümü çizilmez (K-43).
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const settings = await getPublicSettings();
  const siteName = pickLocale(settings.siteName, locale, { fallback: 'tr' });
  const on = (key: Parameters<typeof isModuleEnabled>[1]) => isModuleEnabled(settings.modules, key); // K-43 kill switch
  const L = (v: Readonly<Partial<Record<string, string>>> | null | undefined) => pickLocale(v, locale, { fallback: 'tr' });
  const projects = settings.homePage.projects;

  return (
    <>
      <ModuleBoundary module="home/hero">
        <HeroSection locale={locale} siteName={siteName} />
      </ModuleBoundary>
      {on('products') ? (
        <ModuleBoundary module="home/category-strip">
          <CategoryStrip locale={locale} />
        </ModuleBoundary>
      ) : null}
      {on('products') ? (
        <ModuleBoundary module="home/materials">
          <MaterialsSection locale={locale} index="01" />
        </ModuleBoundary>
      ) : null}
      {on('services') ? (
        <ModuleBoundary module="home/application">
          <ApplicationSection locale={locale} index="02" />
        </ModuleBoundary>
      ) : null}
      <ModuleBoundary module="home/why-steel">
        <WhySteelSection locale={locale} index="03" />
      </ModuleBoundary>
      {on('configurator') ? (
        <ModuleBoundary module="home/configurator">
          <ConfiguratorSection locale={locale} index="04" />
        </ModuleBoundary>
      ) : null}
      {on('projects') ? (
        <ModuleBoundary module="projects/home">
          <ProjectsSection locale={locale} index="05" title={L(projects.title)} cta={on('leads') ? { kicker: L(projects.cta.kicker), title: L(projects.cta.title), text: L(projects.cta.text) } : null} />
        </ModuleBoundary>
      ) : null}
      {/* Sahadan videolar: kayıt yoksa bölüm hiç çizilmez */}
      <ModuleBoundary module="field-videos/home">
        <FieldVideosSection locale={locale} index="06" />
      </ModuleBoundary>
      {on('testimonials') ? (
        <ModuleBoundary module="testimonials/home">
          <TestimonialsSection locale={locale} index="07" />
        </ModuleBoundary>
      ) : null}
      {on('blog') ? (
        <ModuleBoundary module="blog/home">
          <BlogSection locale={locale} index="08" />
        </ModuleBoundary>
      ) : null}
      <ModuleBoundary module="home/contact">
        <ContactSection locale={locale} />
      </ModuleBoundary>
    </>
  );
}
