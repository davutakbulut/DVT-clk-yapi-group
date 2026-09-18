import { getPathname, type AppHref } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getSiteUrl } from '@/core/config/site';

export type JsonLdObject = Record<string, unknown>;

/** Site kökünde tanımlanacak Organization düğümünün kimliği; Service.provider vb. buna referans verir (02-SEO). */
export function organizationId(): string {
  return `${getSiteUrl().origin}/#organization`;
}

/** Tipli iç yol → mutlak URL (canonical, BreadcrumbList item). */
export function absoluteUrl(href: AppHref, locale: Locale): string {
  return new URL(getPathname({ href, locale }), getSiteUrl()).toString();
}

export function breadcrumbList(items: readonly { readonly name: string; readonly href: AppHref }[], locale: Locale): JsonLdObject {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.href, locale) })),
  };
}

/** `<script type="application/ld+json">`. `<` kaçırılır: içerik metni script'i kapatamaz. */
export function JsonLd({ data }: { readonly data: JsonLdObject | readonly JsonLdObject[] }) {
  const graph = Array.isArray(data) ? { '@context': 'https://schema.org', '@graph': data } : { '@context': 'https://schema.org', ...(data as JsonLdObject) };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }} />;
}
