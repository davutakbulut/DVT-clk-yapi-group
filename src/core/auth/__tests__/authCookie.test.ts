import { describe, expect, it } from 'vitest';
import { hasAuthCookie } from '../authCookie';

describe('hasAuthCookie', () => {
  it('oturum çerezini tanır', () => {
    expect(hasAuthCookie(['NEXT_LOCALE', 'clk_session'])).toBe(true);
  });

  it.each([[[]], [['NEXT_LOCALE']], [['sb-exifnifijxnrxagkqwam-auth-token']], [['clk_session_x']]])('oturum saymaz: %j', (names) => {
    expect(hasAuthCookie(names)).toBe(false);
  });
});
