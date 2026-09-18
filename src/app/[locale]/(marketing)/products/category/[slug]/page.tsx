import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { AppHref } from '@/i18n/navigation';
import { RouteAlternates } from '@/i18n/RouteAlternates';
import { routing, type Locale } from '@/i18n/routing';
import { getCachedProductCategories, ProductsList } from '@/modules/products';
import { moduleEnabled } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = true;
export async function generateStaticParams() {
  const all = await Promise.all(
    routing.locales.map(async (locale) => {
      const cats = await getCachedProductCategories(locale);
      return cats.ok ? cats.data.map((c) => ({ locale, slug: c.slug })) : [];
    }),
  );
  return all.flat();
}

async function find(locale: string, slug: string) {
  const cats = await getCachedProductCategories(locale);
  return cats.ok ? (cats.data.find((c) => c.slug === slug) ?? null) : null;
}

async function alternates(id: string): Promise<Readonly<Record<Locale, AppHref | null>>> {
  const out = {} as Record<Locale, AppHref | null>;
  for (const locale of routing.locales) {
    const cats = await getCachedProductCategories(locale);
    const match = cats.ok ? cats.data.find((c) => c.id === id) : undefined;
    out[locale] = match ? ({ pathname: '/products/category/[slug]', params: { slug: match.slug } } as AppHref) : null;
  }
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await find(locale, slug);
  if (!category) return {};
  return { title: category.name, description: category.description || undefined, alternates: buildAlternates(locale as Locale, await alternates(category.id)) };
}

export default async function ProductCategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('products'))) notFound(); // K-43 kill switch
  const category = await find(locale, slug);
  if (!category) notFound();
  const t = await getTranslations('Products');
  return (
    <RouteAlternates value={{ hrefs: await alternates(category.id), fallback: '/products' }}>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/products' }, { name: category.name, href: { pathname: '/products/category/[slug]', params: { slug } } }], locale as Locale)} />
      <ModuleBoundary module="products/category">
        <ProductsList locale={locale} categorySlug={slug} />
      </ModuleBoundary>
    </RouteAlternates>
  );
}
