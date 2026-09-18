import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_MIGRATIONS, createTestDb } from './helpers/db';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); }, 120_000);
afterAll(async () => { await db.close(); });

const names = async (sql: string) => (await db.query<{ name: string }>(sql)).rows.map((row) => row.name).sort();

// Yalnız-ekleme (append-only) ve birleşim tabloları: updated_at taşımaz — düzenlenmezler.
const NO_UPDATED_AT = [
  'analytics_events', 'analytics_pageviews', 'analytics_sessions', 'audit_logs', 'blog_post_tags', 'configuration_items',
  'configuration_versions', 'content_revisions', 'document_counters', 'email_logs', 'form_analytics', 'heatmap_aggregates',
  'material_price_history', 'notifications', 'post_likes', 'project_category_relations', 'review_sync_runs',
  'scroll_depth_aggregates', 'service_projects', 'slug_history', 'web_vitals',
];

// ANONİM ziyaretçinin SELECT yetkisi olan tabloların TAM listesi. Yeni bir tabloyu yanlışlıkla
// anonime açan migration bu testi kırar → açmak bilinçli bir karar olmak zorunda kalır.
const ANON_READABLE = [
  'about_content', 'blog_categories', 'blog_post_tags', 'blog_posts', 'blog_tags', 'certificates', 'clients', 'configurator_rules',
  'content_links', 'faqs', 'field_videos', 'hero_media', 'job_postings', 'media_library', 'menu_items', 'menus', 'panel_types', 'price_guide_rows',
  'price_guides', 'product_categories', 'product_documents', 'product_images', 'product_specs', 'product_variants', 'products',
  'project_categories', 'project_category_relations', 'project_images', 'projects', 'redirects', 'service_images',
  'service_projects', 'services', 'site_settings', 'slug_history', 'solutions', 'static_pages', 'steel_profiles', 'team_members',
  'testimonials', 'ui_translations', 'whatsapp_settings',
  'published_comments', // görünüm: e-posta/IP içermeyen dar kolon listesi
];

describe('şema sözleşmeleri', () => {
  it('~80 tablo', async () => {
    const tables = await names(`select tablename as name from pg_tables where schemaname = 'public'`);
    expect(tables.length).toBeGreaterThanOrEqual(78);
    expect(tables.length).toBeLessThanOrEqual(86);
  });

  it('HER tabloda RLS açık', async () => {
    expect(await names(`select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
                         where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)).toEqual([]);
  });

  it('anonim hiçbir tabloya YAZAMAZ (insert/update/delete/truncate yetkisi yok)', async () => {
    expect(await names(`select distinct table_name as name from information_schema.role_table_grants
                         where table_schema = 'public' and grantee = 'anon' and privilege_type <> 'SELECT'`)).toEqual([]);
  });

  it('anonimin okuyabildiği tablolar açık listeyle BİREBİR aynı', async () => {
    expect(await names(`select distinct table_name as name from information_schema.role_table_grants
                         where table_schema = 'public' and grantee = 'anon' and privilege_type = 'SELECT'`)).toEqual([...ANON_READABLE].sort());
  });

  it('yetki verilmiş her tablonun en az bir politikası var (yetki var + politika yok = sessiz boş sonuç)', async () => {
    expect(await names(`select distinct g.table_name as name from information_schema.role_table_grants g
                          join pg_class c on c.relname = g.table_name and c.relkind = 'r'
                         where g.table_schema = 'public' and g.grantee in ('anon','authenticated')
                           and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = g.table_name)`)).toEqual([]);
  });

  it('yazma politikalarının HEPSİNDE with check var', async () => {
    expect(await names(`select tablename || ' › ' || policyname as name from pg_policies
                         where schemaname = 'public' and cmd in ('ALL','INSERT','UPDATE') and with_check is null`)).toEqual([]);
  });

  it('her tabloda created_at; düzenlenebilir her tabloda updated_at + tetikleyicisi', async () => {
    expect(await names(`select t.tablename as name from pg_tables t where t.schemaname = 'public' and t.tablename <> 'document_counters'
                           and not exists (select 1 from information_schema.columns c where c.table_schema = 'public'
                                            and c.table_name = t.tablename and c.column_name = 'created_at')`)).toEqual([]);

    expect(await names(`select t.tablename as name from pg_tables t where t.schemaname = 'public'
                           and not exists (select 1 from information_schema.columns c where c.table_schema = 'public'
                                            and c.table_name = t.tablename and c.column_name = 'updated_at')`)).toEqual([...NO_UPDATED_AT].sort());

    expect(await names(`select c.table_name as name from information_schema.columns c
                         where c.table_schema = 'public' and c.column_name = 'updated_at'
                           and exists (select 1 from pg_tables t where t.schemaname = 'public' and t.tablename = c.table_name)
                           and not exists (select 1 from pg_trigger g join pg_class r on r.oid = g.tgrelid
                                            where r.relname = c.table_name and g.tgname in ('set_updated_at', 'profiles_set_updated_at'))`)).toEqual([]);
  });

  it('slug taşıyan her tabloda: biçim CHECK + TR/EN kısmi unique İFADE indeksi + geçmiş tetikleyicisi', async () => {
    const withSlug = await names(`select table_name as name from information_schema.columns
                                   where table_schema = 'public' and column_name = 'slug' and data_type = 'jsonb'`);
    expect(withSlug.length).toBeGreaterThanOrEqual(12);
    for (const table of withSlug) {
      const indexes = (await db.query<{ indexdef: string }>(`select indexdef from pg_indexes where schemaname = 'public' and tablename = $1`, [table])).rows.map((r) => r.indexdef);
      for (const locale of ['tr', 'en']) {
        // İfade sorgudakiyle metin olarak aynı olmalı: (slug ->> 'tr')
        expect(indexes.some((def) => def.includes('UNIQUE') && def.includes(`((slug ->> '${locale}'::text))`) && def.includes('WHERE')), `${table} · ${locale}`).toBe(true);
      }
      expect(await names(`select conname as name from pg_constraint where conrelid = 'public.${table}'::regclass and conname = '${table}_slug_format'`), table).toHaveLength(1);
      expect(await names(`select tgname as name from pg_trigger where tgrelid = 'public.${table}'::regclass and tgname = 'record_slug_change'`), table).toHaveLength(1);
    }
  });

  it('security definer fonksiyonların HEPSİNDE search_path sabit (şema ele geçirmeye karşı)', async () => {
    expect(await names(`select n.nspname || '.' || p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname in ('public','app_private') and p.prosecdef
                           and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')`)).toEqual([]);
  });

  it('şema hiçbir uzantıya dayanmaz (PGlite testi + MSSQL taşınabilirliği)', async () => {
    expect(await names(`select extname as name from pg_extension where extname <> 'plpgsql'`)).toEqual([]);
  });

  // createTestDb({ content: false }) bu dosyaları atlar → şema değiştirirlerse atlayan testler eksik şemayla koşardı
  it("içerik migration'ları DDL içermez (yalnız veri yazar)", () => {
    for (const file of CONTENT_MIGRATIONS) {
      const sql = readFileSync(join(__dirname, '..', 'migrations', file), 'utf8');
      expect(sql, file).not.toMatch(/^\s*(create|alter|drop)\s/im);
    }
  });

  // K-75: ürün kataloğu firmanın kendi işinden türetilir (0043) → 'products' bu listede değil.
  // K-55: hizmet/hero/hakkımızda gibi TANIMLAYICI başlangıç metinleri seed edilir (sayısal iddia yok); yorum, proje, ekip, sertifika, fiyat ASLA.
  it('referans verisinde uydurma içerik yok: gerçek-veri tabloları BOŞ başlar', async () => {
    for (const table of ['testimonials', 'projects', 'team_members', 'certificates', 'clients', 'material_prices', 'steel_profiles', 'customers', 'field_videos']) {
      const { rows } = await db.query<{ n: number }>(`select count(*)::int n from public.${table}`);
      expect(rows[0]!.n, table).toBe(0);
    }
  });
});
