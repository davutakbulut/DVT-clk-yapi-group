import { getFormatter, getTranslations } from 'next-intl/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormSection } from '@/modules/admin-shell';
import type { ReportData } from '../../data/reportsRepository';
import { aging, byCustomer, byMonth, byService, calendar, costBreakdown, funnel, invoiceStatus, periodSummary } from '../../domain/aggregate';

/** Bağımlılıksız çubuk: genişlik = değer / en büyük. */
function Bar({ value, max }: { readonly value: number; readonly max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <span className="block h-2 w-full rounded bg-muted" aria-hidden="true">
      <span className="block h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
    </span>
  );
}

/** 9 rapor (05-SALES-FINANCE) — sunucu bileşenleri; maliyet/kâr sütunları yalnız admin (K-33). */
export async function ReportSections({ data, today }: { readonly data: ReportData; readonly today: string }) {
  const [t, format] = await Promise.all([getTranslations('Admin'), getFormatter()]);
  const money = (v: number) => format.number(v, { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
  const pct = (v: number | null) => (v === null ? '—' : `%${format.number(v, { maximumFractionDigits: 1 })}`);
  const months = byMonth(data.sales);
  const summary = periodSummary(data.sales, data.range.from, data.range.to, data.previousSales);
  const services = byService(data.items, data.sales, t('reports.other'));
  const customers = byCustomer(data.sales);
  const statuses = invoiceStatus(data.invoices);
  const ag = aging(data.schedules, today);
  const cal = calendar(data.schedules, today);
  const fn = funnel(data.leads, data.sales);
  const costs = data.withCost ? costBreakdown(data.expenses, data.items) : [];
  const empty = <p className="text-sm text-muted-foreground">{t('reports.empty')}</p>;
  const maxRev = Math.max(0, ...months.map((m) => m.revenue));
  const csv = (report: string) => `/admin/reports/export?report=${report}&from=${data.range.from}&to=${data.range.to}`;
  const Export = ({ report }: { readonly report: string }) => (
    <a href={csv(report)} download className="text-xs underline underline-offset-4">
      {t('reports.export')}
    </a>
  );

  return (
    <div className="grid gap-6">
      <FormSection title={t('reports.sections.revenue')}>
        <dl className="grid gap-2 text-sm sm:grid-cols-4">
          {[
            [t('reports.period'), money(summary.revenue)],
            [t('reports.count'), String(summary.count)],
            [t('reports.previous'), money(summary.previousRevenue)],
            [t('reports.change'), pct(summary.changePct)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-lg font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {months.length === 0 ? (
          empty
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.month')}</TableHead>
                <TableHead>{t('reports.count')}</TableHead>
                <TableHead className="text-right">{t('reports.revenue')}</TableHead>
                <TableHead className="w-1/3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-mono text-xs">{m.month}</TableCell>
                  <TableCell>{m.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(m.revenue)}</TableCell>
                  <TableCell>
                    <Bar value={m.revenue} max={maxRev} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Export report="revenue" />
      </FormSection>

      <FormSection title={`${t('reports.sections.profitability')}${data.withCost ? ' 🔒' : ''}`}>
        {!data.withCost ? <p className="text-sm text-muted-foreground">🔒</p> : months.length === 0 ? (
          empty
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.month')}</TableHead>
                <TableHead className="text-right">{t('reports.revenue')}</TableHead>
                <TableHead className="text-right">{t('reports.cost')}</TableHead>
                <TableHead className="text-right">{t('reports.profit')}</TableHead>
                <TableHead className="text-right">{t('reports.margin')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-mono text-xs">{m.month}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(m.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.cost === null ? '—' : money(m.cost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.profit === null ? '—' : money(m.profit)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${m.marginPct !== null && m.marginPct < 10 ? 'text-red-700' : m.marginPct !== null && m.marginPct <= 20 ? 'text-amber-700' : 'text-green-700'}`}>{pct(m.marginPct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data.withCost ? <Export report="profitability" /> : null}
      </FormSection>

      {(
        [
          ['byService', services, t('reports.service')],
          ['byCustomer', customers, t('reports.customer')],
        ] as const
      ).map(([key, rows, label]) => (
        <FormSection key={key} title={t(`reports.sections.${key}`)}>
          {rows.length === 0 ? (
            empty
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{label}</TableHead>
                  <TableHead>{t('reports.count')}</TableHead>
                  <TableHead className="text-right">{t('reports.revenue')}</TableHead>
                  {data.withCost ? <TableHead className="text-right">{t('reports.profit')} 🔒</TableHead> : null}
                  <TableHead className="w-1/4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell>{r.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.revenue)}</TableCell>
                    {data.withCost ? <TableCell className="text-right tabular-nums">{r.profit === null ? '—' : money(r.profit)}</TableCell> : null}
                    <TableCell>
                      <Bar value={r.revenue} max={rows[0]?.revenue ?? 0} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Export report={key} />
        </FormSection>
      ))}

      <FormSection title={t('reports.sections.invoiceStatus')}>
        {statuses.length === 0 ? (
          empty
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.status')}</TableHead>
                <TableHead>{t('reports.count')}</TableHead>
                <TableHead className="text-right">{t('reports.collectable')}</TableHead>
                <TableHead className="text-right">{t('reports.paid')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.map((s) => (
                <TableRow key={s.status}>
                  <TableCell>{t(`finance.statuses.${s.status as 'issued'}`)}</TableCell>
                  <TableCell>{s.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(s.collectable)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(s.paid)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Export report="invoiceStatus" />
      </FormSection>

      <FormSection title={`⚠ ${t('reports.sections.aging')}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reports.bucket')}</TableHead>
              <TableHead>{t('reports.schedules')}</TableHead>
              <TableHead className="text-right">{t('reports.amount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ag.map((a) => (
              <TableRow key={a.bucket} className={a.amount > 0 && (a.bucket === '61-90' || a.bucket === '90+') ? 'text-red-700' : ''}>
                <TableCell className="font-mono text-xs">{a.bucket}</TableCell>
                <TableCell>{a.count}</TableCell>
                <TableCell className="text-right tabular-nums">{money(a.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Export report="aging" />
      </FormSection>

      <FormSection title={t('reports.sections.calendar')}>
        {cal.length === 0 ? (
          empty
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.month')}</TableHead>
                <TableHead>{t('reports.schedules')}</TableHead>
                <TableHead className="text-right">{t('reports.amount')}</TableHead>
                <TableHead className="w-1/3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cal.map((c) => (
                <TableRow key={c.month}>
                  <TableCell className="font-mono text-xs">{c.month}</TableCell>
                  <TableCell>{c.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(c.amount)}</TableCell>
                  <TableCell>
                    <Bar value={c.amount} max={Math.max(0, ...cal.map((x) => x.amount))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Export report="calendar" />
      </FormSection>

      <FormSection title={t('reports.sections.funnel')}>
        <dl className="grid gap-2 text-sm sm:grid-cols-4">
          {[
            [t('reports.leads'), String(fn.leads), null],
            [t('reports.quoted'), String(fn.quoted), pct(fn.quotedRate)],
            [t('reports.won'), String(fn.won), pct(fn.wonRate)],
            [t('reports.sales'), String(fn.sales), null],
          ].map(([k, v, r]) => (
            <div key={k} className="rounded-md border p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {v} {r ? <span className="text-xs font-normal text-muted-foreground">({r})</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </FormSection>

      {data.withCost ? (
        <FormSection title={`${t('reports.sections.costs')} 🔒`}>
          {costs.length === 0 ? (
            empty
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.category')}</TableHead>
                  <TableHead className="text-right">{t('reports.amount')}</TableHead>
                  <TableHead className="text-right">{t('reports.share')}</TableHead>
                  <TableHead className="w-1/3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((c) => (
                  <TableRow key={c.category}>
                    <TableCell>{c.category === 'item' ? t('reports.itemCost') : c.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(c.amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(c.sharePct)}</TableCell>
                    <TableCell>
                      <Bar value={c.amount} max={costs[0]?.amount ?? 0} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Export report="costs" />
        </FormSection>
      ) : (
        <FormSection title={t('reports.sections.costs')}>
          <p className="text-sm text-muted-foreground">🔒</p>
        </FormSection>
      )}
    </div>
  );
}
