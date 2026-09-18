'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
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

interface Store {
  readonly value: RouteAlternatesValue | null;
  readonly set: (value: RouteAlternatesValue | null) => void;
}

const RouteAlternatesContext = createContext<Store | null>(null);

/**
 * Layout'ta (header'ın üstünde) durur. Sayfa, `RouteAlternates` ile değeri buraya yazar: header sayfanın
 * altında değil üstünde olduğu için context aşağıdan yukarı taşınamaz; kayıt hidrasyon sonrası `useLayoutEffect`
 * ile yapılır (boyamadan önce). JS'siz: değiştirici sabit segmentli davranır → çevrilmemiş dilde 404 sayfası açılır.
 */
export function RouteAlternatesProvider({ children }: { readonly children: ReactNode }) {
  const [value, set] = useState<RouteAlternatesValue | null>(null);
  const store = useMemo<Store>(() => ({ value, set }), [value]);
  return <RouteAlternatesContext.Provider value={store}>{children}</RouteAlternatesContext.Provider>;
}

/** Detay sayfası kökünde: değeri sağlayıcıya kaydeder, ayrılınca temizler. */
export function RouteAlternates({ value, children }: { readonly value: RouteAlternatesValue; readonly children: ReactNode }) {
  const store = useContext(RouteAlternatesContext);
  const key = JSON.stringify(value);
  useLayoutEffect(() => {
    store?.set(JSON.parse(key) as RouteAlternatesValue);
    return () => store?.set(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- değer serileştirilmiş anahtarla izlenir
  }, [store?.set, key]);
  return <>{children}</>;
}

/** Kayıtlı değer yoksa null: sayfa sabit segmentlidir, next-intl yolu kendisi çevirir. */
export function useRouteAlternates(): RouteAlternatesValue | null {
  return useContext(RouteAlternatesContext)?.value ?? null;
}
