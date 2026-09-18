import { NextResponse } from 'next/server';
import { getCachedRedirects } from '@/modules/redirects';

export const dynamic = 'force-dynamic';

/** Middleware'in okuduğu aktif yönlendirme listesi (K-61). Veri katmanı etiketli önbellekte; admin kaydedince düşer. */
export async function GET() {
  const result = await getCachedRedirects();
  const rules = result.ok ? result.data : [];
  return NextResponse.json({ rules }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
