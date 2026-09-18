import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, cannotWrite, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0028: modül bayrağı anonime açık; yönlendirme isabeti anonim sayar ama payload değişmez; purge sarmalayıcısı anonime kapalı;
// audit_logs yalnız-ekleme (silme yolu yok); ui_translations anonim okur, editör yazar; sözlük tohumu var.
describe('0028 · sistem yönetimi', () => {
  let db: PGlite;
  let users: TestUsers;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
  });
  afterAll(() => db.close());

  it('modules.enabled anonim okunur (K-61); diğer gizli ayarlar hâlâ sızmaz', async () => {
    const keys = await as(db, anon, async (tx) => (await tx.query<{ key: string }>('select key from public.site_settings')).rows.map((r) => r.key));
    expect(keys).toContain('modules.enabled');
    expect(keys).not.toContain('configurator.limits');
    expect(keys).not.toContain('reviews.google_place_id');
  });

  it('yönlendirme: editör ekler, anonim aktif olanı okur, isabet sayar; 410 hedefsiz, pasif sayılmaz', async () => {
    await as(db, user(users.ids.editor), async (tx) => {
      await tx.query(`insert into public.redirects (source_path, target_path, status_code) values ('/eski', '/tr/yeni', 308)`);
    });
    await db.query(`insert into public.redirects (source_path, target_path, status_code) values ('/eski', '/tr/yeni', 308), ('/gitti', null, 410), ('/pasif', '/tr', 301)`);
    await db.query(`update public.redirects set is_active = false where source_path = '/pasif'`);
    const seen = await as(db, anon, async (tx) => (await tx.query<{ source_path: string }>('select source_path from public.redirects order by source_path')).rows.map((r) => r.source_path));
    expect(seen).toEqual(['/eski', '/gitti']);
    await as(db, anon, async (tx) => {
      await tx.query(`select public.record_redirect_hit('/eski')`);
      await tx.query(`select public.record_redirect_hit('/pasif')`);
      expect(await cannotWrite(tx, `update public.redirects set target_path = '/tr/kotu' where source_path = '/eski'`)).toBe(true);
      const hits = (await tx.query<{ source_path: string; hit_count: string }>(`select source_path, hit_count from public.redirects order by source_path`)).rows;
      expect(Number(hits.find((h) => h.source_path === '/eski')?.hit_count)).toBe(1);
    });
    const pasif = (await db.query<{ hit_count: string }>(`select hit_count from public.redirects where source_path = '/pasif'`)).rows[0]!;
    expect(Number(pasif.hit_count)).toBe(0);
    await expect(db.query(`insert into public.redirects (source_path, target_path, status_code) values ('/x', null, 301)`)).rejects.toThrow();
  });

  it('purge sarmalayıcısı anonime/üyeye kapalı; süresi dolan başvuru silinir ve CV yolu döner', async () => {
    await expect(as(db, anon, (tx) => tx.query('select * from public.purge_expired_job_applications()'))).rejects.toThrow(/permission|denied/i);
    await expect(as(db, user(users.ids.admin), (tx) => tx.query('select * from public.purge_expired_job_applications()'))).rejects.toThrow(/permission|denied/i);
    await db.query(`insert into public.job_applications (full_name, email, cv_path, consent_kvkk_at, retention_until) values ('Eski', 'e@x.com', 'cv/eski.pdf', now(), current_date - 1), ('Yeni', 'y@x.com', 'cv/yeni.pdf', now(), current_date + 30)`);
    const purged = (await db.query<{ cv_bucket: string; cv_path: string }>('select * from public.purge_expired_job_applications()')).rows;
    expect(purged).toEqual([{ cv_bucket: 'private-documents', cv_path: 'cv/eski.pdf' }]);
    expect(await count(db as never, 'select * from public.job_applications')).toBe(1);
  });

  it('audit_logs: profil değişikliği iz bırakır; admin okur, kimse silemez; ui_translations editör yazar, anonim okur; sözlük tohumlu', async () => {
    await db.query(`update public.profiles set full_name = 'Yeni Ad' where id = $1`, [users.ids.editor]);
    const adminSees = await as(db, user(users.ids.admin), (tx) => count(tx, `select * from public.audit_logs where table_name = 'profiles'`));
    expect(adminSees).toBeGreaterThan(0);
    expect(await as(db, user(users.ids.admin), (tx) => cannotWrite(tx, 'delete from public.audit_logs'))).toBe(true);
    expect(await as(db, user(users.ids.editor), (tx) => count(tx, 'select * from public.audit_logs'))).toBe(0);
    await db.query(`insert into public.ui_translations (namespace, key, locale, value) values ('Header', 'quote', 'tr', 'Hemen teklif al')`);
    expect(await as(db, user(users.ids.editor), async (tx) => (await tx.query(`update public.ui_translations set value = 'Teklif' where namespace = 'Header'`)).affectedRows)).toBe(1);
    expect(await as(db, anon, (tx) => count(tx, 'select * from public.ui_translations'))).toBe(1);
    expect(await as(db, anon, (tx) => cannotWrite(tx, `insert into public.ui_translations (namespace, key, locale, value) values ('X', 'y', 'tr', 'z')`))).toBe(true);
    expect(await as(db, user(users.ids.editor), (tx) => count(tx, 'select * from public.translation_glossary'))).toBeGreaterThan(0);
  });
});
