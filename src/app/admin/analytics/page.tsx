import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { AnalyticsOverview } from '@/modules/analytics';
import { loadOverview } from '@/modules/analytics/server';

/** Analitik genel bakış (06-ANALYTICS). Sıcaklık haritası/huni/form Faz 24, hata/performans Faz 25. */
export default async function AnalyticsPage({ searchParams }: { readonly searchParams: Promise<{ days?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor', 'sales', 'viewer']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const days = sp.days === '7' ? 7 : sp.days === '90' ? 90 : 30;
  const data = await loadOverview(days);
  if (!data.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('analytics.title')} lead={t('analytics.lead')} />
      <nav aria-label={t('analytics.range')} className="flex gap-2 text-sm">
        {[7, 30, 90].map((d) => (
          <a key={d} href={`/admin/analytics?days=${d}`} aria-current={d === days ? 'page' : undefined} className={`rounded-md border px-3 py-1 ${d === days ? 'bg-muted font-medium' : ''}`}>
            {t('analytics.lastDays', { days: d })}
          </a>
        ))}
      </nav>
      <AnalyticsOverview data={data.data} />
    </div>
  );
}
