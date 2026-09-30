import { secretMatches } from '@/core/rate-limit';
import { NextResponse } from 'next/server';
import { processMailCampaigns } from '@/core/jobs/mailCampaigns';
import { processMailQueue } from '@/core/jobs/mailQueue';

export const dynamic = 'force-dynamic';

/**
 * Cron her dakika çağırır: `Authorization: Bearer CRON_SECRET`. Sırsız istek 401.
 * Kullanıcı isteği değil makine isteğidir; iş core/jobs'ta (K-56).
 * Önce otomatik iletiler (talep yanıtı vb.), sonra saatlik sınırdan kalan hakla toplu e-posta (K-108).
 */
export async function GET(request: Request) {
  const secret = process.env['CRON_SECRET'];
  const header = request.headers.get('authorization') ?? '';
  if (!secretMatches(header.replace(/^Bearer\s+/i, ''), secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); // sabit zamanlı (K-104)
  const result = await processMailQueue();
  const campaigns = await processMailCampaigns();
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error.code }, { status: 500 });
  return NextResponse.json({ ok: true, ...result.data, campaigns: campaigns.ok ? campaigns.data : { error: campaigns.error.code } });
}
