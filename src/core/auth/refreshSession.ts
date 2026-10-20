import type { NextResponse } from 'next/server';
import { hasAuthCookie } from './authCookie';

export interface CookieToSet {
  readonly name: string;
  readonly value: string;
  readonly options?: Parameters<NextResponse['cookies']['set']>[2];
}

export interface SessionRefresh {
  /** Middleware için yalnız DENEYİM bilgisidir (K-14). Yetki kararı buna dayanmaz. */
  readonly userId: string | null;
  readonly cookiesToSet: readonly CookieToSet[];
}

/**
 * K-116: middleware veritabanına gitmez (Edge çalışma ortamı; her istekte tur da gereksiz). Çerez VARSA "oturum olabilir"
 * denir; geçersiz/süresi dolmuş çerezi sunucu bileşeni (getCurrentUser) anonim sayar ve giriş sayfasına yönlendirir.
 */
export async function refreshSession(requestCookies: { getAll(): { name: string }[] }): Promise<SessionRefresh> {
  return { userId: hasAuthCookie(requestCookies.getAll().map((c) => c.name)) ? 'session' : null, cookiesToSet: [] };
}
