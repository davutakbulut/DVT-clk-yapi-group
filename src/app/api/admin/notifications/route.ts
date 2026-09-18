import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/core/auth';
import { listNotifications } from '@/modules/notifications/server';

export const dynamic = 'force-dynamic';

/** Zil yoklaması: oturum çerezi + RLS (kendi/rol). Kişisel veri asgari; önbelleklenmez. */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user || !user.isStaff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const result = await listNotifications(user.id, { limit: 8 });
  const body = result.ok ? result.data : { items: [], unread: 0 };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' } });
}
