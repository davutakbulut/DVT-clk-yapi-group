import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { JobList } from '@/modules/corporate';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Corporate' });
  return { title: t('careersTitle'), description: t('careersLead'), alternates: buildAlternates(locale as Locale, { tr: '/careers', en: '/careers' }) };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('Corporate');
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('careersTitle'), href: '/careers' }], locale as Locale)} />
      <ModuleBoundary module="corporate/careers">
        <JobList locale={locale} />
      </ModuleBoundary>
    </>
  );
}
