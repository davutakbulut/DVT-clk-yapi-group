import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { BlogSection } from '@/modules/blog';
import { AboutSection, HeroSection } from '@/modules/home';
import { ProjectsSection } from '@/modules/projects';
import { ServicesSection } from '@/modules/services';
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

// Bölüm sırası 01-PUBLIC-PAGES: hero → hakkımızda → (Faz 7+) hizmetler, projeler, yorumlar… Her biri kendi sınırında.
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const settings = await getPublicSettings();
  const siteName = pickLocale(settings.siteName, locale, { fallback: 'tr' });
  const on = (key: Parameters<typeof isModuleEnabled>[1]) => isModuleEnabled(settings.modules, key); // K-43 kill switch

  return (
    <>
      <ModuleBoundary module="home/hero">
        <HeroSection locale={locale} siteName={siteName} />
      </ModuleBoundary>
      <ModuleBoundary module="home/about">
        <AboutSection locale={locale} index="01" />
      </ModuleBoundary>
      {on('services') ? (
        <ModuleBoundary module="services/home">
          <ServicesSection locale={locale} index="02" />
        </ModuleBoundary>
      ) : null}
      {on('projects') ? (
        <ModuleBoundary module="projects/home">
          <ProjectsSection locale={locale} index="03" />
        </ModuleBoundary>
      ) : null}
      {on('blog') ? (
        <ModuleBoundary module="blog/home">
          <BlogSection locale={locale} index="04" />
        </ModuleBoundary>
      ) : null}
      {/* Sahadan videolar: kayıt yoksa bölüm hiç çizilmez */}
      <ModuleBoundary module="field-videos/home">
        <FieldVideosSection locale={locale} />
      </ModuleBoundary>
      {on('testimonials') ? (
        <ModuleBoundary module="testimonials/home">
          <TestimonialsSection locale={locale} index="05" />
        </ModuleBoundary>
      ) : null}
    </>
  );
}
