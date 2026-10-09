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

  it('boş nesne / boş dize "yok" sayılır (panel boş alanı böyle yazar)', () => {
    const settings = parseSettings([
      { key: 'site.tagline', value: {} },
      { key: 'contact.phone', value: '' },
      { key: 'contact.address', value: { tr: '  ' } },
    ]);
    expect(settings.tagline).toBeNull();
    expect(settings.contact.phone).toBeNull();
    expect(settings.contact.address).toBeNull();
  });

  it('home.page (K-111): bozuk alt alan yalnız o bölümü boşaltır; yol kartları en çok iki', () => {
    const settings = parseSettings([
      { key: 'home.page', value: { hero: { eyebrow: { tr: 'Yapı malzemesi' }, paths: [{ tag: { tr: 'A' }, title: { tr: 'Malzeme' }, text: {} }, { tag: {}, title: { tr: 'Uygulama' }, text: {} }, { tag: {}, title: { tr: 'Fazla' }, text: {} }] }, materials: 'bozuk', contact: { title: { tr: 'İşinizi konuşalım' } } } },
    ]);
    expect(settings.homePage.hero.eyebrow.tr).toBe('Yapı malzemesi');
    expect(settings.homePage.hero.paths).toHaveLength(3); // sınır bileşende (ilk iki)
    expect(settings.homePage.materials.why).toEqual([]);
    expect(settings.homePage.contact.title.tr).toBe('İşinizi konuşalım');
    expect(parseSettings([]).homePage.configurator.button).toEqual({});
  });
});
