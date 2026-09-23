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
import { getCachedProjectBySlug, getCachedProjectList, getCachedProjectSlugs, ProjectDetail, resolveOldProjectSlug, type ProjectDetailData } from '@/modules/projects';
import { getCachedTestimonialsFor, reviewJsonLd, TestimonialsFor } from '@/modules/testimonials';
import { moduleEnabled } from '@/modules/site-settings';
import { isPublicSlug } from '@/lib/slugify';

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = true;
export async function generateStaticParams() {
  const all = await Promise.all(routing.locales.map(async (locale) => (await getCachedProjectSlugs(locale)).map((slug) => ({ locale, slug }))));
  return all.flat();
}

function hrefs(project: ProjectDetailData): Readonly<Record<Locale, AppHref | null>> {
  const to = (slug: string | null): AppHref | null => (slug ? ({ pathname: '/projects/[slug]', params: { slug } } as AppHref) : null);
  return { tr: to(project.alternates.tr), en: to(project.alternates.en) };
}

async function load(locale: string, slug: string): Promise<ProjectDetailData | null> {
  const result = await getCachedProjectBySlug(locale, slug);
  return result.ok ? result.data : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await load(locale, slug);
  if (!project) return {};
  const env = readSupabasePublicEnv();
  return {
    title: project.seo.title || project.title,
    description: project.seo.description || project.excerpt || undefined,
    robots: project.seo.noindex ? { index: false, follow: true } : undefined,
    alternates: { ...buildAlternates(locale as Locale, hrefs(project)), ...(project.seo.canonicalUrl ? { canonical: project.seo.canonicalUrl } : {}) },
    openGraph: project.cover && env.ok ? { images: [{ url: publicStorageUrl(env.data.url, project.cover), width: project.cover.width ?? undefined, height: project.cover.height ?? undefined }] } : undefined,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (!isPublicSlug(slug)) notFound(); // K-104: bozuk/uzun slug için DB'ye ve önbelleğe gidilmez
  if (!(await moduleEnabled('projects'))) notFound(); // K-43 kill switch
  const project = await load(locale, slug);
  if (!project) {
    const fresh = await resolveOldProjectSlug(locale, slug);
    if (fresh) permanentRedirect(getPathname({ href: { pathname: '/projects/[slug]', params: { slug: fresh } }, locale: locale as Locale }));
    notFound();
  }
  const [t, list] = await Promise.all([getTranslations('Projects'), getCachedProjectList(locale)]);
  const all = list.ok ? list.data : [];
  const index = all.findIndex((p) => p.id === project.id);
  const prev = index > 0 ? all[index - 1]! : null;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1]! : null;
  const categorySlugs = new Set(project.categories.map((c) => c.slug));
  const related = all.filter((p) => p.id !== project.id && p.categories.some((c) => categorySlugs.has(c.slug))).slice(0, 3);
  const self: AppHref = { pathname: '/projects/[slug]', params: { slug: project.slug } };
  const reviews = await getCachedTestimonialsFor(locale, { projectId: project.id });
  const jsonLd = [
    {
      '@type': 'Article',
      '@id': `${absoluteUrl(self, locale as Locale)}#project`,
      headline: project.title,
      description: project.seo.description || project.excerpt || undefined,
      url: absoluteUrl(self, locale as Locale),
      inLanguage: locale,
      datePublished: project.publishedAt ?? undefined,
      dateModified: project.updatedAt || undefined,
      author: { '@id': organizationId() },
      publisher: { '@id': organizationId() },
      about: { '@type': 'Thing', name: project.categories.map((c) => c.name).join(', ') || project.title },
    },
    breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/projects' }, { name: project.title, href: self }], locale as Locale),
    // 02-SEO: yalnız bu projeye bağlı yorumlar, bu projenin @id'si üzerinde
    ...reviewJsonLd(reviews, { id: `${absoluteUrl(self, locale as Locale)}#project`, type: 'Project' }),
  ];

  return (
    <RouteAlternates value={{ hrefs: hrefs(project), fallback: '/projects' }}>
      <JsonLd data={jsonLd} />
      <ModuleBoundary module="projects/detail">
        <ProjectDetail
          project={project}
          locale={locale}
          related={related}
          prev={prev}
          next={next}
          extra={
            <ModuleBoundary module="testimonials/for-project">
              <TestimonialsFor items={reviews} headingId="project-reviews" />
            </ModuleBoundary>
          }
        />
      </ModuleBoundary>
    </RouteAlternates>
  );
}
