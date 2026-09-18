import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { FunnelForm, FunnelResultTable } from '@/modules/analytics';
import { deleteFunnel } from '@/modules/analytics/actions';
import { evaluateFunnel, listFunnels } from '@/modules/analytics/server';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 📉 Dönüşüm hunisi: admin tanımlar, sıralı değerlendirilir (0036), her adımda düşüş. */
export default async function FunnelsPage({ searchParams }: { readonly searchParams: Promise<{ from?: string; to?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor', 'sales', 'viewer']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const isAdmin = gate.data.role === 'super_admin' || gate.data.role === 'admin';
  const today = new Date().toISOString().slice(0, 10);
  const from = sp.from && DATE.test(sp.from) ? sp.from : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const to = sp.to && DATE.test(sp.to) ? sp.to : today;
  const funnels = await listFunnels();
  if (!funnels.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const results = await Promise.all(funnels.data.map((f) => evaluateFunnel(f.id, from, to)));
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('insights.funnels')} lead={t('insights.funnelsLead')} />
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
          {t('insights.evaluate')}
        </button>
      </form>
      {isAdmin ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium">{t('insights.newFunnel')}</h2>
          <FunnelForm funnel={null} />
        </section>
      ) : null}
      {funnels.data.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : null}
      {funnels.data.map((f, i) => {
        const r = results[i];
        return (
          <details key={f.id} className="rounded-md border" open={i === 0}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span className="font-medium">{f.name}</span>
              {!f.is_active ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{t('common.inactive')}</span> : null}
              <span className="text-xs text-muted-foreground">
                {f.steps.length} {t('insights.steps').toLocaleLowerCase('tr')} · {t('insights.entered')}: {r?.ok ? r.data.entered : '—'}
              </span>
            </summary>
            <div className="grid gap-4 border-t p-4">
              {r?.ok && r.data.steps.length > 0 ? <FunnelResultTable result={r.data} /> : <p className="text-sm text-muted-foreground">{t('common.empty')}</p>}
              {isAdmin ? (
                <>
                  <FunnelForm funnel={f} />
                  <form action={deleteFunnel}>
                    <input type="hidden" name="id" value={f.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                      {t('common.delete')}
                    </Button>
                  </form>
                </>
              ) : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}
