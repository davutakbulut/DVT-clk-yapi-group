import { describe, expect, it } from 'vitest';
import { safeReturnUrl } from '../returnUrl';

describe('safeReturnUrl (açık yönlendirme savunması)', () => {
  it('site içi yolları korur, sorgu ve hash dahil', () => {
    expect(safeReturnUrl('/admin', '/')).toBe('/admin');
    expect(safeReturnUrl('/tr/hesabim?tab=teklifler#son', '/')).toBe('/tr/hesabim?tab=teklifler#son');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/%2F%2Fevil',
    '/%2f%2fevil',
    '/%5C%5Cevil',
    '/tr/@evil.example',
    '/tr\\evil',
    '/tr/%00',
    `/tr/${String.fromCharCode(1)}`,
    '',
    '   ',
    'admin',
    'javascript:alert(1)',
    '/%zz',
  ])('reddeder: %s', (bad) => {
    expect(safeReturnUrl(bad, '/tr')).toBe('/tr');
  });

  it('boş/null → yedek', () => {
    expect(safeReturnUrl(null, '/tr')).toBe('/tr');
    expect(safeReturnUrl(undefined, '/tr')).toBe('/tr');
  });
});
