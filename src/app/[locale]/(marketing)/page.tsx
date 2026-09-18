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
import { TestimonialsSection } from '@/modules/testimonials';
import { getPublicSettings } from '@/modules/site-settings';

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

  return (
    <>
      <ModuleBoundary module="home/hero">
        <HeroSection locale={locale} siteName={siteName} />
      </ModuleBoundary>
      <ModuleBoundary module="home/about">
        <AboutSection locale={locale} index="01" />
      </ModuleBoundary>
      <ModuleBoundary module="services/home">
        <ServicesSection locale={locale} index="02" />
      </ModuleBoundary>
      <ModuleBoundary module="projects/home">
        <ProjectsSection locale={locale} index="03" />
      </ModuleBoundary>
      <ModuleBoundary module="blog/home">
        <BlogSection locale={locale} index="04" />
      </ModuleBoundary>
      <ModuleBoundary module="testimonials/home">
        <TestimonialsSection locale={locale} index="05" />
      </ModuleBoundary>
    </>
  );
}
