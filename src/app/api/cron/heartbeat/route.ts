import { NextResponse } from 'next/server';
import { runHeartbeatMonitorJob } from '@/core/jobs/heartbeatMonitor';

export const dynamic = 'force-dynamic';

/** Vercel Cron saatte bir: sessiz kalan cron işleri → bildirim + mail (K-56). Sırsız istek 401. */
export async function GET(request: Request) {
  const secret = process.env['CRON_SECRET'];
  const header = request.headers.get('authorization') ?? '';
  if (!secret || header !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const result = await runHeartbeatMonitorJob();
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error.code }, { status: 500 });
  return NextResponse.json({ ok: true, ...result.data });
}
