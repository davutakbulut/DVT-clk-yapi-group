import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/core/config/site';
import { getPathname, type AppHref } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { getCachedBlogCategories, getCachedBlogTags, getCachedPostList } from '@/modules/blog';
import { getCachedJobPostings } from '@/modules/corporate';
import { getCachedProjectCategories, getCachedProjectList } from '@/modules/projects';
import { getCachedServiceList } from '@/modules/services';
import { getCachedPriceGuideList } from '@/modules/pricing';
import { getCachedSolutionList } from '@/modules/solutions';
import { getCachedGuideList } from '@/modules/configurator-pages';
import { getCachedLegalPages } from '@/modules/static-pages';

// 02-SEO: veritabanından, her URL tam dil kümesiyle (alternates.languages → xhtml:link). Çevrilmemiş dil YAZILMAZ.
const STATIC: readonly { readonly href: AppHref; readonly priority: number; readonly changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { href: '/', priority: 1, changeFrequency: 'weekly' },
  { href: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { href: '/solutions', priority: 0.8, changeFrequency: 'monthly' },
  { href: '/configurator-guide', priority: 0.8, changeFrequency: 'monthly' },
  { href: '/pricing', priority: 0.8, changeFrequency: 'weekly' },
  { href: '/reviews', priority: 0.5, changeFrequency: 'weekly' },
  { href: '/projects', priority: 0.8, changeFrequency: 'weekly' },
  { href: '/blog', priority: 0.8, changeFrequency: 'daily' },
  { href: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { href: '/team', priority: 0.5, changeFrequency: 'monthly' },
  { href: '/references', priority: 0.5, changeFrequency: 'monthly' },
  { href: '/certificates', priority: 0.5, changeFrequency: 'monthly' },
  { href: '/careers', priority: 0.5, changeFrequency: 'weekly' },
  { href: '/faq', priority: 0.5, changeFrequency: 'monthly' },
  { href: '/contact', priority: 0.6, changeFrequency: 'yearly' },
  { href: '/get-quote', priority: 0.7, changeFrequency: 'yearly' },
  { href: '/sitemap', priority: 0.3, changeFrequency: 'monthly' },
];

type Entry = MetadataRoute.Sitemap[number];

function entry(hrefs: Readonly<Partial<Record<Locale, AppHref>>>, priority: number, changeFrequency: Entry['changeFrequency'], lastModified?: string | null): Entry[] {
  const base = getSiteUrl();
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    const href = hrefs[locale];
    if (href) languages[locale] = new URL(getPathname({ href, locale }), base).toString();
  }
  const fallback = hrefs[routing.defaultLocale];
  if (fallback) languages['x-default'] = new URL(getPathname({ href: fallback, locale: routing.defaultLocale }), base).toString();
  return routing.locales.flatMap((locale) => {
    const href = hrefs[locale];
    if (!href) return [];
    return [{ url: new URL(getPathname({ href, locale }), base).toString(), priority, changeFrequency, lastModified: lastModified ? new Date(lastModified) : undefined, alternates: { languages } }];
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const out: Entry[] = [];
  for (const s of STATIC) out.push(...entry({ tr: s.href, en: s.href }, s.priority, s.changeFrequency));

  // Dil başına yayındaki slug'lar; alternatifler aynı id üzerinden eşleştirilir (iki yönlü hreflang).
  const byId = async <T extends { id: string; slug: string }>(load: (locale: string) => Promise<{ ok: true; data: T[] } | { ok: false }>, pathname: string, priority: number, freq: Entry['changeFrequency'], modified?: (t: T) => string | null) => {
    const perLocale = await Promise.all(routing.locales.map(async (locale) => ({ locale, items: await load(locale) })));
    const ids = new Set<string>();
    for (const { items } of perLocale) if (items.ok) for (const i of items.data) ids.add(i.id);
    for (const id of ids) {
      const hrefs: Partial<Record<Locale, AppHref>> = {};
      let last: string | null = null;
      for (const { locale, items } of perLocale) {
        if (!items.ok) continue;
        const item = items.data.find((i) => i.id === id);
        if (item) {
          hrefs[locale] = { pathname, params: { slug: item.slug } } as AppHref;
          last = modified?.(item) ?? last;
        }
      }
      out.push(...entry(hrefs, priority, freq, last));
    }
  };

  await byId(getCachedServiceList, '/services/[slug]', 0.8, 'monthly');
  await byId(getCachedSolutionList, '/solutions/[slug]', 0.7, 'monthly');
  await byId(getCachedGuideList, '/configurator-guide/[slug]', 0.8, 'monthly');
  await byId(getCachedPriceGuideList, '/pricing/[slug]', 0.8, 'weekly', (g) => g.pricesUpdatedAt);
  await byId(getCachedProjectList, '/projects/[slug]', 0.7, 'monthly', (p) => p.completedOn);
  await byId(getCachedProjectCategories, '/projects/category/[slug]', 0.6, 'monthly');
  await byId(getCachedPostList, '/blog/[slug]', 0.7, 'weekly', (p) => p.publishedAt);
  await byId(getCachedBlogCategories, '/blog/category/[slug]', 0.6, 'weekly');
  await byId(getCachedBlogTags, '/blog/tag/[slug]', 0.3, 'weekly');
  await byId(getCachedJobPostings, '/careers/[slug]', 0.5, 'weekly', (j) => j.publishedAt);

  const legal = await getCachedLegalPages();
  if (legal.ok) {
    const pathFor: Record<string, AppHref> = { 'privacy-policy': '/privacy-policy', 'cookie-policy': '/cookie-policy', 'data-protection': '/data-protection', 'terms-of-use': '/terms-of-use' };
    for (const page of legal.data) {
      const href = pathFor[page.page_key];
      if (!href || page.status !== 'published') continue;
      const hrefs: Partial<Record<Locale, AppHref>> = {};
      for (const locale of routing.locales) if ((page.published_locales ?? []).includes(locale)) hrefs[locale] = href;
      out.push(...entry(hrefs, 0.3, 'yearly', page.updated_at));
    }
  }
  return out;
}
