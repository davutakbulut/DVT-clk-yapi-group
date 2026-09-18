import { describe, expect, it } from 'vitest';
import { createClientDedupe, cspReportToError, errorReportSchema } from '../domain/errorReport';

describe('errorReport', () => {
  it('şema varsayılanları ve sınırlar', () => {
    const r = errorReportSchema.parse({ message: 'x' });
    expect(r).toMatchObject({ source: 'client', module: 'unknown', level: 'error', context: {} });
    expect(errorReportSchema.safeParse({ message: '' }).success).toBe(false);
    expect(errorReportSchema.safeParse({ message: 'x', status_code: 999 }).success).toBe(false);
  });

  it('CSP raporu (report-uri ve Reporting API) hata paketine döner', () => {
    const a = cspReportToError({ 'csp-report': { 'violated-directive': 'script-src', 'blocked-uri': 'https://evil.example', 'document-uri': 'https://clkyapi.com/tr/hizmetler' } });
    expect(a).toMatchObject({ module: 'csp', level: 'warn', path: '/tr/hizmetler', context: { directive: 'script-src', blocked: 'https://evil.example' } });
    const b = cspReportToError([{ body: { effectiveDirective: 'img-src', blockedURL: 'data:', documentURL: 'https://clkyapi.com/' } }]);
    expect(b?.message).toContain('img-src');
    expect(cspReportToError(null)).toBeNull();
  });

  it('istemci tekilleştirme: aynı mesaj bir kez, en çok N', () => {
    const allow = createClientDedupe(2);
    expect(allow('a')).toBe(true);
    expect(allow('a')).toBe(false);
    expect(allow('b')).toBe(true);
    expect(allow('c')).toBe(false);
  });
});
