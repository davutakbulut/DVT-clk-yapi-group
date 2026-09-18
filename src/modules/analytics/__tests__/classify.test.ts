import { describe, expect, it } from 'vitest';
import { classifyReferrer, collectSchema, detectDevice, isBot, maskIp, parseUserAgent, rateVital } from '../domain/classify';

describe('analytics classify', () => {
  it('referrer türü: AI, arama, sosyal, reklam (UTM), e-posta, kendi alanı direct', () => {
    expect(classifyReferrer('https://chatgpt.com/c/123', {}, 'clkyapi.com')).toEqual({ kind: 'ai', host: 'chatgpt.com' });
    expect(classifyReferrer('https://www.google.com/search?q=x', {}, 'clkyapi.com').kind).toBe('search');
    expect(classifyReferrer('https://www.linkedin.com/feed', {}, 'clkyapi.com').kind).toBe('social');
    expect(classifyReferrer('https://www.google.com/', { medium: 'cpc' }, 'clkyapi.com').kind).toBe('ads');
    expect(classifyReferrer('', { medium: 'email' }, 'clkyapi.com').kind).toBe('email');
    expect(classifyReferrer('https://www.clkyapi.com/tr/hizmetler', {}, 'clkyapi.com')).toEqual({ kind: 'direct', host: null });
    expect(classifyReferrer('https://example.org/blog', {}, 'clkyapi.com')).toEqual({ kind: 'referral', host: 'example.org' });
    expect(classifyReferrer('not a url', {}, 'clkyapi.com').kind).toBe('direct');
  });

  it('cihaz, bot, UA, IP maskesi, vital derecesi', () => {
    expect([detectDevice(390), detectDevice(800), detectDevice(1440)]).toEqual(['mobile', 'tablet', 'desktop']);
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBot('Mozilla/5.0 (iPhone) AppleWebKit Safari/604.1')).toBe(false);
    expect(isBot(null)).toBe(true);
    expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36')).toEqual({ browser: 'Chrome', os: 'Android' });
    expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/17 Safari/605')).toEqual({ browser: 'Safari', os: 'macOS' });
    expect(maskIp('85.104.12.77, 10.0.0.1')).toBe('85.104.12.0');
    expect(maskIp('2a02:4e0:2:1234:abcd::1')).toBe('2a02:4e0:2:1234::');
    expect(rateVital('LCP', 2000)).toBe('good');
    expect(rateVital('CLS', 0.2)).toBe('needs_improvement');
    expect(rateVital('INP', 900)).toBe('poor');
  });

  it('paket şeması: içerik alanı yok, sınırlar, varsayılanlar', () => {
    const ok = collectSchema.safeParse({ session: { id: '11111111-1111-4111-8111-111111111111', visitor: 'visitor-12345', device: 'mobile' }, events: [{ type: 'click', path: '/tr', x_pct: 50, y_pct: 10 }] });
    expect(ok.success).toBe(true);
    expect(ok.success && ok.data.pageviews).toEqual([]);
    expect(collectSchema.safeParse({ session: { id: 'x', visitor: 'v', device: 'tv' } }).success).toBe(false);
    expect(collectSchema.safeParse({ session: { id: '11111111-1111-4111-8111-111111111111', visitor: 'visitor-12345', device: 'mobile' }, forms: [{ form_key: 'lead', field_name: 'email', value: 'secret@x.com' }] }).success).toBe(true);
    const parsed = collectSchema.parse({ session: { id: '11111111-1111-4111-8111-111111111111', visitor: 'visitor-12345', device: 'mobile' }, forms: [{ form_key: 'lead', field_name: 'email', value: 'secret@x.com' }] });
    expect(JSON.stringify(parsed)).not.toContain('secret@x.com');
  });
});
