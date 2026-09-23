/**
 * İstemci IP'si (hız sınırı anahtarı, ip_masked). Yalnız KENDİ proxy'mizin eklediği adres güvenilir:
 * Apache/Passenger ve Vercel gerçek adresi X-Forwarded-For'un SONUNA ekler; istemcinin gönderdiği sahte
 * değerler başta kalır. Baştaki değeri almak hız sınırını her istekte farklı başlıkla aşmaya yetiyordu (K-104).
 * Proxy zinciri uzunsa TRUSTED_PROXY_HOPS ile sondan kaçıncı adresin alınacağı ayarlanır (varsayılan 1).
 */
export function clientIp(headers: { get(name: string): string | null }): string {
  const hops = Math.max(1, Number(process.env['TRUSTED_PROXY_HOPS'] ?? 1) || 1);
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    const pick = parts[Math.max(0, parts.length - hops)];
    if (pick) return normalize(pick);
  }
  const real = headers.get('x-real-ip');
  if (real) return normalize(real.trim());
  return 'unknown';
}

/** "::ffff:1.2.3.4" → "1.2.3.4"; IPv6'da /64 öneki (aynı abone farklı adreslerle sınırı aşamasın) */
function normalize(ip: string): string {
  const v4 = ip.replace(/^::ffff:/i, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v4)) return v4;
  if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + '::/64';
  return ip.slice(0, 64);
}
