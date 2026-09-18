import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { ExpenseLine, ItemLine } from '../domain/saleLines';

export interface SaleRow {
  readonly id: string;
  readonly sale_no: string;
  readonly customer_id: string;
  readonly customerName: string;
  readonly sale_date: string;
  readonly status: string;
  readonly currency: string;
  readonly grand_total: number;
  readonly grand_total_try: number;
  readonly margin_pct: number | null; // 🔒 yalnız admin
  readonly assigneeName: string | null;
  readonly updated_at: string;
}

export interface SaleDetail extends SaleRow {
  readonly lead_id: string | null;
  readonly leadRef: string | null;
  readonly project_id: string | null;
  readonly exchange_rate: number;
  readonly exchange_rate_date: string | null;
  readonly exchange_rate_source: string;
  readonly subtotal: number;
  readonly discount_pct: number;
  readonly discount_amount: number;
  readonly is_invoiced: boolean;
  readonly vat_rate: number;
  readonly vat_amount: number;
  readonly total_cost: number | null; // 🔒
  readonly gross_profit: number | null; // 🔒
  readonly notes: string | null;
  readonly assigned_to: string | null;
  readonly items: readonly ItemLine[];
  readonly expenses: readonly ExpenseLine[]; // 🔒 sales için boş
  readonly invoiceCount: number;
}

export interface Choice {
  readonly id: string;
  readonly label: string;
}

export interface LatestRate {
  readonly currency: 'USD' | 'EUR';
  readonly rate: number;
  readonly rateDate: string;
  readonly source: string;
}

const fail = (message: string) => err(appError('external_service', message, { module: 'sales' }));
const n = (v: unknown): number => Number(v ?? 0);
const nn = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const customerLabel = (c: { type?: string; full_name?: string | null; company_title?: string | null } | null): string => (c ? (c.type === 'corporate' ? c.company_title || c.full_name : c.full_name || c.company_title) || '—' : '—');

/**
 * K-33: admin temel tabloyu (maliyet/kâr dahil), sales/viewer maliyetsiz görünümü okur. Görünüm satırları RLS yerine
 * security_barrier + rol koşuluyla sınırlıdır; giderler sales için hiç yüklenmez.
 */
export async function listSales(isAdmin: boolean, filter: { readonly status?: string; readonly customerId?: string } = {}): Promise<Result<SaleRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const cols = `id, sale_no, customer_id, sale_date, status, currency, grand_total, grand_total_try, assigned_to, updated_at${isAdmin ? ', margin_pct' : ''}, customer:customers(type, full_name, company_title), assignee:profiles!${isAdmin ? 'sales' : 'sales_without_cost'}_assigned_to_fkey(full_name)`;
  let q = (isAdmin ? client.data.from('sales').select(cols) : client.data.from('sales_without_cost').select(cols)).order('sale_date', { ascending: false }).order('created_at', { ascending: false }).limit(300);
  if (filter.status) q = q.eq('status', filter.status);
  if (filter.customerId) q = q.eq('customer_id', filter.customerId);
  const { data, error } = await q;
  if (error) return fail(error.message);
  return ok(
    (data as unknown as Record<string, unknown>[]).map((r) => ({
      id: String(r['id']),
      sale_no: String(r['sale_no']),
      customer_id: String(r['customer_id']),
      customerName: customerLabel(r['customer'] as never),
      sale_date: String(r['sale_date']),
      status: String(r['status']),
      currency: String(r['currency']),
      grand_total: n(r['grand_total']),
      grand_total_try: n(r['grand_total_try']),
      margin_pct: isAdmin ? nn(r['margin_pct']) : null,
      assigneeName: (r['assignee'] as { full_name?: string | null } | null)?.full_name ?? null,
      updated_at: String(r['updated_at']),
    })),
  );
}

export async function getSale(id: string, isAdmin: boolean): Promise<Result<SaleDetail | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const head = isAdmin
    ? client.data.from('sales').select('*, customer:customers(type, full_name, company_title), assignee:profiles!sales_assigned_to_fkey(full_name), lead:leads(ref_no)').eq('id', id).maybeSingle()
    : client.data.from('sales_without_cost').select('*, customer:customers(type, full_name, company_title), assignee:profiles!sales_without_cost_assigned_to_fkey(full_name), lead:leads(ref_no)').eq('id', id).maybeSingle();
  const items = isAdmin ? client.data.from('sale_items').select('description, quantity, unit, unit_price, unit_cost').eq('sale_id', id).order('sort_order') : client.data.from('sale_items_without_cost').select('description, quantity, unit, unit_price').eq('sale_id', id).order('sort_order');
  const expenses = isAdmin ? client.data.from('sale_expenses').select('category, description, amount, expense_date').eq('sale_id', id).order('sort_order') : Promise.resolve({ data: [], error: null });
  const invoices = client.data.from('invoices').select('id', { count: 'exact', head: true }).eq('sale_id', id);
  const [h, i, e, inv] = await Promise.all([head, items, expenses, invoices]);
  const failure = h.error ?? i.error ?? e.error;
  if (failure) return fail(failure.message);
  if (!h.data) return ok(null);
  const r = h.data as unknown as Record<string, unknown>;
  return ok({
    id: String(r['id']),
    sale_no: String(r['sale_no']),
    customer_id: String(r['customer_id']),
    customerName: customerLabel(r['customer'] as never),
    sale_date: String(r['sale_date']),
    status: String(r['status']),
    currency: String(r['currency']),
    grand_total: n(r['grand_total']),
    grand_total_try: n(r['grand_total_try']),
    margin_pct: isAdmin ? nn(r['margin_pct']) : null,
    assigneeName: (r['assignee'] as { full_name?: string | null } | null)?.full_name ?? null,
    updated_at: String(r['updated_at']),
    lead_id: (r['lead_id'] as string | null) ?? null,
    leadRef: (r['lead'] as { ref_no?: string } | null)?.ref_no ?? null,
    project_id: (r['project_id'] as string | null) ?? null,
    exchange_rate: n(r['exchange_rate']) || 1,
    exchange_rate_date: (r['exchange_rate_date'] as string | null) ?? null,
    exchange_rate_source: String(r['exchange_rate_source'] ?? 'tcmb'),
    subtotal: n(r['subtotal']),
    discount_pct: n(r['discount_pct']),
    discount_amount: n(r['discount_amount']),
    is_invoiced: r['is_invoiced'] !== false,
    vat_rate: n(r['vat_rate']) || 0.2,
    vat_amount: n(r['vat_amount']),
    total_cost: isAdmin ? nn(r['total_cost']) : null,
    gross_profit: isAdmin ? nn(r['gross_profit']) : null,
    notes: (r['notes'] as string | null) ?? null,
    assigned_to: (r['assigned_to'] as string | null) ?? null,
    items: ((i.data ?? []) as Record<string, unknown>[]).map((x) => ({ description: String(x['description']), quantity: n(x['quantity']), unit: String(x['unit']), unitPrice: n(x['unit_price']), unitCost: isAdmin ? nn(x['unit_cost']) : null })),
    expenses: ((e.data ?? []) as Record<string, unknown>[]).map((x) => ({ category: x['category'] as ExpenseLine['category'], description: (x['description'] as string | null) ?? null, amount: n(x['amount']), expenseDate: (x['expense_date'] as string | null) ?? null })),
    invoiceCount: inv.count ?? 0,
  });
}

export async function listSaleChoices(): Promise<Result<{ customers: Choice[]; staff: Choice[]; projects: Choice[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [customers, staff, projects] = await Promise.all([
    client.data.from('customers').select('id, type, full_name, company_title').eq('is_active', true).is('anonymized_at', null).order('company_title').limit(500),
    client.data.from('profiles').select('id, full_name').in('role', ['super_admin', 'admin', 'sales']).eq('is_active', true).order('full_name'),
    client.data.from('projects').select('id, title').order('created_at', { ascending: false }).limit(300),
  ]);
  const failure = customers.error ?? staff.error ?? projects.error;
  if (failure) return fail(failure.message);
  return ok({
    customers: (customers.data ?? []).map((c) => ({ id: c.id, label: customerLabel(c) })),
    staff: (staff.data ?? []).map((p) => ({ id: p.id, label: p.full_name || p.id.slice(0, 8) })),
    projects: (projects.data ?? []).map((p) => ({ id: p.id, label: ((p.title as Record<string, string> | null)?.['tr'] ?? '') || p.id.slice(0, 8) })),
  });
}

/** Talep detayı: bu talebe bağlı (iptal olmayan) satış. Görünüm herkese (staff) açık. */
export async function findSaleByLead(leadId: string): Promise<{ id: string; sale_no: string } | null> {
  const client = await createServerClient();
  if (!client.ok) return null;
  const { data } = await client.data.from('sales_without_cost').select('id, sale_no').eq('lead_id', leadId).neq('status', 'cancelled').limit(1).maybeSingle();
  return data ? { id: String(data.id), sale_no: String(data.sale_no) } : null;
}

/** En son kur (K-32 devre kesici): TCMB düşse de son çekilen kullanılır; form "kur X tarihli" notunu gösterir. */
export async function latestRates(): Promise<Result<LatestRate[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('exchange_rates').select('currency, rate, rate_date, source').order('rate_date', { ascending: false }).limit(20);
  if (error) return fail(error.message);
  const out = new Map<string, LatestRate>();
  for (const r of data) if (!out.has(r.currency)) out.set(r.currency, { currency: r.currency as 'USD' | 'EUR', rate: Number(r.rate), rateDate: r.rate_date, source: r.source });
  return ok([...out.values()]);
}
