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
    expect(rows[0]).toEqual({ sizeLabel: '40×40 mm', sizeKey: null, widthMm: 40, heightMm: 40, thicknessMm: 2, lengthMm: 6000, kgPerM: 2.31, kgPerM2: null, stockCode: 'KP-40-2', variantGroup: null, props: {}, dims: {} });
    expect(rows[1]).toMatchObject({ thicknessMm: null, lengthMm: null, kgPerM: 2.93, stockCode: null });
    expect(parseVariants(formatVariants(rows))).toEqual(rows);
  });

  it('CSV başlıklı biçim (K-90): sütunlar ada göre; geometri d_*; tırnaklı alan; gidiş-dönüş', () => {
    const csv = ['k;g;s;v;lbl;dim;kg;A;I;W;i;U;d_D;d_t', 'BP-21.3X2;;"Ø21,3 (1/2"")";2;Ø21,3×2;"Ø21,3 · 1/2""";0.95;1.21;0.57;0.54;0.69;0.067;21.3;2'].join('\n');
    const rows = parseVariants(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ sizeLabel: 'Ø21,3×2', sizeKey: 'Ø21,3 (1/2")', widthMm: 21.3, heightMm: null, thicknessMm: 2, lengthMm: null, kgPerM: 0.95, kgPerM2: null, stockCode: 'BP-21.3X2', variantGroup: null, props: { A: 1.21, I: 0.57, W: 0.54, i: 0.69, u: 0.067 }, dims: { D: 21.3, t: 2, dim: 'Ø21,3 · 1/2"' } });
    expect(parseVariants(formatVariants(rows))).toEqual(rows);
    // Plaka: kg/m² ve grup kodu; I profil: h/b/tw/tf/r geometrisi → yükseklik/genişlik
    const plate = parseVariants('k;g;s;v;lbl;dim;kgm2;p1;d_t\nDKP-0.4;DKP;0,4 mm;0.4;DKP 0,4 mm;0,4 mm;3.14;6.3;0.4')[0]!;
    expect(plate).toMatchObject({ variantGroup: 'DKP', kgPerM: null, kgPerM2: 3.14, thicknessMm: 0.4, dims: { t: 0.4, dim: '0,4 mm' } });
    const hea = parseVariants('k;g;s;v;lbl;dim;kg;A;Ix;d_h;d_b;d_tw;d_tf;d_r\nHEA-100;;HEA 100;;HEA 100;96 × 100;16.7;21.24;349.3;96;100;5;8;12')[0]!;
    expect(hea).toMatchObject({ sizeKey: 'HEA 100', heightMm: 96, widthMm: 100, thicknessMm: null, kgPerM: 16.7, props: { A: 21.24, Ix: 349.3 }, dims: { h: 96, b: 100, tw: 5, tf: 8, r: 12 } });
  });
});
