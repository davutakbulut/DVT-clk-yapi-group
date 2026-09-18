import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { JourneyPanels } from '@/modules/analytics';
import { loadJourneys } from '@/modules/analytics/server';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 🧭 Kullanıcı yolculuğu: giriş → geçişler → çıkış oranı (tablo). */
export default async function JourneysPage({ searchParams }: { readonly searchParams: Promise<{ from?: string; to?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor', 'sales', 'viewer']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const today = new Date().toISOString().slice(0, 10);
  const from = sp.from && DATE.test(sp.from) ? sp.from : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const to = sp.to && DATE.test(sp.to) ? sp.to : today;
  const data = await loadJourneys(from, to);
  if (!data.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('insights.journeys')} lead={t('insights.journeysLead')} />
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
      <JourneyPanels data={data.data} />
    </div>
  );
}
