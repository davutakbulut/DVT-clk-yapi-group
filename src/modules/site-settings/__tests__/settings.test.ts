import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from '../domain/settings';

describe('site-settings › parseSettings', () => {
  it('0012 referans verisi (hepsi null) → iletişim bölümü boş, site adı dolu', () => {
    const settings = parseSettings([
      { key: 'site.name', value: { tr: 'CLK Yapı Group', en: 'CLK Yapı Group' } }, // static-ok: test verisi
      { key: 'contact.phone', value: null },
      { key: 'social.links', value: [] },
    ]);
    expect(settings.siteName.tr).toBe('CLK Yapı Group'); // static-ok: test verisi
    expect(settings.contact.phone).toBeNull();
    expect(settings.socialLinks).toEqual([]);
  });

  it('bozuk değer alanı düşürür, sayfayı düşürmez', () => {
    const settings = parseSettings([
      { key: 'contact.phone', value: 12345 },
      { key: 'social.links', value: [{ platform: 'x', url: 'bozuk' }] },
      { key: 'site.name', value: 'düz metin' },
    ]);
    expect(settings.contact.phone).toBeNull();
    expect(settings.socialLinks).toEqual([]);
    expect(settings.siteName).toEqual(DEFAULT_SETTINGS.siteName);
  });
});
