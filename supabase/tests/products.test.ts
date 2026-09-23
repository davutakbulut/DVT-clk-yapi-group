import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb, seedUsers } from './helpers/db';

// 0023: ürün RPC'si — kategori/hizmet/varyant/özellik/belge dil süzgeçli; taslak ürünün alt tabloları sızmaz; Offer yok.
describe('0023 · ürün kataloğu', () => {
  let db: PGlite;
  let productId: string;
  beforeAll(async () => {
    db = await createTestDb({ content: false });
    const cat = (await db.query<{ id: string }>(`insert into public.product_categories (slug, name) values ('{"tr": "kutu-profil", "en": "box-profile"}', '{"tr": "Kutu Profil", "en": "Box Profile"}') returning id`)).rows[0]!.id;
    const svc = (await db.query<{ id: string }>(`select id from public.services where slug->>'tr' = 'endustriyel-tesis-ve-depo'`)).rows[0]!.id;
    productId = (await db.query<{ id: string }>(`insert into public.products (slug, name, category_id, service_id) values ('{"tr": "kare-kutu-profil", "en": "square-box-profile"}', '{"tr": "Kare Kutu Profil", "en": "Square Box Profile"}', $1, $2) returning id`, [cat, svc])).rows[0]!.id;
    await db.query(`insert into public.product_variants (product_id, size_label, width_mm, height_mm, thickness_mm, kg_per_m, stock_code) values ($1, '40×40 mm', 40, 40, 2, 2.31, 'KP-40-2'), ($1, '50×50 mm', 50, 50, 2, 2.93, 'KP-50-2')`, [productId]);
    await db.query(`insert into public.product_specs (product_id, group_name, name, value, unit) values ($1, '{"tr": "Malzeme"}', '{"tr": "Kalite", "en": "Grade"}', '{"tr": "S235JR", "en": "S235JR"}', null)`, [productId]);
  });
  afterAll(() => db.close());

  const bySlug = (locale: string, slug: string) => as(db, anon, async (tx) => (await tx.query<{ p: Record<string, unknown> | null }>('select public.get_product_by_slug($1, $2) as p', [locale, slug])).rows[0]!.p);

  it('taslak ürün: RPC null; varyantlar anonime sızmaz', async () => {
    expect(await bySlug('tr', 'kare-kutu-profil')).toBeNull();
    const seen = await as(db, anon, async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from public.product_variants`)).rows[0]!.n);
    expect(seen).toBe(0);
  });

  it('yayınlanınca: kategori, varyantlar, özellikler, hizmet (yalnız TR yayında), EN → null', async () => {
    await db.query(`update public.products set status = 'published', published_locales = '{tr}', published_at = now() where id = $1`, [productId]);
    const p = await bySlug('tr', 'kare-kutu-profil');
    expect(p?.['name']).toBe('Kare Kutu Profil');
    expect((p?.['category'] as { slug: string }).slug).toBe('kutu-profil');
    expect((p?.['variants'] as unknown[]).length).toBe(2);
    expect((p?.['specs'] as { name: string; value: string }[])[0]).toMatchObject({ name: 'Kalite', value: 'S235JR' });
    expect((p?.['service'] as { slug: string }).slug).toBe('endustriyel-tesis-ve-depo');
    expect(JSON.stringify(p)).not.toContain('"Offer"');
    expect(await bySlug('en', 'square-box-profile')).toBeNull();
  });

  it('EN onaylanınca EN slug çözülür; EN özelliği olmayan satır düşer', async () => {
    await db.query(`update public.products set translation_meta = '{"en": {"reviewed": true}}', published_locales = '{tr,en}' where id = $1`, [productId]);
    await db.query(`insert into public.product_specs (product_id, name, value) values ($1, '{"tr": "Yalnız TR"}', '{"tr": "x"}')`, [productId]);
    const p = await bySlug('en', 'square-box-profile');
    expect(p?.['name']).toBe('Square Box Profile');
    expect((p?.['specs'] as unknown[]).length).toBe(1);
    expect(p?.['alternates']).toEqual({ tr: 'kare-kutu-profil', en: 'square-box-profile' });
  });
});

// 0046 (K-88): seçici sütunları, RPC'de options/facts/variant_group/props, talep kaleminde nitelikler
describe('0046 · ürün seçici', () => {
  it('varyant grubu + kesit değerleri RPC ile gelir; talep kalemi nitelikleri saklar (yalnız nesne)', async () => {
    const db = await createTestDb();
    try {
      await seedUsers(db);
      const cat = (await db.query<{ id: string }>(`insert into public.product_categories (slug, name) values ('{"tr": "kp-cat"}', '{"tr": "Kutu"}') returning id`)).rows[0]!.id;
      const pid = (await db.query<{ id: string }>(`insert into public.products (slug, name, category_id, status, published_locales, published_at, options, facts)
        values ('{"tr": "kutu-test"}', '{"tr": "Kutu Test"}', $1, 'published', '{tr}', now(),
                '{"grades": ["S235JRH"], "lengths_m": [6, 12], "custom_length": true, "unit": "adet"}', '[{"label": {"tr": "Standart"}, "value": {"tr": "TS EN 10219"}}]') returning id`, [cat])).rows[0]!.id;
      await db.query(`insert into public.product_variants (product_id, size_label, width_mm, height_mm, thickness_mm, kg_per_m, stock_code, variant_group, props, sort_order)
        values ($1, '100×50×3', 50, 100, 3, 6.6, 'T-KP-100X50X3', '{"tr": "Dikdörtgen", "en": "Rectangular"}', '{"A": 8.41, "Ix": 104.7, "u": 0.29}', 1)`, [pid]);
      const p = (await db.query<{ r: Record<string, unknown> }>('select public.get_product_by_slug($1, $2) as r', ['tr', 'kutu-test'])).rows[0]!.r;
      expect(p['options']).toMatchObject({ grades: ['S235JRH'], custom_length: true });
      expect((p['facts'] as unknown[]).length).toBe(1);
      const v = (p['variants'] as Record<string, unknown>[])[0]!;
      expect(v).toMatchObject({ variant_group: 'Dikdörtgen', kg_per_m: 6.6, props: { A: 8.41, u: 0.29 } });
      const en = (await db.query<{ r: Record<string, unknown> | null }>('select public.get_product_by_slug($1, $2) as r', ['en', 'kutu-test'])).rows[0]!.r;
      expect(en).toBeNull(); // EN yayında değil (K-08)

      const vid = (await db.query<{ id: string }>('select id from public.product_variants where product_id = $1', [pid])).rows[0]!.id;
      const lead = (await db.query<{ r: { id: string } }>('select public.submit_lead($1::jsonb) as r', [JSON.stringify({ source: 'quote_basket', full_name: 'Test Kişi', email: 't@ornek.com.tr', consent_kvkk: true, items: [
        { product_id: pid, variant_id: vid, quantity: 10, unit: 'adet', attributes: { grade: 'S235JRH', length_m: 6, kg_per_m: 6.6, total_kg: 396 } },
        { product_id: pid, variant_id: vid, quantity: 1, attributes: 'bozuk' },
      ] })])).rows[0]!.r;
      const items = (await db.query<{ attributes: Record<string, unknown>; quantity: string }>('select attributes, quantity from public.lead_items where lead_id = $1 order by sort_order', [lead.id])).rows;
      expect(items).toHaveLength(2);
      expect(items[0]!.attributes).toEqual({ grade: 'S235JRH', length_m: 6, kg_per_m: 6.6, total_kg: 396 });
      expect(items[1]!.attributes).toEqual({});
    } finally {
      db.close();
    }
  });

  // 0047 (K-90): ölçü anahtarı, kg/m², geometri ve grup KODU RPC'de; eski dil etiketli grup geriye dönük
  it('0047: size_key / kg_per_m2 / dims ve grup kodu RPC ile döner', async () => {
    const db = await createTestDb();
    try {
    const cat = (await db.query<{ id: string }>(`insert into public.product_categories (slug, name) values ('{"tr": "sac-cat"}', '{"tr": "Sac"}') returning id`)).rows[0]!.id;
    const pid = (await db.query<{ id: string }>(`insert into public.products (slug, name, category_id, status, published_locales, published_at, options)
      values ('{"tr": "sac-test"}', '{"tr": "Sac Test"}', $1, 'published', '{tr}', now(), '{"draw": "plate", "groups": [{"code": "DKP", "label": {"tr": "DKP"}}], "formats": {"DKP": [{"w": 1000, "l": 2000}]}}') returning id`, [cat])).rows[0]!.id;
    await db.query(`insert into public.product_variants (product_id, size_label, size_key, thickness_mm, kg_per_m2, stock_code, variant_group, dims, sort_order)
      values ($1, 'DKP 0,4 mm', '0,4 mm', 0.4, 3.14, 'DKP-0.4', '{"code": "DKP"}', '{"t": 0.4, "dim": "0,4 mm"}', 1), ($1, 'Eski', null, 2, null, 'ESKI', '{"tr": "Kare"}', '{}', 2)`, [pid]);
    const p = (await db.query<{ r: Record<string, unknown> }>('select public.get_product_by_slug($1, $2) as r', ['tr', 'sac-test'])).rows[0]!.r;
    const v = p['variants'] as Record<string, unknown>[];
    expect(v[0]).toMatchObject({ size_key: '0,4 mm', kg_per_m2: 3.14, variant_group: 'DKP', dims: { t: 0.4, dim: '0,4 mm' } });
    expect(v[1]).toMatchObject({ variant_group: 'Kare', kg_per_m2: null });
    expect(p['options']).toMatchObject({ draw: 'plate' });
    await expect(db.query(`insert into public.product_variants (product_id, size_label, kg_per_m2) values ($1, 'x', -1)`, [pid])).rejects.toThrow();
    } finally {
      await db.close();
    }
  });
});
