import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd, localBusinessJsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { ContactInfo, LeadFormSection } from '@/modules/leads';
import { getPublicSettings, moduleEnabled } from '@/modules/site-settings';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { notFound } from 'next/navigation';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Contact' });
  return { title: t('title'), description: t('lead'), alternates: buildAlternates(locale as Locale, { tr: '/contact', en: '/contact' }) };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('leads'))) notFound(); // K-43 kill switch
  const [t, settings] = await Promise.all([getTranslations('Contact'), getPublicSettings()]);
  const business = localBusinessJsonLd({
    name: pickLocale(settings.siteName, locale, { fallback: 'tr' }),
    phone: settings.contact.phone,
    email: settings.contact.email,
    address: pickLocale(settings.contact.address, locale) || null,
    openingHours: pickLocale(settings.contact.workingHours, locale) || null,
    mapUrl: settings.contact.mapUrl,
    locale,
  });
  return (
    <>
      <JsonLd data={[breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/contact' }], locale as Locale), business]} />
      <Container as="section" className="grid gap-12 py-[var(--section-y)] lg:grid-cols-[5fr_7fr]">
        <div className="grid content-start gap-8">
          <SectionHeading as="h1" kicker={t('info')} title={t('title')} lead={t('lead')} />
          <ModuleBoundary module="leads/contact-info">
            <ContactInfo locale={locale} />
          </ModuleBoundary>
        </div>
        <div className="grid content-start gap-6 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:p-10">
          <h2 className="text-[length:var(--fs-h3)]">{t('form')}</h2>
          <ModuleBoundary module="leads/form">
            <LeadFormSection locale={locale} variant="contact_form" />
          </ModuleBoundary>
        </div>
      </Container>
    </>
  );
}
