import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/core/auth';
import { getCampaign, listRecipients } from '@/modules/mail-campaigns/server';
import { toCsv } from '@/modules/reports';

export const dynamic = 'force-dynamic';

/** Alıcı listesi CSV (Excel açar): oturum + yönetici rolü; satırları RLS de süzer. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const [campaign, recipients] = await Promise.all([getCampaign(id), listRecipients(id, {}, 10_000)]);
  if (!campaign.ok || !recipients.ok) return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  if (!campaign.data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const csv = toCsv(['email', 'name', 'company', 'source', 'status', 'sent_at', 'unsubscribed_at', 'error'], recipients.data.map((r) => [r.email, r.full_name ?? '', r.company ?? '', r.source, r.status, r.sent_at ?? '', r.unsubscribed_at ?? '', r.error ?? '']));
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="kampanya-alicilar-${id.slice(0, 8)}.csv"`, 'Cache-Control': 'private, no-store' } });
}
