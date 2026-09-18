import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { absoluteUrl, breadcrumbList, JsonLd, organizationId } from '@/core/seo';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { publicStorageUrl } from '@/core/storage';
import { buildAlternates } from '@/i18n/alternates';
import { getPathname, type AppHref } from '@/i18n/navigation';
import { RouteAlternates } from '@/i18n/RouteAlternates';
import { routing, type Locale } from '@/i18n/routing';
import { getCachedServiceBySlug, getCachedServiceSlugs, resolveOldServiceSlug, ServiceDetail, type ServiceDetailData } from '@/modules/services';

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

// K-46: yayındaki tüm slug'lar build'de ön-üretilir; yeni kayıtlar ISR ile ilk istekte gelir.
export const dynamicParams = true;
export async function generateStaticParams() {
  const all = await Promise.all(routing.locales.map(async (locale) => (await getCachedServiceSlugs(locale)).map((slug) => ({ locale, slug }))));
  return all.flat();
}

function hrefs(service: ServiceDetailData): Readonly<Record<Locale, AppHref | null>> {
  const to = (slug: string | null): AppHref | null => (slug ? ({ pathname: '/services/[slug]', params: { slug } } as AppHref) : null);
  return { tr: to(service.alternates.tr), en: to(service.alternates.en) };
}

async function load(locale: string, slug: string): Promise<ServiceDetailData | null> {
  const result = await getCachedServiceBySlug(locale, slug);
  return result.ok ? result.data : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = await load(locale, slug);
  if (!service) return {};
  const env = readSupabasePublicEnv();
  const og = service.seo.ogImage ?? service.cover;
  return {
    title: service.seo.title || service.title,
    description: service.seo.description || service.excerpt || undefined,
    robots: service.seo.noindex ? { index: false, follow: true } : undefined,
    alternates: { ...buildAlternates(locale as Locale, hrefs(service)), ...(service.seo.canonicalUrl ? { canonical: service.seo.canonicalUrl } : {}) },
    openGraph: og && env.ok ? { images: [{ url: publicStorageUrl(env.data.url, og), width: og.width ?? undefined, height: og.height ?? undefined }] } : undefined,
  };
}

export default async function ServicePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  const service = await load(locale, slug);
  if (!service) {
    // K-15: eski slug → 308 kalıcı yönlendirme; yoksa dilli 404.
    const fresh = await resolveOldServiceSlug(locale, slug);
    if (fresh) permanentRedirect(getPathname({ href: { pathname: '/services/[slug]', params: { slug: fresh } }, locale: locale as Locale }));
    notFound();
  }
  const t = await getTranslations('Services');
  const self: AppHref = { pathname: '/services/[slug]', params: { slug: service.slug } };
  const jsonLd = [
    {
      '@type': 'Service',
      '@id': `${absoluteUrl(self, locale as Locale)}#service`,
      name: service.title,
      description: service.seo.description || service.excerpt || undefined,
      url: absoluteUrl(self, locale as Locale),
      inLanguage: locale,
      serviceType: service.title,
      provider: { '@id': organizationId() },
      areaServed: { '@type': 'Country', name: 'TR' },
    },
    breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/services' }, { name: service.title, href: self }], locale as Locale),
  ];

  return (
    <RouteAlternates value={{ hrefs: hrefs(service), fallback: '/services' }}>
      <JsonLd data={jsonLd} />
      <ModuleBoundary module="services/detail">
        <ServiceDetail service={service} locale={locale} />
      </ModuleBoundary>
    </RouteAlternates>
  );
}
