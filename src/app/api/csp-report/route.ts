import { NextResponse } from 'next/server';
import { rateLimit } from '@/core/rate-limit';
import { cspReportToError, reportError } from '@/modules/errors';

export const dynamic = 'force-dynamic';

/** CSP ihlal raporları (Content-Security-Policy-Report-Only, next.config). Uyarı seviyesinde gruplanır; her zaman 204. */
export async function POST(request: Request): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  const limit = await rateLimit(`csp:${ip ?? 'unknown'}`, 30, 60);
  if (!limit.allowed) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const report = cspReportToError(body);
  if (report) await reportError(report);
  return new NextResponse(null, { status: 204 });
}
