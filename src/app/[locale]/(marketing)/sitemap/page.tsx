import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildAlternates } from '@/i18n/alternates';
import { Link, type AppHref } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getCachedBlogCategories, getCachedPostList } from '@/modules/blog';
import { getCachedJobPostings } from '@/modules/corporate';
import { getCachedProjectCategories, getCachedProjectList } from '@/modules/projects';
import { getCachedServiceList } from '@/modules/services';
import { getCachedLegalPages } from '@/modules/static-pages';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Legal' });
  return { title: t('sitemapTitle'), description: t('sitemapLead'), alternates: buildAlternates(locale as Locale, { tr: '/sitemap', en: '/sitemap' }) };
}

/** HTML site haritası (02-SEO): her yayınlanmış sayfaya ikinci keşif yolu; öksüz sayfa kalmaz. */
export default async function SitemapPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [t, tn, services, projects, projectCats, posts, blogCats, jobs, legal] = await Promise.all([
    getTranslations('Legal'),
    getTranslations('Admin'),
    getCachedServiceList(locale),
    getCachedProjectList(locale),
    getCachedProjectCategories(locale),
    getCachedPostList(locale),
    getCachedBlogCategories(locale),
    getCachedJobPostings(locale),
    getCachedLegalPages(),
  ]);
  const nav = (key: string) => tn(`nav.${key}` as never);
  type Group = { readonly title: string; readonly links: readonly { readonly href: AppHref; readonly label: string }[] };
  const groups: Group[] = [
    {
      title: t('pages'),
      links: [
        { href: '/' as AppHref, label: nav('home') },
        { href: '/about' as AppHref, label: tn('corporate.team.title') },
        { href: '/team' as AppHref, label: tn('nav.team') },
        { href: '/references' as AppHref, label: tn('nav.references') },
        { href: '/certificates' as AppHref, label: tn('nav.certificates') },
        { href: '/faq' as AppHref, label: tn('nav.faq') },
        { href: '/contact' as AppHref, label: tn('nav.leads') },
        { href: '/get-quote' as AppHref, label: tn('formSettings.title') },
      ],
    },
    { title: t('services'), links: [{ href: '/services' as AppHref, label: nav('services') }, ...(services.ok ? services.data.map((s) => ({ href: { pathname: '/services/[slug]', params: { slug: s.slug } } as AppHref, label: s.title })) : [])] },
    {
      title: t('projects'),
      links: [
        { href: '/projects' as AppHref, label: nav('projects') },
        ...(projectCats.ok ? projectCats.data.map((c) => ({ href: { pathname: '/projects/category/[slug]', params: { slug: c.slug } } as AppHref, label: c.name })) : []),
        ...(projects.ok ? projects.data.map((p) => ({ href: { pathname: '/projects/[slug]', params: { slug: p.slug } } as AppHref, label: p.title })) : []),
      ],
    },
    {
      title: t('blog'),
      links: [
        { href: '/blog' as AppHref, label: nav('blog') },
        ...(blogCats.ok ? blogCats.data.map((c) => ({ href: { pathname: '/blog/category/[slug]', params: { slug: c.slug } } as AppHref, label: c.name })) : []),
        ...(posts.ok ? posts.data.map((p) => ({ href: { pathname: '/blog/[slug]', params: { slug: p.slug } } as AppHref, label: p.title })) : []),
      ],
    },
    { title: t('careers'), links: [{ href: '/careers' as AppHref, label: nav('careers') }, ...(jobs.ok ? jobs.data.map((j) => ({ href: { pathname: '/careers/[slug]', params: { slug: j.slug } } as AppHref, label: j.title })) : [])] },
    {
      title: t('legal'),
      links: legal.ok
        ? legal.data
            .filter((p) => p.status === 'published' && (p.published_locales ?? []).includes(locale))
            .map((p) => ({ href: `/${p.page_key}` as AppHref, label: p.title[locale] ?? p.page_key }))
        : [],
    },
  ].filter((g) => g.links.length > 0);

  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" title={t('sitemapTitle')} lead={t('sitemapLead')} />
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title} className="grid content-start gap-3">
            <h2 className="text-[length:var(--fs-h3)]">{g.title}</h2>
            <ul className="grid gap-1 text-[length:var(--fs-sm)]">
              {g.links.map((l, i) => (
                <li key={i}>
                  <Link href={l.href} className="underline-offset-4 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </Container>
  );
}
