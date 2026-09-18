import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { listLeadsForAdmin } from '@/modules/leads/server';

const STATUSES = ['new', 'in_review', 'quoted', 'won', 'lost'] as const;

export default async function AdminLeadsPage({ searchParams }: { readonly searchParams: Promise<{ status?: string }> }) {
  const [t, gate, { status }] = await Promise.all([getTranslations('Admin'), requireRole(), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const filter = STATUSES.find((s) => s === status) ?? null;
  const rows = await listLeadsForAdmin(filter);
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('leads.title')} lead={t('leads.lead')} />
      <nav className="flex flex-wrap gap-2 text-sm" aria-label={t('leads.status')}>
        <NextLink href="/admin/leads" className={`rounded-md border px-3 py-1 ${!filter ? 'bg-muted font-medium' : ''}`}>
          {t('leads.all')}
        </NextLink>
        {STATUSES.map((s) => (
          <NextLink key={s} href={`/admin/leads?status=${s}`} className={`rounded-md border px-3 py-1 ${filter === s ? 'bg-muted font-medium' : ''}`}>
            {t(`leads.statuses.${s}`)}
          </NextLink>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">{t('leads.count', { count: rows.data.length })}</p>
      {rows.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('leads.ref')}</TableHead>
              <TableHead>{t('leads.name')}</TableHead>
              <TableHead>{t('leads.source')}</TableHead>
              <TableHead>{t('leads.service')}</TableHead>
              <TableHead>{t('leads.status')}</TableHead>
              <TableHead>{t('leads.assigned')}</TableHead>
              <TableHead>{t('leads.created')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">
                  <NextLink href={`/admin/leads/${r.id}`} className="underline underline-offset-4">
                    {r.ref_no}
                  </NextLink>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">{[r.company, r.email, r.phone].filter(Boolean).join(' · ')}</p>
                </TableCell>
                <TableCell className="text-sm">{t(`leads.sources.${r.source as (typeof STATUSES)[number] | 'contact_form'}` as never)}</TableCell>
                <TableCell className="text-sm">{r.serviceTitle}</TableCell>
                <TableCell className="text-sm">{t(`leads.statuses.${r.status as (typeof STATUSES)[number]}`)}</TableCell>
                <TableCell className="text-sm">{r.assignedName || t('leads.unassigned')}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.created_at.slice(0, 16).replace('T', ' ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
