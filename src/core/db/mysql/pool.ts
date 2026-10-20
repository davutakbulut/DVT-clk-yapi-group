import 'server-only';
import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import { appError, err, ok, type Result } from '@/core/errors/result';

/**
 * Sorguyu yapan taraf (K-116). PostgreSQL'deki anon / authenticated / service_role rollerinin karşılığı:
 * erişim kuralları (policy.ts) ve tetikleyiciler (@app_uid, @app_role oturum değişkenleri) buna göre davranır.
 */
export type Actor =
  | { readonly kind: 'anon' }
  | { readonly kind: 'user'; readonly userId: string; readonly role: string | null }
  | { readonly kind: 'service' };

let pool: Pool | null = null;

function getPool(): Result<Pool> {
  if (pool) return ok(pool);
  const uri = process.env['MYSQL_URL'];
  if (!uri) return err(appError('not_configured', 'MYSQL_URL yok', { module: 'core/db' }));
  pool = mysql.createPool({
    uri,
    connectionLimit: 8,
    // Tarihler UTC metin olarak gelir, biçimi sorgu katmanı (PostgREST uyumlu ISO) belirler; DECIMAL sayı olarak.
    timezone: 'Z',
    dateStrings: true,
    decimalNumbers: true,
    supportBigNumbers: true,
    multipleStatements: false,
    connectTimeout: 5000,
  });
  pool.on('connection', (conn) => {
    // Sunucunun varsayılan sql_mode'u katı değil: uzun/geçersiz değer uyarıyla kırpılıp yazılırdı (PostgreSQL hata verir)
    conn.query("SET time_zone = '+00:00', sql_mode = 'STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
  });
  return ok(pool);
}

/**
 * Bağlantıyı aktörle işaretleyip çalıştırır. Tetikleyiciler (denetim kaydı, rol koruması) @app_uid/@app_role okur;
 * havuza dönen bağlantıda değişkenler bir sonraki kullanımda yeniden yazılır, sızmaz.
 */
export async function withConnection<T>(actor: Actor, fn: (conn: PoolConnection) => Promise<T>): Promise<Result<T>> {
  const p = getPool();
  if (!p.ok) return p;
  let conn: PoolConnection | null = null;
  try {
    conn = await p.data.getConnection();
    await conn.query('SET @app_uid = ?, @app_role = ?, @app_kind = ?', [actor.kind === 'user' ? actor.userId : null, actor.kind === 'user' ? actor.role : null, actor.kind]);
    return ok(await fn(conn));
  } catch (cause) {
    return err(appError('external_service', (cause as Error).message, { module: 'core/db', cause }));
  } finally {
    conn?.release();
  }
}

/** Tek transaction: hata olursa geri alınır (plpgsql fonksiyonlarının tek işlem davranışı). */
export async function withTransaction<T>(actor: Actor, fn: (conn: PoolConnection) => Promise<T>): Promise<Result<T>> {
  return withConnection(actor, async (conn) => {
    await conn.beginTransaction();
    try {
      const out = await fn(conn);
      await conn.commit();
      return out;
    } catch (cause) {
      await conn.rollback();
      throw cause;
    }
  });
}
