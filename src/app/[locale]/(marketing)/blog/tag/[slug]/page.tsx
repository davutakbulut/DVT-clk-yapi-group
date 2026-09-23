import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { AppHref } from '@/i18n/navigation';
import { RouteAlternates } from '@/i18n/RouteAlternates';
import { routing, type Locale } from '@/i18n/routing';
import { getCachedBlogTags, getCachedPostList, PostsList } from '@/modules/blog';
import { moduleEnabled } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = false; // K-104: bilinmeyen kategori/etiket slug'ı diske 404 sayfası yazdırmasın; yeni kategori yayında → yeniden dağıtım
export async function generateStaticParams() {
  const all = await Promise.all(
    routing.locales.map(async (locale) => {
      const tags = await getCachedBlogTags(locale);
      return tags.ok ? tags.data.map((t) => ({ locale, slug: t.slug })) : [];
    }),
  );
  return all.flat();
}

async function find(locale: string, slug: string) {
  const tags = await getCachedBlogTags(locale);
  return tags.ok ? (tags.data.find((t) => t.slug === slug) ?? null) : null;
}

async function alternates(id: string): Promise<Readonly<Record<Locale, AppHref | null>>> {
  const out = {} as Record<Locale, AppHref | null>;
  for (const locale of routing.locales) {
    const tags = await getCachedBlogTags(locale);
    const match = tags.ok ? tags.data.find((t) => t.id === id) : undefined;
    out[locale] = match ? ({ pathname: '/blog/tag/[slug]', params: { slug: match.slug } } as AppHref) : null;
  }
  return out;
}

// 02-SEO: etiket sayfası 5 yazıdan azsa noindex, follow (ince içerik).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const [tag, list, t] = await Promise.all([find(locale, slug), getCachedPostList(locale), getTranslations({ locale: locale as Locale, namespace: 'Blog' })]);
  if (!tag) return {};
  const count = list.ok ? list.data.filter((p) => p.tagSlugs.includes(slug)).length : 0;
  return { title: t('tagPrefix', { name: tag.name }), robots: count < 5 ? { index: false, follow: true } : undefined, alternates: buildAlternates(locale as Locale, await alternates(tag.id)) };
}

export default async function BlogTagPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('blog'))) notFound(); // K-43 kill switch
  const tag = await find(locale, slug);
  if (!tag) notFound();
  const t = await getTranslations('Blog');
  return (
    <RouteAlternates value={{ hrefs: await alternates(tag.id), fallback: '/blog' }}>
      <ModuleBoundary module="blog/tag">
        <PostsList locale={locale} tagSlug={slug} title={t('tagPrefix', { name: tag.name })} />
      </ModuleBoundary>
    </RouteAlternates>
  );
}
