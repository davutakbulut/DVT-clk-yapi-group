import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0044: sahadan videolar — tohum yok; kaynak tutarlılığı CHECK; anonim yalnız yayındakini okur; editör yazar, viewer yazamaz.
describe('0044 · sahadan videolar', () => {
  let db: PGlite;
  let users: TestUsers;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
  });
  afterAll(() => db.close());

  it('tohumda video yok (uydurma içerik yazılmaz)', async () => {
    expect(await count(db as never, 'select * from public.field_videos')).toBe(0);
  });

  it('kaynak tutarlılığı: youtube → 11 karakterlik kimlik şart; upload → video_id şart; başlık tr şart', async () => {
    await expect(db.query(`insert into public.field_videos (title, source) values ('{"tr": "A"}', 'youtube')`)).rejects.toThrow();
    await expect(db.query(`insert into public.field_videos (title, source, youtube_id) values ('{"tr": "A"}', 'youtube', 'kisa')`)).rejects.toThrow();
    await expect(db.query(`insert into public.field_videos (title, source) values ('{"tr": "A"}', 'upload')`)).rejects.toThrow();
    await expect(db.query(`insert into public.field_videos (title, source, youtube_id) values ('{"en": "A"}', 'youtube', 'jNQXAC9IVRw')`)).rejects.toThrow();
  });

  it('anonim yalnız yayındakini okur; editör yazar; viewer yazamaz', async () => {
    await db.query(`insert into public.field_videos (title, source, youtube_id, is_active) values ('{"tr": "Yayında"}', 'youtube', 'jNQXAC9IVRw', true), ('{"tr": "Pasif"}', 'youtube', 'jNQXAC9IVRw', false)`);
    expect(await as(db, anon, (tx) => count(tx, 'select * from public.field_videos'))).toBe(1);
    expect(await as(db, user(users.ids.viewer), (tx) => count(tx, 'select * from public.field_videos'))).toBe(2);
    const editor = await as(db, user(users.ids.editor), async (tx) => (await tx.query(`insert into public.field_videos (title, source, youtube_id) values ('{"tr": "E"}', 'youtube', 'jNQXAC9IVRw')`)).affectedRows);
    expect(editor).toBe(1);
    const write = async (role: { readonly [k: string]: unknown }) =>
      as(db, role as never, async (tx) => {
        try {
          return (await tx.query(`insert into public.field_videos (title, source, youtube_id) values ('{"tr": "X"}', 'youtube', 'jNQXAC9IVRw')`)).affectedRows ?? 0;
        } catch {
          return 0;
        }
      });
    expect(await write(user(users.ids.viewer))).toBe(0);
    expect(await write(anon)).toBe(0);
  });
});
