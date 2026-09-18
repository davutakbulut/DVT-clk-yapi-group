import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { ModuleBoundary } from '@/core/errors';
import { absoluteUrl, breadcrumbList, JsonLd } from '@/core/seo';
import { publicStorageUrl } from '@/core/storage';
import { buildAlternates } from '@/i18n/alternates';
import { getPathname, type AppHref } from '@/i18n/navigation';
import { RouteAlternates } from '@/i18n/RouteAlternates';
import { routing, type Locale } from '@/i18n/routing';
import { getCachedPriceGuideBySlug, getCachedPriceGuideSlugs, PriceGuideDetail, resolveOldPriceGuideSlug, type PriceGuideDetailData } from '@/modules/pricing';
import { getCachedWhatsAppConfig } from '@/modules/whatsapp';

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = true;
export async function generateStaticParams() {
  const all = await Promise.all(routing.locales.map(async (locale) => (await getCachedPriceGuideSlugs(locale)).map((slug) => ({ locale, slug }))));
  return all.flat();
}

function hrefs(guide: PriceGuideDetailData): Readonly<Record<Locale, AppHref | null>> {
  const to = (slug: string | null): AppHref | null => (slug ? ({ pathname: '/pricing/[slug]', params: { slug } } as AppHref) : null);
  return { tr: to(guide.alternates.tr), en: to(guide.alternates.en) };
}

async function load(locale: string, slug: string): Promise<PriceGuideDetailData | null> {
  const result = await getCachedPriceGuideBySlug(locale, slug);
  return result.ok ? result.data : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = await load(locale, slug);
  if (!guide) return {};
  const env = readSupabasePublicEnv();
  const og = guide.seo.ogImage;
  return {
    title: guide.seo.title || guide.title,
    description: guide.seo.description || guide.intro || undefined,
    robots: guide.seo.noindex ? { index: false, follow: true } : undefined,
    alternates: { ...buildAlternates(locale as Locale, hrefs(guide)), ...(guide.seo.canonicalUrl ? { canonical: guide.seo.canonicalUrl } : {}) },
    openGraph: og && env.ok ? { images: [{ url: publicStorageUrl(env.data.url, og), width: og.width ?? undefined, height: og.height ?? undefined }] } : undefined,
  };
}

export default async function PriceGuidePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  const guide = await load(locale, slug);
  if (!guide) {
    const fresh = await resolveOldPriceGuideSlug(locale, slug);
    if (fresh) permanentRedirect(getPathname({ href: { pathname: '/pricing/[slug]', params: { slug: fresh } }, locale: locale as Locale }));
    notFound();
  }
  const [t, wa] = await Promise.all([getTranslations('Pricing'), getCachedWhatsAppConfig()]);
  const whatsappHref = wa.ok && wa.data ? `https://wa.me/${wa.data.phone_e164.slice(1)}?text=${encodeURIComponent(t('whatsappMessage', { title: guide.title }))}` : null;
  const self: AppHref = { pathname: '/pricing/[slug]', params: { slug: guide.slug } };
  // 02-SEO: fiyat rehberi WebPage + Breadcrumb (+ FAQPage). Offer/PriceSpecification YOK: aralık tahmindir, teklif değildir (K-27/K-59).
  const jsonLd: Record<string, unknown>[] = [
    { '@type': 'WebPage', '@id': absoluteUrl(self, locale as Locale), name: guide.title, description: guide.seo.description || guide.intro || undefined, inLanguage: locale, dateModified: guide.pricesUpdatedAt ?? guide.updatedAt ?? undefined },
    breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/pricing' }, { name: guide.title, href: self }], locale as Locale),
  ];
  if (guide.faqs.length > 0) jsonLd.push({ '@type': 'FAQPage', mainEntity: guide.faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) });

  return (
    <RouteAlternates value={{ hrefs: hrefs(guide), fallback: '/pricing' }}>
      <JsonLd data={jsonLd} />
      <ModuleBoundary module="pricing/detail">
        <PriceGuideDetail guide={guide} locale={locale} whatsappHref={whatsappHref} />
      </ModuleBoundary>
    </RouteAlternates>
  );
}
