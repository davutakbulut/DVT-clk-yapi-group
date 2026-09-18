import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { RedirectForm } from '@/modules/redirects';
import { deleteRedirect } from '@/modules/redirects/actions';
import { listRedirectsForAdmin, listSlugHistory } from '@/modules/redirects/server';

/** Yönlendirmeler: elle kayıtlar (CRUD, isabet) + slug_history (otomatik 308, K-15) salt-okunur. */
export default async function RedirectsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [rows, history] = await Promise.all([listRedirectsForAdmin(), listSlugHistory()]);
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('redirects.title')} lead={t('redirects.lead')} />
      <section className="grid gap-2">
        <h2 className="text-sm font-medium">{t('redirects.new')}</h2>
        <RedirectForm redirect={null} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-sm font-medium">{t('redirects.count', { count: rows.data.length })}</h2>
        {rows.data.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : null}
        {rows.data.map((r) => (
          <details key={r.id} className="rounded-md border">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <code className="text-xs">{r.source_path}</code>
              <span aria-hidden="true">→</span>
              <code className="text-xs">{r.target_path ?? '410'}</code>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.status_code}</span>
              {!r.is_active ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{t('common.inactive')}</span> : null}
              <span className="ml-auto text-xs text-muted-foreground">
                {t('redirects.hits', { count: r.hit_count })}
                {r.last_hit_at ? ` · ${r.last_hit_at.slice(0, 16).replace('T', ' ')}` : ''}
              </span>
            </summary>
            <div className="grid gap-3 border-t p-4">
              <RedirectForm redirect={r} />
              <form action={deleteRedirect}>
                <input type="hidden" name="id" value={r.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  {t('common.delete')}
                </Button>
              </form>
            </div>
          </details>
        ))}
      </section>
      <section className="grid gap-2">
        <h2 className="text-sm font-medium">{t('redirects.slugHistory')}</h2>
        <p className="text-xs text-muted-foreground">{t('redirects.slugHistoryLead')}</p>
        {history.ok && history.data.length > 0 ? (
          <ul className="grid gap-1 text-xs">
            {history.data.map((h) => (
              <li key={h.id}>
                <code>
                  {h.entity_type} · {h.locale} · {h.old_slug}
                </code>{' '}
                <span className="text-muted-foreground">{h.created_at.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
        )}
      </section>
    </div>
  );
}
