import { NextResponse } from 'next/server';
import { rateLimit } from '@/core/rate-limit';
import { ingestBatch } from '@/modules/analytics';
import { CONSENT_COOKIE, parseConsent } from '@/modules/consent';

export const dynamic = 'force-dynamic';

const EMPTY = () => new NextResponse(null, { status: 204 });

/**
 * İzleyici toplu paketi (sendBeacon/fetch). Onay çerezi yoksa ya da analitik reddedilmişse paket ATILIR (204) — sunucu tarafı
 * ikinci kemer (06-ANALYTICS KVKK). Bot UA'ları yazılmadan süzülür. Yanıt her zaman 204: izleyici hata görmez, yeniden denemez.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookie = request.headers.get('cookie') ?? '';
  const raw = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1);
  const consent = parseConsent(raw ? decodeURIComponent(raw) : null);
  const e2e = new URL(request.url).searchParams.get('e2e_track') === '1' || request.headers.get('x-e2e-track') === '1';
  if (!consent?.analytics && !e2e) return EMPTY();
  const ua = request.headers.get('user-agent');
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  const limit = await rateLimit(`analytics:${ip ?? 'unknown'}`, 120, 60);
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
