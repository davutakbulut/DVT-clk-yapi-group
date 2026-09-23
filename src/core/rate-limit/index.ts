import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Sabit-pencere hız sınırı (K-104 ile sertleştirildi):
 * - Upstash REST tanımlıysa oradan (süreçler arası tutarlı); hata/kota bitiminde AÇIK KALMAZ, süreç içi sayaca düşer.
 * - Süreç içi Map: anahtar özetlenir (uzun başlık → 16 bayt), sert üst sınır (en eski atılır), süpürme zamanlayıcıyla.
 *   Passenger birden çok süreç açarsa her süreç kendi sayacını tutar → etkin sınır süreç sayısı kadar gevşer; kabul edilen risk.
 */
const MAX_ENTRIES = 20_000;
const memory = new Map<string, { count: number; resetAt: number }>();
let sweepAt = 0;

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
}

const digest = (key: string) => createHash('sha1').update(key).digest('base64url').slice(0, 22);

function memoryLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  if (now >= sweepAt) { // en fazla 10 sn'de bir tam süpürme; istek başına değil
    sweepAt = now + 10_000;
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  }
  const k = digest(key);
  const entry = memory.get(k);
  if (!entry || entry.resetAt <= now) {
    if (memory.size >= MAX_ENTRIES) memory.delete(memory.keys().next().value as string); // en eski
    memory.set(k, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }
  entry.count++;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];
  if (url && token) {
    try {
      const k = `rl:${digest(key)}`;
      const res = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([['INCR', k], ['EXPIRE', k, windowSeconds, 'NX']]),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`upstash ${res.status}`);
      const data = (await res.json()) as { result: number }[];
      const count = Number(data[0]?.result ?? 0);
      return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
    } catch {
      return memoryLimit(key, limit, windowSeconds); // kota/erişim sorununda süreç içi sayaç devrede (açık kalmaz)
    }
  }
  return memoryLimit(key, limit, windowSeconds);
}

/** Cron/servis gizli anahtarı: sabit zamanlı karşılaştırma; boş/tanımsız asla eşleşmez. */
export function secretMatches(given: string | null | undefined, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** İstek gövdesini okumadan önce boyut kapısı: Content-Length üst sınırı aşıyorsa 413. */
export function bodyTooLarge(headers: { get(name: string): string | null }, maxBytes: number): boolean {
  const len = Number(headers.get('content-length') ?? 0);
  return Number.isFinite(len) && len > maxBytes;
}
