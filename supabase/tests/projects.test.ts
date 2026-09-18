import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0018: proje kategorileri referans verisi; projeler boş başlar; kategori/proje ilişkisi ebeveyn görünürlüğüne bağlı.
describe('0018 · projeler', () => {
  let db: PGlite;
  let users: TestUsers;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
  });
  afterAll(() => db.close());

  it('4 kategori, ASCII slug, projeler BOŞ; anonim aktif kategorileri okur', async () => {
    const cats = await as(db, anon, async (tx) => (await tx.query<{ tr: string; n: string }>(`select slug->>'tr' as tr, name->>'tr' as n from public.project_categories order by sort_order`)).rows);
    expect(cats.map((c) => c.tr)).toEqual(['kentsel-donusum', 'endustriyel', 'ticari', 'cati-ve-cephe']);
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.projects`)).rows[0]!.n).toBe(0);
    await db.query(`update public.project_categories set is_active = false where slug->>'tr' = 'ticari'`);
    const active = await as(db, anon, async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from public.project_categories`)).rows[0]!.n);
    expect(active).toBe(3);
  });

  it('taslak projenin kategori ilişkisi ve görselleri anonime sızmaz; yayına alınınca RPC kategori ve hizmeti döner', async () => {
    const cat = (await db.query<{ id: string }>(`select id from public.project_categories where slug->>'tr' = 'endustriyel'`)).rows[0]!.id;
    const svc = (await db.query<{ id: string }>(`select id from public.services where slug->>'tr' = 'endustriyel-tesis-ve-depo'`)).rows[0]!.id;
    const project = (await db.query<{ id: string }>(`insert into public.projects (slug, title, location, area_m2) values ('{"tr": "ornek-depo"}', '{"tr": "Örnek Depo"}', '{"tr": "Gebze"}', 2400) returning id`)).rows[0]!.id;
    await db.query(`insert into public.project_category_relations (project_id, category_id) values ($1, $2)`, [project, cat]);
    await db.query(`insert into public.service_projects (service_id, project_id) values ($1, $2)`, [svc, project]);
    const hidden = await as(db, anon, async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from public.project_category_relations`)).rows[0]!.n);
    expect(hidden).toBe(0);
    expect(await as(db, anon, async (tx) => (await tx.query<{ p: unknown }>(`select public.get_project_by_slug('tr', 'ornek-depo') as p`)).rows[0]!.p)).toBeNull();

    await as(db, user(users.ids.editor), (tx) => tx.query(`update public.projects set status = 'published', published_locales = '{tr}', published_at = now() where id = $1`, [project]));
    // as() geri alır → editör yazımını kalıcı yapmak için doğrudan
    await db.query(`update public.projects set status = 'published', published_locales = '{tr}', published_at = now() where id = $1`, [project]);
    const p = await as(db, anon, async (tx) => (await tx.query<{ p: Record<string, unknown> }>(`select public.get_project_by_slug('tr', 'ornek-depo') as p`)).rows[0]!.p);
    expect(p['title']).toBe('Örnek Depo');
    expect(p['categories']).toEqual([{ slug: 'endustriyel', name: 'Endüstriyel' }]);
    expect(p['services']).toEqual([{ slug: 'endustriyel-tesis-ve-depo', title: 'Endüstriyel Tesis ve Depo' }]);
    expect(Number(p['area_m2'])).toBe(2400);
  });

  it('reorder_content projeler ve kategoriler için çalışır (editör)', async () => {
    const ids = (await db.query<{ id: string }>(`select id from public.project_categories order by sort_order`)).rows.map((r) => r.id);
    const n = await as(db, user(users.ids.editor), async (tx) => (await tx.query<{ n: number }>(`select public.reorder_content('project_categories', $1) as n`, [[...ids].reverse()])).rows[0]!.n);
    expect(n).toBe(4);
  });
});
