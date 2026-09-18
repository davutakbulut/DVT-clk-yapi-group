/** Hızlı hesaplayıcı — tamamen istemci tarafında (01-PUBLIC-PAGES): aralık = birim fiyat aralığı × metraj. Sunucuya gitmez. */
export interface PriceRange {
  readonly min: number;
  readonly max: number;
}

export function estimateRange(row: { readonly minPrice: number | null; readonly maxPrice: number | null }, quantity: number): PriceRange | null {
  if (row.minPrice === null || row.maxPrice === null) return null;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return { min: row.minPrice * quantity, max: row.maxPrice * quantity };
}

/** Kullanıcı girdisi: "1.250,5" / "1250.5" → sayı; geçersizse null. */
export function parseQuantity(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '');
  if (!cleaned) return null;
  // Hem "1.250,50" (TR) hem "1,250.50" (EN) hem "1250.5"
  const normalized = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}
