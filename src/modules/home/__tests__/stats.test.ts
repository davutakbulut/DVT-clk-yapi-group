import { describe, expect, it } from 'vitest';
import { formatStats, parseStats, readStats } from '../domain/stats';

describe('about stats', () => {
  it('satırları ayrıştırır; boş EN yazılmaz, değersiz satır atlanır', () => {
    const out = parseStats('%40-60 | Kaba yapı hızlanması | Rough-frame speedup\n0 | Priz bekleme\n\n| etiketsiz\nParalel');
    expect(out).toEqual([
      { value: '%40-60', label: { tr: 'Kaba yapı hızlanması', en: 'Rough-frame speedup' } },
      { value: '0', label: { tr: 'Priz bekleme' } },
    ]);
  });

  it('format ↔ parse gidiş dönüşü', () => {
    const stats = [{ value: '12', label: { tr: 'Yıl', en: 'Years' } }];
    expect(parseStats(formatStats(stats))).toEqual(stats);
  });

  it('bozuk JSON güvenle boşa düşer', () => {
    expect(readStats(null)).toEqual([]);
    expect(readStats([{ value: 3, label: { tr: 'x', en: 5 } }, 'a', { label: {} }])).toEqual([{ value: '3', label: {} }]);
  });
});
