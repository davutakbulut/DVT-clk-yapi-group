import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { TeamGrid } from '@/modules/corporate';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Corporate' });
  return { title: t('teamTitle'), description: t('teamLead'), alternates: buildAlternates(locale as Locale, { tr: '/team', en: '/team' }) };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('Corporate');
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('teamTitle'), href: '/team' }], locale as Locale)} />
      <ModuleBoundary module="corporate/team">
        <TeamGrid locale={locale} />
      </ModuleBoundary>
    </>
  );
}
