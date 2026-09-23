import { NextResponse } from 'next/server';
import { bodyTooLarge, rateLimit } from '@/core/rate-limit';
import { clientIp } from '@/core/request/clientIp';
import { ingestBatch } from '@/modules/analytics';
import { CONSENT_COOKIE, parseConsent } from '@/modules/consent';

export const dynamic = 'force-dynamic';

const EMPTY = () => new NextResponse(null, { status: 204 });
const MAX_BODY = 64 * 1024;

/**
 * İzleyici toplu paketi (sendBeacon/fetch). Onay çerezi yoksa ya da analitik reddedilmişse paket ATILIR (204) — sunucu tarafı
 * ikinci kemer (06-ANALYTICS KVKK). Bot UA'ları yazılmadan süzülür. Yanıt her zaman 204: izleyici hata görmez, yeniden denemez.
 * K-104: e2e atlaması yalnız üretim DIŞINDA; IP güvenilir proxy'den; 64 KB üstü gövde okunmadan atılır.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (bodyTooLarge(request.headers, MAX_BODY)) return EMPTY();
  const cookie = request.headers.get('cookie') ?? '';
  const raw = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1);
  const consent = parseConsent(raw ? decodeURIComponent(raw) : null);
  const e2eAllowed = process.env['SITE_ENV'] !== 'production';
  const e2e = e2eAllowed && (new URL(request.url).searchParams.get('e2e_track') === '1' || request.headers.get('x-e2e-track') === '1');
  if (!consent?.analytics && !e2e) return EMPTY();
  const ua = request.headers.get('user-agent');
  const ip = clientIp(request.headers);
  const limit = await rateLimit(`analytics:${ip}`, 120, 60);
  if (!limit.allowed) return EMPTY();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return EMPTY();
  }
  await ingestBatch(body, { userAgent: ua, ip, host: new URL(request.url).hostname, allowBots: e2e });
  return EMPTY();
}
