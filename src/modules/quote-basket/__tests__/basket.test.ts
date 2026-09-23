import { describe, expect, it } from 'vitest';
import { addItem, itemKey, parseBasket, removeItem, toSubmission, totalWeightKg, updateItem, type BasketItem } from '../domain/basket';

const base: BasketItem = { productId: 'p1', variantId: 'v1', slug: 'kutu', name: 'Kutu', variantLabel: '40×40', stockCode: 'KP-40', quantity: 2, unit: 'adet', note: '' };

describe('teklif sepeti', () => {
  it('aynı ürün+varyant miktarı toplar; farklı varyant ayrı satır; kaldır/güncelle', () => {
    let items = addItem([], base);
    items = addItem(items, { ...base, quantity: 3 });
    items = addItem(items, { ...base, variantId: 'v2', variantLabel: '50×50' });
    expect(items).toHaveLength(2);
    expect(items[0]!.quantity).toBe(5);
    items = updateItem(items, itemKey(items[0]!), { quantity: '0' as unknown as number, note: 'x' });
    expect(items[0]).toMatchObject({ quantity: 1, note: 'x' });
    items = removeItem(items, itemKey(items[0]!));
    expect(items).toHaveLength(1);
  });

  it('bozuk localStorage güvenle boş; gönderim yükü yalnız kimlik + miktar', () => {
    expect(parseBasket('{bozuk')).toEqual([]);
    expect(parseBasket(JSON.stringify([{ productId: 'p', quantity: '2,5', unit: 'm', foo: 1 }, { nope: true }]))).toEqual([{ productId: 'p', variantId: null, slug: '', name: '', variantLabel: null, stockCode: null, quantity: 2.5, unit: 'm', note: '', attributes: undefined, weightKg: null }]);
    expect(toSubmission([base])).toEqual([{ product_id: 'p1', variant_id: 'v1', quantity: 2, unit: 'adet', note: null, attributes: {} }]);
  });
});

// K-88: seçici nitelikleri — aynı ölçü farklı kalite/boy ayrı kalem; miktar değişince toplam kg güncellenir; gönderimde nitelikler gider
describe('sepet nitelikleri', () => {
  const base = { productId: 'p', variantId: 'v', slug: 's', name: 'Kutu', variantLabel: '100×50×3', stockCode: 'KP', quantity: 10, unit: 'adet', note: '' };
  it('kalite/boy anahtara girer; kg/m × boy × adet', () => {
    const a = addItem([], { ...base, attributes: { grade: 'S235JRH', length_m: 6, kg_per_m: 6.6, total_kg: 396 }, weightKg: 396 });
    const b = addItem(a, { ...base, attributes: { grade: 'S355J2H', length_m: 6, kg_per_m: 6.6, total_kg: 396 }, weightKg: 396 });
    expect(b).toHaveLength(2);
    const c = updateItem(b, itemKey(b[0]!), { quantity: 20 });
    expect(c[0]!.weightKg).toBe(792);
    expect(c[0]!.attributes?.['total_kg']).toBe(792);
    expect(totalWeightKg(c)).toBe(792 + 396);
    expect(totalWeightKg([base])).toBeNull();
    expect(toSubmission(c)[0]).toMatchObject({ attributes: { grade: 'S235JRH', total_kg: 792 } });
  });
  it('depodan okurken bilinmeyen nitelikler atılır', () => {
    const items = parseBasket(JSON.stringify([{ ...base, attributes: { grade: 'S235JRH', hack: 'x', length_m: '6' }, weightKg: 'no' }]));
    expect(items[0]!.attributes).toEqual({ grade: 'S235JRH', length_m: '6' });
    expect(items[0]!.weightKg).toBeNull();
  });
});
