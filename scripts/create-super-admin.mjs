#!/usr/bin/env node
// İlk (ya da ek) super_admin hesabını açar ve şifre belirleme bağlantısını YALNIZ bu terminale yazar (K-116: MariaDB).
//
//   node --env-file=.env.local scripts/create-super-admin.mjs ad@firma.com "Ad Soyad" [https://clkyapigroup.com]
//
// Şifre bu betikten GEÇMEZ: kişi bağlantıyı açıp kendisi belirler (7 gün geçerli, tek kullanımlık).
import { connect, isEmail, normalizeEmail, recoveryLink } from './mysql/lib.mjs';

const [email, fullName = '', origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'] = process.argv.slice(2);
if (!isEmail(email)) {
  console.error('Kullanım: node --env-file=.env.local scripts/create-super-admin.mjs <e-posta> ["Ad Soyad"] [site adresi]');
  process.exit(1);
}
const db = await connect();
const addr = normalizeEmail(email);
let [[user]] = await db.query('SELECT id FROM users WHERE email = ?', [addr]);
if (!user) {
  // profil satırını tetikleyici açar (users_after_insert, full_name meta'dan)
  [[user]] = await db.query('INSERT INTO users (email, meta, email_confirmed_at) VALUES (?, ?, UTC_TIMESTAMP(6)) RETURNING id', [addr, JSON.stringify(fullName ? { full_name: fullName } : {})]);
}
await db.query("UPDATE profiles SET role = 'super_admin', is_active = TRUE WHERE id = ?", [user.id]);
console.log(`✔ ${addr} super_admin. Şifre belirleme bağlantısı (7 gün, tek kullanım):`);
console.log(await recoveryLink(db, user.id, origin, { purpose: 'invite', minutes: 7 * 24 * 60 }));
await db.end();
