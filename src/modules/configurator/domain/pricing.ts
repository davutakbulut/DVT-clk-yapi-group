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
