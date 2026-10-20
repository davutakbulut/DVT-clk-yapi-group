#!/usr/bin/env node
// E2E testleri için AYRI bir personel hesabı (rol: admin — super_admin DEĞİL) (K-116: MariaDB).
//   node --env-file=.env.local scripts/create-e2e-user.mjs
// .env.local'da E2E_ADMIN_EMAIL/PASSWORD yoksa rastgele şifreyle açar ve oraya yazar; varsa hesabı bu bilgilerle eşitler
// (veri aktarımından sonra şifre özeti yoktur). Şifre sohbete/log'a basılmaz.
import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { connect, hashPassword, normalizeEmail } from './mysql/lib.mjs';

const envFile = new URL('../.env.local', import.meta.url);
let email = process.env.E2E_ADMIN_EMAIL;
let password = process.env.E2E_ADMIN_PASSWORD;
const fresh = !email || !password;
if (fresh) {
  email = `e2e-admin+${Date.now()}@clk-yapi-group.test`;
  password = randomBytes(24).toString('base64url');
}
const db = await connect();
const addr = normalizeEmail(email);
const hash = await hashPassword(password);
let [[user]] = await db.query('SELECT id FROM users WHERE email = ?', [addr]);
if (user) await db.query('UPDATE users SET password_hash = ?, email_confirmed_at = COALESCE(email_confirmed_at, UTC_TIMESTAMP(6)) WHERE id = ?', [hash, user.id]);
else [[user]] = await db.query('INSERT INTO users (email, password_hash, meta, email_confirmed_at) VALUES (?, ?, ?, UTC_TIMESTAMP(6)) RETURNING id', [addr, hash, JSON.stringify({ full_name: 'E2E Admin' })]);
await db.query("UPDATE profiles SET role = 'admin', is_active = TRUE, must_change_password = FALSE WHERE id = ?", [user.id]);
await db.end();
if (fresh) appendFileSync(envFile, `\n# E2E test hesabı (scripts/create-e2e-user.mjs) — yalnız yerel/CI gizli değişkeni\nE2E_ADMIN_EMAIL=${email}\nE2E_ADMIN_PASSWORD=${password}\n`);
console.log(`✔ ${addr} (admin) ${fresh ? 'oluşturuldu; kimlik bilgileri .env.local\'a yazıldı' : 'şifresi .env.local ile eşitlendi'}.`);
