import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { PostsList } from '@/modules/blog';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Blog' });
  return { title: t('title'), description: t('lead'), alternates: buildAlternates(locale as Locale, { tr: '/blog', en: '/blog' }) };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('Blog');
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/blog' }], locale as Locale)} />
      <ModuleBoundary module="blog/list">
        <PostsList locale={locale} />
      </ModuleBoundary>
    </>
  );
}
