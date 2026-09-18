import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { toggleResolved } from '@/modules/errors/actions';
import { listErrors } from '@/modules/errors/server';

/** 🐞 Hata takip (06-ANALYTICS): parmak izine göre gruplu; görülme, ilk/son, etkilenen, tarayıcı; çözüldü/yeniden aç; modül etiketi. */
export default async function ErrorsPage({ searchParams }: { readonly searchParams: Promise<{ module?: string; source?: string; resolved?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const resolved = sp.resolved === 'resolved' || sp.resolved === 'all' ? sp.resolved : 'open';
  const result = await listErrors({ ...(sp.module ? { module: sp.module.slice(0, 80) } : {}), ...(sp.source ? { source: sp.source } : {}), resolved });
  if (!result.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const { rows, modules } = result.data;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('errorLogs.title')} lead={t('errorLogs.lead')} />
      <p className="text-sm">
        <NextLink href="/admin/errors/links" className="underline underline-offset-4">
          {t('errorLogs.brokenLinks')}
        </NextLink>
        {' · '}
        <NextLink href="/admin/analytics/vitals" className="underline underline-offset-4">
          {t('errorLogs.vitals')}
        </NextLink>
      </p>
      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          {t('errorLogs.module')}
          <select name="module" defaultValue={sp.module ?? ''} className="h-9 rounded-md border bg-background px-2">
            <option value="">{t('leads.all')}</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          {t('errorLogs.source')}
          <select name="source" defaultValue={sp.source ?? ''} className="h-9 rounded-md border bg-background px-2">
            <option value="">{t('leads.all')}</option>
            {['client', 'server', 'edge', 'cron'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          {t('form.status')}
          <select name="resolved" defaultValue={resolved} className="h-9 rounded-md border bg-background px-2">
            <option value="open">{t('errorLogs.open')}</option>
            <option value="resolved">{t('errorLogs.resolved')}</option>
            <option value="all">{t('leads.all')}</option>
          </select>
        </label>
        <button type="submit" className="h-9 rounded-md border px-3">
          {t('audit.filter')}
        </button>
      </form>
      <p className="text-sm text-muted-foreground">{t('errorLogs.count', { count: rows.length })}</p>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{t('errorLogs.none')}</p> : null}
      {rows.map((e) => (
        <details key={e.id} className="rounded-md border">
          <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2 text-sm">
            <span className={`rounded px-1.5 py-0.5 text-xs ${e.level === 'fatal' ? 'bg-red-100 text-red-800' : e.level === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-muted'}`}>{e.level}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{e.module}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.source}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{e.message}</span>
            <span className="text-xs text-muted-foreground">
              ×{e.occurrences} · 👤{e.affected_users} · {e.last_seen_at.slice(0, 16).replace('T', ' ')}
            </span>
            {e.resolved_at ? <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">{t('errorLogs.resolved')}</span> : null}
          </summary>
          <div className="grid gap-3 border-t p-4 text-sm">
            <dl className="grid gap-1 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">{t('errorLogs.firstSeen')}</dt>
                <dd>{e.first_seen_at.slice(0, 19).replace('T', ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('errorLogs.lastSeen')}</dt>
                <dd>{e.last_seen_at.slice(0, 19).replace('T', ' ')}</dd>
              </div>
              {e.path ? (
                <div>
                  <dt className="text-xs text-muted-foreground">{t('errorLogs.path')}</dt>
                  <dd className="font-mono text-xs">{e.path}</dd>
                </div>
              ) : null}
              {e.user_agent ? (
                <div>
                  <dt className="text-xs text-muted-foreground">{t('errorLogs.browser')}</dt>
                  <dd className="break-all font-mono text-xs">{e.user_agent}</dd>
                </div>
              ) : null}
            </dl>
            {e.stack ? <pre className="max-h-64 overflow-auto rounded bg-muted p-2 text-xs">{e.stack}</pre> : null}
            {Object.keys(e.context).length > 0 ? <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(e.context, null, 2)}</pre> : null}
            <form action={toggleResolved}>
              <input type="hidden" name="id" value={e.id} />
              <input type="hidden" name="resolved" value={e.resolved_at ? 'false' : 'true'} />
              <Button type="submit" size="sm" variant="outline">
                {e.resolved_at ? t('errorLogs.reopen') : t('errorLogs.resolve')}
              </Button>
            </form>
          </div>
        </details>
      ))}
    </div>
  );
}
