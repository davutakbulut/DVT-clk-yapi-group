import { NextResponse } from 'next/server';
import { runExchangeRatesJob } from '@/core/jobs/exchangeRates';

export const dynamic = 'force-dynamic';

/** Vercel Cron hafta içi: TCMB kurları → exchange_rates (K-32). Sırsız istek 401. */
export async function GET(request: Request) {
  const secret = process.env['CRON_SECRET'];
  const header = request.headers.get('authorization') ?? '';
  if (!secret || header !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const result = await runExchangeRatesJob();
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error.code }, { status: 502 });
  return NextResponse.json({ ok: true, ...result.data });
}
