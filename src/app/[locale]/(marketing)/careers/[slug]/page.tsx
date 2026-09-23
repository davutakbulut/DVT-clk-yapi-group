import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { absoluteUrl, breadcrumbList, JsonLd, organizationId } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import { getPathname, type AppHref } from '@/i18n/navigation';
import { RouteAlternates } from '@/i18n/RouteAlternates';
import { routing, type Locale } from '@/i18n/routing';
import { getCachedJobPostingBySlug, getCachedJobSlugs, JobDetail, resolveOldJobSlug, type JobPostingData } from '@/modules/corporate';
import { moduleEnabled } from '@/modules/site-settings';
import { isPublicSlug } from '@/lib/slugify';

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = true;
export async function generateStaticParams() {
  const all = await Promise.all(routing.locales.map(async (locale) => (await getCachedJobSlugs(locale)).map((slug) => ({ locale, slug }))));
  return all.flat();
}

function hrefs(job: JobPostingData): Readonly<Record<Locale, AppHref | null>> {
  const to = (slug: string | null): AppHref | null => (slug ? ({ pathname: '/careers/[slug]', params: { slug } } as AppHref) : null);
  return { tr: to(job.alternates.tr), en: to(job.alternates.en) };
}

async function load(locale: string, slug: string) {
  const r = await getCachedJobPostingBySlug(locale, slug);
  return r.ok ? r.data : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const job = await load(locale, slug);
  if (!job) return {};
  return { title: job.seo.title || job.title, description: job.seo.description || undefined, alternates: buildAlternates(locale as Locale, hrefs(job)) };
}

/** İlan detayı: JobPosting JSON-LD (Google for Jobs) yalnız açık ilanda; kapalıysa başvuru formu yerine not. */
export default async function JobPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (!isPublicSlug(slug)) notFound(); // K-104: bozuk/uzun slug için DB'ye ve önbelleğe gidilmez
  if (!(await moduleEnabled('careers'))) notFound(); // K-43 kill switch
  const job = await load(locale, slug);
  if (!job) {
    const fresh = await resolveOldJobSlug(locale, slug);
    if (fresh) permanentRedirect(getPathname({ href: { pathname: '/careers/[slug]', params: { slug: fresh } }, locale: locale as Locale }));
    notFound();
  }
  const t = await getTranslations('Corporate');
  const self: AppHref = { pathname: '/careers/[slug]', params: { slug: job.slug } };
  const employment: Record<string, string> = { full_time: 'FULL_TIME', part_time: 'PART_TIME', contract: 'CONTRACTOR', internship: 'INTERN' };
  const jsonLd = [
    ...(job.isOpen && job.publishedAt
      ? [
          {
            '@type': 'JobPosting',
            title: job.title,
            description: job.description || job.title,
            datePosted: job.publishedAt,
            validThrough: job.applicationDeadline ?? undefined,
            employmentType: employment[job.employmentType] ?? 'FULL_TIME',
            hiringOrganization: { '@id': organizationId() },
            jobLocation: job.location ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: 'TR' } } : undefined,
            url: absoluteUrl(self, locale as Locale),
            inLanguage: locale,
          },
        ]
      : []),
    breadcrumbList([{ name: t('home'), href: '/' }, { name: t('careersTitle'), href: '/careers' }, { name: job.title, href: self }], locale as Locale),
  ];
  return (
    <RouteAlternates value={{ hrefs: hrefs(job), fallback: '/careers' }}>
      <JsonLd data={jsonLd} />
      <ModuleBoundary module="corporate/job">
        <JobDetail job={job} locale={locale} />
      </ModuleBoundary>
    </RouteAlternates>
  );
}
