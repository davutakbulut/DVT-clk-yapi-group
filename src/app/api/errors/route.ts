import { NextResponse } from 'next/server';
import { rateLimit } from '@/core/rate-limit';
import { isBot, maskIp } from '@/modules/analytics';
import { errorReportSchema, reportError } from '@/modules/errors';

export const dynamic = 'force-dynamic';
const EMPTY = () => new NextResponse(null, { status: 204 });

/** Hata raporu (istemci penceresi, sunucu logger'ı, 404). Bot UA'ları (istemci kaynaklı) atılır; hız sınırı; her zaman 204. */
export async function POST(request: Request): Promise<NextResponse> {
  const ua = request.headers.get('user-agent');
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  const limit = await rateLimit(`errors:${ip ?? 'unknown'}`, 60, 60);
  if (!limit.allowed) return EMPTY();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return EMPTY();
  }
  const parsed = errorReportSchema.safeParse(body);
  if (!parsed.success) return EMPTY();
  if (parsed.data.source === 'client' && isBot(ua) && request.headers.get('x-e2e-track') !== '1') return EMPTY();
  await reportError({ ...parsed.data, ip_masked: maskIp(ip), user_agent: ua?.slice(0, 300) ?? null });
  return EMPTY();
}
