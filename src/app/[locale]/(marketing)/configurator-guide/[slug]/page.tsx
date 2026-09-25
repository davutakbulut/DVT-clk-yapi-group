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
import { isPublicSlug } from '@/lib/slugify';
import { CONFIGURATOR_HREF, getCachedGuideBySlug, getCachedGuideSlugs, resolveOldGuideSlug, type GuideDetailData } from '@/modules/configurator-pages';
import { GuideDetail } from '@/modules/configurator-pages/server';
import { moduleEnabled } from '@/modules/site-settings';

interface Props { readonly params: Promise<{ locale: string; slug: string }> }
export const dynamicParams = true;
export async function generateStaticParams() {
  const all = await Promise.all(routing.locales.map(async (locale) => (await getCachedGuideSlugs(locale)).map((slug) => ({ locale, slug }))));
  return all.flat();
}
const hrefs = (g: GuideDetailData): Readonly<Record<Locale, AppHref | null>> => ({ tr: g.alternates.tr ? ({ pathname: '/configurator-guide/[slug]', params: { slug: g.alternates.tr } } as AppHref) : null, en: g.alternates.en ? ({ pathname: '/configurator-guide/[slug]', params: { slug: g.alternates.en } } as AppHref) : null });
async function load(locale: string, slug: string) { const r = await getCachedGuideBySlug(locale, slug); return r.ok ? r.data : null; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const g = await load(locale, slug);
  if (!g) return {};
  const env = readSupabasePublicEnv();
  const og = g.seo.ogImage ?? g.cover;
  return {
    title: g.seo.title || g.title,
    description: g.seo.description || g.summary || undefined,
    robots: g.seo.noindex ? { index: false, follow: true } : undefined,
    alternates: { ...buildAlternates(locale as Locale, hrefs(g)), ...(g.seo.canonicalUrl ? { canonical: g.seo.canonicalUrl } : {}) },
    openGraph: og && env.ok ? { images: [{ url: publicStorageUrl(env.data.url, og), width: og.width ?? undefined, height: og.height ?? undefined }] } : undefined,
  };
}
/** Konfigüratör rehber sayfası (K-107): WebPage + HowTo + FAQPage + BreadcrumbList; konfigüratöre iç bağlantı ve band. */
export default async function ConfiguratorGuidePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (!isPublicSlug(slug)) notFound();
  if (!(await moduleEnabled('configurator'))) notFound();
  const g = await load(locale, slug);
  if (!g) {
    const fresh = await resolveOldGuideSlug(locale, slug);
    if (fresh) permanentRedirect(getPathname({ href: { pathname: '/configurator-guide/[slug]', params: { slug: fresh } }, locale: locale as Locale }));
    notFound();
  }
  const [t, env] = await Promise.all([getTranslations('ConfiguratorGuide'), readSupabasePublicEnv()]);
  const self: AppHref = { pathname: '/configurator-guide/[slug]', params: { slug: g.slug } };
  const jsonLd: Record<string, unknown>[] = [
    { '@type': 'WebPage', '@id': absoluteUrl(self, locale as Locale), name: g.title, description: g.seo.description || g.summary || undefined, inLanguage: locale, dateModified: g.updatedAt || undefined, about: { '@type': 'SoftwareApplication', name: g.title, applicationCategory: 'DesignApplication', operatingSystem: 'Web', url: absoluteUrl(CONFIGURATOR_HREF[g.key], locale as Locale) } },
    breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/configurator-guide' }, { name: g.title, href: self }], locale as Locale),
  ];
  if (g.steps.length > 0) jsonLd.push({ '@type': 'HowTo', name: g.title, step: g.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.description || s.title })) });
  if (g.faqs.length > 0) jsonLd.push({ '@type': 'FAQPage', mainEntity: g.faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) });
  return (
    <RouteAlternates value={{ hrefs: hrefs(g), fallback: '/configurator-guide' }}>
      <JsonLd data={jsonLd} />
      <ModuleBoundary module="configurator-pages/detail"><GuideDetail guide={g} locale={locale} supabaseUrl={env.ok ? env.data.url : null} /></ModuleBoundary>
    </RouteAlternates>
  );
}
