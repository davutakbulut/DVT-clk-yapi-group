import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { ExpenseFact, InvoiceFact, ItemFact, LeadFact, SaleFact, ScheduleFact } from '../domain/aggregate';

export interface ReportRange {
  readonly from: string;
  readonly to: string;
}

export interface ReportData {
  readonly range: ReportRange;
  readonly sales: readonly SaleFact[];
  readonly previousSales: readonly SaleFact[];
  readonly items: readonly ItemFact[];
  readonly expenses: readonly ExpenseFact[]; // 🔒 admin dışı boş
  readonly invoices: readonly InvoiceFact[];
  readonly schedules: readonly ScheduleFact[];
  readonly leads: readonly LeadFact[];
  readonly withCost: boolean;
}

const fail = (message: string) => err(appError('external_service', message, { module: 'reports' }));
const n = (v: unknown): number => Number(v ?? 0);
const round2 = (v: number) => Math.round(v * 100) / 100;
const customerLabel = (c: { type?: string; full_name?: string | null; company_title?: string | null } | null): string => (c ? (c.type === 'corporate' ? c.company_title || c.full_name : c.full_name || c.company_title) || '—' : '—');

function previousRange(range: ReportRange): ReportRange {
  const from = Date.parse(`${range.from}T00:00:00Z`);
  const to = Date.parse(`${range.to}T00:00:00Z`);
  const span = to - from + 86_400_000;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { from: iso(from - span), to: iso(to - span) };
}

/** Ham veri (rol-duyarlı, K-33): admin temel tablolar (maliyet), diğerleri maliyetsiz görünümler; giderler yalnız admin. Tarih: satış tarihi. */
export async function loadReportData(range: ReportRange, isAdmin: boolean): Promise<Result<ReportData>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const prev = previousRange(range);
  const saleCols = 'id, sale_date, status, customer_id, exchange_rate, subtotal, discount_amount, grand_total_try, lead_id, customer:customers(type, full_name, company_title)';
  const mapSale = (r: Record<string, unknown>): SaleFact => ({
    id: String(r['id']),
    saleDate: String(r['sale_date']),
    status: String(r['status']),
    customerId: String(r['customer_id']),
    customerName: customerLabel(r['customer'] as never),
    exchangeRate: n(r['exchange_rate']) || 1,
    grandTotalTry: n(r['grand_total_try']),
    netTry: round2((n(r['subtotal']) - n(r['discount_amount'])) * (n(r['exchange_rate']) || 1)),
    totalCostTry: isAdmin ? (r['total_cost'] === null || r['total_cost'] === undefined ? null : round2(n(r['total_cost']) * (n(r['exchange_rate']) || 1))) : null,
    leadId: (r['lead_id'] as string | null) ?? null,
  });
  const salesQ = (from: string, to: string) => (isAdmin ? client.data.from('sales').select(`${saleCols}, total_cost`) : client.data.from('sales_without_cost').select(saleCols)).gte('sale_date', from).lte('sale_date', to).limit(2000);
  const [cur, prevSales, invoices, payments, schedules, leads] = await Promise.all([
    salesQ(range.from, range.to),
    salesQ(prev.from, prev.to),
    client.data.from('invoices').select('id, status, collectable_amount, exchange_rate, issue_date, created_at').gte('created_at', `${range.from}T00:00:00Z`).lte('created_at', `${range.to}T23:59:59Z`).limit(2000),
    client.data.from('payments').select('invoice_id, amount_try').limit(5000),
    client.data.from('payment_schedules').select('id, due_date, status, amount').limit(5000),
    client.data.from('leads').select('status, created_at').gte('created_at', `${range.from}T00:00:00Z`).lte('created_at', `${range.to}T23:59:59Z`).limit(5000),
  ]);
  const failure = cur.error ?? prevSales.error ?? invoices.error ?? payments.error ?? schedules.error ?? leads.error;
  if (failure) return fail(failure.message);
  const sales = (cur.data as unknown as Record<string, unknown>[]).map(mapSale);
  const saleIds = sales.map((s) => s.id);
  const rateOf = new Map(sales.map((s) => [s.id, s.exchangeRate]));
  let items: ItemFact[] = [];
  let expenses: ExpenseFact[] = [];
  if (saleIds.length > 0) {
    const [it, ex, schedPaid] = await Promise.all([
      isAdmin
        ? client.data.from('sale_items').select('sale_id, line_total, line_cost, service:services(title)').in('sale_id', saleIds).limit(10_000)
        : client.data.from('sale_items_without_cost').select('sale_id, line_total, service:services(title)').in('sale_id', saleIds).limit(10_000),
      isAdmin ? client.data.from('sale_expenses').select('sale_id, category, amount').in('sale_id', saleIds).limit(10_000) : Promise.resolve({ data: [], error: null }),
      Promise.resolve(null),
    ]);
    void schedPaid;
    if (it.error || ex.error) return fail((it.error ?? ex.error)!.message);
    items = (it.data as unknown as Record<string, unknown>[]).map((r) => {
      const rate = rateOf.get(String(r['sale_id'])) ?? 1;
      const title = (r['service'] as { title?: Record<string, string> } | null)?.title;
      return { saleId: String(r['sale_id']), serviceName: title?.['tr'] ?? null, lineTotalTry: round2(n(r['line_total']) * rate), lineCostTry: isAdmin && r['line_cost'] !== null && r['line_cost'] !== undefined ? round2(n(r['line_cost']) * rate) : null };
    });
    expenses = ((ex.data ?? []) as Record<string, unknown>[]).map((r) => ({ saleId: String(r['sale_id']), category: String(r['category']), amountTry: round2(n(r['amount']) * (rateOf.get(String(r['sale_id'])) ?? 1)) }));
  }
  const paidByInvoice = new Map<string, number>();
  const paidBySchedule = new Map<string, number>();
  for (const p of payments.data ?? []) if (p.invoice_id) paidByInvoice.set(p.invoice_id, round2((paidByInvoice.get(p.invoice_id) ?? 0) + n(p.amount_try)));
  const { data: schedPays } = await client.data.from('payments').select('schedule_id, amount_try').not('schedule_id', 'is', null).limit(5000);
  for (const p of schedPays ?? []) if (p.schedule_id) paidBySchedule.set(p.schedule_id, round2((paidBySchedule.get(p.schedule_id) ?? 0) + n(p.amount_try)));
  return ok({
    range,
    sales,
    previousSales: (prevSales.data as unknown as Record<string, unknown>[]).map(mapSale),
    items,
    expenses,
    invoices: (invoices.data ?? []).map((i) => ({ status: i.status, collectableTry: round2(n(i.collectable_amount) * (n(i.exchange_rate) || 1)), paidTry: paidByInvoice.get(i.id) ?? 0 })),
    schedules: (schedules.data ?? []).map((s) => ({ dueDate: s.due_date, status: s.status, amount: n(s.amount), paid: paidBySchedule.get(s.id) ?? 0 })),
    leads: (leads.data ?? []).map((l) => ({ status: l.status, createdAt: l.created_at })),
    withCost: isAdmin,
  });
}
