import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { ReportSections } from '@/modules/reports';
import { loadReportData } from '@/modules/reports/server';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Raporlar (05-SALES-FINANCE › 9 rapor): tarih aralığı GET süzgeci; CSV bölüm başına; maliyet/kâr yalnız admin (K-33). */
export default async function ReportsPage({ searchParams }: { readonly searchParams: Promise<{ from?: string; to?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'sales', 'viewer']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const today = new Date().toISOString().slice(0, 10);
  const from = sp.from && DATE.test(sp.from) ? sp.from : `${today.slice(0, 4)}-01-01`;
  const to = sp.to && DATE.test(sp.to) ? sp.to : today;
  const isAdmin = gate.data.role === 'super_admin' || gate.data.role === 'admin';
  const data = await loadReportData({ from, to }, isAdmin);
  if (!data.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('reports.title')} lead={t('reports.lead')} />
      <form method="get" className="flex flex-wrap items-end gap-2 text-sm print:hidden">
        <label className="grid gap-1">
          {t('reports.from')}
          <input type="date" name="from" defaultValue={from} className="h-9 rounded-md border bg-background px-2" />
        </label>
        <label className="grid gap-1">
          {t('reports.to')}
          <input type="date" name="to" defaultValue={to} className="h-9 rounded-md border bg-background px-2" />
        </label>
        <button type="submit" className="h-9 rounded-md border px-3">
          {t('reports.apply')}
        </button>
      </form>
      <ReportSections data={data.data} today={today} />
    </div>
  );
}
