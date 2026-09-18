import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { getLegalPage, LegalPage } from '@/modules/static-pages';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

const KEY = 'terms-of-use' as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [page, tr, en] = await Promise.all([getLegalPage(KEY, locale), getLegalPage(KEY, 'tr'), getLegalPage(KEY, 'en')]);
  if (!page) return {};
  return { title: page.title, alternates: buildAlternates(locale as Locale, { tr: tr ? '/terms-of-use' : null, en: en ? '/terms-of-use' : null }) };
}

/** Yasal sayfa: o dilde yayında değilse 404 (K-08); metin panelden, otomatik çeviri kapalı. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const page = await getLegalPage(KEY, locale);
  if (!page) notFound();
  return <LegalPage title={page.title} body={page.body} updatedAt={page.updatedAt} />;
}
