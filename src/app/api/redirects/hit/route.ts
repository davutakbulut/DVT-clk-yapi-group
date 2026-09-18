import { NextResponse } from 'next/server';
import { recordRedirectHit } from '@/modules/redirects';

export const dynamic = 'force-dynamic';

/** İsabet sayacı: middleware arka planda çağırır; yalnız aktif kayıt sayılır (security definer RPC). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { path?: unknown } | null;
  const path = typeof body?.path === 'string' && body.path.startsWith('/') && body.path.length <= 500 ? body.path : null;
  if (!path) return NextResponse.json({ ok: false }, { status: 400 });
  await recordRedirectHit(path);
  return NextResponse.json({ ok: true });
}
