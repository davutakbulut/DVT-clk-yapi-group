/** Teklif sepeti (K-27: sepet var, ödeme yok). Yalnız tarayıcıda: localStorage `clk_basket`; sunucu görmez, gönderimde talep kalemlerine dönüşür. */
export const BASKET_KEY = 'clk_basket';
export const BASKET_EVENT = 'clk:basket';
export const BASKET_MAX_ITEMS = 50;

export interface BasketItem {
  readonly productId: string;
  readonly variantId: string | null;
  readonly slug: string;
  readonly name: string;
  readonly variantLabel: string | null;
  readonly stockCode: string | null;
  readonly quantity: number;
  readonly unit: string;
  readonly note: string;
  /** Seçici nitelikleri (K-88): kalite, boy (m), kg/m, toplam kg — teklif kalemine snapshot olarak gider. */
  readonly attributes?: Readonly<Record<string, string | number>>;
  readonly weightKg?: number | null;
}

/** Aynı ürün+varyant ama farklı kalite/boy ayrı kalemdir. */
export const itemKey = (i: Pick<BasketItem, 'productId' | 'variantId'> & { readonly attributes?: Readonly<Record<string, string | number>> }) =>
  `${i.productId}:${i.variantId ?? ''}:${i.attributes?.['grade'] ?? ''}:${i.attributes?.['length_m'] ?? ''}:${i.attributes?.['format'] ?? ''}:${i.attributes?.['surface'] ?? ''}`;

/** K-88 kalite/boy/kg; K-90 yüzey, plaka ebadı (format), alan ve kg/m² */
const ATTR_KEYS = ['grade', 'length_m', 'kg_per_m', 'total_kg', 'surface', 'format', 'area_m2', 'kg_per_m2'] as const;
function readAttributes(v: unknown): Record<string, string | number> | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const out: Record<string, string | number> = {};
  for (const k of ATTR_KEYS) {
    const x = (v as Record<string, unknown>)[k];
    if (typeof x === 'string' && x.trim()) out[k] = x.trim().slice(0, 40);
    else if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
  }
  return Object.keys(out).length ? out : undefined;
}

export function parseBasket(raw: string | null | undefined): BasketItem[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value
      .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null && typeof (v as { productId?: unknown }).productId === 'string')
      .map((v) => ({
        productId: String(v['productId']),
        variantId: typeof v['variantId'] === 'string' ? v['variantId'] : null,
        slug: typeof v['slug'] === 'string' ? v['slug'] : '',
        name: typeof v['name'] === 'string' ? v['name'] : '',
        variantLabel: typeof v['variantLabel'] === 'string' ? v['variantLabel'] : null,
        stockCode: typeof v['stockCode'] === 'string' ? v['stockCode'] : null,
        quantity: normalizeQuantity(v['quantity']),
        unit: typeof v['unit'] === 'string' ? v['unit'].slice(0, 20) : '',
        note: typeof v['note'] === 'string' ? v['note'].slice(0, 500) : '',
        attributes: readAttributes(v['attributes']),
        weightKg: typeof v['weightKg'] === 'number' && Number.isFinite(v['weightKg']) ? v['weightKg'] : null,
      }))
      .slice(0, BASKET_MAX_ITEMS);
  } catch {
    return [];
  }
}

export function normalizeQuantity(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(Math.round(n * 1000) / 1000, 1_000_000);
}

/** Aynı ürün+varyant zaten varsa miktar toplanır. */
export function addItem(items: readonly BasketItem[], item: BasketItem): BasketItem[] {
  const key = itemKey(item);
  const existing = items.find((i) => itemKey(i) === key);
  if (existing) return items.map((i) => (itemKey(i) === key ? withWeight({ ...i, quantity: normalizeQuantity(i.quantity + item.quantity) }) : i));
  if (items.length >= BASKET_MAX_ITEMS) return [...items];
  return [...items, { ...item, quantity: normalizeQuantity(item.quantity) }];
}

export function updateItem(items: readonly BasketItem[], key: string, patch: Partial<Pick<BasketItem, 'quantity' | 'note' | 'unit'>>): BasketItem[] {
  return items.map((i) => (itemKey(i) === key ? withWeight({ ...i, ...patch, quantity: patch.quantity !== undefined ? normalizeQuantity(patch.quantity) : i.quantity }) : i));
}

/** Miktar değişince toplam ağırlık yeniden hesaplanır: kg/m × boy × adet ya da plakada kg/m² × alan (m²) × adet (K-90); veri yoksa dokunulmaz. */
function withWeight(i: BasketItem): BasketItem {
  const kg = Number(i.attributes?.['kg_per_m']);
  const len = Number(i.attributes?.['length_m']);
  const kg2 = Number(i.attributes?.['kg_per_m2']);
  const area = Number(i.attributes?.['area_m2']);
  const per = kg > 0 && len > 0 ? kg * len : kg2 > 0 && area > 0 ? kg2 * area : null;
  if (per === null) return i;
  const total = Math.round(per * i.quantity * 10) / 10;
  return { ...i, weightKg: total, attributes: { ...i.attributes, total_kg: total } };
}

export function totalWeightKg(items: readonly BasketItem[]): number | null {
  const withW = items.filter((i) => typeof i.weightKg === 'number');
  return withW.length ? withW.reduce((a, i) => a + (i.weightKg ?? 0), 0) : null;
}

export function removeItem(items: readonly BasketItem[], key: string): BasketItem[] {
  return items.filter((i) => itemKey(i) !== key);
}

/** Server Action'a giden yük: yalnız kimlikler + miktar/birim/not (ad DB'den alınır, ziyaretçiye güvenilmez). */
export function toSubmission(items: readonly BasketItem[]): { product_id: string; variant_id: string | null; quantity: number; unit: string | null; note: string | null; attributes: Record<string, string | number> }[] {
  return items.map((i) => ({ product_id: i.productId, variant_id: i.variantId, quantity: i.quantity, unit: i.unit || null, note: i.note || null, attributes: i.attributes ?? {} }));
}
