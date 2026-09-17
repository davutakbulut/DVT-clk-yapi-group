import type { Metadata } from 'next';
import { getPathname, type AppHref } from './navigation';
import { routing, type Locale } from './routing';

/**
 * canonical + hreflang. Çevrilmemiş dil HİÇ yazılmaz (null geçilir) — var olmayan bir sayfaya
 * hreflang vermek tüm kümeyi geçersiz kılar. Yollar görelidir; metadataBase mutlaklaştırır.
 */
export function buildAlternates(current: Locale, hrefs: Readonly<Record<Locale, AppHref | null>>): NonNullable<Metadata['alternates']> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    const href = hrefs[locale];
    if (href !== null) languages[locale] = getPathname({ href, locale });
  }
  const fallback = hrefs[routing.defaultLocale];
  if (fallback !== null) languages['x-default'] = getPathname({ href: fallback, locale: routing.defaultLocale });

  const self = hrefs[current];
  return { canonical: self === null ? undefined : getPathname({ href: self, locale: current }), languages };
}
