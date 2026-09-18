import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface InvoiceRow {
  readonly id: string;
  readonly invoice_no: string | null;
  readonly sale_id: string;
  readonly saleNo: string;
  readonly customerName: string;
  readonly type: string;
  readonly status: string;
  readonly issue_date: string | null;
  readonly due_date: string | null;
  readonly currency: string;
  readonly exchange_rate: number;
  readonly base_amount: number;
  readonly vat_rate: number;
  readonly vat_amount: number;
  readonly total_amount: number;
  readonly withholding_ratio: number | null;
  readonly withholding_amount: number;
  readonly collectable_amount: number;
  readonly notes: string | null;
  readonly paid: number;
}

export interface ScheduleRow {
  readonly id: string;
  readonly seq: number;
  readonly description: string;
  readonly ratio_pct: number | null;
  readonly amount: number;
  readonly due_date: string;
  readonly status: string;
  readonly paid: number;
}

export interface PaymentRow {
  readonly id: string;
  readonly invoice_id: string | null;
  readonly schedule_id: string | null;
  readonly paid_on: string;
  readonly amount: number;
  readonly currency: string;
  readonly exchange_rate: number;
  readonly amount_try: number;
  readonly method: string;
  readonly reference: string | null;
  readonly notes: string | null;
}

export interface SaleFinance {
  readonly sale: { readonly id: string; readonly sale_no: string; readonly customer_id: string; readonly customerName: string; readonly status: string; readonly currency: string; readonly exchange_rate: number; readonly subtotal: number; readonly discount_amount: number; readonly vat_rate: number; readonly grand_total: number; readonly assigned_to: string | null };
  readonly invoices: readonly InvoiceRow[];
  readonly schedules: readonly ScheduleRow[];
  readonly payments: readonly PaymentRow[];
  readonly totals: { readonly collectable: number; readonly paidTry: number; readonly remainingTry: number };
}

export interface OverdueRow {
  readonly id: string;
  readonly sale_id: string;
  readonly saleNo: string;
  readonly customerName: string;
  readonly description: string;
  readonly amount: number;
  readonly due_date: string;
  readonly status: string;
}

const fail = (message: string) => err(appError('external_service', message, { module: 'finance' }));
const n = (v: unknown): number => Number(v ?? 0);
const nn = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const customerLabel = (c: { type?: string; full_name?: string | null; company_title?: string | null } | null): string => (c ? (c.type === 'corporate' ? c.company_title || c.full_name : c.full_name || c.company_title) || '—' : '—');

/** Satışın finans özeti: faturalar, hakedişler, tahsilatlar (staff okur; maliyetsiz görünüm herkese uygun). */
export async function getSaleFinance(saleId: string): Promise<Result<SaleFinance | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [sale, invoices, schedules, payments] = await Promise.all([
    client.data.from('sales_without_cost').select('id, sale_no, customer_id, status, currency, exchange_rate, subtotal, discount_amount, vat_rate, grand_total, assigned_to, customer:customers(type, full_name, company_title)').eq('id', saleId).maybeSingle(),
    client.data.from('invoices').select('*').eq('sale_id', saleId).order('created_at'),
    client.data.from('payment_schedules').select('*').eq('sale_id', saleId).order('seq'),
    client.data.from('payments').select('*').eq('sale_id', saleId).order('paid_on', { ascending: false }),
  ]);
  const failure = sale.error ?? invoices.error ?? schedules.error ?? payments.error;
  if (failure) return fail(failure.message);
  if (!sale.data) return ok(null);
  const s = sale.data as unknown as Record<string, unknown>;
  const pays = (payments.data ?? []).map((p) => ({ ...p, amount: n(p.amount), exchange_rate: n(p.exchange_rate), amount_try: n(p.amount_try) }));
  const paidFor = (key: 'invoice_id' | 'schedule_id', id: string, field: 'amount' | 'amount_try') => pays.filter((p) => p[key] === id).reduce((a, p) => a + p[field], 0);
  const inv = (invoices.data ?? []).map((i) => ({
    id: i.id, invoice_no: i.invoice_no, sale_id: i.sale_id, saleNo: String(s['sale_no']), customerName: customerLabel(s['customer'] as never), type: i.type, status: i.status, issue_date: i.issue_date, due_date: i.due_date, currency: i.currency,
    exchange_rate: n(i.exchange_rate), base_amount: n(i.base_amount), vat_rate: n(i.vat_rate), vat_amount: n(i.vat_amount), total_amount: n(i.total_amount), withholding_ratio: nn(i.withholding_ratio), withholding_amount: n(i.withholding_amount), collectable_amount: n(i.collectable_amount), notes: i.notes,
    paid: paidFor('invoice_id', i.id, 'amount'),
  }));
  const sch = (schedules.data ?? []).map((r) => ({ id: r.id, seq: r.seq, description: r.description, ratio_pct: nn(r.ratio_pct), amount: n(r.amount), due_date: r.due_date, status: r.status, paid: paidFor('schedule_id', r.id, 'amount_try') }));
  const collectable = inv.filter((i) => i.status !== 'cancelled' && i.type !== 'proforma').reduce((a, i) => a + i.collectable_amount, 0);
  const paidTry = pays.reduce((a, p) => a + p.amount_try, 0);
  return ok({
    sale: { id: String(s['id']), sale_no: String(s['sale_no']), customer_id: String(s['customer_id']), customerName: customerLabel(s['customer'] as never), status: String(s['status']), currency: String(s['currency']), exchange_rate: n(s['exchange_rate']) || 1, subtotal: n(s['subtotal']), discount_amount: n(s['discount_amount']), vat_rate: n(s['vat_rate']) || 0.2, grand_total: n(s['grand_total']), assigned_to: (s['assigned_to'] as string | null) ?? null },
    invoices: inv,
    schedules: sch,
    payments: pays,
    totals: { collectable, paidTry, remainingTry: Math.round((collectable - paidTry) * 100) / 100 },
  });
}

export async function listInvoices(status?: string): Promise<Result<InvoiceRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let q = client.data.from('invoices').select('*, sale:sales_without_cost(sale_no), customer:customers(type, full_name, company_title)').order('created_at', { ascending: false }).limit(300);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return fail(error.message);
  return ok(
    data.map((i) => ({
      id: i.id, invoice_no: i.invoice_no, sale_id: i.sale_id, saleNo: String((i.sale as { sale_no?: string } | null)?.sale_no ?? ''), customerName: customerLabel(i.customer as never), type: i.type, status: i.status, issue_date: i.issue_date, due_date: i.due_date, currency: i.currency,
      exchange_rate: n(i.exchange_rate), base_amount: n(i.base_amount), vat_rate: n(i.vat_rate), vat_amount: n(i.vat_amount), total_amount: n(i.total_amount), withholding_ratio: nn(i.withholding_ratio), withholding_amount: n(i.withholding_amount), collectable_amount: n(i.collectable_amount), notes: i.notes, paid: 0,
    })),
  );
}

/** Vadesi geçen / yaklaşan hakedişler (dashboard kırmızı uyarı + tahsilat takvimi). "Vadesi geçti" türetilir. */
export async function listSchedules(kind: 'overdue' | 'upcoming', limit = 20): Promise<Result<OverdueRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const today = new Date().toISOString().slice(0, 10);
  let q = client.data.from('payment_schedules').select('id, sale_id, description, amount, due_date, status, sale:sales_without_cost(sale_no, customer:customers(type, full_name, company_title))').in('status', ['pending', 'partially_paid']).order('due_date').limit(limit);
  q = kind === 'overdue' ? q.lt('due_date', today) : q.gte('due_date', today);
  const { data, error } = await q;
  if (error) return fail(error.message);
  return ok(
    data.map((r) => {
      const sale = r.sale as { sale_no?: string; customer?: unknown } | null;
      return { id: r.id, sale_id: r.sale_id, saleNo: sale?.sale_no ?? '', customerName: customerLabel((sale?.customer ?? null) as never), description: r.description, amount: n(r.amount), due_date: r.due_date, status: r.status };
    }),
  );
}
