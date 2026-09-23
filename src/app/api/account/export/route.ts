import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/core/auth';
import { exportMyData } from '@/modules/account/server';

export const dynamic = 'force-dynamic';

/** KVKK veri taşınabilirliği (K-103): üyenin kendi satırları (RLS) JSON olarak iner. */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = await exportMyData(user.id);
  if (!data.ok) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data.data, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="clk-account-${stamp}.json"`, 'Cache-Control': 'private, no-store' },
  });
}
