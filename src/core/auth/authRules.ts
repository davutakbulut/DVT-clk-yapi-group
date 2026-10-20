import type { TokenPurpose } from '@/core/db/mysql/authStore';

/** K-116 · Bağlantı jetonlarının ömrü (dakika). */
export const TOKEN_TTL_MINUTES: Readonly<Record<TokenPurpose, number>> = {
  recovery: 60,
  invite: 7 * 24 * 60,
  signup: 24 * 60,
  email_change: 24 * 60,
  magiclink: 60,
};

export const isTokenPurpose = (value: string): value is TokenPurpose => Object.hasOwn(TOKEN_TTL_MINUTES, value);

/** K-104 · Giriş: 15 dakikada e-posta başına 10, IP başına 30 başarısız deneme. */
export const LOGIN_LIMIT = { minutes: 15, perEmail: 10, perIp: 30 } as const;
/** K-104 · Bağlantı postası (sıfırlama/kayıt): saatte e-posta başına 3, IP başına 10 istek. */
export const MAIL_LIMIT = { minutes: 60, perEmail: 3, perIp: 10 } as const;

/** E2E aynı IP'den çok giriş yapar → AUTH_RATE_LIMIT çarpanıyla yükseltilir. */
export const authMultiplier = (): number => Math.max(1, Number(process.env['AUTH_RATE_LIMIT'] ?? 1) || 1);

/** Sayılan deneme eşiğe ulaştıysa yeni deneme reddedilir. */
export function overLimit(counts: { byEmail: number; byIp: number }, limit: { perEmail: number; perIp: number }, mult = 1): boolean {
  return counts.byEmail >= limit.perEmail * mult || counts.byIp >= limit.perIp * mult;
}

/** E-postadaki bağlantı: GET onay sayfası gösterir, jetonu yalnız POST tüketir (K-84). */
export function authLink(origin: string, token: string, purpose: TokenPurpose, next: string): string {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('token_hash', token);
  url.searchParams.set('type', purpose);
  url.searchParams.set('next', next);
  return url.toString();
}
