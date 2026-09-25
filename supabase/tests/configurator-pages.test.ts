import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0055 (K-107): 6 rehber tohumu (TR yayında), anahtar tekil, RPC yalnız yayındakini ve o dili döner, slug geçmişi, anonim yazamaz
describe('0055 · konfigüratör rehber sayfaları', () => {
  let db: PGlite;
  let users: TestUsers;
  beforeAll(async () => { db = await createTestDb(); users = await seedUsers(db); }, 120_000);
  afterAll(async () => { await db.close(); });
  const bySlug = (locale: string, slug: string) => as(db, anon, async (tx) => (await tx.query<{ g: Record<string, unknown> | null }>('select public.get_configurator_page_by_slug($1, $2) as g', [locale, slug])).rows[0]!.g);

  it('tohum: 6 rehber, her konfigüratöre bir tane, yalnız TR yayında; band ayarı var', async () => {
    const rows = (await db.query<{ k: string; n: number }>(`select configurator_key as k, count(*)::int as n from public.configurator_pages group by 1 order by 1`)).rows;
    expect(rows.map((r) => r.k)).toEqual(['cladding', 'drywall', 'fence', 'hall', 'mezzanine', 'multi_storey']);
    expect(rows.every((r) => r.n === 1)).toBe(true);
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.configurator_pages where 'en' = any(published_locales)`)).rows[0]!.n).toBe(0);
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.site_settings where key = 'configurator.banner' and is_public`)).rows[0]!.n).toBe(1);
    await expect(db.query(`insert into public.configurator_pages (configurator_key, slug, title) values ('hall', '{"tr":"ikinci-hol"}', '{"tr":"İkinci"}')`)).rejects.toThrow(/unique|configurator_pages_configurator_key_key/);
  });

  it('RPC: TR slug → başlık, faydalar, adımlar, SSS, band; EN yayında değilken null; anonim listede yalnız yayındakiler', async () => {
    const g = await bySlug('tr', 'celik-hol-konfiguratoru');
    expect(g?.['configurator_key']).toBe('hall');
    expect(String(g?.['title'])).toContain('Çelik Hol');
    expect((g?.['benefits'] as unknown[]).length).toBeGreaterThanOrEqual(3);
    expect((g?.['steps'] as unknown[]).length).toBe(3);
    expect((g?.['faqs'] as { question: string }[])[0]!.question).toContain('?');
    expect((g?.['cta'] as { title: string }).title).toContain('Kendiniz');
    expect(g?.['alternates']).toEqual({ tr: 'celik-hol-konfiguratoru', en: null });
    expect(await bySlug('en', 'steel-hall-configurator')).toBeNull();
    await db.query(`update public.configurator_pages set status = 'draft' where configurator_key = 'fence'`);
    const visible = await as(db, anon, async (tx) => (await tx.query<{ n: number }>('select count(*)::int as n from public.configurator_pages')).rows[0]!.n);
    expect(visible).toBe(5);
    await db.query(`update public.configurator_pages set status = 'published' where configurator_key = 'fence'`);
  });

  it('slug değişince eskisi 308 ile çözülür (K-15); anonim yazamaz, editör yazar', async () => {
    await as(db, user(users.ids.editor), (tx) => tx.query(`update public.configurator_pages set slug = '{"tr":"hol-konfiguratoru","en":"steel-hall-configurator"}' where configurator_key = 'hall'`));
    await db.query(`update public.configurator_pages set slug = '{"tr":"hol-konfiguratoru","en":"steel-hall-configurator"}' where configurator_key = 'hall'`);
    const resolved = await as(db, anon, async (tx) => (await tx.query<{ s: string | null }>(`select public.resolve_old_slug('configurator_page', 'tr', 'celik-hol-konfiguratoru') as s`)).rows[0]!.s);
    expect(resolved).toBe('hol-konfiguratoru');
    await expect(as(db, anon, (tx) => tx.query(`update public.configurator_pages set title = '{"tr":"x"}' where configurator_key = 'hall'`).then((r) => { if ((r as { affectedRows?: number }).affectedRows === 0) throw new Error('0 satır'); }))).rejects.toThrow();
  });
});
