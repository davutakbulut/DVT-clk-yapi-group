import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb } from './helpers/db';

// 0025: çözüm RPC'si — 8 bölüm dil süzgeçli; taslak çözüm null; bağlı hizmet yalnız o dilde yayındaysa; SSS entity_type='solution'.
describe('0025 · çözüm sayfaları', () => {
  let db: PGlite;
  let seedId: string;
  beforeAll(async () => {
    db = await createTestDb();
    seedId = (await db.query<{ id: string }>(`select id from public.solutions where slug->>'tr' = 'dar-parselde-hizli-yeniden-yapim'`)).rows[0]!.id;
  });
  afterAll(() => db.close());

  const bySlug = (locale: string, slug: string) => as(db, anon, async (tx) => (await tx.query<{ s: Record<string, unknown> | null }>('select public.get_solution_by_slug($1, $2) as s', [locale, slug])).rows[0]!.s);

  it('tohum çözüm TR yayında: karşılaştırma satırları, avantajlar, CTA, bağlı hizmet; EN → null (K-08)', async () => {
    const s = await bySlug('tr', 'dar-parselde-hizli-yeniden-yapim');
    expect(s?.['title']).toBe('Dar Parselde Hızlı Yeniden Yapım');
    const cmp = s?.['comparison'] as { alternative: string; rows: { criterion: string; steel: string; alternative: string }[] };
    expect(cmp.alternative).toBe('Betonarme');
    expect(cmp.rows.length).toBe(4);
    expect(cmp.rows[0]).toMatchObject({ criterion: 'Saha süresi' });
    expect((s?.['advantages'] as unknown[]).length).toBe(4);
    expect((s?.['cta'] as { button: string }).button).toBe('Teklif alın');
    expect((s?.['service'] as { slug: string }).slug).toBe('kentsel-donusum-celik-karkas');
    expect(s?.['faqs']).toEqual([]);
    expect(JSON.stringify(s)).not.toMatch(/%\d|\d+%/);
    expect(await bySlug('en', 'fast-rebuild-on-narrow-plots')).toBeNull();
  });

  it('taslak çözüm anonime görünmez; yayınlanınca SSS ve EN (onaylı) gelir', async () => {
    const id = (
      await db.query<{ id: string }>(
        `insert into public.solutions (slug, title, comparison) values ('{"tr": "test-cozum", "en": "test-solution"}', '{"tr": "Test Çözüm", "en": "Test Solution"}', '{"rows": [{"criterion": {"tr": "Yalnız TR"}, "steel": {"tr": "a"}, "alternative": {"tr": "b"}}]}') returning id`,
      )
    ).rows[0]!.id;
    expect(await bySlug('tr', 'test-cozum')).toBeNull();
    await db.query(`insert into public.faqs (entity_type, entity_id, question, answer, status, published_locales, published_at, translation_meta) values ('solution', $1, '{"tr": "Soru?", "en": "Question?"}', '{"tr": "Cevap.", "en": "Answer."}', 'published', '{tr,en}', now(), '{"en": {"reviewed": true}}')`, [id]);
    await db.query(`update public.solutions set status = 'published', published_locales = '{tr,en}', published_at = now(), translation_meta = '{"en": {"reviewed": true}}' where id = $1`, [id]);
    const tr = await bySlug('tr', 'test-cozum');
    expect((tr?.['faqs'] as { question: string }[])[0]?.question).toBe('Soru?');
    expect(tr?.['service']).toBeNull();
    const en = await bySlug('en', 'test-solution');
    expect(en?.['title']).toBe('Test Solution');
    // EN'de kriteri olmayan karşılaştırma satırı düşer
    expect((en?.['comparison'] as { rows: unknown[] }).rows).toEqual([]);
    expect(en?.['alternates']).toEqual({ tr: 'test-cozum', en: 'test-solution' });
  });

  it('sıralama RPC izin listesinde; eski slug 308 çözümlemesine girer', async () => {
    const other = (await db.query<{ id: string }>(`insert into public.solutions (slug, title) values ('{"tr": "ikinci"}', '{"tr": "İkinci"}') returning id`)).rows[0]!.id;
    const before = (await db.query<{ id: string }>(`select id from public.solutions order by sort_order`)).rows.map((r) => r.id);
    await db.query(`select public.reorder_content('solutions', $1::uuid[])`, [[other, ...before.filter((i) => i !== other)]]);
    const order = (await db.query<{ id: string; sort_order: number }>(`select id, sort_order from public.solutions order by sort_order`)).rows;
    expect(order[0]!.id).toBe(other);
    await db.query(`update public.solutions set slug = '{"tr": "dar-parsel-yeni", "en": "fast-rebuild-on-narrow-plots"}' where id = $1`, [seedId]);
    const resolved = (await db.query<{ r: string | null }>(`select public.resolve_old_slug('solution', 'tr', 'dar-parselde-hizli-yeniden-yapim') as r`)).rows[0]!.r;
    expect(resolved).toBe('dar-parsel-yeni');
  });
});
