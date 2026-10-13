import { describe, expect, it } from 'vitest';
import { extractMapEmbedUrl, mapEmbedSrc, mapLinkHref } from '../domain/map';

describe('site-settings › harita (K-112)', () => {
  it('Google "Harita yerleştir" iframe parçasından src ayıklanır', () => {
    const html = '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12&amp;hl=tr" width="600" height="450" style="border:0;"></iframe>';
    expect(extractMapEmbedUrl(html)).toBe('https://www.google.com/maps/embed?pb=!1m18!1m12&hl=tr');
  });

  it('Google dışı kaynak, http ve /maps dışı yol reddedilir (CSP frame-src ile aynı sınır)', () => {
    expect(extractMapEmbedUrl('https://evil.example/maps/embed')).toBeNull();
    expect(extractMapEmbedUrl('http://www.google.com/maps/embed?pb=1')).toBeNull();
    expect(extractMapEmbedUrl('https://www.google.com/search?q=x')).toBeNull();
    expect(extractMapEmbedUrl('javascript:alert(1)')).toBeNull();
    expect(extractMapEmbedUrl('')).toBeNull();
  });

  it('gömme adresi yoksa adresten türetilir; adres de yoksa harita yok', () => {
    const src = mapEmbedSrc('', 'Mihrabat Sokak, Başakşehir / İstanbul', 'tr');
    expect(src).toContain('https://www.google.com/maps?q=Mihrabat%20Sokak');
    expect(src).toContain('output=embed');
    expect(mapEmbedSrc(null, '', 'tr')).toBeNull();
    expect(mapEmbedSrc('https://www.google.com/maps/embed?pb=9', 'x', 'tr')).toBe('https://www.google.com/maps/embed?pb=9');
  });

  it('sorgu biçimli gömme adresinde arayüz dili sayfa diline çekilir; pb biçimine dokunulmaz', () => {
    expect(mapEmbedSrc('https://www.google.com/maps?q=Mihrabat%20Sokak&z=17&output=embed', 'x', 'en')).toBe('https://www.google.com/maps?q=Mihrabat+Sokak&z=17&output=embed&hl=en');
    expect(mapEmbedSrc('https://www.google.com/maps/embed?pb=9', 'x', 'en')).toBe('https://www.google.com/maps/embed?pb=9');
  });

  it('yol tarifi: panel bağlantısı öncelikli, yoksa adres araması', () => {
    expect(mapLinkHref('https://maps.app.goo.gl/abc', 'x')).toBe('https://maps.app.goo.gl/abc');
    expect(mapLinkHref(null, 'A B')).toBe('https://www.google.com/maps/search/?api=1&query=A%20B');
    expect(mapLinkHref(null, '')).toBeNull();
  });
});
