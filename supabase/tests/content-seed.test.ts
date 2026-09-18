import { expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
it('0041 uygulanır: 4 yasal sayfa yayında, 11 SSS, 3 yazı; ikinci koşu çoğaltmaz', async () => {
  const db = await createTestDb();
  const q = async (s: string) => (await db.query<{ n: number }>(s)).rows[0]!.n;
  expect(await q("select count(*)::int n from public.static_pages where kind='legal' and status='published' and 'tr' = any(published_locales) and length(body->>'tr') > 500")).toBe(4);
  expect(await q("select count(*)::int n from public.faqs where status='published'")).toBe(11);
  expect(await q("select count(*)::int n from public.blog_posts where status='published' and category_id is not null")).toBe(3);
  const { readFileSync } = await import('node:fs');
  await db.exec(readFileSync(new URL('../migrations/0041_content_legal_faq_blog.sql', import.meta.url), 'utf8'));
  expect(await q('select count(*)::int n from public.faqs')).toBe(11);
  expect(await q('select count(*)::int n from public.blog_posts')).toBe(3);
}, 120000);
