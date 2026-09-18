import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/core/auth';
import { aging, byCustomer, byMonth, byService, calendar, costBreakdown, invoiceStatus, toCsv } from '@/modules/reports';
import { loadReportData } from '@/modules/reports/server';

export const dynamic = 'force-dynamic';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** CSV dışa aktarma (Excel açar): oturum + personel rolü; maliyet raporları yalnız admin (K-33). */
export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user || !user.isStaff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const report = url.searchParams.get('report') ?? 'revenue';
  const today = new Date().toISOString().slice(0, 10);
  const from = DATE.test(url.searchParams.get('from') ?? '') ? url.searchParams.get('from')! : `${today.slice(0, 4)}-01-01`;
  const to = DATE.test(url.searchParams.get('to') ?? '') ? url.searchParams.get('to')! : today;
  const isAdmin = user.role === 'super_admin' || user.role === 'admin';
  const data = await loadReportData({ from, to }, isAdmin);
  if (!data.ok) return NextResponse.json({ error: data.error.code }, { status: 500 });
  const d = data.data;
  let csv: string;
  switch (report) {
    case 'profitability':
      if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      csv = toCsv(['month', 'revenue_try', 'cost_try', 'profit_try', 'margin_pct'], byMonth(d.sales).map((m) => [m.month, m.revenue, m.cost, m.profit, m.marginPct]));
      break;
    case 'byService':
      csv = toCsv(['service', 'count', 'revenue_try', ...(isAdmin ? ['profit_try'] : [])], byService(d.items, d.sales, 'other').map((r) => [r.label, r.count, r.revenue, ...(isAdmin ? [r.profit] : [])]));
      break;
    case 'byCustomer':
      csv = toCsv(['customer', 'count', 'revenue_try', ...(isAdmin ? ['profit_try'] : [])], byCustomer(d.sales).map((r) => [r.label, r.count, r.revenue, ...(isAdmin ? [r.profit] : [])]));
      break;
    case 'invoiceStatus':
      csv = toCsv(['status', 'count', 'collectable_try', 'paid_try'], invoiceStatus(d.invoices).map((s) => [s.status, s.count, s.collectable, s.paid]));
      break;
    case 'aging':
      csv = toCsv(['bucket', 'count', 'amount_try'], aging(d.schedules, today).map((a) => [a.bucket, a.count, a.amount]));
      break;
    case 'calendar':
      csv = toCsv(['month', 'count', 'amount_try'], calendar(d.schedules, today).map((c) => [c.month, c.count, c.amount]));
      break;
    case 'costs':
      if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      csv = toCsv(['category', 'amount_try', 'share_pct'], costBreakdown(d.expenses, d.items).map((c) => [c.category, c.amount, c.sharePct]));
      break;
    default:
      csv = toCsv(['month', 'count', 'revenue_try'], byMonth(d.sales).map((m) => [m.month, m.count, m.revenue]));
  }
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="rapor-${report}-${from}-${to}.csv"`, 'Cache-Control': 'private, no-store' } });
}
