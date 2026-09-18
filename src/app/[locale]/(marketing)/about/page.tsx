import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { CorporateLinks } from '@/modules/corporate';
import { AboutSection } from '@/modules/home';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Corporate' });
  return { title: t('aboutTitle'), description: t('aboutLead'), alternates: buildAlternates(locale as Locale, { tr: '/about', en: '/about' }) };
}

/** Hakkımızda: ana sayfadaki bölümle AYNI kaynak (about_content) tam sayfa; altında kurumsal yönlendirmeler. */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('Corporate');
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('aboutTitle'), href: '/about' }], locale as Locale)} />
      <ModuleBoundary module="corporate/about">
        <AboutSection locale={locale} index="" headingLevel="h1" />
      </ModuleBoundary>
      <ModuleBoundary module="corporate/links">
        <CorporateLinks />
      </ModuleBoundary>
    </>
  );
}
