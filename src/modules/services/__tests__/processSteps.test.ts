import { describe, expect, it } from 'vitest';
import { formatSteps, parseSteps, readSteps } from '../domain/processSteps';

describe('process steps', () => {
  it('TR/EN satırları sıraya göre eşleşir; EN eksik satır yalnız TR kalır', () => {
    const steps = parseSteps('Keşif | Parsel incelenir\nMontaj', 'Survey | Plot reviewed');
    expect(steps).toEqual([
      { title: { tr: 'Keşif', en: 'Survey' }, description: { tr: 'Parsel incelenir', en: 'Plot reviewed' } },
      { title: { tr: 'Montaj' }, description: {} },
    ]);
  });

  it('format ↔ parse gidiş dönüşü', () => {
    const steps = parseSteps('A | a\nB | b', 'X | x\nY | y');
    expect(parseSteps(formatSteps(steps, 'tr'), formatSteps(steps, 'en'))).toEqual(steps);
  });

  it('bozuk JSON güvenle boşa düşer', () => {
    expect(readSteps('x')).toEqual([]);
    expect(readSteps([{ title: { tr: 'A' } }, { title: 3 }, null])).toEqual([{ title: { tr: 'A' }, description: {} }]);
  });
});
