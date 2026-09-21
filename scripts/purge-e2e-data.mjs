#!/usr/bin/env node
/**
 * Otomatik testlerin (E2E) veritabanında bıraktığı kayıtları temizler. Yalnız AÇIKÇA test olan satırlara dokunur:
 * adı "E2E " ile başlayan ya da e-postası teste ayrılmış alan adında (@example.com) olan kayıtlar + "POSTA TESTİ" talepleri.
 *   node --env-file=.env.local scripts/purge-e2e-data.mjs          → yalnız sayar (kuru çalıştırma)
 *   node --env-file=.env.local scripts/purge-e2e-data.mjs --apply  → siler
 */
import { createClient } from '@supabase/supabase-js';
const apply = process.argv.includes('--apply');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const TARGETS = [
  // [tablo, filtre] — sıra önemli: önce bağımlılar
  ['configurations', (q) => q.ilike('name', 'E2E %')],
  ['job_applications', (q) => q.or('full_name.ilike.E2E %,email.ilike.%@example.com')],
  ['leads', (q) => q.or('full_name.ilike.E2E %,full_name.ilike.POSTA TESTİ %,email.ilike.%@example.com')],
  ['customers', (q) => q.or('full_name.ilike.E2E %,email.ilike.%@example.com')],
  ['testimonials', (q) => q.ilike('author_name', 'E2E %')],
  ['field_videos', (q) => q.ilike('title->>tr', 'E2E %')],
  ['email_queue', (q) => q.ilike('to_email', '%@example.com')],
  ['email_logs', (q) => q.ilike('to_email', '%@example.com')],
];
for (const [table, filter] of TARGETS) {
  const count = await filter(s.from(table).select('id', { count: 'exact', head: true }));
  if (count.error) { console.log(`${table.padEnd(18)} atlandı (${count.error.message.slice(0, 60)})`); continue; }
  if (!apply || !count.count) { console.log(`${table.padEnd(18)} ${count.count} kayıt${apply ? '' : ' (kuru çalıştırma)'}`); continue; }
  const del = await filter(s.from(table).delete()).select('id');
  console.log(`${table.padEnd(18)} ${del.error ? 'HATA: ' + del.error.message.slice(0, 100) : del.data.length + ' silindi'}`);
}
