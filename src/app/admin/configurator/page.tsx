import NextLink from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminPageHeader } from '@/modules/admin-shell';
import { listConfigurationsForAdmin } from '@/modules/configurator/server';

const STATUSES = ['saved', 'converted_to_lead', 'converted_to_sale', 'archived'] as const;

/** Konfigüratör gönderimleri (staff read RLS): sahip, sürüm, tonaj, fiyat, durum, talep/satış bağlantıları. */
export default async function ConfigurationsPage({ searchParams }: { readonly searchParams: Promise<{ status?: string }> }) {
  const [t, format, gate, sp] = await Promise.all([getTranslations('Admin'), getFormatter(), requireRole(['super_admin', 'admin', 'sales', 'viewer', 'editor']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status : undefined;
  const rows = await listConfigurationsForAdmin(status ? { status } : {});
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('configurations.title')} lead={t('configurations.lead')} action={{ href: '/admin/configurator/rules', label: t('configuratorRules.title') }} />
      <nav aria-label={t('form.status')} className="flex flex-wrap gap-2 text-sm">
        <NextLink href="/admin/configurator" aria-current={!status ? 'page' : undefined} className={`rounded-md border px-3 py-1 ${!status ? 'bg-muted font-medium' : ''}`}>
          {t('leads.all')}
        </NextLink>
        {STATUSES.map((s) => (
          <NextLink key={s} href={`/admin/configurator?status=${s}`} aria-current={s === status ? 'page' : undefined} className={`rounded-md border px-3 py-1 ${s === status ? 'bg-muted font-medium' : ''}`}>
            {t(`configurations.statuses.${s}`)}
          </NextLink>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">{t('configurations.count', { count: rows.data.length })}</p>
      {rows.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('configurations.ref')}</TableHead>
              <TableHead>{t('configurations.name')}</TableHead>
              <TableHead>{t('configurations.owner')}</TableHead>
              <TableHead className="text-right">{t('configurations.version')}</TableHead>
              <TableHead className="text-right">{t('configurations.tonnage')}</TableHead>
              <TableHead className="text-right">{t('configurations.price')}</TableHead>
              <TableHead>{t('form.status')}</TableHead>
              <TableHead>{t('configurations.updated')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">
                  <NextLink href={`/admin/configurator/${c.id}`} className="underline underline-offset-4">
                    {c.ref_code}
                  </NextLink>
                </TableCell>
                <TableCell>{c.name || '—'}</TableCell>
                <TableCell>{c.owner}</TableCell>
                <TableCell className="text-right tabular-nums">v{c.current_version}</TableCell>
                <TableCell className="text-right tabular-nums">{c.tonnage_kg === null ? '—' : `${format.number(c.tonnage_kg / 1000, { maximumFractionDigits: 2 })} t`}</TableCell>
                <TableCell className="text-right tabular-nums">{c.estimated_price === null ? '—' : format.number(c.estimated_price, { style: 'currency', currency: c.currency, maximumFractionDigits: 0 })}</TableCell>
                <TableCell>{t(`configurations.statuses.${c.status as 'saved'}`)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format.dateTime(new Date(c.updated_at), { dateStyle: 'medium' })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
