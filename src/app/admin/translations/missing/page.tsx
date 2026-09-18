import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminPageHeader } from '@/modules/admin-shell';
import { listMissingTranslations } from '@/modules/translations/server';

/** Çevirisi eksikler: yayındaki içerikte EN yok ya da onaysız (K-08) — düzenleme sayfasına bağlantı. */
export default async function MissingTranslationsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listMissingTranslations();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('translations.missing')} lead={t('translations.missingLead')} action={{ href: '/admin/translations', label: t('form.back') }} />
      <p className="text-sm text-muted-foreground">{t('translations.missingCount', { count: rows.data.length })}</p>
      {rows.data.length === 0 ? (
        <p className="text-sm">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('translations.table')}</TableHead>
              <TableHead>{t('form.name')}</TableHead>
              <TableHead>{t('translations.reason')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((r) => (
              <TableRow key={`${r.table}-${r.id}`}>
                <TableCell className="font-mono text-xs">{r.table}</TableCell>
                <TableCell>
                  <NextLink href={r.adminPath} className="underline underline-offset-4">
                    {r.title || t('form.untitled')}
                  </NextLink>
                </TableCell>
                <TableCell>{t(`translations.reasons.${r.reason}`)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
