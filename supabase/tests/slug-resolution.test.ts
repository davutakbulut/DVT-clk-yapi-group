import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb } from './helpers/db';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(`
    insert into public.projects (slug, title, status, published_locales, published_at, translation_meta)
    select jsonb_build_object('tr', 'proje-' || g, 'en', 'project-' || g), jsonb_build_object('tr', 'Proje ' || g, 'en', 'Project ' || g),
           'published', '{tr,en}', now(), '{"en":{"reviewed":true}}'
      from generate_series(1, 20000) g;
    insert into public.projects (slug, title, status, published_locales, published_at)
      values ('{"tr":"yalniz-turkce","en":"turkish-only-draft"}', '{"tr":"Yalnız Türkçe","en":"Draft"}', 'published', '{tr}', now());
    analyze public.projects;`);
}, 180_000);
afterAll(async () => { await db.close(); });

interface ResolvedProject {
  readonly title: string;
  readonly alternates: { readonly tr: string | null; readonly en: string | null };
}

const resolve = (locale: string, slug: string) =>
  as(db, anon, async (tx) => (await tx.query<{ p: ResolvedProject | null }>('select public.get_project_by_slug($1, $2) as p', [locale, slug])).rows[0]!.p);

describe('get_project_by_slug — çeviri yoksa ne olur (02-ROUTING-I18N tablosu)', () => {
  it('doğru dil + doğru slug → içerik ve iki yönlü alternatifler', async () => {
    const project = await resolve('tr', 'proje-42');
    expect(project?.title).toBe('Proje 42');
    expect(project?.alternates).toEqual({ tr: 'proje-42', en: 'project-42' });
    expect((await resolve('en', 'project-42'))?.alternates).toEqual({ tr: 'proje-42', en: 'project-42' });
  });

  it('/en/projects/<tr-slug> → bulunamaz (Türkçe içerik İngilizce URL de gösterilmez)', async () => {
    expect(await resolve('en', 'proje-42')).toBeNull();
  });

  it('EN satırı var ama `en` ∉ published_locales → bulunamaz; TR tarafında EN alternatifi null', async () => {
    expect(await resolve('en', 'turkish-only-draft')).toBeNull();
    expect((await resolve('tr', 'yalniz-turkce'))?.alternates).toEqual({ tr: 'yalniz-turkce', en: null });
  });
});

// Faz 1 deney #4'ün kalıcı kilidi. Sessiz tam tablo taramasına düşmenin en olası yeri burasıdır.
describe('ifade indeksi kullanımı', () => {
  async function plan(where: string): Promise<string> {
    await db.exec(`set plan_cache_mode = force_generic_plan`);   // PL/pgSQL içindeki parametreli sorgunun en kötü hâli
    const name = `q${Math.random().toString(36).slice(2, 8)}`;
    await db.exec(`prepare ${name}(text, text) as select p.id from public.projects p where ${where}`);
    const { rows } = await db.query<Record<string, string>>(`explain (costs off) execute ${name}('tr', 'proje-4242')`);
    return rows.map((row) => row['QUERY PLAN']).join('\n');
  }

  it("RPC'deki OR dallanması iki ifade indeksini kullanır, tabloyu TARAMAZ", async () => {
    const text = await plan(`(($1 = 'tr' and p.slug->>'tr' = $2) or ($1 = 'en' and p.slug->>'en' = $2)) and $1 = any(p.published_locales)`);
    expect(text).toMatch(/projects_slug_tr_uq/);
    expect(text).toMatch(/projects_slug_en_uq/);
    expect(text).not.toMatch(/Seq Scan/);
  });

  it('kontrol: aynı sorgu CASE ile yazılırsa tam tablo taramasına düşer (bu yüzden yasak)', async () => {
    expect(await plan(`(case when $1 = 'tr' then p.slug->>'tr' else p.slug->>'en' end) = $2`)).toMatch(/Seq Scan/);
  });

  it('fonksiyon gövdesi gerçekten OR biçimini kullanıyor (biri CASE e çevirirse test kırılır)', async () => {
    const { rows } = await db.query<{ src: string }>(`select prosrc as src from pg_proc where proname = 'get_project_by_slug'`);
    expect(rows[0]!.src).toMatch(/p_locale = 'tr' and p\.slug->>'tr' = p_slug/);
    expect(rows[0]!.src).not.toMatch(/case\s+when\s+p_locale/i);
  });
});
