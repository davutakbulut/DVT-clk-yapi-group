// Yerel betikler için MariaDB yardımcıları (K-116). Şifre özeti ve jeton biçimi src/core/db/mysql/authStore.ts ile AYNI olmalı.
import { createHash, randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
import mysql from 'mysql2/promise';

const scrypt = promisify(scryptCb);
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function connect(url = process.env.MYSQL_URL) {
  if (!url) throw new Error('.env.local içinde MYSQL_URL gerekli');
  const db = await mysql.createConnection({ uri: url, timezone: 'Z', dateStrings: true });
  // betikler güvenilir bağlam: tetikleyiciler @app_kind='service' görür (profil/satış korumaları atlanır, denetimde aktör yok)
  await db.query("SET time_zone = '+00:00', sql_mode = 'STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION', transaction_isolation = 'READ-COMMITTED', @app_kind = 'service'");
  return db;
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export const newToken = () => randomBytes(32).toString('base64url');
export const tokenHash = (t) => createHash('sha256').update(t).digest('hex');
export const normalizeEmail = (e) => e.trim().toLocaleLowerCase('en');
export const isEmail = (e) => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

/** Tek kullanımlık şifre belirleme bağlantısı (purpose: recovery / invite); önceki kullanılmamışlar geçersiz olur. */
export async function recoveryLink(db, userId, origin, { purpose = 'recovery', minutes = 60, next = '/tr/sifre-yenile' } = {}) {
  const token = newToken();
  await db.query('UPDATE auth_tokens SET used_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND purpose = ? AND used_at IS NULL', [userId, purpose]);
  await db.query('INSERT INTO auth_tokens (purpose, user_id, token_hash, expires_at) VALUES (?, ?, ?, UTC_TIMESTAMP(6) + INTERVAL ? MINUTE)', [purpose, userId, tokenHash(token), minutes]);
  return `${origin.replace(/\/+$/, '')}/auth/callback?token_hash=${token}&type=${purpose}&next=${encodeURIComponent(next)}`;
}
