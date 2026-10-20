// plpgsql RPC'lerinin TypeScript karşılıkları (K-116). Her işleyici kendi transaction'ında koşar; beklenen hatayı RpcError ile
// PostgreSQL koduyla döndürür (modüller 42501, 23505, P0429… koduna bakar). SECURITY DEFINER fonksiyonlar RLS'i atlardı:
// işleyiciler bağlantıyı doğrudan kullanır, yetki kontrolünü KENDİSİ yapar (Kural 4).
import type { PoolConnection } from 'mysql2/promise';
import type { Actor } from '../pool';

export class RpcError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export type RpcHandler = (conn: PoolConnection, actor: Actor, args: Record<string, unknown>) => Promise<unknown>;

/** auth.uid() karşılığı; oturum yoksa 42501. */
export function requireUser(actor: Actor): { userId: string; role: string | null } {
  if (actor.kind !== 'user') throw new RpcError('42501', 'not authenticated', 401);
  return { userId: actor.userId, role: actor.role };
}

/** app_private.has_role(...) karşılığı. */
export function hasRole(actor: Actor, ...roles: string[]): boolean {
  return actor.kind === 'user' && actor.role != null && roles.includes(actor.role);
}

/**
 * app_private.throttle karşılığı (K-104): sabit pencerede sayaç; sınır aşılırsa P0429. Aşan çağrı transaction'la birlikte
 * geri alınır (PostgreSQL'de de öyleydi) → sayaç sınırda kalır, pencere bitince sıfırlanır. Eski pencereler ara sıra atılır.
 */
export async function throttle(conn: PoolConnection, key: string, limit: number, windowSeconds: number): Promise<void> {
  const k = key.slice(0, 200);
  const start = `FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(UTC_TIMESTAMP(6)) / ${Math.max(1, Math.floor(windowSeconds))}) * ${Math.max(1, Math.floor(windowSeconds))})`;
  await conn.query(`INSERT INTO throttle (\`key\`, window_start, hits) VALUES (?, ${start}, 1) ON DUPLICATE KEY UPDATE hits = hits + 1`, [k]);
  const [rows] = await conn.query(`SELECT hits FROM throttle WHERE \`key\` = ? AND window_start = ${start}`, [k]);
  if (Math.random() < 0.01) await conn.query('DELETE FROM throttle WHERE window_start < UTC_TIMESTAMP(6) - INTERVAL 1 DAY LIMIT 1000');
  if (Number((rows as { hits: number }[])[0]?.hits ?? 0) > limit) throw new RpcError('P0429', `rate_limited: ${k.slice(0, 40)}`, 429);
}
