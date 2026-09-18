import { NextResponse, type NextRequest } from 'next/server';
import type { SessionRefresh } from '@/core/auth/refreshSession';

export interface MiddlewareParts {
  readonly refreshSession: (request: NextRequest) => Promise<SessionRefresh>;
  readonly intl: (request: NextRequest) => NextResponse;
  /** Giriş gerektiren yollar (yalnız deneyim). Varsayılan: /admin ve üye alanı. */
  readonly requiresLogin?: (pathname: string) => boolean;
  /** Giriş sayfası (dil önekli). */
  readonly loginPath?: string;
}

const MEMBER_AREA = /^[/](tr[/]hesabim|en[/]account)([/]|$)/;
export function defaultRequiresLogin(pathname: string): boolean {
  return startsWithSegment(pathname, '/admin') || MEMBER_AREA.test(pathname);
}
export const DEFAULT_LOGIN_PATH = '/tr/giris';

// K-12 · Bu önekler locale dışıdır; next-intl dokunursa /admin → /tr/admin yönlendirmesi auth kapısıyla çakışır.
const LOCALE_FREE_PREFIXES = ['/admin', '/api'] as const;

function startsWithSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * K-13 · İki değişmez:
 *   1. Supabase DALLANMADAN ÖNCE çalışır (kullanıcıyı bilmek gerekir)
 *   2. Çerezler EN SONDA, gerçekten dönülen yanıta basılır — next-intl'in redirect'i bile
 *      yenilenmiş oturumu taşımalı. Aksi hâlde kullanıcılar saatte bir "rastgele" çıkış yapar.
 */
export function composeMiddleware({ refreshSession, intl, requiresLogin = defaultRequiresLogin, loginPath = DEFAULT_LOGIN_PATH }: MiddlewareParts) {
  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const { pathname, search } = request.nextUrl;

    // PKCE kod değişimi kendi çerezlerini yönetir; araya girilmez.
    if (startsWithSegment(pathname, '/auth')) return NextResponse.next();

    const session = await refreshSession(request);

    // Yalnız DENEYİM (K-14): oturumsuz ziyaretçi giriş sayfasına taşınır; rol kontrolü sunucu bileşeninde, sınır RLS'te.
    // next= yalnız yol+sorgu; giriş sayfası onu safeReturnUrl ile yeniden doğrular.
    let response: NextResponse;
    if (session.userId === null && requiresLogin(pathname)) {
      const login = new URL(loginPath, request.url);
      login.searchParams.set('next', `${pathname}${search}`);
      response = NextResponse.redirect(login);
    } else {
      response = LOCALE_FREE_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix)) ? NextResponse.next({ request }) : intl(request);
    }

    for (const { name, value, options } of session.cookiesToSet) response.cookies.set(name, value, options);
    // Set-Cookie taşıyan yanıt CDN'de önbelleklenirse bir kullanıcının oturumu başkasına servis edilir.
    if (session.cookiesToSet.length > 0) response.headers.set('Cache-Control', 'private, no-store');

    return response;
  };
}
