import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: buildAlternates(locale as Locale, { tr: '/', en: '/' }) };
}

// Bölümler (scroll video hero, hakkımızda…) Faz 6'da, her biri kendi <ModuleBoundary> içinde gelir.
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [meta, home] = await Promise.all([getTranslations('Meta'), getTranslations('Home')]);

  return (
    <Container as="section" className="py-[var(--section-y)]">
      <SectionHeading as="h1" title={meta('siteName')} lead={home('underConstruction')} />
    </Container>
  );
}
