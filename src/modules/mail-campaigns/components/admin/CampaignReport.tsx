import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSiteUrl } from '@/core/config/site';
import { campaignVariables, unsubscribeUrls } from '@/core/mail/bulkSettings';
import { renderCampaignMail } from '@/core/mail/render';
import { FormSection } from '@/modules/admin-shell';
import { changeCampaignState, duplicateCampaign } from '../../actions';
import type { CampaignDetail, RecipientRow, SendingOverview } from '../../data/adminCampaignsRepository';
import { estimateMinutes, progressPercent, RECIPIENT_STATUSES, type RecipientStatus } from '../../domain/types';
import { AutoRefresh } from './AutoRefresh';

interface Props {
  readonly campaign: CampaignDetail;
  readonly recipients: readonly RecipientRow[];
  readonly overview: SendingOverview;
  readonly filter: { readonly status?: RecipientStatus; readonly q?: string };
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }) : '—');

/** Başlatılmış kampanya (K-108): ilerleme · eylemler · gönderilen içerik · kitle · alıcı tablosu. İçerik artık değiştirilemez. */
export async function CampaignReport({ campaign: c, recipients, overview, filter }: Props) {
  const t = await getTranslations('Admin');
  const s = c.stats;
  const percent = progressPercent(s);
  const siteUrl = getSiteUrl().origin;
  const links = unsubscribeUrls(siteUrl, c.locale, '00000000-0000-4000-8000-000000000000');
  const html = renderCampaignMail({
    subject: c.subject, preheader: c.preheader, body: c.body, ctaLabel: c.cta_label, ctaUrl: c.cta_url,
    variables: campaignVariables({ email: '', full_name: null, company: null }, overview.settings, c.locale),
    siteName: overview.siteName[c.locale], siteUrl, footer: overview.settings.footer[c.locale] || overview.settings.footer.tr,
    unsubscribeLabel: overview.settings.unsubscribe_label[c.locale] || overview.settings.unsubscribe_label.tr || links.page, unsubscribeUrl: links.page,
  }).html;
  const live = c.status === 'sending' || c.status === 'scheduled';
  const stat = (label: string, value: number, tone = '') => (
    <div className={`rounded-md border bg-card p-3 ${tone}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
  const stateButton = (action: 'pause' | 'resume' | 'retry', label: string) => (
    <form action={changeCampaignState}>
      <input type="hidden" name="id" value={c.id} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" size="sm" variant="outline">{label}</Button>
    </form>
  );
  return (
    <div className="grid gap-6">
      {live ? <AutoRefresh /> : null}
      <section className="grid gap-3" aria-label={t('campaigns.progress')}>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stat(t('campaigns.stats.total'), s.total)}
          {stat(t('campaigns.stats.sent'), s.sent)}
          {stat(t('campaigns.stats.pending'), s.pending)}
          {stat(t('campaigns.stats.failed'), s.failed, s.failed > 0 ? 'border-destructive' : '')}
          {stat(t('campaigns.stats.skipped'), s.skipped)}
          {stat(t('campaigns.stats.unsubscribed'), s.unsubscribed)}
        </div>
        <div className="grid gap-1">
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t('campaigns.progress')} className="h-2 overflow-hidden rounded bg-muted">
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            %{percent}
            {c.status === 'sending' && s.pending > 0 ? ` · ${t('campaigns.minutesLeft', { minutes: estimateMinutes(s.pending, overview.settings.hourly_limit, overview.settings.batch_size) })} · ${t('campaigns.autoRefresh')}` : ''}
            {c.status === 'scheduled' ? ` · ${t('campaigns.scheduledFor')} ${when(c.scheduled_at)}` : ''}
            {c.started_at ? ` · ${t('campaigns.startedAt')} ${when(c.started_at)}` : ''}
            {c.finished_at ? ` · ${t('campaigns.finishedAt')} ${when(c.finished_at)}` : ''}
          </p>
          {c.status === 'sending' && !overview.providerConfigured ? <p role="alert" className="text-sm text-destructive">{t('campaigns.providerMissing')}</p> : null}
        </div>
      </section>

      <FormSection title={t('common.actions')}>
        <div className="flex flex-wrap items-start gap-3">
          {c.status === 'sending' || c.status === 'scheduled' ? stateButton('pause', t('campaigns.pause')) : null}
          {c.status === 'paused' ? stateButton('resume', t('campaigns.resume')) : null}
          {s.failed > 0 && ['sent', 'sending', 'paused'].includes(c.status) ? stateButton('retry', t('campaigns.retry', { count: s.failed })) : null}
          <form action={duplicateCampaign}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="name" value={t('campaigns.copyName', { name: c.name }).slice(0, 120)} />
            <Button type="submit" size="sm" variant="outline">{t('campaigns.duplicate')}</Button>
          </form>
          <a href={`/admin/campaigns/${c.id}/export`} download className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted">{t('campaigns.exportCsv')}</a>
        </div>
        {['scheduled', 'sending', 'paused'].includes(c.status) ? (
          <form action={changeCampaignState} className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="action" value="cancel" />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="confirm" required /> {t('campaigns.cancelConfirm', { count: s.pending })}
            </label>
            <Button type="submit" size="sm" variant="destructive">{t('campaigns.cancel')}</Button>
          </form>
        ) : null}
      </FormSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <div>
        <FormSection title={t('campaigns.recipients')}>
          <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
            <label className="grid gap-1">
              {t('form.status')}
              <select name="status" defaultValue={filter.status ?? ''} className="h-9 rounded-md border bg-background px-2">
                <option value="">{t('leads.all')}</option>
                {RECIPIENT_STATUSES.filter((r) => r !== 'sending').map((r) => <option key={r} value={r}>{t(`campaigns.recipientStatuses.${r}`)}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              {t('campaigns.searchRecipients')}
              <input name="q" defaultValue={filter.q ?? ''} className="h-9 w-56 rounded-md border bg-background px-2" />
            </label>
            <button type="submit" className="h-9 rounded-md border px-3">{t('audit.filter')}</button>
          </form>
          <p className="text-xs text-muted-foreground">{t('campaigns.recipientsShown', { shown: recipients.length, total: s.total })}</p>
          {recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.email')}</TableHead>
                  <TableHead>{t('form.name')}</TableHead>
                  <TableHead>{t('customers.source')}</TableHead>
                  <TableHead>{t('form.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.email}</TableCell>
                    <TableCell className="text-xs">{[r.full_name, r.company].filter(Boolean).join(' · ') || '—'}</TableCell>
                    <TableCell className="text-xs">{t(`campaigns.source.${r.source as 'customer'}`)}</TableCell>
                    <TableCell className="text-xs">
                      <span className={r.status === 'failed' ? 'text-destructive' : ''}>{t(`campaigns.recipientStatuses.${r.status}`)}</span>
                      {r.sent_at ? ` · ${when(r.sent_at)}` : ''}
                      {r.unsubscribed_at ? <span className="block text-muted-foreground">{t('campaigns.stats.unsubscribed')}</span> : null}
                      {r.error ? <span className="block text-muted-foreground">{r.error === 'suppressed' || r.error === 'cancelled' || r.error === 'reserved-address' ? t(`campaigns.skipReasons.${r.error === 'reserved-address' ? 'reserved' : r.error}`) : r.error}</span> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </FormSection>
        </div>

        <aside className="grid content-start gap-4">
          <FormSection title={t('campaigns.audienceSummary')}>
            <ul className="grid gap-1 text-sm">
              {c.audience.segments.map((seg) => <li key={seg}>{t(`campaigns.segment.${seg}.title`)}</li>)}
              {c.audience.city ? <li>{t('campaigns.city')}: {c.audience.city}</li> : null}
              {c.audience.manual_attested && c.audience.manual.length > 0 ? <li>{t('campaigns.manualCount', { count: c.audience.manual.length })}</li> : null}
            </ul>
          </FormSection>
          <div className="grid gap-2">
            <h2 className="text-base font-semibold">{t('campaigns.sentContent')}</h2>
            <div className="rounded-md border bg-card p-3 text-sm">
              <p className="font-medium">{c.subject}</p>
              <p className="text-xs text-muted-foreground">{c.preheader}</p>
            </div>
            <iframe title={t('campaigns.preview')} srcDoc={html} sandbox="" className="h-[32rem] w-full rounded-md border bg-white" />
          </div>
        </aside>
      </div>
    </div>
  );
}
