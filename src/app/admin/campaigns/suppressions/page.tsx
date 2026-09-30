import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { SuppressionForm } from '@/modules/mail-campaigns';
import { removeSuppression } from '@/modules/mail-campaigns/actions';
import { listSuppressions } from '@/modules/mail-campaigns/server';

/** Gönderilmeyecek adresler: listeden çıkanlar (kaldırılamaz), geri dönenler, şikâyetler, elle eklenenler. */
export default async function SuppressionsPage({ searchParams }: { readonly searchParams: Promise<{ q?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listSuppressions(sp.q?.slice(0, 80));
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('campaigns.suppression.title')} lead={t('campaigns.suppression.lead')} action={{ href: '/admin/campaigns', label: t('form.back') }} />
      <SuppressionForm />
      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          {t('campaigns.suppression.search')}
          <input name="q" defaultValue={sp.q ?? ''} className="h-9 w-64 rounded-md border bg-background px-2" />
        </label>
        <button type="submit" className="h-9 rounded-md border px-3">{t('audit.filter')}</button>
      </form>
      <p className="text-sm text-muted-foreground">{t('campaigns.suppression.count', { count: rows.data.length })}</p>
      {rows.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('settings.email')}</TableHead>
              <TableHead>{t('campaigns.suppression.reason')}</TableHead>
              <TableHead>{t('campaigns.suppression.note')}</TableHead>
              <TableHead>{t('campaigns.date')}</TableHead>
              <TableHead>{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.email}</TableCell>
                <TableCell className="text-xs">{t(`campaigns.suppression.reasons.${r.reason}`)}</TableCell>
                <TableCell className="text-xs">{r.note ?? '—'}</TableCell>
                <TableCell className="text-xs">{r.created_at.slice(0, 10)}</TableCell>
                <TableCell>
                  {r.reason === 'unsubscribed' ? (
                    <span className="text-xs text-muted-foreground">{t('campaigns.suppression.locked')}</span>
                  ) : (
                    <form action={removeSuppression}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" size="sm" variant="ghost">{t('campaigns.suppression.remove')}</Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
