import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CampaignRow, SendingOverview } from '../../data/adminCampaignsRepository';
import { estimateMinutes, progressPercent } from '../../domain/types';
import { CampaignStatusBadge } from './CampaignStatusBadge';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }) : '—');

/** Kampanya listesi + gönderim durumu özeti (saatlik kullanım, sağlayıcı, engel listesi). */
export async function CampaignList({ rows, overview }: { readonly rows: readonly CampaignRow[]; readonly overview: SendingOverview }) {
  const t = await getTranslations('Admin');
  const left = Math.max(0, overview.settings.hourly_limit - overview.sentLastHour);
  const stat = (label: string, value: string | number, hint?: string, tone = '') => (
    <div className={`rounded-md border bg-card p-3 ${tone}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stat(t('campaigns.overview.hourly'), `${overview.sentLastHour} / ${overview.settings.hourly_limit}`, t('campaigns.overview.hourlyHint', { left }))}
        {stat(t('campaigns.overview.speed'), t('campaigns.overview.speedValue', { count: overview.settings.batch_size }))}
        {stat(t('campaigns.overview.provider'), overview.providerConfigured ? t('campaigns.overview.providerOk') : t('campaigns.overview.providerMissing'), undefined, overview.providerConfigured ? '' : 'border-destructive')}
        {stat(t('campaigns.overview.suppressions'), overview.suppressions)}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('campaigns.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('campaigns.name')}</TableHead>
              <TableHead>{t('form.status')}</TableHead>
              <TableHead className="text-right">{t('campaigns.stats.total')}</TableHead>
              <TableHead className="text-right">{t('campaigns.stats.sent')}</TableHead>
              <TableHead className="text-right">{t('campaigns.stats.failed')}</TableHead>
              <TableHead className="text-right">{t('campaigns.stats.unsubscribed')}</TableHead>
              <TableHead>{t('campaigns.date')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <NextLink href={`/admin/campaigns/${c.id}`} className="underline-offset-4 hover:underline">{c.name}</NextLink>
                  <span className="block max-w-md truncate text-xs text-muted-foreground">{c.subject || '—'}</span>
                </TableCell>
                <TableCell>
                  <CampaignStatusBadge status={c.status} />
                  {c.status === 'sending' || c.status === 'paused' ? (
                    <span className="block text-xs text-muted-foreground">
                      %{progressPercent(c.stats)}
                      {c.status === 'sending' ? ` · ${t('campaigns.minutesLeft', { minutes: estimateMinutes(c.stats.pending, overview.settings.hourly_limit, overview.settings.batch_size) })}` : ''}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">{c.status === 'draft' ? '—' : c.stats.total}</TableCell>
                <TableCell className="text-right tabular-nums">{c.status === 'draft' ? '—' : c.stats.sent}</TableCell>
                <TableCell className={`text-right tabular-nums ${c.stats.failed > 0 ? 'text-destructive' : ''}`}>{c.status === 'draft' ? '—' : c.stats.failed}</TableCell>
                <TableCell className="text-right tabular-nums">{c.status === 'draft' ? '—' : c.stats.unsubscribed}</TableCell>
                <TableCell className="text-xs">
                  {c.status === 'scheduled' ? `${t('campaigns.scheduledFor')} ${when(c.scheduled_at)}` : c.finished_at ? when(c.finished_at) : c.started_at ? when(c.started_at) : when(c.updated_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
