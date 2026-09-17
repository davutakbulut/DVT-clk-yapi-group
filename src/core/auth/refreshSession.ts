import { createMiddlewareClient, type CookieToSet, type RequestCookieJar } from '@/core/db/createMiddlewareClient';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { hasAuthCookie } from './authCookie';

export interface SessionRefresh {
  /** Middleware için yalnız DENEYİM bilgisidir (K-14). Yetki kararı buna dayanmaz. */
  readonly userId: string | null;
  readonly cookiesToSet: readonly CookieToSet[];
}

const ANONYMOUS: SessionRefresh = { userId: null, cookiesToSet: [] };

/** Asla fırlatmaz: auth sunucusu çökse bile site anonim ziyaretçiye açılmaya devam eder. */
export async function refreshSession(requestCookies: RequestCookieJar): Promise<SessionRefresh> {
  // Erken çıkış: anonim ziyaretçi (trafiğin ezici çoğunluğu) için ağ turu atılmaz.
  if (!hasAuthCookie(requestCookies.getAll().map((cookie) => cookie.name))) return ANONYMOUS;

  const env = readSupabasePublicEnv();
  if (!env.ok) return ANONYMOUS;

  const cookiesToSet: CookieToSet[] = [];
  try {
    const supabase = createMiddlewareClient(env.data, requestCookies, cookiesToSet);
    // getSession() değil getUser(): çerezdeki JWT'ye güvenmez, auth sunucusuna doğrulatır.
    const { data } = await supabase.auth.getUser();
    return { userId: data.user?.id ?? null, cookiesToSet };
  } catch (cause) {
    logger.warn('Oturum yenilenemedi, anonim devam ediliyor', { module: 'core/auth', cause });
    return { userId: null, cookiesToSet };
  }
}
