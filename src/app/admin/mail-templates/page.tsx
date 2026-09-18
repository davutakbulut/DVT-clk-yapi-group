import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { MailTemplateForm } from '@/modules/leads';
import { getMailOverview } from '@/modules/leads/server';

export default async function MailTemplatesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const overview = await getMailOverview();
  if (!overview.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const o = overview.data;
  const stat = (label: string, value: string | number, tone = '') => (
    <div className={`rounded-md border bg-card p-3 ${tone}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );

  return (
    <div className="grid gap-8">
      <AdminPageHeader title={t('mail.title')} lead={t('mail.lead')} />
      <section className="grid gap-3">
        <h2 className="font-semibold">{t('mail.queue')}</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {stat(t('mail.pending'), o.pending)}
          {stat(t('mail.failed'), o.failed, o.failed > 0 ? 'border-destructive' : '')}
          {stat(t('mail.sentToday'), o.sentToday)}
          {stat(t('mail.heartbeat'), o.heartbeat?.last_run_at ? `${o.heartbeat.last_run_at.slice(0, 16).replace('T', ' ')}${o.heartbeat.stale ? ` · ${t('mail.stale')}` : ''}` : t('mail.never'), o.heartbeat?.stale ? 'border-amber-500' : '')}
        </div>
        {o.heartbeat?.last_error ? <p className="text-sm text-destructive">{o.heartbeat.last_error}</p> : null}
        <p className="text-xs text-muted-foreground">{t('mail.cronHint')}</p>
      </section>
      <section className="grid gap-4">
        {o.templates.map((template) => (
          <MailTemplateForm key={template.id} template={template} />
        ))}
      </section>
      <section className="grid gap-2">
        <h2 className="font-semibold">{t('mail.logs')}</h2>
        {o.logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
        ) : (
          <ul className="grid gap-1 text-xs">
            {o.logs.map((l) => (
              <li key={l.id} className={`rounded border px-2 py-1 ${l.status === 'failed' ? 'border-destructive' : ''}`}>
                {l.created_at.slice(0, 16).replace('T', ' ')} · {l.template_key} → {l.to_email} · {l.provider} · {l.status}
                {l.error ? ` · ${l.error}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
