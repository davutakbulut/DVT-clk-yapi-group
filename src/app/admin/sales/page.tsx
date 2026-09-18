import NextLink from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminPageHeader } from '@/modules/admin-shell';
import { marginBand } from '@/modules/sales';
import { listSales } from '@/modules/sales/server';

const STATUSES = ['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;

/** Satışlar: durum süzgeci; marj sütunu yalnız admin (K-33). */
export default async function SalesPage({ searchParams }: { readonly searchParams: Promise<{ status?: string }> }) {
  const [t, format, gate, sp] = await Promise.all([getTranslations('Admin'), getFormatter(), requireRole(['super_admin', 'admin', 'sales', 'viewer']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const isAdmin = gate.data.role === 'super_admin' || gate.data.role === 'admin';
  const canWrite = isAdmin || gate.data.role === 'sales';
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status : undefined;
  const rows = await listSales(isAdmin, status ? { status } : {});
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const money = (v: number, cur: string) => format.number(v, { style: 'currency', currency: cur, maximumFractionDigits: 0 });
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('sales.title')} lead={t('sales.lead')} action={canWrite ? { href: '/admin/sales/new', label: t('sales.new') } : undefined} />
      <nav aria-label={t('form.status')} className="flex flex-wrap gap-2 text-sm">
        <NextLink href="/admin/sales" aria-current={!status ? 'page' : undefined} className={`rounded-md border px-3 py-1 ${!status ? 'bg-muted font-medium' : ''}`}>
          {t('leads.all')}
        </NextLink>
        {STATUSES.map((s) => (
          <NextLink key={s} href={`/admin/sales?status=${s}`} aria-current={s === status ? 'page' : undefined} className={`rounded-md border px-3 py-1 ${s === status ? 'bg-muted font-medium' : ''}`}>
            {t(`sales.statuses.${s}`)}
          </NextLink>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">{t('sales.count', { count: rows.data.length })}</p>
      {rows.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('sales.no')}</TableHead>
              <TableHead>{t('sales.customer')}</TableHead>
              <TableHead>{t('sales.date')}</TableHead>
              <TableHead>{t('form.status')}</TableHead>
              <TableHead className="text-right">{t('sales.grandTotal')}</TableHead>
              {isAdmin ? <TableHead className="text-right">{t('sales.margin')} 🔒</TableHead> : null}
              <TableHead>{t('leads.assigned')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((s) => {
              const band = marginBand(s.margin_pct);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">
                    <NextLink href={`/admin/sales/${s.id}`} className="underline underline-offset-4">
                      {s.sale_no}
                    </NextLink>
                  </TableCell>
                  <TableCell>{s.customerName}</TableCell>
                  <TableCell className="text-xs">{s.sale_date}</TableCell>
                  <TableCell className="text-xs">{t(`sales.statuses.${s.status as 'draft'}`)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(s.grand_total, s.currency)}
                    {s.currency !== 'TRY' ? <span className="block text-xs text-muted-foreground">{money(s.grand_total_try, 'TRY')}</span> : null}
                  </TableCell>
                  {isAdmin ? <TableCell className={`text-right tabular-nums ${band === 'green' ? 'text-green-700' : band === 'yellow' ? 'text-amber-700' : band === 'red' ? 'text-red-700' : ''}`}>{s.margin_pct === null ? '—' : `%${format.number(s.margin_pct, { maximumFractionDigits: 1 })}`}</TableCell> : null}
                  <TableCell className="text-xs">{s.assigneeName ?? t('leads.unassigned')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
