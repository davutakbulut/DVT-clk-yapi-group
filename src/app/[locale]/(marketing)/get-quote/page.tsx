import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { ContactInfo, LeadFormSection } from '@/modules/leads';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { moduleEnabled } from '@/modules/site-settings';
import { notFound } from 'next/navigation';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Quote' });
  return { title: t('title'), description: t('lead'), alternates: buildAlternates(locale as Locale, { tr: '/get-quote', en: '/get-quote' }) };
}

export default async function QuotePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('leads'))) notFound(); // K-43 kill switch
  const t = await getTranslations('Quote');
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/get-quote' }], locale as Locale)} />
      <Container as="section" className="grid gap-12 py-[var(--section-y)] lg:grid-cols-[4fr_8fr]">
        <div className="grid content-start gap-8">
          <SectionHeading as="h1" kicker={t('form')} title={t('title')} lead={t('lead')} />
          <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t('note')}</p>
          <ModuleBoundary module="leads/contact-info">
            <ContactInfo locale={locale} />
          </ModuleBoundary>
        </div>
        <div className="grid content-start gap-6 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:p-10">
          <ModuleBoundary module="leads/form">
            <LeadFormSection locale={locale} variant="quote_form" />
          </ModuleBoundary>
        </div>
      </Container>
    </>
  );
}
