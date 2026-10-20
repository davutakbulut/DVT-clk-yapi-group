import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { readSession, type SessionUser } from '@/core/db/mysql/authStore';
import type { Actor } from '@/core/db/mysql/pool';
import { logger } from '@/core/observability/logger';
import { SESSION_COOKIE } from './authCookie';

/** K-116 · Oturum çerezi: rastgele 256 bit jeton, veritabanında yalnız özeti. httpOnly → istemci betiği okuyamaz. */
export { SESSION_COOKIE };

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

/** İstek başına bir kez. Asla fırlatmaz: veritabanı hatası → anonim (03-ERROR-ISOLATION). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const res = await readSession(token);
  if (!res.ok) {
    logger.warn('Oturum okunamadı, anonim devam ediliyor', { module: 'core/auth', cause: res.error });
    return null;
  }
  return res.data;
});

/** Sorgu katmanının aktörü: etkin profilin rolüyle kullanıcı, yoksa anonim. */
export async function getSessionActor(): Promise<Actor> {
  const user = await getSessionUser();
  return user ? { kind: 'user', userId: user.id, role: user.role } : { kind: 'anon' };
}
