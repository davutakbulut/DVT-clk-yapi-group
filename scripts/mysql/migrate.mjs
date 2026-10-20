#!/usr/bin/env node
// MariaDB göçleri (K-116): db/migrations/*.sql sırayla, schema_migrations'a kaydedilerek uygulanır.
//   node --env-file=.env.local scripts/mysql/migrate.mjs [--reset]   (--reset: TÜM tabloları siler — yalnız ilk kurulum/yerel)
import mysql from 'mysql2/promise';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.MYSQL_URL;
if (!url) { console.error('.env.local içinde MYSQL_URL gerekli'); process.exit(1); }
const dir = join(import.meta.dirname, '..', '..', 'db', 'migrations');
const db = await mysql.createConnection({ uri: url, multipleStatements: true, timezone: 'Z' });
await db.query("SET time_zone = '+00:00'");
if (process.argv.includes('--reset')) {
  const [rows] = await db.query('SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()');
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const { t } of rows) await db.query(`DROP TABLE \`${t}\``);
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log(`${rows.length} tablo silindi`);
}
await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(200) PRIMARY KEY, applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6))');
const [done] = await db.query('SELECT name FROM schema_migrations');
const applied = new Set(done.map((r) => r.name));
for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  if (applied.has(file)) continue;
  // MariaDB'de DDL örtük commit yapar: yarıda kalan göç elle temizlenir (--reset yalnız boş/yerel veritabanında)
  await db.query(readFileSync(join(dir, file), 'utf8'));
  await db.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
  console.log(`uygulandı: ${file}`);
}
await db.end();
