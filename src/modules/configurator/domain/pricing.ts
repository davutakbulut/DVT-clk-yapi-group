import type { Takeoff } from './takeoff';

/** Birim fiyatlar (material_prices'tan, üye oturumuyla okunur K-29). null → o kalem için fiyat girilmemiş; UYDURULMAZ. */
export interface PriceTable {
  readonly steelPerKg: number | null;
  readonly roofPerM2: number | null;
  readonly wallPerM2: number | null;
  readonly boltPerPiece: number | null;
  readonly currency: string | null;
  readonly laborFactor: number;
  /** Eksik/uyumsuz kalemler (kod ya da para birimi) — arayüz açıklar. */
  readonly missing: readonly string[];
}

export type PriceLineKey = 'steel' | 'labor' | 'roof' | 'wall' | 'bolts';
export interface PriceEstimate {
  readonly lines: readonly { readonly key: PriceLineKey; readonly amount: number }[];
  readonly total: number;
  readonly currency: string;
  /** Fiyatlanamayan kalemler (panel/civata fiyatı yok) — toplam eksiktir. */
  readonly unpriced: readonly PriceLineKey[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Tahmini fiyat = çelik kg × birim + işçilik (çelik × (katsayı − 1)) + paneller m² × birim + civata × birim.
 * Çelik fiyatı ya da para birimi yoksa veya tonaj eksikse (kg/m girilmemiş) → null: rakam gösterilmez (K-66).
 */
export function computePrice(takeoff: Takeoff, table: PriceTable): PriceEstimate | null {
  if (!takeoff.complete || table.steelPerKg === null || !table.currency) return null;
  const lines: { key: PriceLineKey; amount: number }[] = [];
  const unpriced: PriceLineKey[] = [];
  const steel = r2(takeoff.steelKg * table.steelPerKg);
  lines.push({ key: 'steel', amount: steel });
  if (table.laborFactor > 1) lines.push({ key: 'labor', amount: r2(steel * (table.laborFactor - 1)) });
  const roofArea = takeoff.panels.filter((p) => p.kind === 'roof').reduce((a, p) => a + p.totalAreaM2, 0);
  const wallArea = takeoff.panels.filter((p) => p.kind !== 'roof').reduce((a, p) => a + p.totalAreaM2, 0);
  if (roofArea > 0) {
    if (table.roofPerM2 === null) unpriced.push('roof');
    else lines.push({ key: 'roof', amount: r2(roofArea * table.roofPerM2) });
  }
  if (wallArea > 0) {
    if (table.wallPerM2 === null) unpriced.push('wall');
    else lines.push({ key: 'wall', amount: r2(wallArea * table.wallPerM2) });
  }
  if (takeoff.bolts > 0) {
    if (table.boltPerPiece === null) unpriced.push('bolts');
    else lines.push({ key: 'bolts', amount: r2(takeoff.bolts * table.boltPerPiece) });
  }
  return { lines, total: r2(lines.reduce((a, l) => a + l.amount, 0)), currency: table.currency, unpriced };
}
