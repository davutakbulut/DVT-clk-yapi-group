#!/usr/bin/env node
// Mantıksal yedek (Faz 31, K-69): public şemadaki tüm tablolar + auth kullanıcıları JSON olarak backups/<zaman>/ altına.
// Supabase'in kendi anlık görüntüsünden BAĞIMSIZ ikinci hat; restore tatbikatı scripts/backup-restore-drill.mjs ile.
//
//   node --env-file=.env.local scripts/backup-export.mjs
//
// Secret key yalnız bu yerel betikte (Kural 4). Çıktı kişisel veri içerir: backups/ gitignore'dadır, şifreli diske alınmalı.
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error('.env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY dolu olmalı.');
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

// Tablo listesi migration dosyalarından (bilgi şeması PostgREST'ten okunamaz): sıralı, tekil.
export function tablesFromMigrations(dir) {
  const names = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    for (const m of readFileSync(join(dir, file), 'utf8').matchAll(/create table (?:if not exists )?public\.([a-z_]+)/g)) names.add(m[1]);
  }
  return [...names];
}

const started = Date.now();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = join('backups', stamp);
mkdirSync(out, { recursive: true });
const tables = tablesFromMigrations('supabase/migrations');
const manifest = { exported_at: new Date().toISOString(), source: new URL(url).host, tables: {}, users: 0 };

for (const table of tables) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + 999);
    if (error) {
      console.error(`${table}: HATA ${error.message}`);
      manifest.tables[table] = { error: error.message };
      break;
    }
    rows.push(...data);
    if (data.length < 1000) break;
  }
  if (!manifest.tables[table]) manifest.tables[table] = { rows: rows.length };
  writeFileSync(join(out, `${table}.json`), JSON.stringify(rows));
  console.log(`${table.padEnd(28)} ${String(rows.length).padStart(6)}`);
}

// auth.users: e-posta + meta (şifre özetleri Supabase'de kalır; devralma/rol eşlemesi için kimlik gerekir)
const users = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) {
    console.error(`auth.users: HATA ${error.message}`);
    break;
  }
  users.push(...data.users.map((u) => ({ id: u.id, email: u.email, email_confirmed_at: u.email_confirmed_at, created_at: u.created_at, raw_user_meta_data: u.user_metadata })));
  if (data.users.length < 1000) break;
}
writeFileSync(join(out, 'auth_users.json'), JSON.stringify(users));
manifest.users = users.length;
manifest.duration_ms = Date.now() - started;
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${tables.length} tablo · ${users.length} kullanıcı · ${manifest.duration_ms} ms → ${out}`);
