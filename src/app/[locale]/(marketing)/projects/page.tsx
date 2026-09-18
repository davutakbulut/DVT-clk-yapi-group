import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { ProjectsList } from '@/modules/projects';
import { moduleEnabled } from '@/modules/site-settings';
import { notFound } from 'next/navigation';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Projects' });
  return { title: t('title'), description: t('lead'), alternates: buildAlternates(locale as Locale, { tr: '/projects', en: '/projects' }) };
}

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('projects'))) notFound(); // K-43 kill switch
  const t = await getTranslations('Projects');
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/projects' }], locale as Locale)} />
      <ModuleBoundary module="projects/list">
        <ProjectsList locale={locale} />
      </ModuleBoundary>
    </>
  );
}
