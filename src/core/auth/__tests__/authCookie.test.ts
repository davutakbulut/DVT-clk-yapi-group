import { describe, expect, it } from 'vitest';
import { hasAuthCookie } from '../authCookie';

describe('hasAuthCookie', () => {
  it('tek parça oturum çerezini tanır', () => {
    expect(hasAuthCookie(['NEXT_LOCALE', 'sb-exifnifijxnrxagkqwam-auth-token'])).toBe(true);
  });

  // Faz 1 deney #3: gerçek Set-Cookie adları .0 .1 .2 idi
  it('parçalanmış (chunked) oturum çerezini tanır', () => {
    expect(hasAuthCookie(['sb-exifnifijxnrxagkqwam-auth-token.0', 'sb-exifnifijxnrxagkqwam-auth-token.1'])).toBe(true);
  });

  it("URL tanımsızken ref'e sabitlenmez (yerel Supabase); tanımlıyken YALNIZ kendi ref'i sayılır (K-104)", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(hasAuthCookie(['sb-127-auth-token'])).toBe(true);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://exifnifijxnrxagkqwam.supabase.co';
    expect(hasAuthCookie(['sb-127-auth-token'])).toBe(false);
    expect(hasAuthCookie(['sb-exifnifijxnrxagkqwam-auth-token.1'])).toBe(true);
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it.each([
    [[]],
    [['NEXT_LOCALE']],
    [['sb-exifnifijxnrxagkqwam-auth-token-code-verifier']], // PKCE doğrulayıcı: oturum değil
    [['xsb-abc-auth-token']],
    [['sb--auth-token']],
  ])('oturum saymaz: %j', (names) => {
    expect(hasAuthCookie(names)).toBe(false);
  });
});
