import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { HeatmapPanels } from '@/modules/analytics';
import { loadHeatmap, type Device } from '@/modules/analytics/server';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 🔥 Sıcaklık haritası (06-ANALYTICS): sayfa + cihaz AYRI + tarih; tık · scroll · dikkat; öfke/ölü tık listeleri. */
export default async function HeatmapPage({ searchParams }: { readonly searchParams: Promise<{ path?: string; device?: string; from?: string; to?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor', 'sales', 'viewer']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const today = new Date().toISOString().slice(0, 10);
  const from = sp.from && DATE.test(sp.from) ? sp.from : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const to = sp.to && DATE.test(sp.to) ? sp.to : today;
  const device: Device = sp.device === 'mobile' || sp.device === 'tablet' ? sp.device : 'desktop';
  const data = await loadHeatmap({ path: sp.path && sp.path.startsWith('/') ? sp.path.slice(0, 500) : null, device, from, to });
  if (!data.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('insights.heatmap')} lead={t('insights.heatmapLead')} />
      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          {t('insights.path')}
          <select name="path" defaultValue={sp.path ?? data.data.paths[0] ?? ''} className="h-9 max-w-xs rounded-md border bg-background px-2">
            {data.data.paths.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          {t('insights.device')}
          <select name="device" defaultValue={device} className="h-9 rounded-md border bg-background px-2">
            {(["mobile", "tablet", "desktop"] as const).map((d) => (
              <option key={d} value={d}>
                {d === "mobile" ? "📱" : d === "tablet" ? "📲" : "🖥"} {d}
              </option>
            ))}
          </select>
        </label>
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
      <HeatmapPanels data={data.data} />
    </div>
  );
}
