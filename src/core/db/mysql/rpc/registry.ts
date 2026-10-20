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
