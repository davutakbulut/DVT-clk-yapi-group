import { clientIp } from '@/core/request/clientIp';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/core/rate-limit';
import { routing } from '@/i18n/routing';
import { normalizeQuery } from '@/modules/search';
import { getCachedSearch } from '@/modules/search/server';

export const dynamic = 'force-dynamic';

/**
 * /api/search?q=&locale= (K-102): en az 2 karakter; IP başına dakikada 60 istek; sunucu önbelleği 5 dk (aynı sorgu tek DB çağrısı);
 * yanıt 60 sn CDN/tarayıcı önbelleklenebilir. İstemci ayrıca 250 ms geciktirir ve önceki isteği iptal eder.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const q = normalizeQuery(url.searchParams.get('q'));
  const locale = routing.locales.includes(url.searchParams.get('locale') as 'tr') ? (url.searchParams.get('locale') as string) : routing.defaultLocale;
  if (!q) return NextResponse.json({ hits: [] }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  const ip = clientIp(request.headers);
  const rl = await rateLimit(`search:${ip}`, 60, 60);
  if (!rl.allowed) return NextResponse.json({ hits: [], error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } });
  const result = await getCachedSearch(locale, q, 20);
  if (!result.ok) return NextResponse.json({ hits: [], error: 'unavailable' }, { status: 503 });
  return NextResponse.json({ hits: result.data }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600', Vary: 'Accept-Language' } });
}
