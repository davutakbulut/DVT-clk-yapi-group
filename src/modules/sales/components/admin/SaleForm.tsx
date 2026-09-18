'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useActionState, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection } from '@/modules/admin-shell';
import { saveSale } from '../../actions';
import type { Choice, LatestRate, SaleDetail } from '../../data/adminSalesRepository';
import { formatExpenseLines, formatItemLines, parseExpenseLines, parseItemLines } from '../../domain/saleLines';
import { computeSaleTotals, marginBand } from '../../domain/saleMath';

interface Props {
  readonly sale: SaleDetail | null;
  readonly customers: readonly Choice[];
  readonly staff: readonly Choice[];
  readonly projects: readonly Choice[];
  readonly rates: readonly LatestRate[];
  readonly isAdmin: boolean;
  readonly canEdit: boolean;
  readonly defaultCustomerId?: string;
}

const STATUSES = ['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;

/**
 * Satış giriş ekranı (05-SALES-FINANCE): müşteri · tarih · durum · talep/proje · KALEMLER (satır) · EK GİDERLER (🔒 admin) ·
 * fatura/KDV · ÖZET (canlı, istemcide aynı saf hesap) · maliyet/kâr/marj 🔒. sales rolü maliyet sütununu görmez (K-33).
 */
export function SaleForm({ sale, customers, staff, projects, rates, isAdmin, canEdit, defaultCustomerId }: Props) {
  const t = useTranslations('Admin');
  const format = useFormatter();
  const [state, action, pending] = useActionState(saveSale, IDLE);
  const s = sale;
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>((s?.currency as 'TRY') ?? 'TRY');
  const latest = rates.find((r) => r.currency === currency);
  const [rate, setRate] = useState(s ? String(s.exchange_rate) : latest ? String(latest.rate) : '');
  const [items, setItems] = useState(s ? formatItemLines(s.items, isAdmin) : '');
  const [expenses, setExpenses] = useState(s ? formatExpenseLines(s.expenses) : '');
  const [discount, setDiscount] = useState(String(s?.discount_pct ?? 0));
  const [invoiced, setInvoiced] = useState(s?.is_invoiced ?? true);
  const [vatRate, setVatRate] = useState(String((s?.vat_rate ?? 0.2) * 100));
  const locked = !canEdit;

  const totals = useMemo(() => {
    const lines = parseItemLines(items, isAdmin);
    const exp = isAdmin ? parseExpenseLines(expenses) : [];
    const r = currency === 'TRY' ? 1 : Number(rate.replace(',', '.')) || 0;
    return computeSaleTotals({ lines: lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, unitCost: l.unitCost })), expenses: exp.map((e) => e.amount), discountPct: Number(discount.replace(',', '.')) || 0, isInvoiced: invoiced, vatRate: (Number(vatRate.replace(',', '.')) || 0) / 100, exchangeRate: r, withCost: isAdmin });
  }, [items, expenses, discount, invoiced, vatRate, currency, rate, isAdmin]);
  const money = (v: number, cur = currency) => format.number(v, { style: 'currency', currency: cur, maximumFractionDigits: 2 });
  const band = marginBand(totals.marginPct);
  const bandClass = band === 'green' ? 'text-green-700' : band === 'yellow' ? 'text-amber-700' : band === 'red' ? 'text-red-700' : '';

  const select = (name: string, label: string, options: readonly { value: string; label: string }[], value: string, onChange?: (v: string) => void) => (
    <div className="grid gap-1">
      <Label htmlFor={`s-${name}`}>{label}</Label>
      <select id={`s-${name}`} name={name} defaultValue={onChange ? undefined : value} value={onChange ? value : undefined} onChange={onChange ? (e) => onChange(e.target.value) : undefined} disabled={locked} className="h-9 rounded-md border bg-background px-2 text-sm" aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError state={state} name={name} />
    </div>
  );

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={s?.id ?? ''} />
      <ActionMessage state={state} />

      <FormSection title={t('sales.header')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {select('customerId', t('sales.customer'), [{ value: '', label: t('common.none') }, ...customers.map((c) => ({ value: c.id, label: c.label }))], s?.customer_id ?? defaultCustomerId ?? '')}
          <div className="grid gap-1">
            <Label htmlFor="s-saleDate">{t('sales.date')}</Label>
            <Input id="s-saleDate" name="saleDate" type="date" defaultValue={s?.sale_date ?? new Date().toISOString().slice(0, 10)} required readOnly={locked} />
          </div>
          {select('status', t('form.status'), STATUSES.map((st) => ({ value: st, label: t(`sales.statuses.${st}`) })), s?.status ?? 'draft')}
          {select('assignedTo', t('leads.assigned'), [{ value: '', label: t('leads.unassigned') }, ...staff.map((p) => ({ value: p.id, label: p.label }))], s?.assigned_to ?? '')}
          {select('projectId', t('sales.project'), [{ value: '', label: t('common.none') }, ...projects.map((p) => ({ value: p.id, label: p.label }))], s?.project_id ?? '')}
          <input type="hidden" name="leadId" value={s?.lead_id ?? ''} />
          {s?.leadRef ? (
            <p className="self-end pb-2 text-sm text-muted-foreground">
              {t('sales.lead')}: <span className="font-mono">{s.leadRef}</span>
            </p>
          ) : null}
        </div>
      </FormSection>

      <FormSection title={t('sales.currencySection')}>
        <div className="grid gap-3 sm:grid-cols-3">
          {select('currency', t('sales.currency'), (['TRY', 'USD', 'EUR'] as const).map((c) => ({ value: c, label: c })), currency, (v) => {
            const c = v as 'TRY' | 'USD' | 'EUR';
            setCurrency(c);
            const l = rates.find((r) => r.currency === c);
            setRate(c === 'TRY' ? '1' : l ? String(l.rate) : '');
          })}
          {currency !== 'TRY' ? (
            <>
              <div className="grid gap-1">
                <Label htmlFor="s-exchangeRate">{t('sales.rate')}</Label>
                <Input id="s-exchangeRate" name="exchangeRate" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" readOnly={locked} aria-invalid={state.fieldErrors?.['exchangeRate'] ? 'true' : undefined} />
                <FieldError state={state} name="exchangeRate" />
                <p className="text-xs text-muted-foreground">{latest ? t('sales.rateNote', { date: latest.rateDate, source: latest.source }) : t('sales.rateMissing')}</p>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="s-exchangeRateDate">{t('sales.rateDate')}</Label>
                <Input id="s-exchangeRateDate" name="exchangeRateDate" type="date" defaultValue={s?.exchange_rate_date ?? latest?.rateDate ?? ''} readOnly={locked} />
                <input type="hidden" name="exchangeRateSource" value={latest && String(latest.rate) === rate ? 'tcmb' : 'manual'} />
              </div>
            </>
          ) : null}
        </div>
      </FormSection>

      <FormSection title={t('sales.items')}>
        <div className="grid gap-1">
          <Label htmlFor="s-items">{t('sales.items')}</Label>
          <Textarea id="s-items" name="items" rows={6} value={items} onChange={(e) => setItems(e.target.value)} readOnly={locked} className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground">{isAdmin ? t('sales.itemsHintAdmin') : t('sales.itemsHint')}</p>
        </div>
        {isAdmin ? (
          <div className="grid gap-1">
            <Label htmlFor="s-expenses">{t('sales.expenses')} 🔒</Label>
            <Textarea id="s-expenses" name="expenses" rows={3} value={expenses} onChange={(e) => setExpenses(e.target.value)} readOnly={locked} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">{t('sales.expensesHint')}</p>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor="s-discountPct">{t('sales.discountPct')}</Label>
            <Input id="s-discountPct" name="discountPct" value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" readOnly={locked} />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="isInvoiced" checked={invoiced} onChange={(e) => setInvoiced(e.target.checked)} disabled={locked} /> {t('sales.invoiced')}
          </label>
          <div className="grid gap-1">
            <Label htmlFor="s-vatRatePct">{t('sales.vatRate')}</Label>
            <Input id="s-vatRatePct" value={vatRate} onChange={(e) => setVatRate(e.target.value)} inputMode="decimal" readOnly={locked} />
            <input type="hidden" name="vatRate" value={String((Number(vatRate.replace(',', '.')) || 0) / 100)} />
          </div>
        </div>
      </FormSection>

      <FormSection title={t('sales.summary')}>
        <dl className="grid gap-1 text-sm sm:max-w-md" aria-live="polite">
          {[
            [t('sales.subtotal'), money(totals.subtotal)],
            [t('sales.discount'), `−${money(totals.discountAmount)}`],
            [t('sales.vat'), money(totals.vatAmount)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="tabular-nums">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t pt-1 font-semibold">
            <dt>{t('sales.grandTotal')}</dt>
            <dd className="tabular-nums" data-testid="grand-total">
              {money(totals.grandTotal)}
            </dd>
          </div>
          {currency !== 'TRY' ? (
            <div className="flex justify-between gap-4 text-muted-foreground">
              <dt>{t('sales.grandTotalTry')}</dt>
              <dd className="tabular-nums">{money(totals.grandTotalTry, 'TRY')}</dd>
            </div>
          ) : null}
          {isAdmin ? (
            <>
              <div className="flex justify-between gap-4 border-t pt-1">
                <dt className="text-muted-foreground">{t('sales.totalCost')} 🔒</dt>
                <dd className="tabular-nums">{totals.totalCost === null ? '—' : money(totals.totalCost)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('sales.grossProfit')} 🔒</dt>
                <dd className="tabular-nums">{totals.grossProfit === null ? '—' : money(totals.grossProfit)}</dd>
              </div>
              <div className={`flex justify-between gap-4 font-semibold ${bandClass}`}>
                <dt>{t('sales.margin')} 🔒</dt>
                <dd className="tabular-nums" data-testid="margin">
                  {totals.marginPct === null ? '—' : `%${format.number(totals.marginPct, { maximumFractionDigits: 1 })}`}
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      </FormSection>

      <div className="grid gap-1">
        <Label htmlFor="s-notes">{t('customers.notes')}</Label>
        <Textarea id="s-notes" name="notes" rows={3} defaultValue={s?.notes ?? ''} readOnly={locked} />
      </div>
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
