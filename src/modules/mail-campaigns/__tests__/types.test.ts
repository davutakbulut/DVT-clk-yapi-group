import { describe, expect, it } from 'vitest';
import { estimateMinutes, formatManualList, parseAudience, parseManualList, progressPercent } from '../domain/types';

describe('toplu e-posta alan yardımcıları (K-108)', () => {
  it('elle liste: dört biçim, tekrar ve bozuk satır ayrılır; büyük I ASCII küçülür (ı olmaz)', () => {
    const r = parseManualList(['INFO@Firma.com', 'Ayşe Yılmaz <ayse@firma.com>', 'ali@firma.com; Ali Veli', 'Veli Can\tveli@firma.com', 'info@firma.com', 'adres-degil', '', 'a@b'].join('\n'));
    expect(r.recipients).toEqual([{ email: 'info@firma.com' }, { email: 'ayse@firma.com', name: 'Ayşe Yılmaz' }, { email: 'ali@firma.com', name: 'Ali Veli' }, { email: 'veli@firma.com', name: 'Veli Can' }]);
    expect(r.duplicates).toBe(1);
    expect(r.invalid).toEqual(['adres-degil', 'a@b']);
    expect(formatManualList(r.recipients).split('\n')[1]).toBe('Ayşe Yılmaz <ayse@firma.com>');
  });

  it('bozuk audience boş kitleye düşer; bilinmeyen segment atılır', () => {
    expect(parseAudience(null)).toEqual({ segments: [], manual: [], manual_attested: false });
    expect(parseAudience({ segments: ['leads'], city: 'İzmir', manual: [{ email: 'a@b.co' }], manual_attested: true })).toEqual({ segments: ['leads'], city: 'İzmir', manual: [{ email: 'a@b.co' }], manual_attested: true });
    expect(parseAudience({ segments: ['herkes'] }).segments).toEqual([]);
  });

  it('ilerleme ve kalan süre', () => {
    expect(progressPercent({ total: 0, pending: 0 })).toBe(0);
    expect(progressPercent({ total: 200, pending: 50 })).toBe(75);
    expect(estimateMinutes(0, 100, 10)).toBe(0);
    expect(estimateMinutes(3, 100, 10)).toBe(1); // sınırın içinde: tek koşu
    expect(estimateMinutes(250, 100, 10)).toBe(150); // saatlik sınır belirleyici
    expect(estimateMinutes(30, 5000, 1)).toBe(30); // koşu başına adet belirleyici
  });
});
