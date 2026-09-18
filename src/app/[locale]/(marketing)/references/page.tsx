import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { ClientLogos } from '@/modules/corporate';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Corporate' });
  return { title: t('referencesTitle'), description: t('referencesLead'), alternates: buildAlternates(locale as Locale, { tr: '/references', en: '/references' }) };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('Corporate');
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('referencesTitle'), href: '/references' }], locale as Locale)} />
      <ModuleBoundary module="corporate/references">
        <ClientLogos locale={locale} />
      </ModuleBoundary>
    </>
  );
}
