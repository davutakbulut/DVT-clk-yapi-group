import { getTranslations } from 'next-intl/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormSection } from '@/modules/admin-shell';
import type { FormFieldStat, FunnelResult, HeatmapData, JourneyData } from '../../data/insightsRepository';

/** Tık/dikkat haritası: 100 sütun × N satır hücre ızgarası; yoğunluk opaklıkla (bağımlılıksız, sayfa proxy'si). */
function HeatGrid({ cells, maxY, label }: { readonly cells: readonly { x: number; y: number; hits: number }[]; readonly maxY: number; readonly label: string }) {
  const max = Math.max(1, ...cells.map((c) => c.hits));
  const rows = Math.max(10, Math.min(100, maxY + 1));
  return (
    <div role="img" aria-label={label} className="relative w-full overflow-hidden rounded border bg-white" style={{ aspectRatio: `100 / ${rows}` }}>
      <span className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-muted" />
      {cells.map((c) => (
        <span key={`${c.x}-${c.y}`} className="absolute rounded-full bg-red-600" style={{ left: `${c.x}%`, top: `${(c.y / rows) * 100}%`, width: '1.6%', height: `${(1 / rows) * 100}%`, opacity: 0.25 + (c.hits / max) * 0.75 }} title={`${c.hits}`} />
      ))}
    </div>
  );
}

export async function HeatmapPanels({ data }: { readonly data: HeatmapData }) {
  const t = await getTranslations('Admin');
  const s = data.scroll;
  const pct = (v: number) => (s && s.views > 0 ? `%${Math.round((v / s.views) * 100)}` : '—');
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <FormSection title={t('insights.clicks')}>{data.clicks.length === 0 ? <p className="text-sm text-muted-foreground">{t('insights.noData')}</p> : <HeatGrid cells={data.clicks} maxY={data.maxY} label={t('insights.clicks')} />}</FormSection>
        <FormSection title={t('insights.attention')}>{data.attention.length === 0 ? <p className="text-sm text-muted-foreground">{t('insights.noData')}</p> : <HeatGrid cells={data.attention} maxY={data.maxY} label={t('insights.attention')} />}</FormSection>
      </div>
      <FormSection title={t('insights.scroll')}>
        {!s ? (
          <p className="text-sm text-muted-foreground">{t('insights.noData')}</p>
        ) : (
          <div className="grid gap-2 text-sm">
            <p>
              {t('insights.views')}: <strong>{s.views}</strong> · {t('insights.fold')} ≈ 25%
            </p>
            {[
              ['25%', s.reached25],
              ['50%', s.reached50],
              ['75%', s.reached75],
              ['100%', s.reached100],
            ].map(([k, v]) => (
              <div key={String(k)} className="grid grid-cols-[60px_1fr_60px] items-center gap-2">
                <span className="font-mono text-xs">{k}</span>
                <span className="block h-3 w-full rounded bg-muted">
                  <span className="block h-3 rounded bg-primary" style={{ width: `${s.views > 0 ? Math.round((Number(v) / s.views) * 100) : 0}%` }} />
                </span>
                <span className="text-right tabular-nums">{pct(Number(v))}</span>
              </div>
            ))}
          </div>
        )}
      </FormSection>
      <div className="grid gap-6 lg:grid-cols-2">
        {(
          [
            ['rage', data.rage],
            ['dead', data.dead],
          ] as const
        ).map(([key, rows]) => (
          <FormSection key={key} title={t(`insights.${key}`)}>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('insights.selector')}</TableHead>
                    <TableHead className="text-right">{t('insights.hits')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.selector}>
                      <TableCell className="break-all font-mono text-xs">{r.selector}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.hits}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </FormSection>
        ))}
      </div>
    </div>
  );
}

export async function FunnelResultTable({ result }: { readonly result: FunnelResult }) {
  const t = await getTranslations('Admin');
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('insights.step')}</TableHead>
          <TableHead className="text-right">{t('insights.sessions')}</TableHead>
          <TableHead className="text-right">{t('insights.rate')}</TableHead>
          <TableHead className="text-right">{t('insights.dropoff')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {result.steps.map((s, i) => {
          const prev = i === 0 ? result.entered : result.steps[i - 1]!.sessions;
          const drop = prev > 0 ? Math.round(((prev - s.sessions) / prev) * 1000) / 10 : 0;
          return (
            <TableRow key={s.seq} className={drop >= 50 ? 'text-red-700' : ''}>
              <TableCell>
                {s.seq}. {s.name}
              </TableCell>
              <TableCell className="text-right tabular-nums">{s.sessions}</TableCell>
              <TableCell className="text-right tabular-nums">%{s.rate_pct}</TableCell>
              <TableCell className="text-right tabular-nums">{i === 0 ? '—' : `−%${drop}`}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export async function FormStatsTable({ rows }: { readonly rows: readonly FormFieldStat[] }) {
  const t = await getTranslations('Admin');
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{t('common.empty')}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('insights.form')}</TableHead>
          <TableHead>{t('insights.field')}</TableHead>
          <TableHead>{t('insights.device')}</TableHead>
          <TableHead className="text-right">{t('insights.focus')}</TableHead>
          <TableHead className="text-right">{t('insights.abandon')}</TableHead>
          <TableHead className="text-right">{t('insights.abandonRate')}</TableHead>
          <TableHead className="text-right">{t('insights.avgTime')}</TableHead>
          <TableHead className="text-right">{t('insights.errors')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={`${r.form}-${r.field}-${r.device}`} className={r.abandonPct >= 30 ? 'text-red-700' : ''}>
            <TableCell className="font-mono text-xs">{r.form}</TableCell>
            <TableCell className="font-mono text-xs">{r.field}</TableCell>
            <TableCell className="text-xs">{r.device}</TableCell>
            <TableCell className="text-right tabular-nums">{r.focus}</TableCell>
            <TableCell className="text-right tabular-nums">{r.abandon}</TableCell>
            <TableCell className="text-right tabular-nums">%{r.abandonPct}</TableCell>
            <TableCell className="text-right tabular-nums">{(r.avgMs / 1000).toFixed(1)} sn</TableCell>
            <TableCell className="text-right tabular-nums">{r.errors}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export async function JourneyPanels({ data }: { readonly data: JourneyData }) {
  const t = await getTranslations('Admin');
  const empty = <p className="text-sm text-muted-foreground">{t('common.empty')}</p>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <FormSection title={t('insights.landing')}>
        {data.landing.length === 0 ? empty : (
          <ul className="grid gap-1 text-sm">
            {data.landing.map((l) => (
              <li key={l.path} className="flex justify-between gap-2">
                <span className="break-all font-mono text-xs">{l.path}</span>
                <span className="tabular-nums">{l.count}</span>
              </li>
            ))}
          </ul>
        )}
      </FormSection>
      <FormSection title={t('insights.exitRate')}>
        {data.exits.length === 0 ? empty : (
          <ul className="grid gap-1 text-sm">
            {data.exits.map((e) => (
              <li key={e.path} className={`flex justify-between gap-2 ${e.exitPct >= 60 ? 'text-red-700' : ''}`}>
                <span className="break-all font-mono text-xs">{e.path}</span>
                <span className="tabular-nums">
                  {e.exits}/{e.views} · %{e.exitPct}
                </span>
              </li>
            ))}
          </ul>
        )}
      </FormSection>
      <div className="lg:col-span-2">
        <FormSection title={t('insights.transitions')}>
          {data.transitions.length === 0 ? empty : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('insights.fromPage')}</TableHead>
                  <TableHead>{t('insights.toPage')}</TableHead>
                  <TableHead className="text-right">{t('insights.transitions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transitions.map((tr) => (
                  <TableRow key={`${tr.from}>${tr.to}`}>
                    <TableCell className="break-all font-mono text-xs">{tr.from}</TableCell>
                    <TableCell className="break-all font-mono text-xs">{tr.to}</TableCell>
                    <TableCell className="text-right tabular-nums">{tr.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </FormSection>
      </div>
    </div>
  );
}
