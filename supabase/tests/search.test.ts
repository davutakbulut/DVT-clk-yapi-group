import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb } from './helpers/db';

// 0049 (K-102): search_site — Türkçe normalizasyon, alan tespiti, parça, sıra, yalnız yayındakiler, anonim
describe('0049 · site içi arama', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
    const cat = (await db.query<{ id: string }>(`insert into public.product_categories (slug, name) values ('{"tr": "arama-cat"}', '{"tr": "Kat"}') returning id`)).rows[0]!.id;
    const pid = (await db.query<{ id: string }>(`insert into public.products (slug, name, short_description, description, category_id, status, published_locales, published_at)
      values ('{"tr": "kutu-profil-x"}', '{"tr": "Kutu Profil"}', '{"tr": "Kare ve dikdörtgen kesitli soğuk şekillendirilmiş profiller"}', '{"tr": "Çelik karkas ve çatı aşıklarında kullanılır."}', $1, 'published', '{tr}', now()) returning id`, [cat])).rows[0]!.id;
    await db.query(`insert into public.product_variants (product_id, size_label, stock_code, sort_order) values ($1, '40×40×2', 'ARAMA-40X40X2', 1)`, [pid]);
    await db.query(`insert into public.products (slug, name, category_id, status, published_locales) values ('{"tr": "taslak-urun"}', '{"tr": "Taslak Şekillendirilmiş"}', $1, 'draft', '{}')`, [cat]);
    await db.query(`insert into public.faqs (question, answer, status, published_locales) values ('{"tr": "Kesim yapıyor musunuz?"}', '{"tr": "Evet, ölçüye kesim yapılır."}', 'published', '{tr}')`);
  }, 120_000);
  afterAll(async () => { await db.close(); });

  const search = (q: string, locale = 'tr') => as(db, anon, async (tx) => (await tx.query<{ kind: string; slug: string; title: string; field: string; snippet: string; rank: string }>('select * from public.search_site($1, $2, 20)', [locale, q])).rows);

  it('normalizasyon: "SEKILLENDIRILMIS" → ş/ı içeren kısa açıklamayı bulur; alan excerpt; taslak ürün çıkmaz', async () => {
    expect(await db.query<{ n: string }>(`select app_private.search_norm('İSTANBUL Çelik ığ') as n`).then((r) => r.rows[0]!.n)).toBe('istanbul celik ig');
    const rows = await search('SEKILLENDIRILMIS');
    const mine = rows.find((r) => r.slug === 'kutu-profil-x');
    expect(mine).toMatchObject({ kind: 'product', field: 'excerpt' });
    expect(mine!.snippet).toContain('şekillendirilmiş');
    expect(rows.some((r) => r.slug === 'taslak-urun')).toBe(false);
  });
  it('başlık eşleşmesi önce; ölçü tablosu (stok kodu) alanı; SSS; kısa sorgu boş', async () => {
    const byTitle = await search('kutu profil');
    expect(byTitle[0]).toMatchObject({ kind: 'product', field: 'title' });
    expect(Number(byTitle[0]!.rank)).toBeGreaterThanOrEqual(Number(byTitle[byTitle.length - 1]!.rank));
    const byCode = await search('ARAMA-40X40');
    expect(byCode[0]).toMatchObject({ field: 'variants' });
    expect(byCode[0]!.snippet).toContain('ARAMA-40X40X2');
    const faq = await search('ölçüye kesim');
    expect(faq[0]).toMatchObject({ kind: 'faq', field: 'body' });
    expect(await search('k')).toHaveLength(0);
    // 0050: markdown bağlantısı parçaya URL olarak sızmaz
    expect(await db.query<{ s: string }>(`select app_private.search_snippet('Önce [kutu profil](/tr/urunler/kutu-profil) sonra aşık', 'sonra') as s`).then((r) => r.rows[0]!.s)).toBe('Önce kutu profil sonra aşık');
    expect(await search('kutu', 'en')).toHaveLength(0); // EN yayında değil
  });
});
