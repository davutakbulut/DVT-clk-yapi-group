import { secretMatches } from '@/core/rate-limit';
import { NextResponse } from 'next/server';
import { runReviewSyncJob } from '@/core/jobs/reviewSync';

export const dynamic = 'force-dynamic';

/** Vercel Cron (vercel.json) günde bir: Google Places yorumlarını çeker (K-56: service-role yalnız core/jobs). Sırsız istek 401. */
export async function GET(request: Request) {
  const secret = process.env['CRON_SECRET'];
  const header = request.headers.get('authorization') ?? '';
  if (!secretMatches(header.replace(/^Bearer\s+/i, ''), secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); // sabit zamanlı (K-104)
  const result = await runReviewSyncJob();
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error.code }, { status: result.error.code === 'not_configured' ? 200 : 500 });
  return NextResponse.json({ ok: true, ...result.data });
}
