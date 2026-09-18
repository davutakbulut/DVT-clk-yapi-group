import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, FormSection } from '@/modules/admin-shell';
import { InvoiceForm, PaymentForm, ScheduleForm } from '@/modules/finance';
import { deleteInvoice, deletePayment } from '@/modules/finance/actions';
import { getSaleFinance } from '@/modules/finance/server';

/** Satış finansı (05-SALES-FINANCE): faturalar (tevkifat) · ödeme planı · tahsilatlar · özet. Staff okur, admin yazar (0007). */
export default async function SaleFinancePage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, format, gate, { id }] = await Promise.all([getTranslations('Admin'), getFormatter(), requireRole(['super_admin', 'admin', 'sales', 'viewer']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const isAdmin = gate.data.role === 'super_admin' || gate.data.role === 'admin';
  const result = await getSaleFinance(id);
  if (!result.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!result.data) notFound();
  const f = result.data;
  const money = (v: number, cur = f.sale.currency) => format.number(v, { style: 'currency', currency: cur, maximumFractionDigits: 2 });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={`${f.sale.sale_no} · ${t('finance.title')}`} lead={`${f.sale.customerName} · ${t('sales.grandTotal')}: ${money(f.sale.grand_total)}`} action={{ href: `/admin/sales/${f.sale.id}`, label: t('form.back') }} />
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        {[
          [t('finance.collectableTotal'), money(f.totals.collectable)],
          [t('finance.paidTotal'), money(f.totals.paidTry, 'TRY')],
          [t('finance.remaining'), money(f.totals.remainingTry, 'TRY')],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-lg font-semibold tabular-nums" data-testid={k === t('finance.remaining') ? 'remaining' : undefined}>
              {v}
            </dd>
          </div>
        ))}
      </dl>

      <FormSection title={t('finance.invoices')}>
        {f.invoices.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : null}
        {f.invoices.map((i) => (
          <details key={i.id} className="rounded-md border">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span className="font-mono">{i.invoice_no ?? '—'}</span>
              <span>{t(`finance.types.${i.type as 'e_invoice'}`)}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{t(`finance.statuses.${i.status as 'issued'}`)}</span>
              {i.withholding_ratio ? <span className="text-xs text-muted-foreground">{t('finance.withholding')} {Math.round(i.withholding_ratio * 10)}/10</span> : null}
              <span className="ml-auto tabular-nums">{money(i.collectable_amount, i.currency)}</span>
              <span className="text-xs text-muted-foreground">
                {t('finance.paid')}: {money(i.paid, i.currency)}
              </span>
            </summary>
            {isAdmin ? (
              <div className="grid gap-3 border-t p-4">
                <InvoiceForm sale={f.sale} invoice={i} />
                {i.paid === 0 ? (
                  <form action={deleteInvoice}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="saleId" value={f.sale.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                      {t('common.delete')}
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </details>
        ))}
        {isAdmin ? <InvoiceForm sale={f.sale} invoice={null} /> : null}
      </FormSection>

      <FormSection title={t('finance.schedule')}>
        {f.schedules.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1">#</th>
                <th className="py-1">{t('finance.description')}</th>
                <th className="py-1">%</th>
                <th className="py-1 text-right">{t('finance.amount')}</th>
                <th className="py-1">{t('finance.dueDate')}</th>
                <th className="py-1">{t('form.status')}</th>
                <th className="py-1 text-right">{t('finance.paid')}</th>
              </tr>
            </thead>
            <tbody>
              {f.schedules.map((s) => {
                const overdue = s.status !== 'paid' && s.status !== 'cancelled' && s.due_date < today;
                return (
                  <tr key={s.id} className={`border-t ${overdue ? 'text-red-700' : ''}`}>
                    <td className="py-1">{s.seq}</td>
                    <td className="py-1">{s.description}</td>
                    <td className="py-1">{s.ratio_pct ?? '—'}</td>
                    <td className="py-1 text-right tabular-nums">{money(s.amount, 'TRY')}</td>
                    <td className="py-1">
                      {s.due_date}
                      {overdue ? ` ⚠ ${t('finance.overdue')}` : ''}
                    </td>
                    <td className="py-1">{t(`finance.scheduleStatuses.${s.status as 'pending'}`)}</td>
                    <td className="py-1 text-right tabular-nums">{money(s.paid, 'TRY')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
        )}
        {isAdmin ? <ScheduleForm saleId={f.sale.id} collectable={f.totals.collectable || f.sale.grand_total} schedules={f.schedules} /> : null}
      </FormSection>

      <FormSection title={t('finance.payments')}>
        {f.payments.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : null}
        <ul className="grid gap-1 text-sm">
          {f.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 border-t py-1">
              <span>{p.paid_on}</span>
              <span className="tabular-nums">{money(p.amount, p.currency)}</span>
              {p.currency !== 'TRY' ? <span className="text-xs text-muted-foreground">= {money(p.amount_try, 'TRY')}</span> : null}
              <span className="text-xs text-muted-foreground">{t(`finance.methods.${p.method as 'cash'}`)}</span>
              {p.reference ? <span className="font-mono text-xs">{p.reference}</span> : null}
              {isAdmin ? (
                <form action={deletePayment} className="ml-auto">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="saleId" value={f.sale.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                    {t('common.delete')}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {isAdmin ? <PaymentForm saleId={f.sale.id} currency={f.sale.currency} exchangeRate={f.sale.exchange_rate} invoices={f.invoices.filter((i) => i.status !== 'cancelled')} schedules={f.schedules.filter((s) => s.status !== 'cancelled')} /> : null}
      </FormSection>
      <p className="text-xs text-muted-foreground">
        <NextLink href="/admin/invoices" className="underline underline-offset-4">
          {t('finance.allInvoices')}
        </NextLink>
      </p>
    </div>
  );
}
