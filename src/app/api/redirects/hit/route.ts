import { NextResponse } from 'next/server';
import { bodyTooLarge, secretMatches } from '@/core/rate-limit';
import { recordRedirectHit } from '@/modules/redirects';

export const dynamic = 'force-dynamic';

/**
 * İsabet sayacı: yalnız middleware çağırır (security definer RPC). K-104: RPC_GATE_SECRET tanımlıysa `x-clk-gate` başlığı
 * şart (dışarıdan sayaç şişirme ve her istekte DB yazması kapanır); tanımsızsa eski davranış.
 */
export async function POST(request: Request) {
  const secret = process.env['RPC_GATE_SECRET'];
  if (secret && !secretMatches(request.headers.get('x-clk-gate'), secret)) return NextResponse.json({ ok: false }, { status: 401 });
  if (bodyTooLarge(request.headers, 4096)) return NextResponse.json({ ok: false }, { status: 413 });
  const body = (await request.json().catch(() => null)) as { path?: unknown } | null;
  const path = typeof body?.path === 'string' && body.path.startsWith('/') && body.path.length <= 500 ? body.path : null;
  if (!path) return NextResponse.json({ ok: false }, { status: 400 });
  await recordRedirectHit(path);
  return NextResponse.json({ ok: true });
}
