#!/usr/bin/env node
/**
 * Otomatik testlerin (E2E) veritabanında bıraktığı kayıtları temizler (K-116: MariaDB, doğrudan SQL). Yalnız AÇIKÇA test olan
 * satırlara dokunur: "E2E " / "e2e-" önekli adlar ve slug'lar, teste ayrılmış alan adları (@example.com, @sink.clkyapigroup.com),
 * "POSTA TESTİ" talepleri, adsız-e-postasız "Anonim" sepet talepleri.
 *   node --env-file=.env.local scripts/purge-e2e-data.mjs          → yalnız sayar (kuru çalıştırma)
 *   node --env-file=.env.local scripts/purge-e2e-data.mjs --apply  → siler
 */
import { connect } from './mysql/lib.mjs';

export const E2E_CUSTOMERS = "SELECT id FROM customers WHERE company_title LIKE 'E2E %' OR full_name LIKE 'E2E %' OR email LIKE '%@example.com'";
export const E2E_LEADS = "SELECT id FROM leads WHERE full_name LIKE 'E2E %' OR full_name LIKE 'POSTA TESTİ %' OR email LIKE '%@example.com' OR (full_name = 'Anonim' AND email IS NULL)";
const E2E_SALES = `SELECT id FROM sales WHERE notes LIKE 'E2E %' OR customer_id IN (${E2E_CUSTOMERS}) OR lead_id IN (${E2E_LEADS})`;
const slug = (prefix) => `JSON_VALUE(slug, '$.tr') LIKE '${prefix}%'`;

// [tablo, koşul] — sıra önemli: önce bağımlılar (fatura/tahsilat satışa RESTRICT)
export const TARGETS = [
  ['payments', `sale_id IN (${E2E_SALES})`],
  ['invoices', `sale_id IN (${E2E_SALES})`],
  ['payment_schedules', `sale_id IN (${E2E_SALES})`],
  ['sale_items', `sale_id IN (${E2E_SALES})`],
  ['sales', `id IN (SELECT id FROM (${E2E_SALES}) s)`],
  ['configurations', "name LIKE 'E2E %'"],
  ['job_applications', "full_name LIKE 'E2E %' OR email LIKE 'e2e-%' OR email LIKE '%@example.com'"],
  ['leads', `id IN (SELECT id FROM (${E2E_LEADS}) l)`],
  ['customers', `id IN (SELECT id FROM (${E2E_CUSTOMERS}) c)`],
  ['notifications', "JSON_VALUE(payload, '$.full_name') LIKE 'E2E %' OR JSON_VALUE(payload, '$.full_name') = 'Anonim' OR JSON_VALUE(payload, '$.author_name') LIKE 'E2E %' OR JSON_VALUE(payload, '$.name') LIKE 'E2E %'"],
  ['projects', slug('e2e-proje-')],
  ['services', slug('e2e-hizmet-')],
  ['blog_posts', slug('e2e-yazi-')],
  ['job_postings', slug('e2e-ilan-')],
  ['products', slug('e2e-urun-')],
  ['solutions', slug('e2e-cozum-')],
  ['price_guides', slug('e2e-fiyat-')],
  ['material_prices', "code LIKE 'E2E-%'"],
  ['testimonials', "author_name LIKE 'E2E %'"],
  ['field_videos', "JSON_VALUE(title, '$.tr') LIKE 'E2E %'"],
  ['redirects', "source_path LIKE '/e2e-%'"],
  ['ui_translations', "value LIKE 'E2E %'"],
  ['translation_glossary', "term_tr LIKE 'E2E %'"],
  ['funnels', "name LIKE 'E2E Huni %'"],
  ['steel_profiles', "code LIKE 'E2E%'"],
  ['error_logs', "message LIKE 'E2E %' OR module = 'e2e' OR path LIKE '/tr/e2e-yok-sayfa-%'"],
  ['email_queue', "to_email LIKE '%@example.com'"],
  ['email_logs', "to_email LIKE '%@example.com' OR to_email LIKE '%@sink.clkyapigroup.com'"],
  // Toplu e-posta (K-108): E2E kampanyaları (alıcı satırları cascade) ve teste ayrılmış adreslerin engel kayıtları
  ['mail_suppressions', "email LIKE '%@example.com' OR email LIKE '%@sink.clkyapigroup.com'"],
  ['mail_campaigns', "name LIKE 'E2E %'"],
  ['mail_campaign_templates', "name LIKE 'E2E %'"],
];

export async function purge(apply) {
  const db = await connect();
  for (const [table, where] of TARGETS) {
    try {
      const [[{ n }]] = await db.query(`SELECT COUNT(*) AS n FROM \`${table}\` WHERE ${where}`);
      if (!apply || !n) {
        console.log(`${table.padEnd(24)} ${n} kayıt${apply ? '' : ' (kuru çalıştırma)'}`);
        continue;
      }
      const [res] = await db.query(`DELETE FROM \`${table}\` WHERE ${where}`);
      console.log(`${table.padEnd(24)} ${res.affectedRows} silindi`);
    } catch (e) {
      console.log(`${table.padEnd(24)} HATA: ${String(e.message).slice(0, 120)}`);
    }
  }
  await db.end();
}

if (import.meta.url === `file://${process.argv[1]}`) await purge(process.argv.includes('--apply'));
