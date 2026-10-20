#!/usr/bin/env node
// Bir hesap için TEK KULLANIMLIK şifre belirleme bağlantısı üretir ve YALNIZ bu terminale yazar (K-116: MariaDB).
// Şifreyi kişi tarayıcıda kendisi belirler; şifre hiçbir betikten, sohbetten ya da dosyadan geçmez.
//
//   node --env-file=.env.local scripts/admin-recovery-link.mjs ad@firma.com [https://clkyapigroup.com]
//
// Bağlantı 1 saat geçerlidir, bir kez kullanılır. Bağlantıyı açan kişi hesaba girer: kimseyle paylaşmayın.
import { connect, isEmail, normalizeEmail, recoveryLink } from './mysql/lib.mjs';

const [email, origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'] = process.argv.slice(2);
if (!isEmail(email)) {
  console.error('Kullanım: node --env-file=.env.local scripts/admin-recovery-link.mjs <e-posta> [site adresi]');
  process.exit(1);
}
const db = await connect();
const [[user]] = await db.query('SELECT id FROM users WHERE email = ?', [normalizeEmail(email)]);
if (!user) {
  console.error('Bu e-postayla kullanıcı yok.');
  process.exit(1);
}
console.log(await recoveryLink(db, user.id, origin));
await db.end();
