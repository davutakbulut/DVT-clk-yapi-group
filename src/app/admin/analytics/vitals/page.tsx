import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminPageHeader } from '@/modules/admin-shell';
import { listVitals } from '@/modules/errors/server';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** ⚡ Yavaş sayfalar: gerçek kullanıcı Core Web Vitals (p75), kötü oranı yüksek olan önce. */
export default async function VitalsPage({ searchParams }: { readonly searchParams: Promise<{ from?: string; to?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor', 'sales', 'viewer']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const today = new Date().toISOString().slice(0, 10);
  const from = sp.from && DATE.test(sp.from) ? sp.from : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const to = sp.to && DATE.test(sp.to) ? sp.to : today;
  const rows = await listVitals(from, to);
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const fmt = (metric: string, v: number) => (metric === 'CLS' ? v.toFixed(3) : `${Math.round(v)} ms`);
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('errorLogs.vitals')} lead={t('errorLogs.vitalsLead')} />
      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          {t('insights.from')}
          <input type="date" name="from" defaultValue={from} className="h-9 rounded-md border bg-background px-2" />
        </label>
        <label className="grid gap-1">
          {t('insights.to')}
          <input type="date" name="to" defaultValue={to} className="h-9 rounded-md border bg-background px-2" />
        </label>
        <button type="submit" className="h-9 rounded-md border px-3">
          {t('insights.apply')}
        </button>
      </form>
      {rows.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('errorLogs.path')}</TableHead>
              <TableHead>{t('errorLogs.metric')}</TableHead>
              <TableHead className="text-right">p75</TableHead>
              <TableHead className="text-right">{t('errorLogs.samples')}</TableHead>
              <TableHead>{t('errorLogs.rating')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((r) => {
              const total = Math.max(1, r.samples);
              return (
                <TableRow key={`${r.path}-${r.metric}`}>
                  <TableCell className="break-all font-mono text-xs">{r.path}</TableCell>
                  <TableCell className="font-mono text-xs">{r.metric}</TableCell>
                  <TableCell className={`text-right tabular-nums ${r.poor / total > 0.25 ? 'text-red-700' : r.needsImprovement / total > 0.25 ? 'text-amber-700' : 'text-green-700'}`}>{fmt(r.metric, r.p75)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.samples}</TableCell>
                  <TableCell>
                    <span className="flex h-2 w-40 overflow-hidden rounded bg-muted" aria-label={`${r.good}/${r.needsImprovement}/${r.poor}`}>
                      <span className="bg-green-500" style={{ width: `${(r.good / total) * 100}%` }} />
                      <span className="bg-amber-400" style={{ width: `${(r.needsImprovement / total) * 100}%` }} />
                      <span className="bg-red-500" style={{ width: `${(r.poor / total) * 100}%` }} />
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
