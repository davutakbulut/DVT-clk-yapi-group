import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { ModuleBoundary } from '@/core/errors';
import { absoluteUrl, breadcrumbList, JsonLd, organizationId } from '@/core/seo';
import { publicStorageUrl } from '@/core/storage';
import { buildAlternates } from '@/i18n/alternates';
import { getPathname, type AppHref } from '@/i18n/navigation';
import { RouteAlternates } from '@/i18n/RouteAlternates';
import { routing, type Locale } from '@/i18n/routing';
import { getCachedPostBySlug, getCachedPostList, getCachedPostSlugs, PostDetail, resolveOldPostSlug, type PostDetailData } from '@/modules/blog';
import { moduleEnabled } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = true;
export async function generateStaticParams() {
  const all = await Promise.all(routing.locales.map(async (locale) => (await getCachedPostSlugs(locale)).map((slug) => ({ locale, slug }))));
  return all.flat();
}

function hrefs(post: PostDetailData): Readonly<Record<Locale, AppHref | null>> {
  const to = (slug: string | null): AppHref | null => (slug ? ({ pathname: '/blog/[slug]', params: { slug } } as AppHref) : null);
  return { tr: to(post.alternates.tr), en: to(post.alternates.en) };
}

async function load(locale: string, slug: string): Promise<PostDetailData | null> {
  const result = await getCachedPostBySlug(locale, slug);
  return result.ok ? result.data : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await load(locale, slug);
  if (!post) return {};
  const env = readSupabasePublicEnv();
  const og = post.seo.ogImage ?? post.cover;
  return {
    title: post.seo.title || post.title,
    description: post.seo.description || post.excerpt || undefined,
    robots: post.seo.noindex ? { index: false, follow: true } : undefined,
    alternates: { ...buildAlternates(locale as Locale, hrefs(post)), ...(post.seo.canonicalUrl ? { canonical: post.seo.canonicalUrl } : {}) },
    openGraph: { type: 'article', publishedTime: post.publishedAt ?? undefined, modifiedTime: post.updatedAt || undefined, ...(og && env.ok ? { images: [{ url: publicStorageUrl(env.data.url, og), width: og.width ?? undefined, height: og.height ?? undefined }] } : {}) },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('blog'))) notFound(); // K-43 kill switch
  const post = await load(locale, slug);
  if (!post) {
    const fresh = await resolveOldPostSlug(locale, slug);
    if (fresh) permanentRedirect(getPathname({ href: { pathname: '/blog/[slug]', params: { slug: fresh } }, locale: locale as Locale }));
    notFound();
  }
  const [t, list, env] = await Promise.all([getTranslations('Blog'), getCachedPostList(locale), readSupabasePublicEnv()]);
  const all = list.ok ? list.data : [];
  const index = all.findIndex((p) => p.id === post.id);
  // Liste yeniden-eskiye: "sonraki" daha eski yazı, "önceki" daha yeni.
  const next = index >= 0 && index < all.length - 1 ? all[index + 1]! : null;
  const prev = index > 0 ? all[index - 1]! : null;
  const related = all.filter((p) => p.id !== post.id && post.category && p.category?.slug === post.category.slug).slice(0, 3);
  const self: AppHref = { pathname: '/blog/[slug]', params: { slug: post.slug } };
  const jsonLd = [
    {
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.seo.description || post.excerpt || undefined,
      url: absoluteUrl(self, locale as Locale),
      mainEntityOfPage: absoluteUrl(self, locale as Locale),
      inLanguage: locale,
      datePublished: post.publishedAt ?? undefined,
      dateModified: post.updatedAt || post.publishedAt || undefined,
      author: post.author ? { '@type': 'Person', name: post.author.name, jobTitle: post.author.position ?? undefined } : { '@id': organizationId() },
      publisher: { '@id': organizationId() },
      image: post.cover && env.ok ? publicStorageUrl(env.data.url, post.cover) : undefined,
      keywords: post.tags.map((tag) => tag.name).join(', ') || undefined,
      articleSection: post.category?.name,
    },
    breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/blog' }, { name: post.title, href: self }], locale as Locale),
  ];

  return (
    <RouteAlternates value={{ hrefs: hrefs(post), fallback: '/blog' }}>
      <JsonLd data={jsonLd} />
      <ModuleBoundary module="blog/detail">
        <PostDetail post={post} locale={locale} related={related} prev={prev} next={next} />
      </ModuleBoundary>
    </RouteAlternates>
  );
}
