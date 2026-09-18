import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0027: ziyaretçi yorumu RPC — bekleyen başlar, anonime sızmaz; yayınlanınca okunur; bağlı varlık yayında olmalı; tohum yorum yok.
describe('0027 · müşteri yorumları', () => {
  let db: PGlite;
  let users: TestUsers;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
  });
  afterAll(() => db.close());

  // as() geri alır → kalıcı kayıt için doğrudan (RPC security definer; anon yolu ayrıca aşağıda doğrulanır)
  const submit = async (p: Record<string, unknown>) => (await db.query<{ r: { id: string } }>('select public.submit_testimonial($1::jsonb) as r', [JSON.stringify(p)])).rows[0]!.r;
  const base = { author_name: 'Ayşe Yılmaz', body: 'Süreç planlandığı gibi ilerledi, montaj ekibi titizdi.', rating: 5, locale: 'tr', consent_kvkk: true };

  it('tohumda yorum yok; ziyaretçi yorumu pending başlar ve anonime görünmez; editöre bildirim düşer', async () => {
    expect(await count(db as never, 'select * from public.testimonials')).toBe(0);
    const anonId = await as(db, anon, async (tx) => (await tx.query<{ r: { id: string } }>('select public.submit_testimonial($1::jsonb) as r', [JSON.stringify(base)])).rows[0]!.r.id);
    expect(anonId).toMatch(/[0-9a-f-]{36}/);
    const r = await submit(base);
    expect(r.id).toMatch(/[0-9a-f-]{36}/);
    expect(await as(db, anon, (tx) => count(tx, 'select * from public.testimonials'))).toBe(0);
    const row = (await db.query<{ status: string; source: string; body: { tr: string }; consent_kvkk_at: string | null }>('select status, source, body, consent_kvkk_at from public.testimonials where id = $1', [r.id])).rows[0]!;
    expect(row).toMatchObject({ status: 'pending', source: 'visitor' });
    expect(row.body.tr).toContain('montaj');
    expect(row.consent_kvkk_at).not.toBeNull();
    expect(await count(db as never, `select * from public.notifications where type = 'testimonial.pending' and target_role = 'editor'`)).toBe(1);
  });

  it('doğrulama: kısa gövde, puan aralığı, onay yok, yayında olmayan hizmet → hata', async () => {
    await expect(submit({ ...base, body: 'kısa' })).rejects.toThrow(/body/);
    await expect(submit({ ...base, rating: 6 })).rejects.toThrow(/rating/);
    await expect(submit({ ...base, consent_kvkk: false })).rejects.toThrow(/consent/);
    const draft = (await db.query<{ id: string }>(`insert into public.services (slug, title) values ('{"tr": "taslak-h"}', '{"tr": "Taslak"}') returning id`)).rows[0]!.id;
    await expect(submit({ ...base, service_id: draft })).rejects.toThrow(/service/);
  });

  it('editör yayınlar → anonim okur; Google kaynaklı satır external_id ister (0005 CHECK)', async () => {
    const id = (await db.query<{ id: string }>(`select id from public.testimonials where source = 'visitor' limit 1`)).rows[0]!.id;
    const affected = await as(db, user(users.ids.editor), async (tx) => (await tx.query(`update public.testimonials set status = 'published' where id = $1`, [id])).affectedRows);
    expect(affected).toBe(1);
    await db.query(`update public.testimonials set status = 'published' where id = $1`, [id]); // as() geri aldı → kalıcı
    expect(await as(db, anon, (tx) => count(tx, `select * from public.testimonials where status = 'published'`))).toBe(1);
    await expect(db.query(`insert into public.testimonials (source, author_name, rating, body) values ('google', 'X', 5, '{}')`)).rejects.toThrow();
    await db.query(`insert into public.testimonials (source, external_id, author_name, rating, body, status) values ('google', 'places/1/reviews/a', 'G', 4, '{"tr": "iyi"}', 'pending')`);
    await expect(db.query(`insert into public.testimonials (source, external_id, author_name, rating, body) values ('google', 'places/1/reviews/a', 'G2', 4, '{}')`)).rejects.toThrow(/unique|duplicate/);
  });

  it('senkron koşusu: admin yazar, editör yalnız okur; ayar anahtarı gizli', async () => {
    const ok = await as(db, user(users.ids.admin), async (tx) => (await tx.query(`insert into public.review_sync_runs (status, fetched_count) values ('success', 3)`)).affectedRows);
    expect(ok).toBe(1);
    await db.query(`insert into public.review_sync_runs (status, fetched_count) values ('success', 3)`);
    const editorRead = await as(db, user(users.ids.editor), (tx) => count(tx, 'select * from public.review_sync_runs'));
    expect(editorRead).toBe(1);
    const editorWrite = await as(db, user(users.ids.editor), async (tx) => {
      try {
        return (await tx.query(`insert into public.review_sync_runs (status) values ('failed')`)).affectedRows ?? 0;
      } catch {
        return 0;
      }
    });
    expect(editorWrite).toBe(0);
    expect(await as(db, anon, (tx) => count(tx, `select * from public.site_settings where key = 'reviews.google_place_id'`))).toBe(0);
  });

  it('0045: örnek işareti yalnız elle yazılan kayıtta; ziyaretçi/Google kaydı örnek olamaz', async () => {
    await db.query(`insert into public.testimonials (source, author_name, rating, body, status, is_sample) values ('manual', 'Örnek Müşteri', 5, '{"tr": "örnek"}', 'published', true)`);
    await expect(db.query(`insert into public.testimonials (source, external_id, author_name, rating, body, is_sample) values ('google', 'places/1/reviews/s', 'G', 5, '{"tr": "x"}', true)`)).rejects.toThrow(/sample_manual_only/);
    await expect(db.query(`update public.testimonials set is_sample = true where source = 'visitor'`)).rejects.toThrow(/sample_manual_only/);
  });
});
