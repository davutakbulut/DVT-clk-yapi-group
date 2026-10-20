import 'server-only';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PoolConnection } from 'mysql2/promise';
import type { Result } from '@/core/errors/result';
import { withConnection } from './pool';

// K-116 · Giriş sisteminin veri katmanı. Tablolar PostgREST motoruna AÇIK DEĞİL (access.generated'da yoklar → 42501);
// yalnız bu dosya ve core/auth üzerinden erişilir. Bağlantı 'service' aktörüyle: tetikleyiciler güvenilir bağlam görür.

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const parts = stored?.split('$');
  if (!parts || parts.length !== 6 || parts[0] !== 'scrypt') {
    // kullanıcı yok/şifresiz: zamanlama farkı e-postanın varlığını sızdırmasın diye yine hesapla
    await scrypt(password, randomBytes(16), 32, SCRYPT);
    return false;
  }
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash!, 'base64');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(salt!, 'base64'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const newToken = (): string => randomBytes(32).toString('base64url');
export const tokenHash = (token: string): string => createHash('sha256').update(token).digest('hex');

const svc = <T>(fn: (conn: PoolConnection) => Promise<T>): Promise<Result<T>> => withConnection({ kind: 'service' }, fn);
type Row = Record<string, unknown>;
const rows = async (conn: PoolConnection, sql: string, params: unknown[] = []): Promise<Row[]> => (await conn.query(sql, params))[0] as Row[];

export interface SessionUser {
  readonly id: string;
  readonly email: string;
  /** Etkin profilin rolü; pasif hesapta null (app_private.user_role() gibi) */
  readonly role: string | null;
}

export const SESSION_DAYS = 30;

export function createSession(userId: string, userAgent: string | null): Promise<Result<string>> {
  return svc(async (conn) => {
    const token = newToken();
    await conn.query('INSERT INTO auth_sessions (user_id, token_hash, expires_at, user_agent) VALUES (?, ?, UTC_TIMESTAMP(6) + INTERVAL ? DAY, ?)', [userId, tokenHash(token), SESSION_DAYS, userAgent?.slice(0, 300) ?? null]);
    await conn.query('UPDATE users SET last_sign_in_at = UTC_TIMESTAMP(6) WHERE id = ?', [userId]);
    return token;
  });
}

/** Geçerli oturumun kullanıcısı. Günde bir kez son kullanım ve bitiş ileri alınır (kayan 30 gün). */
export function readSession(token: string): Promise<Result<SessionUser | null>> {
  return svc(async (conn) => {
    const hash = tokenHash(token);
    const [row] = await rows(
      conn,
      `SELECT u.id, u.email, IF(p.is_active, p.role, NULL) AS role, s.last_used_at < UTC_TIMESTAMP(6) - INTERVAL 1 DAY AS stale
         FROM auth_sessions s JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.id = u.id
        WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP(6)`,
      [hash],
    );
    if (!row) return null;
    if (Number(row['stale'])) await conn.query('UPDATE auth_sessions SET last_used_at = UTC_TIMESTAMP(6), expires_at = UTC_TIMESTAMP(6) + INTERVAL ? DAY WHERE token_hash = ?', [SESSION_DAYS, hash]);
    return { id: String(row['id']), email: String(row['email']), role: row['role'] == null ? null : String(row['role']) };
  });
}

export function deleteSession(token: string): Promise<Result<void>> {
  return svc(async (conn) => {
    await conn.query('DELETE FROM auth_sessions WHERE token_hash = ?', [tokenHash(token)]);
  });
}

/** Şifre/e-posta değişince diğer cihazlardaki oturumlar kapanır. */
export function deleteOtherSessions(userId: string, keepToken: string | null): Promise<Result<void>> {
  return svc(async (conn) => {
    await conn.query('DELETE FROM auth_sessions WHERE user_id = ? AND token_hash <> ?', [userId, keepToken ? tokenHash(keepToken) : '']);
  });
}

export interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string | null;
  readonly emailConfirmed: boolean;
}

const toUser = (r: Row): UserRow => ({ id: String(r['id']), email: String(r['email']), passwordHash: (r['password_hash'] as string | null) ?? null, emailConfirmed: r['email_confirmed_at'] != null });

export function findUserByEmail(email: string): Promise<Result<UserRow | null>> {
  return svc(async (conn) => {
    const [r] = await rows(conn, 'SELECT id, email, password_hash, email_confirmed_at FROM users WHERE email = ?', [normalizeEmail(email)]);
    return r ? toUser(r) : null;
  });
}

export function findUserById(id: string): Promise<Result<UserRow | null>> {
  return svc(async (conn) => {
    const [r] = await rows(conn, 'SELECT id, email, password_hash, email_confirmed_at FROM users WHERE id = ?', [id]);
    return r ? toUser(r) : null;
  });
}

/** Yeni kullanıcı; profil satırını tetikleyici açar (users_after_insert). */
export function createUser(input: { email: string; passwordHash: string | null; meta: Record<string, unknown>; confirmed: boolean }): Promise<Result<UserRow>> {
  return svc(async (conn) => {
    const [r] = await rows(
      conn,
      'INSERT INTO users (email, password_hash, meta, email_confirmed_at) VALUES (?, ?, ?, IF(?, UTC_TIMESTAMP(6), NULL)) RETURNING id, email, password_hash, email_confirmed_at',
      [normalizeEmail(input.email), input.passwordHash, JSON.stringify(input.meta), input.confirmed ? 1 : 0],
    );
    return toUser(r!);
  });
}

export function setPassword(userId: string, passwordHash: string): Promise<Result<void>> {
  return svc(async (conn) => {
    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
  });
}

export function confirmEmail(userId: string): Promise<Result<void>> {
  return svc(async (conn) => {
    await conn.query('UPDATE users SET email_confirmed_at = COALESCE(email_confirmed_at, UTC_TIMESTAMP(6)) WHERE id = ?', [userId]);
  });
}

export function setEmail(userId: string, email: string): Promise<Result<void>> {
  return svc(async (conn) => {
    await conn.query('UPDATE users SET email = ?, email_confirmed_at = UTC_TIMESTAMP(6) WHERE id = ?', [normalizeEmail(email), userId]);
  });
}

export type TokenPurpose = 'recovery' | 'invite' | 'signup' | 'email_change' | 'magiclink';

/** Tek kullanımlık bağlantı jetonu; aynı amaçlı önceki kullanılmamış jetonlar geçersiz olur. */
export function createToken(input: { purpose: TokenPurpose; userId: string; newEmail?: string | null; ttlMinutes: number }): Promise<Result<string>> {
  return svc(async (conn) => {
    const token = newToken();
    await conn.query('UPDATE auth_tokens SET used_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND purpose = ? AND used_at IS NULL', [input.userId, input.purpose]);
    await conn.query('INSERT INTO auth_tokens (purpose, user_id, token_hash, new_email, expires_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6) + INTERVAL ? MINUTE)', [
      input.purpose,
      input.userId,
      tokenHash(token),
      input.newEmail ? normalizeEmail(input.newEmail) : null,
      input.ttlMinutes,
    ]);
    return token;
  });
}

/** Jetonu tüketir (tek kullanım, süresi geçmemiş). Eşzamanlı iki tıklamada yalnız biri kazanır. */
export function consumeToken(purposes: readonly TokenPurpose[], token: string): Promise<Result<{ userId: string; purpose: TokenPurpose; newEmail: string | null } | null>> {
  return svc(async (conn) => {
    const hash = tokenHash(token);
    const [r] = await rows(conn, `SELECT user_id, purpose, new_email FROM auth_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(6) AND purpose IN (?)`, [hash, purposes]);
    if (!r) return null;
    const [res] = await conn.query('UPDATE auth_tokens SET used_at = UTC_TIMESTAMP(6) WHERE token_hash = ? AND used_at IS NULL', [hash]);
    if ((res as { affectedRows: number }).affectedRows !== 1) return null;
    return { userId: String(r['user_id']), purpose: r['purpose'] as TokenPurpose, newEmail: (r['new_email'] as string | null) ?? null };
  });
}

/** K-104: son `minutes` dakikadaki deneme sayısı (e-posta ve IP ayrı ayrı). Varsayılan yalnız başarısızlar; `all` → bağlantı isteği kotası. */
export function recentAttempts(kind: string, email: string | null, ip: string | null, minutes: number, all = false): Promise<Result<{ byEmail: number; byIp: number }>> {
  return svc(async (conn) => {
    const [r] = await rows(
      conn,
      `SELECT COALESCE(SUM(email = ?), 0) AS by_email, COALESCE(SUM(ip = ?), 0) AS by_ip FROM auth_attempts
        WHERE kind = ? AND (ok = FALSE OR ?) AND created_at > UTC_TIMESTAMP(6) - INTERVAL ? MINUTE AND (email = ? OR ip = ?)`,
      [email ? normalizeEmail(email) : null, ip, kind, all ? 1 : 0, minutes, email ? normalizeEmail(email) : null, ip],
    );
    return { byEmail: Number(r?.['by_email'] ?? 0), byIp: Number(r?.['by_ip'] ?? 0) };
  });
}

export function recordAttempt(kind: string, email: string | null, ip: string | null, okFlag: boolean): Promise<Result<void>> {
  return svc(async (conn) => {
    await conn.query('INSERT INTO auth_attempts (kind, email, ip, ok) VALUES (?, ?, ?, ?)', [kind, email ? normalizeEmail(email) : null, ip, okFlag ? 1 : 0]);
    // tablo büyümesin: bir günden eski kayıtlar atılır
    await conn.query('DELETE FROM auth_attempts WHERE created_at < UTC_TIMESTAMP(6) - INTERVAL 1 DAY LIMIT 500');
  });
}

/** Giriş postası kuyruğa en yüksek öncelikle girer; `email_queue` istek yolunda yalnız buradan yazılır (kullanıcıya INSERT yetkisi yok). */
export function enqueueMail(input: { templateKey: string; to: string; locale: 'tr' | 'en'; payload: Record<string, unknown>; userId: string }): Promise<Result<string>> {
  return svc(async (conn) => {
    const [r] = await rows(
      conn,
      "INSERT INTO email_queue (template_key, to_email, locale, payload, priority, related_type, related_id) VALUES (?, ?, ?, ?, 1, 'auth', ?) RETURNING id",
      [input.templateKey, input.to, input.locale, JSON.stringify(input.payload), input.userId],
    );
    return String(r!['id']);
  });
}

/** E-posta anahtarı: kırpılmış, ASCII küçük harf (K-16: toLowerCase yasak; adresler ASCII olduğundan 'en' yerel ayarı). */
export const normalizeEmail = (email: string): string => email.trim().toLocaleLowerCase('en');
