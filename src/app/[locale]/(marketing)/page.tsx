import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';

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
    <section className="mx-auto grid max-w-[var(--content-max)] gap-3 px-[var(--gutter)] py-[var(--section-y)]">
      <h1 className="text-4xl font-semibold tracking-tight">{meta('siteName')}</h1>
      <p className="text-[var(--color-text-muted)]">{home('underConstruction')}</p>
    </section>
  );
}
