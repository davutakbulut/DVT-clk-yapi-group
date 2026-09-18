import type { PublicDbClient } from '@/core/db/createPublicClient';
import type { AppHref } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';

/** Yayın kolonları (app_private.publishable): status · published_locales · published_at · translation_meta. */
export interface Publishable {
  readonly status: string;
  readonly published_locales: readonly string[] | null;
  readonly published_at: string | null;
}

/** K-07: yayında VE o dilde yayında. published_at gelecekteyse zamanlanmış demektir. */
export function isVisibleIn(row: Publishable, locale: string, now = new Date()): boolean {
  if (row.status !== 'published') return false;
  if (!row.published_locales?.includes(locale)) return false;
  if (row.published_at && new Date(row.published_at) > now) return false;
  return true;
}

export function slugFor(slug: unknown, locale: string): string | null {
  if (!isLocalizedText(slug)) return null;
  return slug[locale] ?? null;
}

/**
 * hreflang kümesi (02-SEO): alternatif diller AYNI satırdan türetilir; çevrilmemiş/yayınlanmamış dil null → hiç yazılmaz.
 * Yol şablonu tipli pathname anahtarıdır (ör. '/services/[slug]').
 */
export function alternatesFromRow<P extends string>(row: Publishable & { readonly slug: unknown }, pathname: P): Readonly<Record<Locale, AppHref | null>> {
  const out = {} as Record<Locale, AppHref | null>;
  for (const locale of routing.locales) {
    const slug = slugFor(row.slug, locale);
    out[locale] = slug && isVisibleIn(row, locale) ? ({ pathname, params: { slug } } as unknown as AppHref) : null;
  }
  return out;
}

/** Tek dilde yayındaki tüm slug'lar — generateStaticParams (K-46: hepsi build'de ön-üretilir). */
export async function publishedSlugs(client: PublicDbClient, table: keyof PublicDbClient['from'] extends never ? string : string, locale: string): Promise<string[]> {
  const { data } = await client
    .from(table as never)
    .select('slug, status, published_locales, published_at')
    .eq('status', 'published')
    .contains('published_locales', [locale]);
  const rows = (data ?? []) as unknown as (Publishable & { slug: unknown })[];
  return rows.filter((r) => isVisibleIn(r, locale)).map((r) => slugFor(r.slug, locale)).filter((s): s is string => Boolean(s));
}

/** Locale'e göre metin; yoksa boş (İngilizce sayfada Türkçe sızmaz — 01-SCHEMA). */
export function text(value: unknown, locale: string): string {
  return isLocalizedText(value) ? (value[locale] ?? '') : '';
}

export type { LocalizedText };
