'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { dbErrorKey } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import { computeInvoice, parseScheduleLines, WITHHOLDING_RATIOS } from './domain/invoiceMath';

const ADMINS = ['super_admin', 'admin'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(''));
const money = z.string().max(24).transform((v) => Number(v.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')));
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));

function bump(saleId: string) {
  revalidatePath(`/admin/sales/${saleId}/finance`);
  revalidatePath(`/admin/sales/${saleId}`);
  revalidatePath('/admin/invoices');
  revalidatePath('/admin');
}

function fail(msg: string, error: { code?: string; message: string }): ActionState {
  logger.error(msg, { module: 'finance', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

const invoiceSchema = z.object({
  id: uuid,
  saleId: z.string().uuid(),
  customerId: z.string().uuid(),
  type: z.enum(['e_invoice', 'e_archive', 'proforma']),
  status: z.enum(['not_issued', 'issued', 'sent', 'paid', 'partially_paid', 'cancelled']),
  invoiceNo: z.string().trim().max(60).optional().or(z.literal('')),
  issueDate: date,
  dueDate: date,
  currency: z.enum(['TRY', 'USD', 'EUR']),
  exchangeRate: z.string().max(20).optional().or(z.literal('')),
  baseAmount: money.pipe(z.number().min(0)),
  vatRate: z.coerce.number().min(0).max(1).default(0.2),
  withholdingRatio: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

/** Fatura (K-31): tutarlar saf domain'de; 0007 CHECK son emniyet. Kesildi durumu numara + tarih ister (proforma hariç). */
export async function saveInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const ratio = v.withholdingRatio ? Number(v.withholdingRatio) : null;
  if (ratio !== null && !WITHHOLDING_RATIOS.includes(ratio as (typeof WITHHOLDING_RATIOS)[number])) return failed('validation', { withholdingRatio: 'validation' });
  if (v.status !== 'not_issued' && v.type !== 'proforma' && (!v.invoiceNo || !v.issueDate)) return failed('validation', { invoiceNo: 'validation' });
  const rate = v.currency === 'TRY' ? 1 : Number((v.exchangeRate ?? '').replace(',', '.')) || 0;
  if (rate <= 0) return failed('validation', { exchangeRate: 'validation' });
  const a = computeInvoice({ baseAmount: v.baseAmount, vatRate: v.vatRate, withholdingRatio: ratio });
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = {
    sale_id: v.saleId,
    customer_id: v.customerId,
    type: v.type,
    status: v.status,
    invoice_no: v.invoiceNo || null,
    issue_date: v.issueDate || null,
    due_date: v.dueDate || null,
    currency: v.currency,
    exchange_rate: rate,
    base_amount: a.baseAmount,
    vat_rate: v.vatRate,
    vat_amount: a.vatAmount,
    total_amount: a.totalAmount,
    withholding_ratio: ratio,
    withholding_amount: a.withholdingAmount,
    collectable_amount: a.collectableAmount,
    notes: v.notes || null,
  };
  const res = v.id ? await client.data.from('invoices').update(row).eq('id', v.id) : await client.data.from('invoices').insert({ ...row, created_by: gate.data.id });
  if (res.error) return fail('Fatura kaydedilemedi', res.error);
  await client.data.rpc('recalc_sale_payments', { p_sale_id: v.saleId });
  bump(v.saleId);
  return DONE;
}

export async function deleteInvoice(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  const saleId = z.string().uuid().safeParse(formData.get('saleId'));
  if (!id.success || !saleId.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('invoices').delete().eq('id', id.data);
  if (error) logger.error('Fatura silinemedi', { module: 'finance', code: error.code, message: error.message });
  bump(saleId.data);
}

/** Ödeme planı sil-yaz (satır biçimi). Tahsilat bağlı hakedişler silinemez → önce ödemeleri kaldırın (FK set null yerine bilinçli koruma). */
export async function saveSchedules(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const parsed = z.object({ saleId: z.string().uuid(), lines: z.string().max(20000).optional().or(z.literal('')), collectable: money }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const rows = parseScheduleLines(v.lines ?? '', v.collectable);
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { count } = await client.data.from('payments').select('id', { count: 'exact', head: true }).eq('sale_id', v.saleId).not('schedule_id', 'is', null);
  if ((count ?? 0) > 0) return failed('validation', { lines: 'validation' });
  const del = await client.data.from('payment_schedules').delete().eq('sale_id', v.saleId);
  if (del.error) return fail('Odeme plani silinemedi', del.error);
  if (rows.length > 0) {
    const ins = await client.data.from('payment_schedules').insert(rows.map((r, i) => ({ sale_id: v.saleId, seq: i + 1, description: r.description, ratio_pct: r.ratioPct, amount: r.amount, due_date: r.dueDate })));
    if (ins.error) return fail('Odeme plani kaydedilemedi', ins.error);
  }
  bump(v.saleId);
  return DONE;
}

const paymentSchema = z.object({
  saleId: z.string().uuid(),
  invoiceId: uuid,
  scheduleId: uuid,
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: money.pipe(z.number().positive()),
  currency: z.enum(['TRY', 'USD', 'EUR']),
  exchangeRate: z.string().max(20).optional().or(z.literal('')),
  method: z.enum(['bank_transfer', 'cash', 'check', 'credit_card', 'other']),
  reference: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

/** Tahsilat (K-32: kur kayda yazılır, ₺ karşılığı saklanır) → hakediş/fatura durumları RPC ile türetilir. */
export async function addPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const rate = v.currency === 'TRY' ? 1 : Number((v.exchangeRate ?? '').replace(',', '.')) || 0;
  if (rate <= 0) return failed('validation', { exchangeRate: 'validation' });
  const amountTry = Number((BigInt(Math.round(v.amount * 100)) * BigInt(Math.round(rate * 1_000_000)) + 500_000n) / 1_000_000n) / 100;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.from('payments').insert({ sale_id: v.saleId, invoice_id: v.invoiceId || null, schedule_id: v.scheduleId || null, paid_on: v.paidOn, amount: v.amount, currency: v.currency, exchange_rate: rate, amount_try: amountTry, method: v.method, reference: v.reference || null, notes: v.notes || null, recorded_by: gate.data.id });
  if (error) return fail('Tahsilat kaydedilemedi', error);
  await client.data.rpc('recalc_sale_payments', { p_sale_id: v.saleId });
  bump(v.saleId);
  return DONE;
}

export async function deletePayment(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  const saleId = z.string().uuid().safeParse(formData.get('saleId'));
  if (!id.success || !saleId.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('payments').delete().eq('id', id.data);
  if (error) logger.error('Tahsilat silinemedi', { module: 'finance', code: error.code, message: error.message });
  await client.data.rpc('recalc_sale_payments', { p_sale_id: saleId.data });
  bump(saleId.data);
}
