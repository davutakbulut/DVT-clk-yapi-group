import { describe, expect, it } from 'vitest';
import { addItem, parseBasket, removeItem, toSubmission, updateItem, type BasketItem } from '../domain/basket';

const base: BasketItem = { productId: 'p1', variantId: 'v1', slug: 'kutu', name: 'Kutu', variantLabel: '40×40', stockCode: 'KP-40', quantity: 2, unit: 'adet', note: '' };

describe('teklif sepeti', () => {
  it('aynı ürün+varyant miktarı toplar; farklı varyant ayrı satır; kaldır/güncelle', () => {
    let items = addItem([], base);
    items = addItem(items, { ...base, quantity: 3 });
    items = addItem(items, { ...base, variantId: 'v2', variantLabel: '50×50' });
    expect(items).toHaveLength(2);
    expect(items[0]!.quantity).toBe(5);
    items = updateItem(items, 'p1:v1', { quantity: '0' as unknown as number, note: 'x' });
    expect(items[0]).toMatchObject({ quantity: 1, note: 'x' });
    items = removeItem(items, 'p1:v1');
    expect(items).toHaveLength(1);
  });

  it('bozuk localStorage güvenle boş; gönderim yükü yalnız kimlik + miktar', () => {
    expect(parseBasket('{bozuk')).toEqual([]);
    expect(parseBasket(JSON.stringify([{ productId: 'p', quantity: '2,5', unit: 'm', foo: 1 }, { nope: true }]))).toEqual([{ productId: 'p', variantId: null, slug: '', name: '', variantLabel: null, stockCode: null, quantity: 2.5, unit: 'm', note: '' }]);
    expect(toSubmission([base])).toEqual([{ product_id: 'p1', variant_id: 'v1', quantity: 2, unit: 'adet', note: null }]);
  });
});
