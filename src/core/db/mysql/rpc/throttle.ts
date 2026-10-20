// app_private.throttle karşılığı (K-104 → K-116): sabit pencere, veritabanında → uygulama süreçlerinden bağımsız.
// Çağıranın transaction'ında sayar: işlem geri alınırsa sayım da geri alınır (plpgsql'deki gibi; yalnız başarılı çağrılar sayılır).
import type { PoolConnection } from 'mysql2/promise';
import { exec, select } from './pgCast';
import { RpcError } from './registry';

/** Tablo henüz MariaDB göçlerinde yok: göç dosyasına bu tanım girmeli (IF NOT EXISTS: test veritabanında elle açıldı). */
export const THROTTLE_DDL = `CREATE TABLE IF NOT EXISTS throttle (
  \`key\` VARCHAR(200) COLLATE utf8mb4_bin NOT NULL,
  window_start DATETIME(6) NOT NULL,
  hits INT NOT NULL DEFAULT 0,
  PRIMARY KEY (\`key\`, window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci`;

/** Eşik aşılırsa P0429 'rate_limited: <anahtarın ilk 40 karakteri>'. */
export async function throttle(conn: PoolConnection, key: string, limit: number, windowSeconds: number): Promise<void> {
  const k = [...key].slice(0, 200).join('');
  const w = windowSeconds * 1000;
  const start = new Date(Math.floor(Date.now() / w) * w).toISOString().slice(0, 19).replace('T', ' ');
  await exec(conn, 'INSERT INTO throttle (`key`, window_start, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE hits = hits + 1', [k, start]);
  const [row] = await select<{ hits: number }>(conn, 'SELECT hits FROM throttle WHERE `key` = ? AND window_start = ?', [k, start]);
  if ((row?.hits ?? 0) > limit) throw new RpcError('P0429', `rate_limited: ${[...k].slice(0, 40).join('')}`, 429);
}
