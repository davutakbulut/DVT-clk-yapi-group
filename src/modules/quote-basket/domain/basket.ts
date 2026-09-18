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
}

export const itemKey = (i: Pick<BasketItem, 'productId' | 'variantId'>) => `${i.productId}:${i.variantId ?? ''}`;

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
  if (existing) return items.map((i) => (itemKey(i) === key ? { ...i, quantity: normalizeQuantity(i.quantity + item.quantity) } : i));
  if (items.length >= BASKET_MAX_ITEMS) return [...items];
  return [...items, { ...item, quantity: normalizeQuantity(item.quantity) }];
}

export function updateItem(items: readonly BasketItem[], key: string, patch: Partial<Pick<BasketItem, 'quantity' | 'note' | 'unit'>>): BasketItem[] {
  return items.map((i) => (itemKey(i) === key ? { ...i, ...patch, quantity: patch.quantity !== undefined ? normalizeQuantity(patch.quantity) : i.quantity } : i));
}

export function removeItem(items: readonly BasketItem[], key: string): BasketItem[] {
  return items.filter((i) => itemKey(i) !== key);
}

/** Server Action'a giden yük: yalnız kimlikler + miktar/birim/not (ad DB'den alınır, ziyaretçiye güvenilmez). */
export function toSubmission(items: readonly BasketItem[]): { product_id: string; variant_id: string | null; quantity: number; unit: string | null; note: string | null }[] {
  return items.map((i) => ({ product_id: i.productId, variant_id: i.variantId, quantity: i.quantity, unit: i.unit || null, note: i.note || null }));
}
