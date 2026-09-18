import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, cannotWrite, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0019: yazı RPC'si (kategori/etiket/yazar dil süzgeçli), ziyaretçi yorumu (yalnız pending, yalnız açık yazıya), kategori seed.
describe('0019 · blog', () => {
  let db: PGlite;
  let users: TestUsers;
  let postId: string;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
    const cat = (await db.query<{ id: string }>(`select id from public.blog_categories where slug->>'tr' = 'mevzuat'`)).rows[0]!.id;
    const author = (await db.query<{ id: string }>(`insert into public.team_members (full_name, position, status, published_locales, published_at) values ('Ayşe Yılmaz', '{"tr": "İnşaat Mühendisi"}', 'published', '{tr}', now()) returning id`)).rows[0]!.id;
    postId = (await db.query<{ id: string }>(`insert into public.blog_posts (slug, title, body, category_id, author_id, reading_minutes, status, published_locales, published_at)
      values ('{"tr": "tbdy-2018-celik", "en": "tbdy-2018-steel"}', '{"tr": "TBDY 2018 ve çelik", "en": "TBDY 2018 and steel"}', '{"tr": "## Giriş\\n\\nMetin."}', $1, $2, '{"tr": 3}', 'published', '{tr}', now()) returning id`, [cat, author])).rows[0]!.id;
    const tag = (await db.query<{ id: string }>(`insert into public.blog_tags (slug, name) values ('{"tr": "tbdy-2018"}', '{"tr": "TBDY 2018"}') returning id`)).rows[0]!.id;
    await db.query(`insert into public.blog_post_tags (post_id, tag_id) values ($1, $2)`, [postId, tag]);
  });
  afterAll(() => db.close());

  const bySlug = (locale: string, slug: string) => as(db, anon, async (tx) => (await tx.query<{ p: Record<string, unknown> | null }>('select public.get_blog_post_by_slug($1, $2) as p', [locale, slug])).rows[0]!.p);

  it('3 kategori seed; yazılar boş başlamıştı', async () => {
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.blog_categories`);
    expect(rows[0]!.n).toBe(3);
  });

  it('RPC: TR yazı → kategori, etiket, yayındaki yazar, okuma süresi; EN onaysız → null', async () => {
    const p = await bySlug('tr', 'tbdy-2018-celik');
    expect(p?.['title']).toBe('TBDY 2018 ve çelik');
    expect(p?.['category']).toEqual({ slug: 'mevzuat', name: 'Mevzuat' });
    expect(p?.['tags']).toEqual([{ slug: 'tbdy-2018', name: 'TBDY 2018' }]);
    expect((p?.['author'] as { name: string }).name).toBe('Ayşe Yılmaz');
    expect(p?.['reading_minutes']).toBe(3);
    expect(p?.['alternates']).toEqual({ tr: 'tbdy-2018-celik', en: null });
    expect(await bySlug('en', 'tbdy-2018-steel')).toBeNull();
  });

  it('ziyaretçi yorumu: anonim pending ekler, approved ekleyemez, kapalı yazıya ekleyemez, tabloyu okuyamaz; onaylanınca görünümde', async () => {
    await as(db, anon, (tx) => tx.query(`insert into public.post_comments (post_id, author_name, body, locale) values ($1, 'Ziyaretçi', 'Güzel yazı, teşekkürler.', 'tr')`, [postId]));
    expect(await as(db, anon, (tx) => cannotWrite(tx, `insert into public.post_comments (post_id, author_name, body, status) values ($1, 'X', 'yorum metni', 'approved')`, [postId]))).toBe(true);
    await db.query(`update public.blog_posts set allow_comments = false where id = $1`, [postId]);
    expect(await as(db, anon, (tx) => cannotWrite(tx, `insert into public.post_comments (post_id, author_name, body) values ($1, 'X', 'yorum metni')`, [postId]))).toBe(true);
    await db.query(`update public.blog_posts set allow_comments = true where id = $1`, [postId]);
    await expect(as(db, anon, (tx) => tx.query(`select * from public.post_comments`))).rejects.toThrow(/permission denied/);
    // as() geri alır → kalıcı ekle ve onayla
    await db.query(`insert into public.post_comments (post_id, author_name, body, locale, status) values ($1, 'Ziyaretçi', 'Güzel yazı.', 'tr', 'approved')`, [postId]);
    const seen = await as(db, anon, async (tx) => (await tx.query<{ author_name: string }>(`select author_name from public.published_comments where post_id = $1`, [postId])).rows);
    expect(seen).toEqual([{ author_name: 'Ziyaretçi' }]);
  });

  it('editör yorumu onaylar; anonim güncelleyemez', async () => {
    const id = (await db.query<{ id: string }>(`insert into public.post_comments (post_id, author_name, body) values ($1, 'Y', 'bekleyen yorum') returning id`, [postId])).rows[0]!.id;
    const n = await as(db, user(users.ids.editor), async (tx) => (await tx.query(`update public.post_comments set status = 'approved', moderated_by = $2, moderated_at = now() where id = $1`, [id, users.ids.editor])).affectedRows);
    expect(n).toBe(1);
    expect(await as(db, anon, (tx) => cannotWrite(tx, `update public.post_comments set status = 'approved' where id = $1`, [id]))).toBe(true);
  });
});
