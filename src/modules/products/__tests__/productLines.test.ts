import { describe, expect, it } from 'vitest';
import { formatSpecs, formatVariants, parseSpecs, parseVariants } from '../domain/productLines';

describe('ürün satır biçimleri', () => {
  it('özellikler: TR/EN sıraya göre eşleşir, birim TR satırından', () => {
    const specs = parseSpecs('Malzeme | Kalite | S235JR |\nÖlçü | Et kalınlığı | 2 | mm', 'Material | Grade | S235JR\n');
    expect(specs).toEqual([
      { group: { tr: 'Malzeme', en: 'Material' }, name: { tr: 'Kalite', en: 'Grade' }, value: { tr: 'S235JR', en: 'S235JR' }, unit: null },
      { group: { tr: 'Ölçü' }, name: { tr: 'Et kalınlığı' }, value: { tr: '2' }, unit: 'mm' },
    ]);
    expect(parseSpecs(formatSpecs(specs, 'tr'), formatSpecs(specs, 'en'))).toEqual(specs);
  });

  it('varyantlar: sayılar ondalık virgülle de okunur; pozitif olmayan null', () => {
    const rows = parseVariants('40×40 mm | 40 | 40 | 2 | 6000 | 2,31 | KP-40-2\n50×50 mm | 50 | 50 | 0 | | 2.93');
    expect(rows[0]).toEqual({ sizeLabel: '40×40 mm', widthMm: 40, heightMm: 40, thicknessMm: 2, lengthMm: 6000, kgPerM: 2.31, stockCode: 'KP-40-2', variantGroup: null, props: {} });
    expect(rows[1]).toMatchObject({ thicknessMm: null, lengthMm: null, kgPerM: 2.93, stockCode: null });
    expect(parseVariants(formatVariants(rows))).toEqual(rows);
  });
});
