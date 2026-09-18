import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { PricingList } from '@/modules/pricing';
import { moduleEnabled } from '@/modules/site-settings';
import { notFound } from 'next/navigation';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Pricing' });
  return { title: t('title'), description: t('lead'), alternates: buildAlternates(locale as Locale, { tr: '/pricing', en: '/pricing' }) };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('pricing'))) notFound(); // K-43 kill switch
  const t = await getTranslations('Pricing');
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/pricing' }], locale as Locale)} />
      <ModuleBoundary module="pricing/list">
        <PricingList locale={locale} />
      </ModuleBoundary>
    </>
  );
}
