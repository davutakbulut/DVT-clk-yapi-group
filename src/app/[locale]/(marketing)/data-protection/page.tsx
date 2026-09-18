import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { buildAlternates } from '@/i18n/alternates';
import { RouteAlternates } from '@/i18n/RouteAlternates';
import type { Locale } from '@/i18n/routing';
import { getLegalPage, LegalPage } from '@/modules/static-pages';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

const KEY = 'data-protection' as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [page, tr, en] = await Promise.all([getLegalPage(KEY, locale), getLegalPage(KEY, 'tr'), getLegalPage(KEY, 'en')]);
  if (!page) return {};
  return { title: page.title, alternates: buildAlternates(locale as Locale, { tr: tr ? '/data-protection' : null, en: en ? '/data-protection' : null }) };
}

/** Yasal sayfa: o dilde yayında değilse 404 (K-08); metin panelden, otomatik çeviri kapalı. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [page, tr, en] = await Promise.all([getLegalPage(KEY, locale), getLegalPage(KEY, 'tr'), getLegalPage(KEY, 'en')]);
  if (!page) notFound();
  // Karşı dilde yayında değilse dil değiştirici 404'e değil ana sayfaya gider (yasal metinde otomatik çeviri kapalı, Kural 7)
  return (
    <RouteAlternates value={{ hrefs: { tr: tr ? '/data-protection' : null, en: en ? '/data-protection' : null }, fallback: '/' }}>
      <LegalPage title={page.title} body={page.body} updatedAt={page.updatedAt} />
    </RouteAlternates>
  );
}
