'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { AppHref } from './navigation';
import type { Locale } from './routing';

// Dinamik slug'lı sayfalar karşı dildeki hedefi buraya yayınlar. next-intl yalnız sabit segmentleri
// çevirir; "fabrika-celik-cati" ↔ "factory-steel-roof" eşleşmesini framework bilmez.
// Değerler detay RPC'sinin döndürdüğü alternatiflerden gelir — hreflang ile AYNI kaynak.
export interface RouteAlternatesValue {
  /** null = içerik o dilde yok veya published_locales'te değil. */
  readonly hrefs: Readonly<Record<Locale, AppHref | null>>;
  /** Karşılık yoksa gidilecek bölüm listesi (ör. '/projects'). null = dil düğmesi devre dışı. */
  readonly fallback: AppHref | null;
}

const RouteAlternatesContext = createContext<RouteAlternatesValue | null>(null);

export function RouteAlternates({ value, children }: { readonly value: RouteAlternatesValue; readonly children: ReactNode }) {
  return <RouteAlternatesContext.Provider value={value}>{children}</RouteAlternatesContext.Provider>;
}

/** Sağlayıcı yoksa null: sayfa sabit segmentlidir, next-intl yolu kendisi çevirir. */
export function useRouteAlternates(): RouteAlternatesValue | null {
  return useContext(RouteAlternatesContext);
}
