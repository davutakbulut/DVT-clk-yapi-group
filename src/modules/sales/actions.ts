'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { checkbox, dbErrorKey } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import { slugify } from '@/lib/slugify';
import { parseExpenseLines, parseItemLines } from './domain/saleLines';
import { computeSaleTotals, lineTotals } from './domain/saleMath';

const WRITERS = ['super_admin', 'admin', 'sales'] as const;
const ADMINS = ['super_admin', 'admin'] as const;
const ADMIN_PATH = '/admin/sales';
const uuid = z.string().uuid().optional().or(z.literal(''));

const schema = z.object({
  id: uuid,
  customerId: z.string().uuid(),
  leadId: uuid,
  projectId: uuid,
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['draft', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  currency: z.enum(['TRY', 'USD', 'EUR']),
  exchangeRate: z.string().max(20).optional().or(z.literal('')),
  exchangeRateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  exchangeRateSource: z.enum(['tcmb', 'manual']).default('tcmb'),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  isInvoiced: z.boolean(),
  vatRate: z.coerce.number().min(0).max(1).default(0.2),
  items: z.string().max(40000).optional().or(z.literal('')),
  expenses: z.string().max(40000).optional().or(z.literal('')),
  notes: z.string().trim().max(4000).optional().or(z.literal('')),
  assignedTo: uuid,
});

const num = (v: string | undefined, fallback: number) => {
  if (!v) return fallback;
  const x = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(x) && x > 0 ? x : fallback;
};

/**
 * Satış kaydı (05-SALES-FINANCE): tutarlar saf domain'de hesaplanır, 0007 CHECK'leri son emniyettir.
 * K-33: admin temel tabloya (maliyet dahil) yazar; sales rolü maliyetsiz görünüme yazar, maliyet alanlarına dokunmaz.
 */
export async function saveSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(WRITERS);
  if (!gate.ok) return failed('forbidden');
  const isAdmin = gate.data.role !== 'sales';
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), isInvoiced: checkbox(formData, 'isInvoiced') });
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const items = parseItemLines(v.items ?? '', isAdmin);
  const expenses = isAdmin ? parseExpenseLines(v.expenses ?? '') : [];
  const rate = v.currency === 'TRY' ? 1 : num(v.exchangeRate, 0);
  if (rate <= 0) return failed('validation', { exchangeRate: 'validation' });

  // sales rolü maliyeti göremez → var olan maliyet korunur; toplamlar admin için tam, sales için maliyetsiz hesaplanır
  const totals = computeSaleTotals({ lines: items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, unitCost: i.unitCost })), expenses: expenses.map((e) => e.amount), discountPct: v.discountPct, isInvoiced: v.isInvoiced, vatRate: v.vatRate, exchangeRate: rate, withCost: isAdmin });
  const head = {
    customer_id: v.customerId,
    lead_id: v.leadId || null,
    project_id: v.projectId || null,
    sale_date: v.saleDate,
    status: v.status,
    currency: v.currency,
    exchange_rate: rate,
    exchange_rate_date: v.currency === 'TRY' ? null : v.exchangeRateDate || v.saleDate,
    exchange_rate_source: v.currency === 'TRY' ? 'tcmb' : v.exchangeRateSource,
    subtotal: totals.subtotal,
    discount_pct: v.discountPct,
    discount_amount: totals.discountAmount,
    is_invoiced: v.isInvoiced,
    vat_rate: v.isInvoiced ? v.vatRate : v.vatRate,
    vat_amount: totals.vatAmount,
    grand_total: totals.grandTotal,
    grand_total_try: totals.grandTotalTry,
    notes: v.notes || null,
    assigned_to: v.assignedTo || null,
  };
  const cost = { total_cost: totals.totalCost, gross_profit: totals.grossProfit, margin_pct: totals.marginPct }; // yalnız admin dalında yazılır

  let id = v.id || '';
  if (isAdmin) {
    if (id) {
      const res = await client.data.from('sales').update({ ...head, ...cost }).eq('id', id);
      if (res.error) return fail(res.error);
    } else {
      const res = await client.data.from('sales').insert({ ...head, ...cost, created_by: gate.data.id }).select('id').single();
      if (res.error) return fail(res.error);
      id = res.data.id;
    }
  } else if (id) {
    const res = await client.data.from('sales_without_cost').update(head).eq('id', id);
    if (res.error) return fail(res.error);
  } else {
    const res = await client.data.from('sales_without_cost').insert({ ...head, created_by: gate.data.id }).select('id').single();
    if (res.error || !res.data?.id) return fail(res.error ?? { message: 'insert' });
    id = String(res.data.id);
  }

  // Kalemler sil-yaz; sales rolü görünümden (maliyet kolonu yok), admin temel tablodan
  const baseRows = items.map((i, idx) => ({ sale_id: id, description: i.description, quantity: i.quantity, unit: i.unit, unit_price: i.unitPrice, line_total: lineTotals({ quantity: i.quantity, unitPrice: i.unitPrice, unitCost: null }).lineTotal, sort_order: idx + 1 }));
  if (isAdmin) {
    const del = await client.data.from('sale_items').delete().eq('sale_id', id);
    if (del.error) return fail(del.error);
    if (items.length > 0) {
      const ins = await client.data.from('sale_items').insert(
        items.map((i, idx) => {
          const t = lineTotals({ quantity: i.quantity, unitPrice: i.unitPrice, unitCost: i.unitCost });
          return { ...baseRows[idx]!, unit_cost: i.unitCost, line_cost: t.lineCost, line_profit: t.lineProfit };
        }),
      );
      if (ins.error) return fail(ins.error);
    }
  } else {
    const del = await client.data.from('sale_items_without_cost').delete().eq('sale_id', id);
    if (del.error) return fail(del.error);
    if (baseRows.length > 0) {
      const ins = await client.data.from('sale_items_without_cost').insert(baseRows);
      if (ins.error) return fail(ins.error);
    }
  }
  if (isAdmin) {
    const delE = await client.data.from('sale_expenses').delete().eq('sale_id', id);
    if (delE.error) return fail(delE.error);
    if (expenses.length > 0) {
      const insE = await client.data.from('sale_expenses').insert(expenses.map((e, idx) => ({ sale_id: id, category: e.category, description: e.description, amount: e.amount, expense_date: e.expenseDate, sort_order: idx + 1 })));
      if (insE.error) return fail(insE.error);
    }
  }
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/${id}`);
  revalidatePath(`/admin/customers/${v.customerId}`);
  if (!v.id) redirect(`${ADMIN_PATH}/${id}`);
  return DONE;
}

function fail(error: { code?: string; message: string }): ActionState {
  logger.error('Satis kaydedilemedi', { module: 'sales', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

/** Yalnız yönetici siler (0007 guard); faturası olan satış restrict ile korunur. */
export async function deleteSale(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('sales').delete().eq('id', id.data);
  if (error) {
    logger.error('Satis silinemedi', { module: 'sales', code: error.code, message: error.message });
    return;
  }
  revalidatePath(ADMIN_PATH);
  redirect(ADMIN_PATH);
}

/** Talep detayından tek tık (RPC 0030): müşteri açılır, taslak satış + talep kalemleri; var olan satışa gider. */
export async function convertLeadToSale(formData: FormData): Promise<void> {
  const gate = await requireRole(WRITERS);
  if (!gate.ok) return;
  const leadId = z.string().uuid().safeParse(formData.get('leadId'));
  if (!leadId.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { data, error } = await client.data.rpc('create_sale_from_lead', { p_lead_id: leadId.data });
  if (error || !data) {
    logger.error('Talep satisa donusturulemedi', { module: 'sales', code: error?.code, message: error?.message });
    return;
  }
  revalidatePath(`/admin/leads/${leadId.data}`);
  revalidatePath(ADMIN_PATH);
  redirect(`${ADMIN_PATH}/${data}`);
}

/** Tamamlanan satış → taslak referans projesi (05-SALES-FINANCE). Editör yayınlar; sale_id bağlanır. */
export async function createProjectFromSale(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { data: sale } = await client.data.from('sales').select('id, sale_no, project_id, customer:customers(type, full_name, company_title, city)').eq('id', id.data).maybeSingle();
  if (!sale) return;
  if (sale.project_id) redirect(`/admin/projects/${sale.project_id}`);
  const c = sale.customer as { type?: string; full_name?: string | null; company_title?: string | null; city?: string | null } | null;
  const name = (c?.type === 'corporate' ? c.company_title || c.full_name : c?.full_name || c?.company_title) || sale.sale_no;
  const title = `${name} · ${sale.sale_no}`;
  const { data: project, error } = await client.data
    .from('projects')
    .insert({ slug: { tr: slugify(`${name}-${sale.sale_no}`) }, title: { tr: title }, client_name: name, location: c?.city ? { tr: c.city } : {}, sale_id: sale.id, status: 'draft', published_locales: ['tr'] })
    .select('id')
    .single();
  if (error || !project) {
    logger.error('Satistan proje acilamadi', { module: 'sales', code: error?.code, message: error?.message });
    return;
  }
  await client.data.from('sales').update({ project_id: project.id }).eq('id', sale.id);
  revalidatePath(`${ADMIN_PATH}/${sale.id}`);
  redirect(`/admin/projects/${project.id}`);
}
