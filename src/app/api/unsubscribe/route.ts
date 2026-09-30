import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/core/config/site';
import { bodyTooLarge, rateLimit } from '@/core/rate-limit';
import { clientIp } from '@/core/request/clientIp';
import { unsubscribeByToken } from '@/modules/mail-campaigns/server';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Tek tıkla listeden çıkma (RFC 8058): posta istemcisi "Abonelikten çık" düğmesinde bu adrese POST atar
 * (List-Unsubscribe + List-Unsubscribe-Post başlıkları, K-108). K-104: gövde okunmaz, IP eşiği, her zaman aynı yanıt (204).
 */
export async function POST(request: Request) {
  if (bodyTooLarge(request.headers, 1024)) return new NextResponse(null, { status: 413 });
  const token = new URL(request.url).searchParams.get('t') ?? '';
  const limit = await rateLimit(`unsubscribe:${clientIp(request.headers)}`, 20, 600);
  if (limit.allowed && UUID.test(token)) await unsubscribeByToken(token);
  return new NextResponse(null, { status: 204 });
}

/** Bağlantı tarayıcıda açılırsa onay sayfasına gider: GET hiçbir şeyi değiştirmez (posta tarayıcıları bağlantıları ön yükler). */
export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('t') ?? '';
  // Hedef, isteğin kendi adresinden DEĞİL site adresinden kurulur: Passenger arkasında request.url iç adresi (0.0.0.0:3000) taşır
  return NextResponse.redirect(new URL(`/tr/abonelik-iptal${UUID.test(token) ? `?t=${token}` : ''}`, getSiteUrl().origin), 302);
}
