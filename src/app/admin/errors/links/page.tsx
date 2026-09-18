import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminPageHeader } from '@/modules/admin-shell';
import { listBrokenLinks } from '@/modules/errors/server';

/** 🔗 Kırık linkler: en çok 404 alan yollar + referrer (SEO aksiyon listesi; yönlendirme /admin/redirects'ten). */
export default async function BrokenLinksPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listBrokenLinks();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('errorLogs.brokenLinks')} lead={t('errorLogs.brokenLinksLead')} action={{ href: '/admin/redirects', label: t('redirects.title') }} />
      {rows.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('errorLogs.path')}</TableHead>
              <TableHead className="text-right">{t('errorLogs.hits')}</TableHead>
              <TableHead>{t('errorLogs.lastSeen')}</TableHead>
              <TableHead>{t('errorLogs.referrers')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((r) => (
              <TableRow key={r.path}>
                <TableCell className="break-all font-mono text-xs">{r.path}</TableCell>
                <TableCell className="text-right tabular-nums">{r.hits}</TableCell>
                <TableCell className="text-xs">{r.lastSeen.slice(0, 16).replace('T', ' ')}</TableCell>
                <TableCell className="break-all font-mono text-xs">{r.referrers.join(', ') || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
