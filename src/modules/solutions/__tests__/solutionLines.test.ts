import { describe, expect, it } from 'vitest';
import { formatAdvantages, formatComparisonRows, parseAdvantages, parseComparisonRows, readComparison } from '../domain/solutionLines';

describe('solutionLines', () => {
  it('karşılaştırma satırları TR/EN sırayla eşleşir; eksik hücre boş kalır', () => {
    const rows = parseComparisonRows('Saha süresi | Kısa | Uzun\nAğırlık | Hafif', 'Site time | Short | Long');
    expect(rows).toEqual([
      { criterion: { tr: 'Saha süresi', en: 'Site time' }, steel: { tr: 'Kısa', en: 'Short' }, alternative: { tr: 'Uzun', en: 'Long' } },
      { criterion: { tr: 'Ağırlık' }, steel: { tr: 'Hafif' }, alternative: {} },
    ]);
    expect(formatComparisonRows(rows, 'tr')).toBe('Saha süresi | Kısa | Uzun\nAğırlık | Hafif | ');
    expect(formatComparisonRows(rows, 'en')).toBe('Site time | Short | Long');
  });

  it('avantajlar: başlık | açıklama; okuma bozuk girdiyi eler', () => {
    const items = parseAdvantages('Hızlı | Atölye imalatı\nHafif', '');
    expect(items).toEqual([
      { title: { tr: 'Hızlı' }, description: { tr: 'Atölye imalatı' } },
      { title: { tr: 'Hafif' }, description: {} },
    ]);
    expect(formatAdvantages(items, 'tr')).toBe('Hızlı | Atölye imalatı\nHafif');
    expect(readComparison({ alternative: { tr: 'Betonarme' }, rows: [{ criterion: { tr: 'x' } }, { bozuk: true }, null] })).toEqual({ alternative: { tr: 'Betonarme' }, rows: [{ criterion: { tr: 'x' }, steel: {}, alternative: {} }] });
    expect(readComparison('yok')).toEqual({ alternative: {}, rows: [] });
  });
});
