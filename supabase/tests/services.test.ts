import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0017: hizmet RPC'si, genel sıralama RPC'si, başlangıç içeriği.
describe('0017 · hizmetler', () => {
  let db: PGlite;
  let users: TestUsers;
  beforeAll(async () => {
    db = await createTestDb({ content: false });
    users = await seedUsers(db);
  });
  afterAll(() => db.close());

  const bySlug = (locale: string, slug: string) => as(db, anon, async (tx) => (await tx.query<{ s: Record<string, unknown> | null }>('select public.get_service_by_slug($1, $2) as s', [locale, slug])).rows[0]!.s);

  it('başlangıç: 12 hizmet (0053: 3 grup), yalnız TR yayında, slug ASCII, süreç adımları dizi', async () => {
    const { rows } = await db.query<{ n: number; en: number }>(`select count(*)::int as n, count(*) filter (where 'en' = any(published_locales))::int as en from public.services`);
    expect(rows[0]).toEqual({ n: 12, en: 0 });
    const groups = (await db.query<{ g: string; n: number }>(`select group_key as g, count(*)::int as n from public.services group by 1 order by 1`)).rows;
    expect(groups).toEqual([{ g: 'construction', n: 5 }, { g: 'engineering', n: 1 }, { g: 'steel', n: 6 }]);
    const slugs = await db.query<{ tr: string; en: string }>(`select slug->>'tr' as tr, slug->>'en' as en from public.services`);
    for (const s of slugs.rows) {
      expect(s.tr).toMatch(/^[a-z0-9-]+$/);
      expect(s.en).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('RPC: TR slug → içerik, süreç adımları o dilde, EN alternatifi null (onaysız); EN slug → null', async () => {
    const s = await bySlug('tr', 'kentsel-donusum-celik-karkas');
    expect(s?.['title']).toBe('Kentsel Dönüşüm Çelik Karkas');
    expect(s?.['alternates']).toEqual({ tr: 'kentsel-donusum-celik-karkas', en: null });
    const steps = s?.['process_steps'] as { title: string; description: string }[];
    expect(steps.length).toBe(4);
    expect(steps[0]!.title).toBe('Keşif ve ön proje');
    expect(s?.['projects']).toEqual([]);
    expect(s?.['faqs']).toEqual([]);
    expect(await bySlug('en', 'urban-renewal-steel-frame')).toBeNull();
    expect(await bySlug('en', 'kentsel-donusum-celik-karkas')).toBeNull();
  });

  it('RPC: EN onaylanıp yayına alınınca EN slug çözülür; yalnız-TR SSS EN sayfaya sızmaz', async () => {
    await db.query(`update public.services set translation_meta = '{"en": {"reviewed": true}}', published_locales = '{tr,en}' where slug->>'tr' = 'endustriyel-tesis-ve-depo'`);
    const id = (await db.query<{ id: string }>(`select id from public.services where slug->>'tr' = 'endustriyel-tesis-ve-depo'`)).rows[0]!.id;
    await db.query(`insert into public.faqs (entity_type, entity_id, question, answer, status, published_locales, published_at) values ('service', $1, '{"tr": "Süre ne kadar?", "en": "How long?"}', '{"tr": "Projeye göre.", "en": "Depends."}', 'published', '{tr}', now())`, [id]);
    const en = await bySlug('en', 'industrial-facilities-and-warehouses');
    expect(en?.['alternates']).toEqual({ tr: 'endustriyel-tesis-ve-depo', en: 'industrial-facilities-and-warehouses' });
    expect(en?.['faqs']).toEqual([]);
    const tr = await bySlug('tr', 'endustriyel-tesis-ve-depo');
    expect(tr?.['faqs']).toEqual([{ question: 'Süre ne kadar?', answer: 'Projeye göre.' }]);
  });

  it('reorder_content: editör sıralar, anonim yazamaz, izinsiz tablo reddedilir', async () => {
    const ids = (await db.query<{ id: string }>(`select id from public.services order by sort_order`)).rows.map((r) => r.id);
    const reversed = [...ids].reverse();
    const n = await as(db, user(users.ids.editor), async (tx) => (await tx.query<{ n: number }>(`select public.reorder_content('services', $1) as n`, [reversed])).rows[0]!.n);
    expect(n).toBe(12);
    await expect(as(db, anon, (tx) => tx.query(`select public.reorder_content('services', $1)`, [reversed]))).rejects.toThrow();
    await expect(as(db, user(users.ids.editor), (tx) => tx.query(`select public.reorder_content('profiles', $1)`, [reversed]))).rejects.toThrow(/izinli degil/);
  });

  it("slug değişince slug_history yazılır ve resolve_old_slug yeni slug'ı verir", async () => {
    await db.query(`update public.services set slug = '{"tr": "kentsel-donusum-yeni", "en": "urban-renewal-steel-frame"}' where slug->>'tr' = 'kentsel-donusum-celik-karkas'`);
    const resolved = await as(db, anon, async (tx) => (await tx.query<{ s: string | null }>(`select public.resolve_old_slug('service', 'tr', 'kentsel-donusum-celik-karkas') as s`)).rows[0]!.s);
    expect(resolved).toBe('kentsel-donusum-yeni');
  });
});
