import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminPageHeader } from '@/modules/admin-shell';
import { displayName } from '@/modules/customers';
import { listCustomers, type CustomerFilter } from '@/modules/customers/server';

/** Müşteriler (CRM): arama + tip + aktiflik süzgeci (GET formu, JS'siz), liste. Viewer okur, sales/admin yazar. */
export default async function CustomersPage({ searchParams }: { readonly searchParams: Promise<{ q?: string; type?: string; active?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'sales', 'viewer']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const filter: CustomerFilter = {
    ...(sp.q ? { q: sp.q.slice(0, 80) } : {}),
    ...(sp.type === 'individual' || sp.type === 'corporate' ? { type: sp.type } : {}),
    ...(sp.active === 'active' || sp.active === 'passive' ? { active: sp.active } : {}),
  };
  const rows = await listCustomers(filter);
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const canWrite = ['super_admin', 'admin', 'sales'].includes(gate.data.role);
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('customers.title')} lead={t('customers.lead')} action={canWrite ? { href: '/admin/customers/new', label: t('customers.new') } : undefined} />
      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          {t('customers.search')}
          <input name="q" defaultValue={sp.q ?? ''} className="h-9 w-64 rounded-md border bg-background px-2" />
        </label>
        <label className="grid gap-1">
          {t('customers.type')}
          <select name="type" defaultValue={sp.type ?? ''} className="h-9 rounded-md border bg-background px-2">
            <option value="">{t('leads.all')}</option>
            <option value="corporate">{t('customers.types.corporate')}</option>
            <option value="individual">{t('customers.types.individual')}</option>
          </select>
        </label>
        <label className="grid gap-1">
          {t('form.status')}
          <select name="active" defaultValue={sp.active ?? ''} className="h-9 rounded-md border bg-background px-2">
            <option value="">{t('leads.all')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="passive">{t('common.inactive')}</option>
          </select>
        </label>
        <button type="submit" className="h-9 rounded-md border px-3">
          {t('audit.filter')}
        </button>
      </form>
      <p className="text-sm text-muted-foreground">{t('customers.count', { count: rows.data.length })}</p>
      {rows.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('form.name')}</TableHead>
              <TableHead>{t('customers.type')}</TableHead>
              <TableHead>{t('customers.taxId')}</TableHead>
              <TableHead>{t('customers.city')}</TableHead>
              <TableHead>{t('settings.email')}</TableHead>
              <TableHead>{t('customers.source')}</TableHead>
              <TableHead>{t('form.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <NextLink href={`/admin/customers/${c.id}`} className="underline-offset-4 hover:underline">
                    {displayName(c, t('customers.anonymous'))}
                  </NextLink>
                  {c.type === 'corporate' && c.full_name ? <span className="block text-xs text-muted-foreground">{c.full_name}</span> : null}
                </TableCell>
                <TableCell className="text-xs">{t(`customers.types.${c.type as 'corporate'}`)}</TableCell>
                <TableCell className="font-mono text-xs">{c.tax_id ?? '—'}</TableCell>
                <TableCell className="text-xs">{c.city ?? '—'}</TableCell>
                <TableCell className="text-xs">{c.email ?? '—'}</TableCell>
                <TableCell className="text-xs">{t(`customers.sources.${c.source as 'manual'}`)}</TableCell>
                <TableCell className="text-xs">{c.anonymized_at ? t('customers.anonymized') : c.is_active ? t('common.active') : t('common.inactive')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
