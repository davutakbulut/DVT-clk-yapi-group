import { describe, expect, it } from 'vitest';
import { estimateRange, parseQuantity } from '../domain/estimate';
import { formatPriceRows, parsePresets, parsePriceRows } from '../domain/priceLines';

describe('priceLines', () => {
  it('TR satırı sistem | açıklama | kod | min | max; EN yalnız metin; çarpan düzeltmeleri', () => {
    const rows = parsePriceRows('Portal çerçeve | Tek açıklık | s235 | 0,9 | 1,2\nKafes makas | | | | \nBozuk | x | K | -1 | 0', 'Portal frame | Single span');
    expect(rows).toEqual([
      { systemType: { tr: 'Portal çerçeve', en: 'Portal frame' }, description: { tr: 'Tek açıklık', en: 'Single span' }, materialCode: 'S235', minFactor: 0.9, maxFactor: 1.2 },
      { systemType: { tr: 'Kafes makas' }, description: {}, materialCode: null, minFactor: 1, maxFactor: 1 },
      { systemType: { tr: 'Bozuk' }, description: { tr: 'x' }, materialCode: 'K', minFactor: 1, maxFactor: 1 },
    ]);
    expect(formatPriceRows(rows, 'tr').split('\n')[0]).toBe('Portal çerçeve | Tek açıklık | S235 | 0.9 | 1.2');
    expect(formatPriceRows(rows, 'en')).toBe('Portal frame | Single span');
  });

  it('ön ayarlar: virgül/boşluk ayrımı, tekrar ve geçersiz düşer, sıralı; boşsa varsayılan', () => {
    expect(parsePresets('200, 50 100 100 abc -3')).toEqual([50, 100, 200]);
    expect(parsePresets('')).toEqual([50, 100, 200]);
  });
});

describe('estimate', () => {
  it('aralık = fiyat × metraj; fiyatsız satır ya da geçersiz metraj null', () => {
    expect(estimateRange({ minPrice: 900, maxPrice: 1200 }, 50)).toEqual({ min: 45000, max: 60000 });
    expect(estimateRange({ minPrice: null, maxPrice: null }, 50)).toBeNull();
    expect(estimateRange({ minPrice: 900, maxPrice: 1200 }, 0)).toBeNull();
  });
  it('metraj girdisi TR ve EN biçimlerini okur', () => {
    expect(parseQuantity('1.250,5')).toBe(1250.5);
    expect(parseQuantity('1,250.5')).toBe(1250.5);
    expect(parseQuantity('75')).toBe(75);
    expect(parseQuantity('abc')).toBeNull();
    expect(parseQuantity('')).toBeNull();
  });
});
