import { describe, expect, it } from 'vitest';
import { authLink, isTokenPurpose, LOGIN_LIMIT, MAIL_LIMIT, overLimit, TOKEN_TTL_MINUTES } from '../authRules';

describe('core/auth › giriş kuralları (K-116, K-104)', () => {
  it('bağlantı: jeton, tür ve site içi yol sorgu parametresi olarak kaçırılır', () => {
    const url = new URL(authLink('https://clkyapigroup.com', 'a+b/c=', 'recovery', '/tr/sifre-yenile?x=1&y=2'));
    expect(url.origin + url.pathname).toBe('https://clkyapigroup.com/auth/callback');
    expect(url.searchParams.get('token_hash')).toBe('a+b/c=');
    expect(url.searchParams.get('type')).toBe('recovery');
    expect(url.searchParams.get('next')).toBe('/tr/sifre-yenile?x=1&y=2');
  });

  it('eşik: sayılan deneme sınıra ulaşınca reddedilir; çarpan sınırı büyütür', () => {
    expect(overLimit({ byEmail: 9, byIp: 29 }, LOGIN_LIMIT)).toBe(false);
    expect(overLimit({ byEmail: 10, byIp: 0 }, LOGIN_LIMIT)).toBe(true);
    expect(overLimit({ byEmail: 0, byIp: 30 }, LOGIN_LIMIT)).toBe(true);
    expect(overLimit({ byEmail: 2, byIp: 9 }, MAIL_LIMIT)).toBe(false);
    expect(overLimit({ byEmail: 3, byIp: 0 }, MAIL_LIMIT)).toBe(true);
    expect(overLimit({ byEmail: 3, byIp: 0 }, MAIL_LIMIT, 2)).toBe(false);
  });

  it('jeton türleri ve ömürleri', () => {
    expect(TOKEN_TTL_MINUTES).toEqual({ recovery: 60, invite: 10080, signup: 1440, email_change: 1440, magiclink: 60 });
    expect(isTokenPurpose('invite')).toBe(true);
    expect(isTokenPurpose('email')).toBe(false);
    expect(isTokenPurpose('toString')).toBe(false);
  });
});
