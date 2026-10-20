/** K-116 · Oturum çerezinin adı (core/auth/session.ts yazar). Middleware'de de okunur: saf, sunucu bağımlılığı yok. */
export const SESSION_COOKIE = 'clk_session';

/** Middleware deneyimi için yalnız VARLIK kontrolü (K-14): geçerliliği sunucu bileşeni veritabanında doğrular. */
export function hasAuthCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.includes(SESSION_COOKIE);
}
