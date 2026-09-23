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
import { getCachedSolutionBySlug, getCachedSolutionSlugs, resolveOldSolutionSlug, SolutionDetail, type SolutionDetailData } from '@/modules/solutions';
import { moduleEnabled } from '@/modules/site-settings';
import { isPublicSlug } from '@/lib/slugify';

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

// K-46: yayındaki slug'lar build'de ön-üretilir; yeni kayıtlar ISR ile ilk istekte gelir.
export const dynamicParams = true;
export async function generateStaticParams() {
  const all = await Promise.all(routing.locales.map(async (locale) => (await getCachedSolutionSlugs(locale)).map((slug) => ({ locale, slug }))));
  return all.flat();
}

function hrefs(solution: SolutionDetailData): Readonly<Record<Locale, AppHref | null>> {
  const to = (slug: string | null): AppHref | null => (slug ? ({ pathname: '/solutions/[slug]', params: { slug } } as AppHref) : null);
  return { tr: to(solution.alternates.tr), en: to(solution.alternates.en) };
}

async function load(locale: string, slug: string): Promise<SolutionDetailData | null> {
  const result = await getCachedSolutionBySlug(locale, slug);
  return result.ok ? result.data : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const solution = await load(locale, slug);
  if (!solution) return {};
  const env = readSupabasePublicEnv();
  const og = solution.seo.ogImage ?? solution.cover;
  return {
    title: solution.seo.title || solution.title,
    description: solution.seo.description || solution.summary || undefined,
    robots: solution.seo.noindex ? { index: false, follow: true } : undefined,
    alternates: { ...buildAlternates(locale as Locale, hrefs(solution)), ...(solution.seo.canonicalUrl ? { canonical: solution.seo.canonicalUrl } : {}) },
    openGraph: og && env.ok ? { images: [{ url: publicStorageUrl(env.data.url, og), width: og.width ?? undefined, height: og.height ?? undefined }] } : undefined,
  };
}

export default async function SolutionPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (!isPublicSlug(slug)) notFound(); // K-104: bozuk/uzun slug için DB'ye ve önbelleğe gidilmez
  if (!(await moduleEnabled('solutions'))) notFound(); // K-43 kill switch
  const solution = await load(locale, slug);
  if (!solution) {
    // K-15: eski slug → 308; yoksa dilli 404.
    const fresh = await resolveOldSolutionSlug(locale, slug);
    if (fresh) permanentRedirect(getPathname({ href: { pathname: '/solutions/[slug]', params: { slug: fresh } }, locale: locale as Locale }));
    notFound();
  }
  const t = await getTranslations('Solutions');
  const self: AppHref = { pathname: '/solutions/[slug]', params: { slug: solution.slug } };
  // 02-SEO: iniş sayfası WebPage + (SSS varsa) FAQPage; sayısal iddia yok (K-55) — içerik veritabanından.
  const jsonLd: Record<string, unknown>[] = [
    { '@type': 'WebPage', '@id': absoluteUrl(self, locale as Locale), name: solution.title, description: solution.seo.description || solution.summary || undefined, inLanguage: locale, dateModified: solution.updatedAt || undefined },
    breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/solutions' }, { name: solution.title, href: self }], locale as Locale),
  ];
  if (solution.faqs.length > 0) jsonLd.push({ '@type': 'FAQPage', mainEntity: solution.faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) });

  return (
    <RouteAlternates value={{ hrefs: hrefs(solution), fallback: '/solutions' }}>
      <JsonLd data={jsonLd} />
      <ModuleBoundary module="solutions/detail">
        <SolutionDetail solution={solution} locale={locale} />
      </ModuleBoundary>
    </RouteAlternates>
  );
}
