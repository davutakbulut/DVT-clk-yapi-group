import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createTestDb } from './helpers/db';

// 0014: menü yapısı. Ön yüz bu satırları K-50 süzgecinden geçirir; burada verinin biçimi kilitlenir.
describe('0014 · menü yapısı', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.close());

  it('header: sol/sağ yuva dolu, tek CTA; footer 3 sütun; yasal 5 bağlantı', async () => {
    const { rows } = await db.query<{ key: string; slot: string | null; cta: boolean; parent: boolean; n: number }>(`
      select m.key, i.header_slot as slot, i.is_cta as cta, i.parent_id is null as parent, count(*)::int as n
      from public.menu_items i join public.menus m on m.id = i.menu_id
      group by 1,2,3,4 order by 1,2,3,4`);
    const header = rows.filter((r) => r.key === 'header');
    expect(header.find((r) => r.slot === 'left')?.n).toBe(4);
    expect(header.filter((r) => r.cta).reduce((a, r) => a + r.n, 0)).toBe(1);
    expect(rows.find((r) => r.key === 'footer_primary' && r.parent)?.n).toBe(3);
    expect(rows.find((r) => r.key === 'footer_legal')?.n).toBe(5);
  });

  it('her iç yol ASCII ve routing.ts anahtar biçiminde; her etiketin TR ve EN karşılığı var', async () => {
    const { rows } = await db.query<{ internal_path: string | null; label: Record<string, string> }>(`select internal_path, label from public.menu_items`);
    for (const row of rows) {
      if (row.internal_path) expect(row.internal_path).toMatch(/^\/[a-z-]+$/);
      expect(row.label['tr']).toBeTruthy();
      expect(row.label['en']).toBeTruthy();
    }
  });

  it('anonim menüyü okur ama yazamaz; yeniden çalışan migration çoğaltmaz', async () => {
    const before = (await db.query<{ n: number }>(`select count(*)::int as n from public.menu_items`)).rows[0]!.n;
    const seen = await as(db, { role: 'anon' }, async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from public.menu_items`)).rows[0]!.n);
    expect(seen).toBe(before);
    await expect(as(db, { role: 'anon' }, (tx) => tx.query(`delete from public.menu_items`))).rejects.toThrow();
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    // Yalnız seed bloğu yeniden koşar (şema düzeltmesi kısmı tek seferliktir).
    const sql = readFileSync(join(__dirname, '..', 'migrations', '0014_navigation_seed.sql'), 'utf8');
    await db.exec(sql.slice(sql.indexOf('do $$\ndeclare')));
    const after = (await db.query<{ n: number }>(`select count(*)::int as n from public.menu_items`)).rows[0]!.n;
    expect(after).toBe(before);
  });
});
