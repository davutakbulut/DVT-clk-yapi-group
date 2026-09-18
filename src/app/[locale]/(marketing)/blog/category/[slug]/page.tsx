import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { AppHref } from '@/i18n/navigation';
import { RouteAlternates } from '@/i18n/RouteAlternates';
import { routing, type Locale } from '@/i18n/routing';
import { getCachedBlogCategories, PostsList } from '@/modules/blog';
import { moduleEnabled } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = true;
export async function generateStaticParams() {
  const all = await Promise.all(
    routing.locales.map(async (locale) => {
      const cats = await getCachedBlogCategories(locale);
      return cats.ok ? cats.data.map((c) => ({ locale, slug: c.slug })) : [];
    }),
  );
  return all.flat();
}

async function find(locale: string, slug: string) {
  const cats = await getCachedBlogCategories(locale);
  return cats.ok ? (cats.data.find((c) => c.slug === slug) ?? null) : null;
}

async function alternates(id: string): Promise<Readonly<Record<Locale, AppHref | null>>> {
  const out = {} as Record<Locale, AppHref | null>;
  for (const locale of routing.locales) {
    const cats = await getCachedBlogCategories(locale);
    const match = cats.ok ? cats.data.find((c) => c.id === id) : undefined;
    out[locale] = match ? ({ pathname: '/blog/category/[slug]', params: { slug: match.slug } } as AppHref) : null;
  }
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await find(locale, slug);
  if (!category) return {};
  return { title: category.name, description: category.description || undefined, alternates: buildAlternates(locale as Locale, await alternates(category.id)) };
}

export default async function BlogCategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('blog'))) notFound(); // K-43 kill switch
  const category = await find(locale, slug);
  if (!category) notFound();
  const t = await getTranslations('Blog');
  return (
    <RouteAlternates value={{ hrefs: await alternates(category.id), fallback: '/blog' }}>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/blog' }, { name: category.name, href: { pathname: '/blog/category/[slug]', params: { slug } } }], locale as Locale)} />
      <ModuleBoundary module="blog/category">
        <PostsList locale={locale} categorySlug={slug} title={category.name} lead={category.description || undefined} />
      </ModuleBoundary>
    </RouteAlternates>
  );
}
