import { NextResponse } from 'next/server';
import { runIndexNowJob } from '@/core/jobs/indexNow';

export const dynamic = 'force-dynamic';

/** Vercel Cron saatte bir: sitemap'te değişen URL'leri IndexNow'a gönderir (K-56). Sırsız istek 401; anahtar yoksa 200 not_configured. */
export async function GET(request: Request) {
  const secret = process.env['CRON_SECRET'];
  const header = request.headers.get('authorization') ?? '';
  if (!secret || header !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const result = await runIndexNowJob();
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error.code }, { status: result.error.code === 'not_configured' ? 200 : 500 });
  return NextResponse.json({ ok: true, ...result.data });
}
