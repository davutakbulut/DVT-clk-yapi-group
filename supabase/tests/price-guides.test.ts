import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0026: fiyat rehberi RPC'si — material_prices anonime kapalı kalır; yayındaki rehber türetilmiş min/max aralığı döner;
// taslak rehber null; satır/fiyat değişince prices_updated_at yenilenir; bayat bayrağı; tohum fiyat YOK (K-55).
describe('0026 · fiyat rehberi', () => {
  let db: PGlite;
  let users: TestUsers;
  let guideId: string;
  let priceId: string;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
    priceId = (await db.query<{ id: string }>(`insert into public.material_prices (code, name, category, unit, unit_price, currency) values ('TEST-S235', '{"tr": "S235 yapısal çelik"}', 'steel', 'ton', 1000, 'TRY') returning id`)).rows[0]!.id;
    guideId = (
      await db.query<{ id: string }>(
        `insert into public.price_guides (slug, title, disclaimer, quantity_presets) values ('{"tr": "celik-ton-fiyatlari", "en": "steel-ton-prices"}', '{"tr": "Çelik Ton Fiyatları", "en": "Steel Ton Prices"}', '{"tr": "Tahmini aralıktır; kesin teklif keşif sonrası verilir."}', '{50,100,200}') returning id`,
      )
    ).rows[0]!.id;
    await db.query(`insert into public.price_guide_rows (price_guide_id, system_type, description, material_price_id, min_factor, max_factor) values ($1, '{"tr": "Portal çerçeve", "en": "Portal frame"}', '{"tr": "Tek açıklık"}', $2, 0.9, 1.2), ($1, '{"tr": "Malzemesiz satır"}', '{}', null, 1, 1)`, [guideId, priceId]);
  });
  afterAll(() => db.close());

  const bySlug = (locale: string, slug: string) => as(db, anon, async (tx) => (await tx.query<{ g: Record<string, unknown> | null }>('select public.get_price_guide_by_slug($1, $2) as g', [locale, slug])).rows[0]!.g);

  it('tablolar tohumda boş; material_prices anonime kapalı, üyeye açık', async () => {
    expect(await count(db as never, `select * from public.material_prices where code <> 'TEST-S235'`)).toBe(0);
    await as(db, anon, async (tx) => {
      await expect(tx.query('select * from public.material_prices')).rejects.toThrow();
    });
    expect(await as(db, user(users.ids.member), (tx) => count(tx, 'select * from public.material_prices'))).toBe(1);
  });

  it('taslak rehber: RPC null; yayınlanınca satırlar türetilmiş min/max ile gelir, malzemesiz satır null fiyat', async () => {
    expect(await bySlug('tr', 'celik-ton-fiyatlari')).toBeNull();
    await db.query(`update public.price_guides set status = 'published', published_locales = '{tr}', published_at = now() where id = $1`, [guideId]);
    const g = await bySlug('tr', 'celik-ton-fiyatlari');
    expect(g?.['title']).toBe('Çelik Ton Fiyatları');
    expect(g?.['disclaimer']).toContain('keşif');
    expect(g?.['quantity_presets']).toEqual([50, 100, 200]);
    const rows = g?.['rows'] as { system_type: string; min_price: string | null; max_price: string | null; currency: string | null }[];
    expect(rows.length).toBe(2);
    expect(rows[0]).toMatchObject({ system_type: 'Portal çerçeve', currency: 'TRY' });
    expect(Number(rows[0]!.min_price)).toBe(900);
    expect(Number(rows[0]!.max_price)).toBe(1200);
    expect(rows[1]!.min_price).toBeNull();
    expect(await bySlug('en', 'steel-ton-prices')).toBeNull();
  });

  it('bayat bayrağı: prices_updated_at satır ekleyince ve malzeme fiyatı değişince yenilenir', async () => {
    await db.query(`update public.price_guides set prices_updated_at = now() - interval '100 days', stale_after_days = 90 where id = $1`, [guideId]);
    expect((await bySlug('tr', 'celik-ton-fiyatlari'))?.['is_stale']).toBe(true);
    await db.query(`update public.material_prices set unit_price = 1100 where id = $1`, [priceId]);
    const g = await bySlug('tr', 'celik-ton-fiyatlari');
    expect(g?.['is_stale']).toBe(false);
    expect(Number((g?.['rows'] as { min_price: string }[])[0]!.min_price)).toBe(990);
    // Fiyat geçmişi tutuldu (0008)
    expect(await count(db as never, `select * from public.material_price_history where material_price_id = '${priceId}'`)).toBe(1);
  });

  it('editör rehber metnini yazar ama malzeme fiyatını değiştiremez (0008: yalnız admin)', async () => {
    const editorWrite = await as(db, user(users.ids.editor), async (tx) => {
      const r = await tx.query(`update public.price_guides set intro = '{"tr": "Giriş"}' where id = $1`, [guideId]);
      return r.affectedRows;
    });
    expect(editorWrite).toBe(1);
    const priceWrite = await as(db, user(users.ids.editor), async (tx) => (await tx.query(`update public.material_prices set unit_price = 5 where id = $1`, [priceId])).affectedRows);
    expect(priceWrite).toBe(0);
  });
});
