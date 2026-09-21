import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabasePublicEnv } from './publicEnv';

export interface CookieToSet {
  readonly name: string;
  readonly value: string;
  readonly options?: CookieOptions;
}

export interface RequestCookieJar {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string): void;
}

// 03-ERROR-ISOLATION Katman 5: sınırsız await yasak. Auth sunucusu yanıt vermezse
// middleware — yani sitenin TAMAMI — onunla birlikte asılı kalırdı.
const AUTH_TIMEOUT_MS = 5000;

/**
 * K-13 · Supabase'in yanıt nesnesine yazmasına İZİN VERİLMEZ. Yenilenen çerezler `collected`
 * dizisine toplanır; hangi yanıtın döneceği (next-intl rewrite'ı, redirect…) belli olduktan sonra basılır.
 */
export function createMiddlewareClient(env: SupabasePublicEnv, requestCookies: RequestCookieJar, collected: CookieToSet[]): SupabaseClient {
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      // K-83: çerezde yalnız jetonlar (kullanıcı nesnesi yok) → oturum çerezi ~%60 küçülür. Paylaşımlı hosting'in ön vekili büyük
      // Set-Cookie başlığında 502 veriyordu. Güvenli: uygulama hiçbir yerde session.user'a güvenmez, hep getUser() ile doğrular (K-14).
      encode: 'tokens-only',
      getAll: () => requestCookies.getAll(),
      setAll: (cookies) => {
        for (const cookie of cookies) {
          // İsteğe de yaz: aynı istekte çalışan sunucu bileşenleri yenilenmiş jetonu görsün.
          requestCookies.set(cookie.name, cookie.value);
          collected.push(cookie);
        }
      },
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(AUTH_TIMEOUT_MS) }),
    },
  });
}
