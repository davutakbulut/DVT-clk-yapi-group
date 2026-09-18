import { createServerClient } from '@/core/db/createServerClient';
import type { PriceTable } from '../domain/pricing';
import type { ConfiguratorRules } from './rulesRepository';

/**
 * Üye oturumuyla birim fiyat tablosu (material_prices RLS: yalnız oturumlu okur, K-29). price_map kodları boş/yoksa → null kalem.
 * Birim dönüşümü: çelik kg ya da ton (÷1000); panel m²; civata adet. Çelikten farklı para birimi → kalem dışarıda (missing).
 * Asla fırlatmaz: hata → tamamen boş tablo.
 */
export async function loadPriceTable(rules: ConfiguratorRules): Promise<PriceTable> {
  const empty: PriceTable = { steelPerKg: null, roofPerM2: null, wallPerM2: null, boltPerPiece: null, currency: null, laborFactor: rules.laborFactor, missing: ['steel', 'roof', 'wall', 'bolt'] };
  const codes = Object.values(rules.priceMap).filter(Boolean);
  if (codes.length === 0) return empty;
  const client = await createServerClient();
  if (!client.ok) return empty;
  const { data, error } = await client.data.from('material_prices').select('code, unit, unit_price, currency').in('code', codes);
  if (error || !data) return empty;
  const byCode = new Map(data.map((m) => [m.code, m]));
  const missing: string[] = [];
  const steelRow = rules.priceMap.steel ? byCode.get(rules.priceMap.steel) : undefined;
  const currency = steelRow?.currency ?? null;
  const pick = (key: keyof ConfiguratorRules['priceMap'], units: readonly string[], scale: (unit: string, price: number) => number | null): number | null => {
    const code = rules.priceMap[key];
    const row = code ? byCode.get(code) : undefined;
    if (!row || !units.includes(row.unit) || (currency && row.currency !== currency)) {
      missing.push(key);
      return null;
    }
    return scale(row.unit, Number(row.unit_price));
  };
  const steelPerKg = pick('steel', ['kg', 'ton'], (u, p) => (u === 'ton' ? p / 1000 : p));
  const roofPerM2 = pick('roof_panel', ['m2'], (_u, p) => p);
  const wallPerM2 = pick('wall_panel', ['m2'], (_u, p) => p);
  const boltPerPiece = pick('bolt', ['piece'], (_u, p) => p);
  return { steelPerKg, roofPerM2, wallPerM2, boltPerPiece, currency, laborFactor: rules.laborFactor, missing };
}
