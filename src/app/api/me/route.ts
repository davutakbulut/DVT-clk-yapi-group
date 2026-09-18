import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/core/auth';

export const dynamic = 'force-dynamic';

/**
 * Header hesap menüsü için oturum özeti. Tarayıcıda Supabase istemcisi YOK (K-52): ikinci bir istemci aynı çerezi
 * yönetmeye kalkınca sunucunun yeni yazdığı oturumla yarışıp siliyordu. Kişisel veri asgari: ad + personel mi.
 */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  const body = user ? { user: { name: user.fullName || user.email, isStaff: user.isStaff } } : { user: null };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate', Pragma: 'no-cache', Vary: 'Cookie' } });
}
