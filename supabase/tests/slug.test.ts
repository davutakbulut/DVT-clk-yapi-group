import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isValidSlug, slugify } from '../../src/lib/slugify';
import { anon, as, createTestDb } from './helpers/db';

let db: PGlite;
beforeAll(async () => { db = await createTestDb({ content: false }); }, 120_000);
afterAll(async () => { await db.close(); });

const insertProject = (slug: object, extra = '') => db.query(`insert into public.projects (slug, title ${extra ? ', ' + extra.split('=')[0] : ''}) values ($1, '{"tr":"Başlık","en":"Title"}' ${extra ? ', ' + extra.split('=')[1] : ''}) returning id`, [JSON.stringify(slug)]);

describe('slug CHECK kısıtı — veritabanındaki son emniyet', () => {
  it.each(['Buyuk-Harf', 'çelik-çatı', 'cift--tire', '-bas', 'son-', 'bosluk var', 'nokta.li', 'x'.repeat(81)])('reddeder: %s', async (bad) => {
    await expect(insertProject({ tr: bad })).rejects.toThrow(/projects_slug_format/);
  });

  it.each(['kategori', 'category', 'etiket', 'tag', 'arama', 'search', 'sayfa', 'page', '403', 'api'])('rezerve kelime reddedilir: %s (K-17)', async (reserved) => {
    await expect(insertProject({ tr: reserved })).rejects.toThrow(/projects_slug_format/);
  });

  it('TR zorunlu, bilinmeyen dil anahtarı reddedilir', async () => {
    await expect(insertProject({ en: 'only-english' })).rejects.toThrow(/projects_slug_format/);
    await expect(insertProject({ tr: 'gecerli', de: 'gultig' })).rejects.toThrow(/projects_slug_format/);
  });

  it('uygulamadaki slugify() ile veritabanı deseni AYNI kararı verir', async () => {
    const samples = ['Fabrika Çelik Çatı', 'İSTANBUL İNŞAAT', 'IĞDIR ISITMA', 'Kâr & Rüzgâr', 'kategori', 'a--b', 'Son-', '100% Çelik!'];
    for (const sample of [...samples, ...samples.map(slugify)]) {
      const { rows } = await db.query<{ ok: boolean }>('select app_private.is_valid_slug($1) as ok', [sample]);
      const reserved = ['kategori'].includes(sample);
      expect(rows[0]!.ok, sample).toBe(isValidSlug(sample) && !reserved);
    }
  });
});

describe('benzersizlik — locale başına', () => {
  it('aynı Türkçe slug iki projeye verilemez; TR ve EN ayrı uzaylardır', async () => {
    await insertProject({ tr: 'depo-projesi', en: 'warehouse-project' });
    await expect(insertProject({ tr: 'depo-projesi' })).rejects.toThrow(/projects_slug_tr_uq/);
    await expect(insertProject({ tr: 'baska-proje', en: 'warehouse-project' })).rejects.toThrow(/projects_slug_en_uq/);
    await expect(insertProject({ tr: 'warehouse-project' })).resolves.toBeDefined();
  });

  it('EN slug u olmayan birden çok kayıt çakışmaz (kısmi indeks)', async () => {
    await insertProject({ tr: 'yalniz-turkce-1' });
    await expect(insertProject({ tr: 'yalniz-turkce-2' })).resolves.toBeDefined();
  });
});

describe('K-07 / K-08 · "yayında" ≠ "çevrildi"', () => {
  const publish = (locales: string, meta: object, slug: object = { tr: `p-${Math.random().toString(36).slice(2, 8)}`, en: `e-${Math.random().toString(36).slice(2, 8)}` }) =>
    db.query(`insert into public.projects (slug, title, status, published_locales, published_at, translation_meta)
              values ($1, '{"tr":"Başlık","en":"Title"}', 'published', $2, now(), $3)`, [JSON.stringify(slug), locales, JSON.stringify(meta)]);

  it('makine çevirisi insan onayı OLMADAN İngilizce yayına giremez', async () => {
    await expect(publish('{tr,en}', { en: { machine: true, reviewed: false } })).rejects.toThrow(/projects_publishable/);
    await expect(publish('{tr,en}', {})).rejects.toThrow(/projects_publishable/);
  });

  it('onaylanınca girer', async () => {
    await expect(publish('{tr,en}', { en: { machine: true, reviewed: true } })).resolves.toBeDefined();
  });

  it('EN slug u yoksa onaylı olsa bile EN yayına giremez', async () => {
    await expect(publish('{tr,en}', { en: { reviewed: true } }, { tr: 'slugsiz-en' })).rejects.toThrow(/projects_publishable/);
  });

  it('bilinmeyen dil yayınlanamaz', async () => {
    await expect(publish('{tr,de}', {})).rejects.toThrow(/projects_publishable/);
  });
});

describe('K-15 · slug geçmişi → 308', () => {
  it('slug değişince eskisi geçmişe düşer ve güncel slug çözülür', async () => {
    await db.exec(`insert into public.projects (slug, title, status, published_locales, published_at)
                   values ('{"tr":"eski-ad"}', '{"tr":"P"}', 'published', '{tr}', now())`);
    await db.exec(`update public.projects set slug = '{"tr":"yeni-ad"}' where slug->>'tr' = 'eski-ad'`);

    const resolved = await as(db, anon, async (tx) => (await tx.query<{ s: string }>(`select public.resolve_old_slug('project', 'tr', 'eski-ad') as s`)).rows[0]!.s);
    expect(resolved).toBe('yeni-ad');
  });

  it('zincir: A → B → C sonrası hem A hem B güncel C ye çözülür', async () => {
    await db.exec(`update public.projects set slug = '{"tr":"en-yeni-ad"}' where slug->>'tr' = 'yeni-ad'`);
    for (const old of ['eski-ad', 'yeni-ad']) {
      const { rows } = await db.query<{ s: string }>(`select public.resolve_old_slug('project', 'tr', $1) as s`, [old]);
      expect(rows[0]!.s, old).toBe('en-yeni-ad');
    }
  });

  it('eski slug a GERİ dönülürse geçmiş kaydı silinir (kendine 308 döngüsü olmaz)', async () => {
    await db.exec(`update public.projects set slug = '{"tr":"eski-ad"}' where slug->>'tr' = 'en-yeni-ad'`);
    const { rows } = await db.query<{ n: number }>(`select count(*)::int n from public.slug_history where old_slug = 'eski-ad'`);
    expect(rows[0]!.n).toBe(0);
  });

  it('taslağa çekilen kaydın yeni slug ı anonime SIZMAZ', async () => {
    await db.exec(`update public.projects set slug = '{"tr":"gizli-yeni-ad"}', status = 'draft', published_locales = '{}' where slug->>'tr' = 'eski-ad'`);
    const resolved = await as(db, anon, async (tx) => (await tx.query<{ s: string | null }>(`select public.resolve_old_slug('project', 'tr', 'eski-ad') as s`)).rows[0]!.s);
    expect(resolved).toBeNull();
  });

  it('bilinmeyen entity_type enjeksiyon değil, null döner', async () => {
    const { rows } = await db.query<{ s: string | null }>(`select public.resolve_old_slug('projects; drop table projects', 'tr', 'x') as s`);
    expect(rows[0]!.s).toBeNull();
  });
});

describe('sürükle-bırak sıralama', () => {
  it('yeni kayıt sona eklenir; iki kaydın sırası TEK transaction da takas edilir (ertelenebilir unique)', async () => {
    await db.exec(`insert into public.services (slug, title) values ('{"tr":"hizmet-a"}', '{"tr":"A"}'), ('{"tr":"hizmet-b"}', '{"tr":"B"}')`);
    // 0017 başlangıç hizmetleri de tabloda: yeni kayıtlar onların ARKASINA ardışık eklenir.
    const before = (await db.query<{ s: string; o: number }>(`select slug->>'tr' as s, sort_order as o from public.services order by sort_order`)).rows;
    expect(before.slice(-2).map((r) => [r.s, r.o])).toEqual([['hizmet-a', before.length - 1], ['hizmet-b', before.length]]);

    await db.transaction(async (tx) => {
      await tx.exec(`update public.services set sort_order = ${before.length} where slug->>'tr' = 'hizmet-a'`); // ara durumda ÇAKIŞIR — commit'e kadar ertelenir
      await tx.exec(`update public.services set sort_order = ${before.length - 1} where slug->>'tr' = 'hizmet-b'`);
    });
    const after = (await db.query<{ s: string }>(`select slug->>'tr' as s from public.services order by sort_order`)).rows.map((r) => r.s);
    expect(after.slice(-2)).toEqual(['hizmet-b', 'hizmet-a']);
  });

  it('kapsamlı sıra: her ürünün görselleri kendi içinde 1 den başlar', async () => {
    await db.exec(`
      insert into public.products (slug, name) values ('{"tr":"urun-1"}', '{"tr":"Ü1"}'), ('{"tr":"urun-2"}', '{"tr":"Ü2"}');
      insert into public.media_library (storage_path, file_name, mime_type, size_bytes) values ('a.webp','a','image/webp',1), ('b.webp','b','image/webp',1);
      insert into public.product_images (product_id, media_id) select p.id, m.id from public.products p cross join public.media_library m;`);
    const { rows } = await db.query<{ orders: number[] }>(`select array_agg(sort_order order by sort_order) as orders from public.product_images group by product_id`);
    expect(rows.map((r) => r.orders)).toEqual([[1, 2], [1, 2]]);
  });
});
