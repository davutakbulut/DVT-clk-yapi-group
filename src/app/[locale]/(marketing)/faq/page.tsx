import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { FaqList, getCachedFaqs } from '@/modules/corporate';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Corporate' });
  return { title: t('faqTitle'), description: t('faqLead'), alternates: buildAlternates(locale as Locale, { tr: '/faq', en: '/faq' }) };
}

/** Genel SSS: FAQPage JSON-LD (02-SEO) yalnız yayındaki sorularla. */
export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [t, faqs] = await Promise.all([getTranslations('Corporate'), getCachedFaqs(locale, null, null)]);
  const items = faqs.ok ? faqs.data : [];
  const jsonLd = [
    breadcrumbList([{ name: t('home'), href: '/' }, { name: t('faqTitle'), href: '/faq' }], locale as Locale),
    ...(items.length > 0 ? [{ '@type': 'FAQPage', inLanguage: locale, mainEntity: items.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }] : []),
  ];
  return (
    <>
      <JsonLd data={jsonLd} />
      <ModuleBoundary module="corporate/faq">
        <FaqList locale={locale} asPage />
      </ModuleBoundary>
    </>
  );
}
