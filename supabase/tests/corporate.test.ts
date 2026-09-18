import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0021: iş başvurusu RPC'si (anonim), kapalı/ilansız durumlar, CV yolu deseni, İK yetkileri; kurumsal tablolar boş başlar.
describe('0021 · kurumsal', () => {
  let db: PGlite;
  let users: TestUsers;
  let posting: string;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
    posting = (await db.query<{ id: string }>(`insert into public.job_postings (slug, title, status, published_locales, published_at) values ('{"tr": "proje-muhendisi"}', '{"tr": "Proje Mühendisi"}', 'published', '{tr}', now()) returning id`)).rows[0]!.id;
  });
  afterAll(() => db.close());

  const submit = (p: Record<string, unknown>) => db.query<{ r: { id: string } }>(`select public.submit_job_application($1::jsonb) as r`, [JSON.stringify(p)]);

  it('ekip, referans, belge ve ilan tabloları boş başlar; anonim yalnız yayındakini görür', async () => {
    for (const table of ['team_members', 'clients', 'certificates']) {
      expect((await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0]!.n, table).toBe(0);
    }
    await db.query(`insert into public.team_members (full_name, position) values ('Taslak Kişi', '{"tr": "Mühendis"}')`);
    const seen = await as(db, anon, async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from public.team_members`)).rows[0]!.n);
    expect(seen).toBe(0);
  });

  it('anonim başvuru: kayıt + aday maili + İK bildirimi; KVKK/ilan/CV deseni kontrolleri', async () => {
    const { rows } = await submit({ job_posting_id: posting, full_name: 'Ada Lovelace', email: 'ADA@example.com', consent_kvkk: true, cv_path: 'cv/123e4567-e89b-12d3-a456-426614174000.pdf' });
    const id = rows[0]!.r.id;
    const app = (await db.query<{ email: string; status: string; cv_path: string }>(`select email, status, cv_path from public.job_applications where id = $1`, [id])).rows[0]!;
    expect(app).toEqual({ email: 'ada@example.com', status: 'new', cv_path: 'cv/123e4567-e89b-12d3-a456-426614174000.pdf' });
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.email_queue where related_id = $1`, [id])).rows[0]!.n).toBeGreaterThanOrEqual(1);
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.notifications where type = 'application.created'`)).rows[0]!.n).toBe(1);
    await expect(submit({ job_posting_id: posting, full_name: 'X Y', email: 'x@y.com', consent_kvkk: false })).rejects.toThrow(/consent/);
    await expect(submit({ job_posting_id: posting, full_name: 'X Y', email: 'x@y.com', consent_kvkk: true, cv_path: '../etc/passwd' })).rejects.toThrow(/cv_path/);
    await db.query(`update public.job_postings set is_open = false where id = $1`, [posting]);
    await expect(submit({ job_posting_id: posting, full_name: 'X Y', email: 'x@y.com', consent_kvkk: true })).rejects.toThrow(/posting/);
    await db.query(`update public.job_postings set is_open = true where id = $1`, [posting]);
  });

  it('başvuruları yalnız super_admin/admin okur; editör ve anonim okuyamaz', async () => {
    const adminSees = await as(db, user(users.ids.admin), async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from public.job_applications`)).rows[0]!.n);
    expect(adminSees).toBe(1);
    const editorSees = await as(db, user(users.ids.editor), async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from public.job_applications`)).rows[0]!.n).catch(() => -1);
    expect(editorSees).toBeLessThanOrEqual(0);
    await expect(as(db, anon, (tx) => tx.query(`select * from public.job_applications`))).rejects.toThrow(/permission denied/);
  });
});
