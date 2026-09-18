import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createTestDb } from './helpers/db';

// 0016: ana sayfa başlangıç içeriği. Anonim yayındaki satırı görür; EN onaysız → yalnız TR yayında; yeniden koşunca çoğaltmaz.
describe('0016 · ana sayfa içeriği', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb({ content: false });
  });
  afterAll(() => db.close());

  it('tek aktif hero; anonim okur; CTA yolu routing anahtar biçiminde', async () => {
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.hero_media where is_active`);
    expect(rows[0]!.n).toBe(1);
    const seen = await as(db, { role: 'anon' }, async (tx) => (await tx.query<{ cta_path: string; headline: Record<string, string> }>(`select cta_path, headline from public.hero_media`)).rows);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.cta_path).toMatch(/^\/[a-z-]+$/);
    expect(seen[0]!.headline['tr']).toBeTruthy();
  });

  it('hakkımızda yayında ama yalnız TR (K-08: EN makine taslağı onaysız); anonim görür, yazamaz', async () => {
    const seen = await as(db, { role: 'anon' }, async (tx) => (await tx.query<{ status: string; published_locales: string[]; title: Record<string, string> }>(`select status, published_locales, title from public.about_content where key = 'main'`)).rows);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.status).toBe('published');
    expect(seen[0]!.published_locales).toEqual(['tr']);
    expect(seen[0]!.title['en']).toBeTruthy(); // taslak var, yayında değil
    await expect(as(db, { role: 'anon' }, (tx) => tx.query(`update public.about_content set title = '{}' where key = 'main'`))).rejects.toThrow(/permission denied/);
  });

  it("EN'i onaysız yayına almak DB kısıtına takılır", async () => {
    await expect(db.query(`update public.about_content set published_locales = '{tr,en}' where key = 'main'`)).rejects.toThrow(/publishable/);
  });

  it('yeniden çalışan migration hero çoğaltmaz, panel içeriğini ezmez', async () => {
    await db.query(`update public.about_content set title = '{"tr": "Panelden yazıldı"}' where key = 'main'`);
    await db.exec(readFileSync(join(__dirname, '..', 'migrations', '0016_home_seed.sql'), 'utf8'));
    const heroes = (await db.query<{ n: number }>(`select count(*)::int as n from public.hero_media`)).rows[0]!.n;
    expect(heroes).toBe(1);
    const title = (await db.query<{ title: Record<string, string> }>(`select title from public.about_content where key = 'main'`)).rows[0]!.title;
    expect(title['tr']).toBe('Panelden yazıldı');
  });
});
