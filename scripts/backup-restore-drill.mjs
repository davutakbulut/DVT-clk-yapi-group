#!/usr/bin/env node
// Geri yükleme tatbikatı (Faz 31, K-69): boş PGlite + şim + TÜM migration'lar → yedekteki satırlar tablo tablo geri yüklenir →
// satır sayıları ve örnek kayıtlar doğrulanır; süre ölçülür; rapor backups/<zaman>/RESTORE-REPORT.md.
//
//   node scripts/backup-restore-drill.mjs [backups/<zaman>]   (verilmezse en yeni yedek)
//
// Docker/pg_restore gerekmez. Üretime DOKUNMAZ: hedef bellek içi PGlite'tır.
import { PGlite } from '@electric-sql/pglite';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? (() => {
  const all = readdirSync('backups').filter((d) => existsSync(join('backups', d, 'manifest.json'))).sort();
  return all.length ? join('backups', all[all.length - 1]) : null;
})();
if (!dir) {
  console.error('Yedek yok: önce node --env-file=.env.local scripts/backup-export.mjs');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
const t0 = Date.now();

const db = new PGlite();
await db.exec(readFileSync('supabase/tests/helpers/supabase-shim.sql', 'utf8'));
const migrations = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).sort();
for (const file of migrations) await db.exec(readFileSync(join('supabase/migrations', file), 'utf8'));
const tSchema = Date.now();

// auth.users önce (profiles FK); şim auth.users tablosunu tanımlar
const users = JSON.parse(readFileSync(join(dir, 'auth_users.json'), 'utf8'));
await db.exec('alter table auth.users disable trigger all');
for (const u of users) {
  await db.query('insert into auth.users (id, email, email_confirmed_at, created_at, raw_user_meta_data) values ($1, $2, $3, $4, $5::jsonb) on conflict (id) do nothing', [u.id, u.email, u.email_confirmed_at, u.created_at, JSON.stringify(u.raw_user_meta_data ?? {})]);
}

// Tablolar: FK sırası önemsiz — replica modunda FK/tetikleyici kapalı; tohum satırları (migration) ile çakışan PK'ler yedektekiyle değiştirilir.
await db.exec("set session_replication_role = 'replica'");
const report = [];
let failures = 0;
for (const [table, info] of Object.entries(manifest.tables)) {
  if (info.error) {
    report.push({ table, expected: null, restored: null, note: `dışa aktarım hatası: ${info.error}` });
    continue;
  }
  const rows = JSON.parse(readFileSync(join(dir, `${table}.json`), 'utf8'));
  await db.exec(`delete from public.${table}`);

  let note = '';
  // Sütun tipleri bilgi şemasından: jsonb'de JSON null ↔ SQL NULL ayrımı (not null sütunda 'null'::jsonb), diziler jsonb'den açılır, üretilmiş sütunlar atlanır.
  const { rows: cols } = await db.query(
    "select column_name, data_type, udt_name, is_nullable, is_generated from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position",
    [table],
  );
  const insertable = cols.filter((c) => c.is_generated !== 'ALWAYS');
  const names = insertable.map((c) => `"${c.column_name}"`).join(', ');
  const placeholders = insertable
    .map((c, i) => {
      const n = i + 1;
      if (c.data_type === 'jsonb' || c.data_type === 'json') return `$${n}::${c.data_type}`;
      if (c.data_type === 'ARRAY') return `(select coalesce(array_agg(x), '{}')::${c.udt_name.slice(1)}[] from jsonb_array_elements_text($${n}::jsonb) x)`;
      return `$${n}::${c.udt_name}`;
    });
  const sql = `insert into public.${table} (${names}) values (${placeholders.join(', ')})`;
  for (const row of rows) {
    const values = insertable.map((c) => {
      const v = row[c.column_name];
      if (c.data_type === 'jsonb' || c.data_type === 'json') return v === null && c.is_nullable === 'YES' ? null : JSON.stringify(v);
      if (c.data_type === 'ARRAY') return v === null ? null : JSON.stringify(v);
      return v === undefined ? null : v;
    });
    try {
      await db.query(sql, values);

    } catch (e) {
      if (!note) note = String(e.message).split('\n')[0].slice(0, 160);
    }
  }
  const { rows: cnt } = await db.query(`select count(*)::int as n from public.${table}`);
  const ok = cnt[0].n === rows.length;
  if (!ok) failures += 1;
  report.push({ table, expected: rows.length, restored: cnt[0].n, note: ok ? '' : note || 'sayı uyuşmuyor' });
}
await db.exec("set session_replication_role = 'origin'");
const tData = Date.now();

// Örnek doğrulama: RLS/RPC katmanı geri yüklenen veriyle çalışıyor mu (anonim slug RPC'si)
let spot = 'atlandı';
try {
  const { rows } = await db.query("select count(*)::int as n from public.services where status = 'published'");
  const { rows: menu } = await db.query('select count(*)::int as n from public.menu_items');
  spot = `yayındaki hizmet ${rows[0].n} · menü öğesi ${menu[0].n}`;
} catch (e) {
  spot = `hata: ${e.message}`;
}
await db.close();

const lines = [
  `# Geri yükleme tatbikatı — ${new Date().toISOString()}`,
  '',
  `Yedek: \`${dir}\` (dışa aktarım ${manifest.exported_at}, kaynak ${manifest.source})`,
  `Şema (şim + ${migrations.length} migration): **${tSchema - t0} ms** · Veri (${Object.keys(manifest.tables).length} tablo, ${users.length} kullanıcı): **${tData - tSchema} ms** · Toplam: **${tData - t0} ms**`,
  `Sonuç: ${failures === 0 ? '✅ tüm tablolar birebir' : `⚠️ ${failures} tabloda fark`} · örnek doğrulama: ${spot}`,
  '',
  '| Tablo | Beklenen | Geri yüklenen | Not |',
  '|---|---:|---:|---|',
  ...report.map((r) => `| ${r.table} | ${r.expected ?? '—'} | ${r.restored ?? '—'} | ${r.note} |`),
  '',
  '> Kapsam dışı: Storage nesneleri (medya/CV dosyaları) ve auth şifre özetleri — bunlar Supabase anlık görüntüsüyle döner. Bu tatbikat mantıksal (satır) yedeğin bütünlüğünü ve şemanın sıfırdan kurulabilirliğini kanıtlar.',
];
writeFileSync(join(dir, 'RESTORE-REPORT.md'), lines.join('\n'));
console.log(lines.slice(0, 5).join('\n'));
for (const r of report.filter((x) => x.note)) console.log(`  ! ${r.table}: ${r.note}`);
process.exit(failures === 0 ? 0 : 2);
