import type { PriceTable } from '../domain/pricing';
import type { RunOutput } from './runtime';
import { isGroup, type BomRow } from './types';

export type EnginePriceLine = 'steel' | 'labor' | 'roof' | 'wall' | 'bolts';
export interface EnginePrice {
  readonly lines: readonly { readonly key: EnginePriceLine; readonly amount: number }[];
  readonly total: number;
  readonly currency: string;
  readonly unpriced: readonly EnginePriceLine[];
}
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Tahmini fiyat (K-67/K-110): çelik kg (levha ve cıvata dahil) × birim + işçilik (çelik × (katsayı − 1)) + çatı/cephe m² × birim.
 * Çatı/cephe satırları kalem anahtarından tanınır (roof* / wall|fac|gable*). Çelik fiyatı ya da para birimi yoksa null — rakam uydurulmaz (K-66).
 */
export function computeEnginePrice(out: RunOutput, table: PriceTable): EnginePrice | null {
  if (table.steelPerKg === null || !table.currency) return null;
  const rows = out.bom.filter((r): r is BomRow => !isGroup(r));
  const lines: { key: EnginePriceLine; amount: number }[] = [];
  const unpriced: EnginePriceLine[] = [];
  const steel = r2(out.steelKg * table.steelPerKg);
  lines.push({ key: 'steel', amount: steel });
  if (table.laborFactor > 1) lines.push({ key: 'labor', amount: r2(steel * (table.laborFactor - 1)) });
  const area = (test: (k: string) => boolean) => rows.filter((r) => r.unit === 'm2' && r.key && test(r.key) && !/Area$/.test(r.key)).reduce((a, r) => a + (r.amount ?? 0), 0);
  const roofArea = area((k) => /^roof/.test(k));
  const wallArea = area((k) => /^(wall|fac|gable)/.test(k));
  if (roofArea > 0) { if (table.roofPerM2 === null) unpriced.push('roof'); else lines.push({ key: 'roof', amount: r2(roofArea * table.roofPerM2) }); }
  if (wallArea > 0) { if (table.wallPerM2 === null) unpriced.push('wall'); else lines.push({ key: 'wall', amount: r2(wallArea * table.wallPerM2) }); }
  return { lines, total: r2(lines.reduce((a, l) => a + l.amount, 0)), currency: table.currency, unpriced };
}
