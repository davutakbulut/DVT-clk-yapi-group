// PostgREST uyumlu motorun MariaDB'ye karşı bütünleşik testi (K-116). MYSQL_TEST_URL yoksa atlanır.
//   MYSQL_URL=$MYSQL_TEST_URL npx vitest run src/core/db/mysql
import { PostgrestClient } from '@supabase/postgrest-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const enabled = !!process.env['MYSQL_URL'] && process.env['MYSQL_URL'] === process.env['MYSQL_TEST_URL'];
const TAG = `t${Date.now().toString(36)}`;

describe.skipIf(!enabled)('MariaDB PostgREST motoru', async () => {
  const { createDbFetch, DB_BASE_URL } = await import('../rest/fetch');
  const client = (actor: Parameters<typeof createDbFetch>[0]) => new PostgrestClient(DB_BASE_URL, { fetch: createDbFetch(actor) });
  const service = client({ kind: 'service' });
  const anon = client({ kind: 'anon' });
  const editor = client({ kind: 'user', userId: '00000000-0000-4000-8000-000000000001', role: 'editor' });
  const viewer = client({ kind: 'user', userId: '00000000-0000-4000-8000-000000000002', role: 'viewer' });
  let catId = '';

  beforeAll(async () => {
    const { data, error } = await service
      .from('product_categories')
      .insert({ slug: { tr: `${TAG}-kat` }, name: { tr: 'Çelik Kategori' }, is_active: true })
      .select('id, slug, name, is_active, created_at')
      .single();
    expect(error).toBeNull();
    catId = (data as { id: string }).id;
  });

  afterAll(async () => {
    await service.from('products').delete().like('slug->>tr', `${TAG}%`);
    await service.from('product_categories').delete().like('slug->>tr', `${TAG}%`);
    await service.from('site_settings').delete().like('key', `${TAG}%`);
  });

  it('JSON, boolean ve zaman PostgREST biçiminde döner', async () => {
    const { data, error } = await service.from('product_categories').select('id, slug, name, is_active, created_at').eq('id', catId).single();
    expect(error).toBeNull();
    const row = data as Record<string, unknown>;
    expect(row['slug']).toEqual({ tr: `${TAG}-kat` });
    expect(row['is_active']).toBe(true);
    expect(String(row['created_at'])).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}\+00:00$/);
  });

  it('JSON yolu filtresi, sayım ve sıralama', async () => {
    const { data, count, error } = await service.from('product_categories').select('id, name->>tr', { count: 'exact' }).eq('slug->>tr', `${TAG}-kat`).order('created_at', { ascending: false });
    expect(error).toBeNull();
    expect(count).toBe(1);
    expect(data).toEqual([{ id: catId, tr: 'Çelik Kategori' }]);
  });

  it('erişim: ziyaretçi yazamaz, editör yazar, izleyici yazamaz', async () => {
    const a = await anon.from('product_categories').insert({ slug: { tr: `${TAG}-anon` }, name: { tr: 'x' } });
    expect(a.error?.code).toBe('42501');
    const v = await viewer.from('product_categories').insert({ slug: { tr: `${TAG}-viewer` }, name: { tr: 'x' } });
    expect(v.error?.code).toBe('42501');
    const e = await editor.from('product_categories').insert({ slug: { tr: `${TAG}-editor` }, name: { tr: 'x' } }).select('id').single();
    expect(e.error).toBeNull();
  });

  it('erişim: taslak ürün ziyaretçiye görünmez, yayındaki görünür; gömülü kategori', async () => {
    const draft = await service.from('products').insert({ slug: { tr: `${TAG}-taslak` }, name: { tr: 'Taslak' }, category_id: catId, status: 'draft' }).select('id').single();
    expect(draft.error).toBeNull();
    const pub = await service
      .from('products')
      .insert({ slug: { tr: `${TAG}-yayin` }, name: { tr: 'Yayında' }, category_id: catId, status: 'published', published_locales: ['tr'] })
      .select('id')
      .single();
    expect(pub.error).toBeNull();
    const seen = await anon.from('products').select('slug->>tr, category:product_categories(name)').like('slug->>tr', `${TAG}%`);
    expect(seen.error).toBeNull();
    expect(seen.data).toEqual([{ tr: `${TAG}-yayin`, category: { name: { tr: 'Çelik Kategori' } } }]);
    const many = await service.from('product_categories').select('id, products(slug, status)').eq('id', catId).single();
    expect(many.error).toBeNull();
    expect(((many.data as { products: unknown[] }).products ?? []).length).toBe(2);
  });

  it('kısıt hataları PostgreSQL koduyla: tekrar 23505, biçim 23514', async () => {
    const dup = await service.from('product_categories').insert({ slug: { tr: `${TAG}-kat` }, name: { tr: 'x' } });
    expect(dup.error?.code).toBe('23505');
    const bad = await service.from('product_categories').insert({ slug: { tr: 'Buyuk-Harf' }, name: { tr: 'x' } });
    expect(bad.error?.code).toBe('23514');
  });

  it('upsert, güncelleme ve silme temsil döndürür; or filtresi', async () => {
    const key = `${TAG}.ayar`;
    const up1 = await service.from('site_settings').upsert({ key, value: { a: 1 }, is_public: true }, { onConflict: 'key' }).select('key, value').single();
    expect(up1.error).toBeNull();
    const up2 = await service.from('site_settings').upsert({ key, value: { a: 2 }, is_public: true }, { onConflict: 'key' }).select('value').single();
    expect(up2.data).toEqual({ value: { a: 2 } });
    const pub = await anon.from('site_settings').select('key').or(`key.eq.${key},key.eq.yok`);
    expect(pub.data).toEqual([{ key }]);
    const upd = await service.from('site_settings').update({ is_public: false }).eq('key', key).select('is_public');
    expect(upd.data).toEqual([{ is_public: false }]);
    const hidden = await anon.from('site_settings').select('key').eq('key', key);
    expect(hidden.data).toEqual([]);
    const del = await service.from('site_settings').delete().eq('key', key).select('key');
    expect(del.data).toEqual([{ key }]);
  });

  it('maybeSingle boşta null, single boşta PGRST116', async () => {
    const m = await anon.from('products').select('id').eq('slug->>tr', `${TAG}-yok`).maybeSingle();
    expect(m.error).toBeNull();
    expect(m.data).toBeNull();
    const s = await anon.from('products').select('id').eq('slug->>tr', `${TAG}-yok`).single();
    expect(s.error?.code).toBe('PGRST116');
  });
});
