import { getTranslations } from 'next-intl/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormSection } from '@/modules/admin-shell';
import type { AnalyticsOverview as Overview, OverviewRow } from '../../data/analyticsRepository';

function Bar({ value, max }: { readonly value: number; readonly max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <span className="block h-2 w-full rounded bg-muted" aria-hidden="true">
      <span className="block h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
    </span>
  );
}

async function Tally({ title, rows, label, translate }: { readonly title: string; readonly rows: readonly OverviewRow[]; readonly label: string; readonly translate?: (k: string) => string }) {
  const t = await getTranslations('Admin');
  const max = rows[0]?.count ?? 0;
  return (
    <FormSection title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{label}</TableHead>
              <TableHead className="text-right">{t('analytics.count')}</TableHead>
              <TableHead className="w-1/3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="break-all font-mono text-xs">{translate ? translate(r.key) : r.key}</TableCell>
                <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                <TableCell>
                  <Bar value={r.count} max={max} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </FormSection>
  );
}

/** Genel bakış (06-ANALYTICS): günlük seri, sayfalar, kaynak türü + AI kaynaklı trafik, cihaz, dil, çıkış sayfaları. */
export async function AnalyticsOverview({ data }: { readonly data: Overview }) {
  const t = await getTranslations('Admin');
  const maxDay = Math.max(0, ...data.byDay.map((d) => d.pageviews));
  const ai = data.referrers.find((r) => r.key === 'ai')?.count ?? 0;
  return (
    <div className="grid gap-6">
      <dl className="grid gap-2 text-sm sm:grid-cols-4">
        {[
          [t('analytics.sessions'), String(data.sessions)],
          [t('analytics.pageviews'), String(data.pageviews)],
          [t('analytics.avgPageviews'), String(data.avgPageviews)],
          [t('analytics.aiShare'), data.sessions > 0 ? `%${Math.round((ai / data.sessions) * 1000) / 10}` : '—'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-lg font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <FormSection title={t('analytics.daily')}>
        {data.byDay.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('analytics.day')}</TableHead>
                <TableHead className="text-right">{t('analytics.sessions')}</TableHead>
                <TableHead className="text-right">{t('analytics.pageviews')}</TableHead>
                <TableHead className="w-1/3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byDay.map((d) => (
                <TableRow key={d.day}>
                  <TableCell className="font-mono text-xs">{d.day}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.sessions}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.pageviews}</TableCell>
                  <TableCell>
                    <Bar value={d.pageviews} max={maxDay} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FormSection>
      <div className="grid gap-6 lg:grid-cols-2">
        <Tally title={t('analytics.topPages')} rows={data.topPages} label={t('analytics.path')} />
        <Tally title={t('analytics.referrers')} rows={data.referrers} label={t('analytics.kind')} translate={(k) => t(`analytics.kinds.${k as 'direct'}`)} />
        <Tally title={`🤖 ${t('analytics.aiTraffic')}`} rows={data.aiHosts} label={t('analytics.host')} />
        <Tally title={t('analytics.devices')} rows={data.devices} label={t('analytics.device')} />
        <Tally title={t('analytics.exits')} rows={data.exits} label={t('analytics.path')} />
        <Tally title={t('analytics.locales')} rows={data.locales} label={t('analytics.locale')} />
      </div>
    </div>
  );
}
