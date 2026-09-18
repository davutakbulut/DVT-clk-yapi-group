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

it('0042: EN yayında — hizmetler, çözüm, SSS, blog; yasal sayfalar EN DEĞİL', async () => {
  const db = await createTestDb();
  const q = async (s: string) => (await db.query<{ n: number }>(s)).rows[0]!.n;
  expect(await q("select count(*)::int n from public.faqs where 'en' = any(published_locales) and length(answer->>'en') > 40")).toBe(11);
  expect(await q("select count(*)::int n from public.blog_posts where 'en' = any(published_locales) and slug->>'en' is not null and length(body->>'en') > 1000")).toBe(3);
  expect(await q("select count(*)::int n from public.static_pages where kind = 'legal' and 'en' = any(published_locales)")).toBe(0);
}, 120000);

it('0043: 3 kategori, 4 ürün TR+EN yayında, ölçü tabloları ve özellikler; ikinci koşu çoğaltmaz', async () => {
  const db = await createTestDb();
  const q = async (s: string) => (await db.query<{ n: number }>(s)).rows[0]!.n;
  expect(await q('select count(*)::int n from public.product_categories')).toBe(3);
  expect(await q("select count(*)::int n from public.products where status = 'published' and published_locales @> array['tr','en'] and category_id is not null and length(description->>'tr') > 800")).toBe(4);
  expect(await q('select count(*)::int n from public.product_variants')).toBe(19);
  expect(await q("select count(*)::int n from public.product_variants where kg_per_m is not null and stock_code like 'KP-%'")).toBe(12);
  expect(await q('select count(*)::int n from public.product_specs')).toBe(18);
  // kg/m, kesit alanından türetilen standart değerle tutarlı (40×40×2 → 2,31)
  expect(await q("select (kg_per_m * 100)::int n from public.product_variants where stock_code = 'KP-40X40X2'")).toBe(231);
  const { readFileSync } = await import('node:fs');
  await db.exec(readFileSync(new URL('../migrations/0043_product_catalog_seed.sql', import.meta.url), 'utf8'));
  expect(await q('select count(*)::int n from public.products')).toBe(4);
  expect(await q('select count(*)::int n from public.product_variants')).toBe(19);
}, 120000);
