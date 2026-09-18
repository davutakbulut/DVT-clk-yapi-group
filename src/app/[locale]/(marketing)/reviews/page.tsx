import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { getCachedServiceList } from '@/modules/services';
import { ReviewsPage } from '@/modules/testimonials';
import { moduleEnabled } from '@/modules/site-settings';
import { notFound } from 'next/navigation';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Testimonials' });
  return { title: t('title'), description: t('lead'), alternates: buildAlternates(locale as Locale, { tr: '/reviews', en: '/reviews' }) };
}

/** /yorumlar — yayındaki yorumlar + ziyaretçi formu. AggregateRating şeması burada YOK (02-SEO: yalnız varlık sayfasında). */
export default async function ReviewsRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('testimonials'))) notFound(); // K-43 kill switch
  const [t, services] = await Promise.all([getTranslations('Testimonials'), getCachedServiceList(locale)]);
  const choices = services.ok ? services.data.map((s) => ({ id: s.id, label: s.title })) : [];
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/reviews' }], locale as Locale)} />
      <ModuleBoundary module="testimonials/page">
        <ReviewsPage locale={locale} services={choices} />
      </ModuleBoundary>
    </>
  );
}
