import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { SearchResults } from '@/modules/search/server';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

interface Props {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<{ q?: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Search' });
  return { title: t('title'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/search', en: '/search' }) };
}
/** /arama (K-102) — sonuçlar modülde; noindex (sorgu sayfaları dizine girmez). */
export default async function SearchPage({ params, searchParams }: Props) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale as Locale);
  const t = await getTranslations('Search');
  return (
    <Container as="section" className="grid gap-8 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('kicker')} title={t('title')} />
      <ModuleBoundary module="search/page">
        <SearchResults locale={locale} q={sp.q} />
      </ModuleBoundary>
    </Container>
  );
}
