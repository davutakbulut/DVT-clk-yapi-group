#!/usr/bin/env node
// Mantıksal yedeği (scripts/backup-export.mjs çıktısı) MariaDB'ye yükler (K-116).
//   node --env-file=.env.local scripts/mysql/import-backup.mjs backups/<zaman> [--target=main|test] [--replace]
// --replace: yedekte verisi olan tabloları önce boşaltır (DELETE). Yoksa hedefte satır varsa durur.
// --merge: hedefteki satırlara dokunmadan ekler (göçlerin tohumladığı satırlar, ör. 0004 auth şablonları); anahtar çakışması hata sayılır.
// Satır hatası göçü durdurmaz ama sonda listelenir ve çıkış kodu 1 olur: şema çevirisi hatasına işaret eder.
import mysql from 'mysql2/promise';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCHEMA } from '../../src/core/db/mysql/schema.generated.ts';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const target = (args.find((a) => a.startsWith('--target=')) ?? '--target=main').slice(9);
const replace = args.includes('--replace');
const merge = args.includes('--merge');
const url = { main: process.env.MYSQL_URL, test: process.env.MYSQL_TEST_URL }[target];
if (!dir || !url) {
  console.error('Kullanım: import-backup.mjs backups/<zaman> [--target=main|test] [--replace] (MYSQL_URL / MYSQL_TEST_URL gerekli)');
  process.exit(1);
}

// PostgreSQL ISO (ofsetli) → UTC 'YYYY-MM-DD HH:MM:SS.ffffff'; Date mikrosaniyeyi kaybettiği için kesir ayrı taşınır.
function toUtc(s) {
  const m = /^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d):(\d\d)(?:\.(\d+))?(Z|[+-]\d\d(?::?\d\d)?)?$/.exec(s);
  if (!m) throw new Error(`tanınmayan zaman: ${s}`);
  const [, y, mo, d, h, mi, se, frac = '', tz = 'Z'] = m;
  const off = tz === 'Z' ? 0 : (tz[0] === '-' ? -1 : 1) * (Number(tz.slice(1, 3)) * 60 + (tz.length > 3 ? Number(tz.slice(-2)) : 0));
  const t = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi - off, +se));
  return `${t.toISOString().slice(0, 19).replace('T', ' ')}.${frac.padEnd(6, '0').slice(0, 6)}`;
}
assert.equal(toUtc('2026-09-17T23:26:03.233721+00:00'), '2026-09-17 23:26:03.233721');
assert.equal(toUtc('2026-09-18T00:45:14.74986Z'), '2026-09-18 00:45:14.749860');
assert.equal(toUtc('2026-01-01T01:30:00+03:00'), '2025-12-31 22:30:00.000000');
assert.equal(toUtc('2026-01-01T23:00:00.5-05:30'), '2026-01-02 04:30:00.500000');
assert.equal(toUtc('2026-01-01T00:00:00+03'), '2025-12-31 21:00:00.000000');

const read = (name) => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'));
const manifest = read('manifest');
const data = {};
for (const [table, info] of Object.entries(manifest.tables)) if (info.rows) data[table] = read(table);
// auth.users → users; şifre özetleri yedekte yok, password_hash NULL kalır (kullanıcı şifre sıfırlar)
const users = read('auth_users');
if (users.length) {
  data.users = users.map((u) => ({
    id: u.id, email: u.email, password_hash: null, email_confirmed_at: u.email_confirmed_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null, meta: u.raw_user_meta_data ?? u.user_metadata ?? {},
    created_at: u.created_at, updated_at: u.updated_at ?? u.created_at,
  }));
}

const db = await mysql.createConnection({ uri: url, timezone: 'Z', dateStrings: true });
await db.query("SET time_zone = '+00:00'");
await db.query('SET FOREIGN_KEY_CHECKS = 0');
await db.query('SET @app_import = 1');
// Sunucu varsayılanı katı değil: kırpılan/geçersiz değer uyarıyla geçer; göçte sessiz veri kaybı yerine hata olsun
await db.query("SET SESSION sql_mode = CONCAT('STRICT_ALL_TABLES,', @@SESSION.sql_mode)");

// Hedefteki gerçek sütunlar: üretilmiş sütunlara yazılmaz, NOT NULL json için JSON null 'null' olur
const [colRows] = await db.query("SELECT table_name AS t, column_name AS c, is_nullable AS n, extra AS e FROM information_schema.columns WHERE table_schema = DATABASE()");
const live = {};
for (const r of colRows) (live[r.t] ??= {})[r.c] = { nullable: r.n === 'YES', generated: /GENERATED/i.test(r.e) };

const skippedTables = Object.keys(data).filter((t) => !SCHEMA[t] || !live[t]);
for (const t of skippedTables) {
  console.error(`${t}: şemada/hedefte yok, atlandı (${data[t].length} satır)`);
  delete data[t];
}

const tables = Object.keys(data);
if (replace) {
  for (const t of tables) await db.query(`DELETE FROM \`${t}\``);
} else if (!merge) {
  const full = [];
  for (const t of tables) {
    const [[{ n }]] = await db.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    if (n > 0) full.push(`${t} (${n})`);
  }
  if (full.length) {
    console.error(`Hedefte veri var, --replace ya da --merge olmadan yüklenmez: ${full.join(', ')}`);
    await db.end();
    process.exit(1);
  }
}

function convert(kind, value, col) {
  if (value === undefined) return null;
  if (kind === 'json') return value === null ? (col.nullable ? null : 'null') : JSON.stringify(value);
  if (value === null) return null;
  if (kind === 'ts') return toUtc(value);
  if (kind === 'bool') return value ? 1 : 0;
  return value;
}

// MariaDB tekrar hatası değeri (e-posta vb.) metne koyar; rapora kişisel veri sızmasın
const scrub = (msg) => msg.replace(/Duplicate entry '.*?' for key/, "Duplicate entry '<değer>' for key");

const summary = [];
const failures = [];
for (const t of tables) {
  const rows = data[t];
  const meta = SCHEMA[t];
  const present = Object.keys(rows[0]);
  const cols = present.filter((c) => meta.cols[c] && live[t][c] && !live[t][c].generated);
  const dropped = present.filter((c) => !cols.includes(c));
  if (dropped.length) console.error(`${t}: atlanan sütunlar: ${dropped.join(', ')}`);
  const colList = cols.map((c) => `\`${c}\``).join(', ');
  const tuple = `(${cols.map(() => '?').join(', ')})`;
  const values = (r) => cols.map((c) => convert(meta.cols[c], r[c], live[t][c]));
  let inserted = 0;
  await db.beginTransaction();
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    try {
      await db.query(`INSERT INTO \`${t}\` (${colList}) VALUES ${batch.map(() => tuple).join(', ')}`, batch.flatMap(values));
      inserted += batch.length;
    } catch {
      // Toplu deyim geri alındı (deyim düzeyi); hangi satırın bozuk olduğunu bulmak için tek tek dene
      for (const r of batch) {
        try {
          await db.query(`INSERT INTO \`${t}\` (${colList}) VALUES ${tuple}`, values(r));
          inserted += 1;
        } catch (e) {
          failures.push({ table: t, id: meta.pk.map((k) => r[k]).join('/'), error: scrub(e.message) });
        }
      }
    }
  }
  await db.commit();
  summary.push({ table: t, backup: rows.length, inserted, failed: rows.length - inserted });
}

await db.query('SET FOREIGN_KEY_CHECKS = 1');
await db.end();

console.log(`\n${'tablo'.padEnd(28)} ${'yedek'.padStart(6)} ${'eklendi'.padStart(8)} ${'hata'.padStart(5)}`);
for (const s of summary) console.log(`${s.table.padEnd(28)} ${String(s.backup).padStart(6)} ${String(s.inserted).padStart(8)} ${String(s.failed).padStart(5)}`);
const total = summary.reduce((a, s) => [a[0] + s.backup, a[1] + s.inserted], [0, 0]);
console.log(`${'TOPLAM'.padEnd(28)} ${String(total[0]).padStart(6)} ${String(total[1]).padStart(8)} ${String(failures.length).padStart(5)}  → ${target}`);
if (failures.length) {
  console.error(`\n${failures.length} satır yüklenemedi (şema çevirisi hatası olabilir):`);
  for (const f of failures) console.error(`  ${f.table}  ${f.id}  ${f.error}`);
  process.exit(1);
}
