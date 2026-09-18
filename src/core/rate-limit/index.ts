import 'server-only';

/**
 * Basit sabit-pencere hız sınırı. Upstash REST tanımlıysa oradan (instance'lar arası tutarlı); yoksa süreç içi Map
 * (yalnız aynı instance'ı korur — geliştirme ve tek instance için yeterli, üretimde Upstash beklenir).
 */
const memory = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];
  if (url && token) {
    try {
      const res = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['INCR', `rl:${key}`],
          ['EXPIRE', `rl:${key}`, windowSeconds, 'NX'],
        ]),
        signal: AbortSignal.timeout(3000),
      });
      const data = (await res.json()) as { result: number }[];
      const count = Number(data[0]?.result ?? 0);
      return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
    } catch {
      // Upstash erişilemezse açık kalır (kullanıcıyı cezalandırma); bal küpü ve DB doğrulaması yine devrede
      return { allowed: true, remaining: limit };
    }
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    return { allowed: true, remaining: limit - 1 };
  }
  entry.count++;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}
