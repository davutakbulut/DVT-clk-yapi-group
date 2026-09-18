import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, cannotWrite, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

let db: PGlite;
let users: TestUsers;

beforeAll(async () => {
  db = await createTestDb();
  users = await seedUsers(db);
  await db.exec(`
    insert into public.projects (slug, title, status, published_locales, published_at) values
      ('{"tr":"yayinda-proje"}',    '{"tr":"Yayında"}',    'published', '{tr}', now() - interval '1 day'),
      ('{"tr":"taslak-proje"}',     '{"tr":"Taslak"}',     'draft',     '{}',   null),
      ('{"tr":"zamanlanmis-proje"}','{"tr":"Zamanlanmış"}','published', '{tr}', now() + interval '7 days'),
      ('{"tr":"arsiv-proje"}',      '{"tr":"Arşiv"}',      'archived',  '{}',   null);
    insert into public.media_library (storage_path, file_name, mime_type, size_bytes) values ('p/1.webp', '1.webp', 'image/webp', 10);
    insert into public.project_images (project_id, media_id)
      select p.id, (select id from public.media_library limit 1) from public.projects p where p.slug->>'tr' in ('yayinda-proje','taslak-proje');
  `);
}, 120_000);
afterAll(async () => { await db.close(); });

const ALL_PROJECTS = 'select 1 from public.projects';

describe('içerik — okuma', () => {
  it('anonim YALNIZ yayındaki ve zamanı gelmiş içeriği görür', async () => {
    const slugs = await as(db, anon, async (tx) => (await tx.query<{ s: string }>(`select slug->>'tr' as s from public.projects`)).rows.map((r) => r.s));
    expect(slugs).toEqual(['yayinda-proje']);
  });

  it('anonim taslağı, zamanlanmışı ve arşivi GÖRMEZ — filtreyi kendisi yazsa bile', async () => {
    expect(await as(db, anon, (tx) => count(tx, `select 1 from public.projects where status in ('draft','archived') or published_at > now()`))).toBe(0);
  });

  it('taslak projenin galerisi de sızmaz (alt tablo görünürlüğü ebeveynden miras)', async () => {
    expect(await as(db, anon, (tx) => count(tx, 'select 1 from public.project_images'))).toBe(1);
    expect(await as(db, user(users.ids.editor), (tx) => count(tx, 'select 1 from public.project_images'))).toBe(2);
  });

  it.each(['super_admin', 'admin', 'editor', 'viewer'] as const)('%s taslakları görür', async (role) => {
    expect(await as(db, user(users.ids[role]), (tx) => count(tx, ALL_PROJECTS))).toBe(4);
  });

  it.each(['sales', 'member'] as const)('%s taslakları GÖRMEZ', async (role) => {
    expect(await as(db, user(users.ids[role]), (tx) => count(tx, ALL_PROJECTS))).toBe(1);
  });
});

describe('içerik — yazma', () => {
  const INSERT = `insert into public.projects (slug, title) values ('{"tr":"yeni-proje"}', '{"tr":"Yeni"}')`;
  const UPDATE = `update public.projects set is_featured = true where slug->>'tr' = 'yayinda-proje'`;
  const DELETE = `delete from public.projects where slug->>'tr' = 'yayinda-proje'`;

  it.each(['super_admin', 'admin', 'editor'] as const)('%s ekler, günceller, siler', async (role) => {
    await as(db, user(users.ids[role]), async (tx) => {
      for (const sql of [INSERT, UPDATE, DELETE]) expect(await cannotWrite(tx, sql), sql).toBe(false);
    });
  });

  it.each(['sales', 'viewer', 'member'] as const)('%s YAZAMAZ', async (role) => {
    await as(db, user(users.ids[role]), async (tx) => {
      for (const sql of [INSERT, UPDATE, DELETE]) expect(await cannotWrite(tx, sql), sql).toBe(true);
    });
  });

  it('anonim YAZAMAZ', async () => {
    await as(db, anon, async (tx) => {
      for (const sql of [INSERT, UPDATE, DELETE]) expect(await cannotWrite(tx, sql), sql).toBe(true);
    });
  });

  it('pasifleştirilmiş editör yetkisini ANINDA kaybeder', async () => {
    await db.query(`update public.profiles set is_active = false where id = $1`, [users.ids.editor]);
    try {
      expect(await as(db, user(users.ids.editor), (tx) => count(tx, ALL_PROJECTS))).toBe(1);
      expect(await as(db, user(users.ids.editor), (tx) => cannotWrite(tx, INSERT))).toBe(true);
    } finally {
      await db.query(`update public.profiles set is_active = true where id = $1`, [users.ids.editor]);
    }
  });
});

describe('site ayarları', () => {
  it('anonim yalnız is_public ayarları görür — modül bayrakları ve mail ayarları sızmaz', async () => {
    const keys = await as(db, anon, async (tx) => (await tx.query<{ key: string }>('select key from public.site_settings')).rows.map((r) => r.key));
    expect(keys).toContain('site.name');
    // 0022: seo.verification HTML meta olarak zaten herkese açık → is_public=true (Faz 12)
    expect(keys).toContain('seo.verification');
    expect(keys).not.toContain('modules.enabled');
    expect(keys).not.toContain('configurator.limits');
  });

  it('editör ayarları okur ama DEĞİŞTİREMEZ; admin değiştirir', async () => {
    const sql = `update public.site_settings set value = '"x"' where key = 'site.tagline'`;
    expect(await as(db, user(users.ids.editor), (tx) => cannotWrite(tx, sql))).toBe(true);
    expect(await as(db, user(users.ids.admin), (tx) => cannotWrite(tx, sql))).toBe(false);
  });
});

describe('yorumlar', () => {
  it('anonim onaylı yorumu dar görünümden okur; e-posta ve IP kolonu YOKTUR, tabloya erişemez', async () => {
    await db.exec(`
      insert into public.blog_posts (slug, title, status, published_locales, published_at)
        values ('{"tr":"yazi"}', '{"tr":"Yazı"}', 'published', '{tr}', now());
      insert into public.post_comments (post_id, author_name, author_email, ip_masked, body, status)
        select id, 'Ali', 'ali@example.com', '10.0.0.0', 'Onaylı yorum', 'approved' from public.blog_posts;
      insert into public.post_comments (post_id, author_name, author_email, body, status)
        select id, 'Veli', 'veli@example.com', 'Bekleyen yorum', 'pending' from public.blog_posts;
    `);
    await as(db, anon, async (tx) => {
      const { rows, fields } = await tx.query('select * from public.published_comments');
      expect(rows).toHaveLength(1);
      expect(fields.map((f) => f.name)).not.toEqual(expect.arrayContaining(['author_email', 'ip_masked']));
      expect(await cannotWrite(tx, 'select author_email from public.post_comments')).toBe(true);
    });
  });

  it('yanıta yanıt verilemez (tek seviye)', async () => {
    const { rows } = await db.query<{ id: string; post_id: string }>(`select id, post_id from public.post_comments limit 1`);
    const reply = await db.query<{ id: string }>(`insert into public.post_comments (post_id, parent_id, author_name, body) values ($1, $2, 'A', 'yanıt') returning id`, [rows[0]!.post_id, rows[0]!.id]);
    await expect(db.query(`insert into public.post_comments (post_id, parent_id, author_name, body) values ($1, $2, 'B', 'yanıta yanıt')`, [rows[0]!.post_id, reply.rows[0]!.id])).rejects.toThrow(/tek seviye/);
  });
});
