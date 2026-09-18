import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb } from './helpers/db';

// 0022: yasal sayfalar taslak (anonim görmez), slug'lar route tablosuyla aynı, çeviri kapalı; çerez bandı metni.
describe('0022 · yasal sayfalar', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb({ content: false });
  });
  afterAll(() => db.close());

  it('4 yasal sayfa taslak; auto_translate_disabled; slug TR/EN; anonim hiçbirini görmez', async () => {
    const { rows } = await db.query<{ page_key: string; tr: string; en: string; disabled: boolean; status: string }>(`select page_key, slug->>'tr' as tr, slug->>'en' as en, auto_translate_disabled as disabled, status from public.static_pages where kind = 'legal' order by page_key`);
    expect(rows.map((r) => r.page_key)).toEqual(['cookie-policy', 'data-protection', 'privacy-policy', 'terms-of-use']);
    for (const r of rows) {
      expect(r.disabled).toBe(true);
      expect(r.status).toBe('draft');
      expect(r.tr).toMatch(/^[a-z0-9-]+$/);
      expect(r.en).toMatch(/^[a-z0-9-]+$/);
    }
    const seen = await as(db, anon, async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from public.static_pages where kind = 'legal'`)).rows[0]!.n);
    expect(seen).toBe(0);
  });

  it('yasal sayfa yayına alınınca anonim görür; EN onaysız giremez (K-08)', async () => {
    await db.query(`update public.static_pages set body = '{"tr": "Metin"}', status = 'published', published_locales = '{tr}', published_at = now() where page_key = 'privacy-policy'`);
    const seen = await as(db, anon, async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from public.static_pages where kind = 'legal'`)).rows[0]!.n);
    expect(seen).toBe(1);
    await expect(db.query(`update public.static_pages set published_locales = '{tr,en}' where page_key = 'privacy-policy'`)).rejects.toThrow(/publishable/);
  });

  it('çerez bandı metni dolu ve iki dilli', async () => {
    const { rows } = await db.query<{ value: { tr?: { accept?: string }; en?: { accept?: string } } }>(`select value from public.site_settings where key = 'cookie_banner'`);
    expect(rows[0]!.value.tr?.accept).toBeTruthy();
    expect(rows[0]!.value.en?.accept).toBeTruthy();
  });
});
