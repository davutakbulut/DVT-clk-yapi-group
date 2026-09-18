import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { ApplicationStatusForm } from '@/modules/corporate';
import { listApplicationsForAdmin } from '@/modules/corporate/server';

const STATUSES = ['new', 'reviewing', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'] as const;

export default async function ApplicationsPage({ searchParams }: { readonly searchParams: Promise<{ status?: string }> }) {
  const [t, gate, { status }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const filter = STATUSES.find((s) => s === status) ?? null;
  const rows = await listApplicationsForAdmin(filter);
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('corporate.applications.title')} lead={t('corporate.applications.lead')} />
      <nav className="flex flex-wrap gap-2 text-sm" aria-label={t('corporate.applications.status')}>
        <NextLink href="/admin/careers/applications" className={`rounded-md border px-3 py-1 ${!filter ? 'bg-muted font-medium' : ''}`}>
          {t('corporate.applications.all')}
        </NextLink>
        {STATUSES.map((s) => (
          <NextLink key={s} href={`/admin/careers/applications?status=${s}`} className={`rounded-md border px-3 py-1 ${filter === s ? 'bg-muted font-medium' : ''}`}>
            {t(`corporate.applications.statuses.${s}`)}
          </NextLink>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">{t('corporate.applications.count', { count: rows.data.length })}</p>
      {rows.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <ul className="grid gap-4">
          {rows.data.map((a) => (
            <li key={a.id} className="grid gap-3 rounded-md border bg-card p-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">{a.full_name}</span>
                <a href={`mailto:${a.email}`} className="underline underline-offset-4">
                  {a.email}
                </a>
                {a.phone ? <span>{a.phone}</span> : null}
                <span className="text-muted-foreground">{a.postingTitle}</span>
                <span className="text-xs text-muted-foreground">{a.created_at.slice(0, 16).replace('T', ' ')}</span>
                {a.cvUrl ? (
                  <a href={a.cvUrl} rel="noopener noreferrer" target="_blank" className="font-medium underline underline-offset-4">
                    {t('corporate.applications.cv')}
                  </a>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {t('corporate.applications.retention')}: {a.retention_until}
                </span>
              </div>
              {a.cover_letter ? <p className="whitespace-pre-wrap text-sm">{a.cover_letter}</p> : null}
              <ApplicationStatusForm application={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
