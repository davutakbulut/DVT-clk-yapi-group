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

  it("proje ref'ine sabitlenmez — yerel Supabase'de de çalışır", () => {
    expect(hasAuthCookie(['sb-127-auth-token'])).toBe(true);
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
