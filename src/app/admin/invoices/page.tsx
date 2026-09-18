import NextLink from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminPageHeader, FormSection } from '@/modules/admin-shell';
import { listInvoices, listSchedules } from '@/modules/finance/server';

const STATUSES = ['not_issued', 'issued', 'sent', 'partially_paid', 'paid', 'cancelled'] as const;

/** Faturalar + tahsilat takvimi (02-ADMIN-PANEL): durum süzgeci; vadesi geçen hakedişler kırmızı. */
export default async function InvoicesPage({ searchParams }: { readonly searchParams: Promise<{ status?: string }> }) {
  const [t, format, gate, sp] = await Promise.all([getTranslations('Admin'), getFormatter(), requireRole(['super_admin', 'admin', 'sales', 'viewer']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status : undefined;
  const [invoices, overdue, upcoming] = await Promise.all([listInvoices(status), listSchedules('overdue'), listSchedules('upcoming', 10)]);
  if (!invoices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const money = (v: number, cur: string) => format.number(v, { style: 'currency', currency: cur, maximumFractionDigits: 0 });
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('finance.invoices')} lead={t('finance.invoicesLead')} />
      <nav aria-label={t('form.status')} className="flex flex-wrap gap-2 text-sm">
        <NextLink href="/admin/invoices" aria-current={!status ? 'page' : undefined} className={`rounded-md border px-3 py-1 ${!status ? 'bg-muted font-medium' : ''}`}>
          {t('leads.all')}
        </NextLink>
        {STATUSES.map((s) => (
          <NextLink key={s} href={`/admin/invoices?status=${s}`} aria-current={s === status ? 'page' : undefined} className={`rounded-md border px-3 py-1 ${s === status ? 'bg-muted font-medium' : ''}`}>
            {t(`finance.statuses.${s}`)}
          </NextLink>
        ))}
      </nav>
      {invoices.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('finance.invoiceNo')}</TableHead>
              <TableHead>{t('sales.no')}</TableHead>
              <TableHead>{t('sales.customer')}</TableHead>
              <TableHead>{t('finance.type')}</TableHead>
              <TableHead>{t('form.status')}</TableHead>
              <TableHead>{t('finance.issueDate')}</TableHead>
              <TableHead className="text-right">{t('finance.collectable')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.data.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.invoice_no ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">
                  <NextLink href={`/admin/sales/${i.sale_id}/finance`} className="underline underline-offset-4">
                    {i.saleNo}
                  </NextLink>
                </TableCell>
                <TableCell>{i.customerName}</TableCell>
                <TableCell className="text-xs">{t(`finance.types.${i.type as 'e_invoice'}`)}</TableCell>
                <TableCell className="text-xs">{t(`finance.statuses.${i.status as 'issued'}`)}</TableCell>
                <TableCell className="text-xs">{i.issue_date ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{money(i.collectable_amount, i.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <FormSection title={`⚠ ${t('finance.overdueTitle')}`}>
          {overdue.ok && overdue.data.length > 0 ? (
            <ul className="grid gap-1 text-sm text-red-700">
              {overdue.data.map((s) => (
                <li key={s.id}>
                  <NextLink href={`/admin/sales/${s.sale_id}/finance`} className="underline underline-offset-4">
                    {s.saleNo}
                  </NextLink>{' '}
                  · {s.customerName} · {s.description} · {money(s.amount, 'TRY')} · {s.due_date}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('finance.noOverdue')}</p>
          )}
        </FormSection>
        <FormSection title={t('finance.upcomingTitle')}>
          {upcoming.ok && upcoming.data.length > 0 ? (
            <ul className="grid gap-1 text-sm">
              {upcoming.data.map((s) => (
                <li key={s.id}>
                  <NextLink href={`/admin/sales/${s.sale_id}/finance`} className="underline underline-offset-4">
                    {s.saleNo}
                  </NextLink>{' '}
                  · {s.customerName} · {s.description} · {money(s.amount, 'TRY')} · {s.due_date}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
          )}
        </FormSection>
      </div>
    </div>
  );
}
