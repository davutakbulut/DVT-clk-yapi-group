import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { getCachedQuoteFormOptions } from '@/modules/leads';
import { BasketPage } from '@/modules/quote-basket';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { moduleEnabled } from '@/modules/site-settings';
import { notFound } from 'next/navigation';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

// 02-SEO: teklif sepeti noindex, follow
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Basket' });
  return { title: t('title'), robots: { index: false, follow: true }, alternates: buildAlternates(locale as Locale, { tr: '/quote-basket', en: '/quote-basket' }) };
}

export default async function QuoteBasketPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('quoteBasket'))) notFound(); // K-43 kill switch
  const [t, options] = await Promise.all([getTranslations('Basket'), getCachedQuoteFormOptions()]);
  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('kicker')} title={t('title')} lead={t('lead')} />
      <ModuleBoundary module="quote-basket">
        <BasketPage options={options} />
      </ModuleBoundary>
    </Container>
  );
}
