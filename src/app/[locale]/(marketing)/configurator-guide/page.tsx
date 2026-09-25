import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { ModuleBoundary } from '@/core/errors';
import { breadcrumbList, JsonLd } from '@/core/seo';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { getCachedGuideList } from '@/modules/configurator-pages';
import { GuideList } from '@/modules/configurator-pages/server';
import { moduleEnabled } from '@/modules/site-settings';
import { notFound } from 'next/navigation';

interface Props { readonly params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'ConfiguratorGuide' });
  return { title: t('title'), description: t('lead'), alternates: buildAlternates(locale as Locale, { tr: '/configurator-guide', en: '/configurator-guide' }) };
}
/** Konfigüratör rehberleri listesi (K-107): SEO iniş sayfalarına giriş; her kart konfigüratöre de bağlanır. */
export default async function ConfiguratorGuidesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('configurator'))) notFound();
  const [t, list, env] = await Promise.all([getTranslations('ConfiguratorGuide'), getCachedGuideList(locale), readSupabasePublicEnv()]);
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/configurator-guide' }], locale as Locale)} />
      <ModuleBoundary module="configurator-pages/list">
        <GuideList items={list.ok ? list.data : []} locale={locale} supabaseUrl={env.ok ? env.data.url : null} heroTitle={t('title')} heroLede={t('lead')} />
      </ModuleBoundary>
    </>
  );
}
