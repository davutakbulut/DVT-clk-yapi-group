import { describe, expect, it } from 'vitest';
import { cornerRadii, dimText, findVariant, galvanizeExtraKg, groupsOf, isConfigurable, normSearch, parseFacts, formatFacts, parseFormats, parseGrouped, parseGroups, plateWeightOf, readOptions, readProps, sizeKey, sizesOf, thicknessesOf, weightOf, writeOptions, type SelectableVariant } from '../domain/productConfig';
import { formatVariants, parseVariants } from '../domain/productLines';

const v = (id: string, h: number, b: number, t: number, kg: number, group: string): SelectableVariant => ({ id, sizeLabel: `${h}×${b}×${t}`, widthMm: b, heightMm: h, thicknessMm: t, lengthMm: null, kgPerM: kg, kgPerM2: null, sizeKey: null, stockCode: `KP-${h}X${b}X${t}`, group, props: {}, dims: {} });
const V = [v('a', 40, 40, 2, 2.31, 'Kare'), v('b', 40, 40, 3, 3.3, 'Kare'), v('c', 100, 50, 3, 6.6, 'Dikdörtgen')];

describe('ürün seçici alanı', () => {
  it('gruplar, ölçüler, kalınlıklar ve seçim', () => {
    expect(groupsOf(V)).toEqual(['Kare', 'Dikdörtgen']);
    expect(sizesOf(V, 'Kare')).toEqual(['40×40']);
    expect(thicknessesOf(V, 'Kare', '40×40')).toEqual([2, 3]);
    expect(findVariant(V, 'Dikdörtgen', '100×50', 3)?.id).toBe('c');
    expect(findVariant(V, 'Kare', '100×50', 3)).toBeNull();
    expect(sizeKey({ ...V[0]!, heightMm: 2.5, widthMm: 40 })).toBe('2,5×40');
    expect(isConfigurable(V)).toBe(true);
    expect(isConfigurable([{ ...V[0]!, kgPerM: null, widthMm: null }])).toBe(false);
  });
  it('ağırlık: kg/m × boy × adet (prototip: 6,60 × 6 × 10 = 396)', () => {
    expect(weightOf(6.6, 6, 10)).toEqual({ perBar: 39.599999999999994, total: 395.99999999999994 });
    expect(weightOf(null, 6, 1)).toEqual({ perBar: null, total: null });
    expect(weightOf(6.6, 0, 1).total).toBeNull();
  });
  it('TS EN 10219 köşe yarıçapları', () => {
    expect(cornerRadii(3)).toEqual({ outer: 6, inner: 3 });
    expect(cornerRadii(8)).toEqual({ outer: 20, inner: 12 });
    expect(cornerRadii(12.5)).toEqual({ outer: 37.5, inner: 25 });
  });
  it('seçenekler ve gerçekler', () => {
    expect(readOptions({ grades: ['S235JRH', ' S355J2H '], lengths_m: [6, '12', -1], custom_length: true, unit: 'adet' })).toMatchObject({ grades: ['S235JRH', 'S355J2H'], lengthsM: [6, 12], customLength: true, unit: 'adet', draw: null, groups: [], sizeUi: 'select' });
    expect(readOptions(null).grades).toEqual([]);
    const facts = parseFacts('Üretim standardı | TS EN 10219\nStok boyları | 6 m · 12 m', 'Standard | EN 10219');
    expect(facts).toEqual([{ label: { tr: 'Üretim standardı', en: 'Standard' }, value: { tr: 'TS EN 10219', en: 'EN 10219' } }, { label: { tr: 'Stok boyları' }, value: { tr: '6 m · 12 m' } }]);
    expect(formatFacts(facts, 'tr')).toBe('Üretim standardı | TS EN 10219\nStok boyları | 6 m · 12 m');
    expect(readProps({ A: '2.41', Ix: 1.84, bad: 1, u: 0 })).toEqual({ A: 2.41, Ix: 1.84 });
  });
  it('varyant satırı: grup ve kesit değerleri; Excel sekmesi; başlık satırı atlanır', () => {
    const rows = parseVariants('Ölçü\tGenişlik\n40×40×2\t40\t40\t2\t\t2,31\tKP-40X40X2\tKare\t2,94\t6,94\t6,94\t3,47\t3,47\t1,54\t1,54\t0,153');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ sizeLabel: '40×40×2', widthMm: 40, kgPerM: 2.31, variantGroup: 'Kare', props: { A: 2.94, Ix: 6.94, u: 0.153 } });
    expect(parseVariants(formatVariants(rows))).toEqual(rows);
    expect(normSearch('100 X 50,5')).toBe('100x50.5');
  });

  it('K-90: kesit türü, gruplar, grup bazlı kalite/ebat/yüzey; yazma-okuma gidiş-dönüş', () => {
    const o = readOptions({ ...writeOptions({ ...readOptions({}), draw: 'plate', pattern: 'tear', sizeUi: 'chips', qtyDefault: 2, groups: parseGroups('DKP | DKP\nHRP | HRP (siyah) | HRP (black)'), grades: [], gradesByGroup: parseGrouped('DKP: DC01, DC03\nHRP: S235JR').byGroup, formats: parseFormats('HRP: 1000×2000, 1500x3000'), surfaces: ['black'], surfacesByGroup: { HRP: ['raw', 'red'] }, groupLabel: { tr: 'Sac tipi' } }) });
    expect(o.draw).toBe('plate');
    expect(o.pattern).toBe('tear');
    expect(o.groups).toEqual([{ code: 'DKP', label: { tr: 'DKP' } }, { code: 'HRP', label: { tr: 'HRP (siyah)', en: 'HRP (black)' } }]);
    expect(o.gradesByGroup).toEqual({ DKP: ['DC01', 'DC03'], HRP: ['S235JR'] });
    expect(o.formats).toEqual({ HRP: [{ w: 1000, l: 2000 }, { w: 1500, l: 3000 }] });
    expect(o.surfacesByGroup).toEqual({ HRP: ['raw', 'red'] });
    expect(readOptions({ draw: 'hexagon', surfaces: ['black', 'gold'] })).toMatchObject({ draw: null, surfaces: ['black'] });
  });
  it('K-90: plaka ağırlığı, galvaniz payı, ölçü metni, grup sırası', () => {
    // DKP 0,4 mm: 3,14 kg/m² × 1000×2000 mm × 2 adet = 12,56 kg (örnek sayfa p1 = 6,3 kg/plaka)
    expect(plateWeightOf(3.14, 1000, 2000, 2)).toEqual({ areaM2: 2, perSheet: 6.28, total: 12.56 });
    expect(plateWeightOf(3.14, 0, 2000, 2).total).toBeNull();
    expect(galvanizeExtraKg({ draw: 'plate', paintAreaM2PerM: null, per: 2, qty: 1 })).toBeCloseTo(2.44);
    expect(galvanizeExtraKg({ draw: 'box', paintAreaM2PerM: 0.29, per: 6, qty: 10 })).toBeCloseTo(0.29 * 0.61 * 2 * 60);
    expect(galvanizeExtraKg({ draw: 'I', paintAreaM2PerM: 0.561, per: 12, qty: 1 })).toBeCloseTo(0.561 * 0.61 * 12);
    const pipe: SelectableVariant = { ...V[0]!, sizeKey: 'Ø21,3 (1/2")', heightMm: null, widthMm: 21.3, dims: { D: 21.3, t: 2 } };
    expect(sizeKey(pipe)).toBe('Ø21,3 (1/2")');
    expect(dimText(pipe, 'pipe')).toBe('Ø21,3');
    expect(dimText({ ...pipe, dims: { dim: 'Ø21,3 · 1/2"' } }, 'pipe')).toBe('Ø21,3 · 1/2"');
    expect(dimText({ ...V[2]!, dims: {} }, 'box')).toBe('100 × 50');
    // Panel sırası (kod ASCII): veride olan gruplar panel sırasıyla, tanımsızlar sonda
    const coded = [{ ...V[0]!, group: 'K' }, { ...V[2]!, group: 'D' }, { ...V[1]!, group: 'X' }];
    const opts = readOptions({ groups: [{ code: 'D', label: { tr: 'Dikdörtgen' } }, { code: 'K', label: { tr: 'Kare' } }, { code: 'Z', label: { tr: 'Yok' } }] });
    expect(groupsOf(coded, opts)).toEqual(['D', 'K', 'X']);
    expect(thicknessesOf([V[0]!, { ...V[1]!, group: 'Kare' }], 'Kare', 'x', true)).toEqual([2, 3]);
  });
});
