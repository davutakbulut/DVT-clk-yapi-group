import { describe, expect, it } from 'vitest';
import type { PriceTable } from '../domain/pricing';
import { Catalog } from '../engine/catalog';
import { hall } from '../engine/apps/hall';
import { plainContext } from '../engine/helpers';
import { computeEnginePrice } from '../engine/pricing';
import { defaultState, runApp } from '../engine/runtime';

// Sentetik test değerleri — gerçek fiyatlar panelden (K-55).
describe('motor fiyatı (K-110)', () => {
  const catalog = Catalog.standard();
  const ctx = plainContext(catalog);
  const out = runApp(hall, defaultState(hall, catalog), ctx);
  const table: PriceTable = { steelPerKg: 30, roofPerM2: 400, wallPerM2: 350, boltPerPiece: 5, currency: 'TRY', laborFactor: 1.2, missing: [] };

  it('çelik kg × birim + işçilik + çatı/cephe m²; toplam satırların toplamı', () => {
    const p = computeEnginePrice(out, table)!;
    const steel = p.lines.find((l) => l.key === 'steel')!.amount;
    expect(steel).toBeCloseTo(out.steelKg * 30, 0);
    expect(p.lines.find((l) => l.key === 'labor')!.amount).toBeCloseTo(steel * 0.2, 0);
    expect(p.lines.find((l) => l.key === 'roof')).toBeDefined(); // hol: çatı paneli m²
    expect(p.lines.find((l) => l.key === 'wall')).toBeDefined(); // yan duvar + alın paneli
    expect(p.total).toBeCloseTo(p.lines.reduce((a, l) => a + l.amount, 0), 2);
    expect(p.unpriced).toEqual([]);
  });

  it('panel fiyatı yoksa kalem fiyatlanmaz ve listelenir; çelik fiyatı yoksa null', () => {
    const p = computeEnginePrice(out, { ...table, roofPerM2: null, wallPerM2: null })!;
    expect(p.unpriced).toEqual(['roof', 'wall']);
    expect(computeEnginePrice(out, { ...table, steelPerKg: null })).toBeNull();
    expect(computeEnginePrice(out, { ...table, currency: null })).toBeNull();
  });
});
