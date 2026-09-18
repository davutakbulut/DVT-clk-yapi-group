import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// 0024: submit_lead sepet kalemleri — yalnız yayındaki ürün, ad/stok kodu DB'den, taslak ürün atlanır, 50 kalem sınırı.
describe('0024 · teklif sepeti', () => {
  let db: PGlite;
  let product: string;
  let variant: string;
  let draft: string;
  beforeAll(async () => {
    db = await createTestDb();
    product = (await db.query<{ id: string }>(`insert into public.products (slug, name, status, published_locales, published_at) values ('{"tr": "kutu"}', '{"tr": "Kutu Profil"}', 'published', '{tr}', now()) returning id`)).rows[0]!.id;
    variant = (await db.query<{ id: string }>(`insert into public.product_variants (product_id, size_label, stock_code) values ($1, '40×40', 'KP-40') returning id`, [product])).rows[0]!.id;
    draft = (await db.query<{ id: string }>(`insert into public.products (slug, name) values ('{"tr": "taslak"}', '{"tr": "Taslak"}') returning id`)).rows[0]!.id;
  });
  afterAll(() => db.close());

  it('kalemler anlık görüntüyle yazılır; ziyaretçinin gönderdiği ad DEĞİL veritabanındaki ad; taslak ürün atlanır', async () => {
    const items = [
      { product_id: product, variant_id: variant, quantity: '12', unit: 'adet', note: 'Galvanizli', name: 'SAHTE AD' },
      { product_id: draft, quantity: 3 },
      { product_id: product, quantity: 0 },
    ];
    const { rows } = await db.query<{ r: { id: string; items: number } }>(`select public.submit_lead($1::jsonb) as r`, [JSON.stringify({ source: 'quote_basket', full_name: 'Sepet Kullanıcı', email: 's@example.com', consent_kvkk: true, items })]);
    expect(rows[0]!.r.items).toBe(2);
    const li = (await db.query<{ product_name_snapshot: string; variant_label_snapshot: string | null; stock_code_snapshot: string | null; quantity: string; unit: string | null; note: string | null }>(`select product_name_snapshot, variant_label_snapshot, stock_code_snapshot, quantity, unit, note from public.lead_items where lead_id = $1 order by sort_order`, [rows[0]!.r.id])).rows;
    expect(li[0]).toEqual({ product_name_snapshot: 'Kutu Profil', variant_label_snapshot: '40×40', stock_code_snapshot: 'KP-40', quantity: '12.000', unit: 'adet', note: 'Galvanizli' });
    expect(li[1]).toMatchObject({ product_name_snapshot: 'Kutu Profil', variant_label_snapshot: null, quantity: '0.001' });
  });

  it('50 kalemden fazlası reddedilir; kalemsiz form eskisi gibi çalışır', async () => {
    const many = Array.from({ length: 51 }, () => ({ product_id: product, quantity: 1 }));
    await expect(db.query(`select public.submit_lead($1::jsonb)`, [JSON.stringify({ full_name: 'X Y', email: 'x@y.com', consent_kvkk: true, items: many })])).rejects.toThrow(/items/);
    const { rows } = await db.query<{ r: { items: number } }>(`select public.submit_lead($1::jsonb) as r`, [JSON.stringify({ full_name: 'X Y', email: 'x@y.com', consent_kvkk: true })]);
    expect(rows[0]!.r.items).toBe(0);
  });
});

import { createTestDb } from './helpers/db';
