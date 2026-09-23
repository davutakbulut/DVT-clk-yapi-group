import { secretMatches } from '@/core/rate-limit';
import { NextResponse } from 'next/server';
import { runPurgeApplicationsJob } from '@/core/jobs/purgeApplications';

export const dynamic = 'force-dynamic';

/** Vercel Cron günde bir: KVKK saklama süresi dolan başvurular + CV dosyaları (K-56). Sırsız istek 401. */
export async function GET(request: Request) {
  const secret = process.env['CRON_SECRET'];
  const header = request.headers.get('authorization') ?? '';
  if (!secretMatches(header.replace(/^Bearer\s+/i, ''), secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); // sabit zamanlı (K-104)
  const result = await runPurgeApplicationsJob();
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error.code }, { status: 500 });
  return NextResponse.json({ ok: true, ...result.data });
}
