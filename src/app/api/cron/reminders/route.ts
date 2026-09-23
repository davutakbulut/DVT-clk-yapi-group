import { secretMatches } from '@/core/rate-limit';
import { NextResponse } from 'next/server';
import { runPaymentRemindersJob } from '@/core/jobs/paymentReminders';

export const dynamic = 'force-dynamic';

/** Vercel Cron günde bir: vadesi yaklaşan/geçen hakedişler → sorumluya mail + bildirim (K-56). Sırsız istek 401. */
export async function GET(request: Request) {
  const secret = process.env['CRON_SECRET'];
  const header = request.headers.get('authorization') ?? '';
  if (!secretMatches(header.replace(/^Bearer\s+/i, ''), secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); // sabit zamanlı (K-104)
  const result = await runPaymentRemindersJob();
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error.code }, { status: 500 });
  return NextResponse.json({ ok: true, ...result.data });
}
