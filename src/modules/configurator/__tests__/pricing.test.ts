import { describe, expect, it } from 'vitest';
import { computePrice, type PriceTable } from '../domain/pricing';
import type { Takeoff } from '../domain/takeoff';

// Sentetik test değerleri — gerçek fiyatlar panelden (K-55).
const takeoff: Takeoff = {
  lines: [],
  panels: [
    { kind: 'roof', pieces: 2, totalAreaM2: 800, totalWeightKg: null },
    { kind: 'wall', pieces: 2, totalAreaM2: 480, totalWeightKg: null },
    { kind: 'gable', pieces: 4, totalAreaM2: 255, totalWeightKg: null },
  ],
  plates: 10,
  bolts: 200,
  steelKg: 10000,
  panelKg: 0,
  missingProfiles: [],
  complete: true,
};
const table: PriceTable = { steelPerKg: 30, roofPerM2: 400, wallPerM2: 350, boltPerPiece: 5, currency: 'TRY', laborFactor: 1.2, missing: [] };

describe('computePrice (elle doğrulanmış)', () => {
  it('çelik 10 t × 30 = 300.000; işçilik %20 = 60.000; çatı 800 × 400 = 320.000; duvar+alın 735 × 350 = 257.250; civata 200 × 5 = 1.000 → 938.250', () => {
    const p = computePrice(takeoff, table)!;
    expect(p.total).toBe(938250);
    expect(p.lines.map((l) => l.key)).toEqual(['steel', 'labor', 'roof', 'wall', 'bolts']);
    expect(p.unpriced).toEqual([]);
    expect(p.currency).toBe('TRY');
  });
  it('panel/civata fiyatı yoksa kalem atlanır ve unpriced listelenir; çelik fiyatı ya da tonaj yoksa null', () => {
    const p = computePrice(takeoff, { ...table, roofPerM2: null, boltPerPiece: null, laborFactor: 1 })!;
    expect(p.total).toBe(300000 + 257250);
    expect(p.unpriced).toEqual(['roof', 'bolts']);
    expect(computePrice(takeoff, { ...table, steelPerKg: null })).toBeNull();
    expect(computePrice({ ...takeoff, complete: false, missingProfiles: ['IPE300'] }, table)).toBeNull();
    expect(computePrice(takeoff, { ...table, currency: null })).toBeNull();
  });
});
