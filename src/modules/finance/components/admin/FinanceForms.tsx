'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useActionState, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError } from '@/modules/admin-shell';
import { addPayment, saveInvoice, saveSchedules } from '../../actions';
import type { InvoiceRow, SaleFinance, ScheduleRow } from '../../data/adminFinanceRepository';
import { computeInvoice, formatScheduleLines, parseScheduleLines, WITHHOLDING_RATIOS } from '../../domain/invoiceMath';

const TYPES = ['e_invoice', 'e_archive', 'proforma'] as const;
const STATUSES = ['not_issued', 'issued', 'sent', 'paid', 'partially_paid', 'cancelled'] as const;
const METHODS = ['bank_transfer', 'cash', 'check', 'credit_card', 'other'] as const;
const parseMoney = (v: string) => Number(v.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0;

/** Fatura formu (K-31): matrah satıştan gelir, KDV/tevkifat canlı; kesildi → numara + tarih zorunlu (proforma hariç). */
export function InvoiceForm({ sale, invoice }: { readonly sale: SaleFinance['sale']; readonly invoice: InvoiceRow | null }) {
  const t = useTranslations('Admin');
  const format = useFormatter();
  const [state, action, pending] = useActionState(saveInvoice, IDLE);
  const i = invoice;
  const [base, setBase] = useState(String(i?.base_amount ?? Math.round((sale.subtotal - sale.discount_amount) * 100) / 100));
  const [vat, setVat] = useState(String((i?.vat_rate ?? sale.vat_rate) * 100));
  const [ratio, setRatio] = useState(i?.withholding_ratio ? String(i.withholding_ratio) : '');
  const [type, setType] = useState<(typeof TYPES)[number]>((i?.type as (typeof TYPES)[number]) ?? 'e_invoice');
  const amounts = useMemo(() => computeInvoice({ baseAmount: parseMoney(base), vatRate: (Number(vat.replace(',', '.')) || 0) / 100, withholdingRatio: ratio ? Number(ratio) : null }), [base, vat, ratio]);
  const money = (v: number) => format.number(v, { style: 'currency', currency: i?.currency ?? sale.currency, maximumFractionDigits: 2 });
  const k = i?.id ?? 'new';
  return (
    <form action={action} className="grid gap-3 rounded-md border p-4">
      <input type="hidden" name="id" value={i?.id ?? ''} />
      <input type="hidden" name="saleId" value={sale.id} />
      <input type="hidden" name="customerId" value={sale.customer_id} />
      <input type="hidden" name="currency" value={i?.currency ?? sale.currency} />
      <input type="hidden" name="exchangeRate" value={String(i?.exchange_rate ?? sale.exchange_rate)} />
      <input type="hidden" name="vatRate" value={String((Number(vat.replace(',', '.')) || 0) / 100)} />
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label htmlFor={`i-${k}-type`}>{t('finance.type')}</Label>
          <select id={`i-${k}-type`} name="type" value={type} onChange={(e) => setType(e.target.value as (typeof TYPES)[number])} className="h-9 rounded-md border bg-background px-2 text-sm">
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`finance.types.${x}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`i-${k}-status`}>{t('form.status')}</Label>
          <select id={`i-${k}-status`} name="status" defaultValue={i?.status ?? 'not_issued'} className="h-9 rounded-md border bg-background px-2 text-sm">
            {STATUSES.map((x) => (
              <option key={x} value={x}>
                {t(`finance.statuses.${x}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`i-${k}-no`}>{t('finance.invoiceNo')}</Label>
          <Input id={`i-${k}-no`} name="invoiceNo" defaultValue={i?.invoice_no ?? ''} placeholder={type === 'proforma' ? t('finance.autoNo') : 'GIB…'} aria-invalid={state.fieldErrors?.['invoiceNo'] ? 'true' : undefined} />
          <FieldError state={state} name="invoiceNo" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`i-${k}-issue`}>{t('finance.issueDate')}</Label>
          <Input id={`i-${k}-issue`} name="issueDate" type="date" defaultValue={i?.issue_date ?? ''} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`i-${k}-due`}>{t('finance.dueDate')}</Label>
          <Input id={`i-${k}-due`} name="dueDate" type="date" defaultValue={i?.due_date ?? ''} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`i-${k}-base`}>{t('finance.baseAmount')}</Label>
          <Input id={`i-${k}-base`} name="baseAmount" value={base} onChange={(e) => setBase(e.target.value)} inputMode="decimal" aria-invalid={state.fieldErrors?.['baseAmount'] ? 'true' : undefined} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`i-${k}-vat`}>{t('sales.vatRate')}</Label>
          <Input id={`i-${k}-vat`} value={vat} onChange={(e) => setVat(e.target.value)} inputMode="decimal" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`i-${k}-wh`}>{t('finance.withholding')}</Label>
          <select id={`i-${k}-wh`} name="withholdingRatio" value={ratio} onChange={(e) => setRatio(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="">{t('finance.noWithholding')}</option>
            {WITHHOLDING_RATIOS.map((r) => (
              <option key={r} value={r}>
                {Math.round(r * 10)}/10
              </option>
            ))}
          </select>
        </div>
      </div>
      <dl className="grid gap-1 text-sm sm:max-w-md" aria-live="polite">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('finance.baseAmount')}</dt>
          <dd className="tabular-nums">{money(amounts.baseAmount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('sales.vat')}</dt>
          <dd className="tabular-nums">{money(amounts.vatAmount)}</dd>
        </div>
        <div className="flex justify-between font-medium">
          <dt>{t('finance.totalAmount')}</dt>
          <dd className="tabular-nums">{money(amounts.totalAmount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('finance.withholdingAmount')}</dt>
          <dd className="tabular-nums">−{money(amounts.withholdingAmount)}</dd>
        </div>
        <div className="flex justify-between border-t pt-1 font-semibold">
          <dt>{t('finance.collectable')}</dt>
          <dd className="tabular-nums" data-testid={`collectable-${k}`}>
            {money(amounts.collectableAmount)}
          </dd>
        </div>
      </dl>
      <div className="grid gap-1">
        <Label htmlFor={`i-${k}-notes`}>{t('customers.notes')}</Label>
        <Textarea id={`i-${k}-notes`} name="notes" rows={2} defaultValue={i?.notes ?? ''} />
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {i ? t('common.save') : t('finance.addInvoice')}
        </Button>
      </div>
    </form>
  );
}

/** Ödeme planı: satırlar "Açıklama | oran% | tutar | vade"; oran verilirse tutar tahsil edilecek toplamdan türetilir. */
export function ScheduleForm({ saleId, collectable, schedules }: { readonly saleId: string; readonly collectable: number; readonly schedules: readonly ScheduleRow[] }) {
  const t = useTranslations('Admin');
  const format = useFormatter();
  const [state, action, pending] = useActionState(saveSchedules, IDLE);
  const [lines, setLines] = useState(formatScheduleLines(schedules.map((s) => ({ description: s.description, ratioPct: s.ratio_pct, amount: s.amount, dueDate: s.due_date }))));
  const preview = useMemo(() => parseScheduleLines(lines, collectable), [lines, collectable]);
  const total = preview.reduce((a, r) => a + r.amount, 0);
  const locked = schedules.some((s) => s.paid > 0);
  return (
    <form action={action} className="grid gap-3 rounded-md border p-4">
      <input type="hidden" name="saleId" value={saleId} />
      <input type="hidden" name="collectable" value={String(collectable)} />
      <ActionMessage state={state} />
      <div className="grid gap-1">
        <Label htmlFor="sch-lines">{t('finance.scheduleLines')}</Label>
        <Textarea id="sch-lines" name="lines" rows={4} value={lines} onChange={(e) => setLines(e.target.value)} readOnly={locked} className="font-mono text-xs" aria-invalid={state.fieldErrors?.['lines'] ? 'true' : undefined} />
        <p className="text-xs text-muted-foreground">{locked ? t('finance.scheduleLocked') : t('finance.scheduleHint', { total: format.number(collectable, { maximumFractionDigits: 2 }) })}</p>
        <FieldError state={state} name="lines" />
      </div>
      <p className="text-sm" aria-live="polite">
        {t('finance.schedulePreview', { count: preview.length, total: format.number(total, { maximumFractionDigits: 2 }) })}
      </p>
      {locked ? null : (
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {t('common.save')}
          </Button>
        </div>
      )}
    </form>
  );
}

/** Tahsilat: tarih · tutar · para birimi/kur · yöntem · referans · fatura/hakediş bağlantısı. */
export function PaymentForm({ saleId, currency, exchangeRate, invoices, schedules }: { readonly saleId: string; readonly currency: string; readonly exchangeRate: number; readonly invoices: readonly InvoiceRow[]; readonly schedules: readonly ScheduleRow[] }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(addPayment, IDLE);
  const [cur, setCur] = useState(currency);
  return (
    <form action={action} className="grid gap-3 rounded-md border p-4">
      <input type="hidden" name="saleId" value={saleId} />
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label htmlFor="p-paidOn">{t('finance.paidOn')}</Label>
          <Input id="p-paidOn" name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="p-amount">{t('finance.amount')}</Label>
          <Input id="p-amount" name="amount" inputMode="decimal" required aria-invalid={state.fieldErrors?.['amount'] ? 'true' : undefined} />
          <FieldError state={state} name="amount" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="p-currency">{t('sales.currency')}</Label>
          <select id="p-currency" name="currency" value={cur} onChange={(e) => setCur(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            {['TRY', 'USD', 'EUR'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {cur !== 'TRY' ? (
          <div className="grid gap-1">
            <Label htmlFor="p-rate">{t('sales.rate')}</Label>
            <Input id="p-rate" name="exchangeRate" defaultValue={String(exchangeRate)} inputMode="decimal" />
          </div>
        ) : null}
        <div className="grid gap-1">
          <Label htmlFor="p-method">{t('finance.method')}</Label>
          <select id="p-method" name="method" defaultValue="bank_transfer" className="h-9 rounded-md border bg-background px-2 text-sm">
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`finance.methods.${m}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="p-invoice">{t('finance.invoice')}</Label>
          <select id="p-invoice" name="invoiceId" defaultValue="" className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="">{t('common.none')}</option>
            {invoices.map((i) => (
              <option key={i.id} value={i.id}>
                {i.invoice_no ?? t(`finance.types.${i.type as 'e_invoice'}`)} · {i.collectable_amount}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="p-schedule">{t('finance.schedule')}</Label>
          <select id="p-schedule" name="scheduleId" defaultValue="" className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="">{t('common.none')}</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.seq}. {s.description} · {s.amount}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="p-reference">{t('finance.reference')}</Label>
          <Input id="p-reference" name="reference" />
        </div>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('finance.addPayment')}
        </Button>
      </div>
    </form>
  );
}
