import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, FormSection } from '@/modules/admin-shell';
import { ProjectFromSaleButton, SaleForm } from '@/modules/sales';
import { deleteSale } from '@/modules/sales/actions';
import { getSale, latestRates, listSaleChoices } from '@/modules/sales/server';

export default async function SaleDetailPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'sales', 'viewer']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const isAdmin = gate.data.role === 'super_admin' || gate.data.role === 'admin';
  const canEdit = isAdmin || gate.data.role === 'sales';
  const [sale, choices, rates] = await Promise.all([getSale(id, isAdmin), listSaleChoices(), latestRates()]);
  if (!sale.ok || !choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!sale.data) notFound();
  const s = sale.data;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={`${s.sale_no} · ${s.customerName}`} lead={`${t(`sales.statuses.${s.status as 'draft'}`)} · ${s.sale_date}`} action={{ href: '/admin/sales', label: t('form.back') }} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <SaleForm sale={s} customers={choices.data.customers} staff={choices.data.staff} projects={choices.data.projects} rates={rates.ok ? rates.data : []} isAdmin={isAdmin} canEdit={canEdit} />
        <div className="grid content-start gap-6">
          <FormSection title={t('sales.links')}>
            <ul className="grid gap-1 text-sm">
              <li>
                <NextLink href={`/admin/customers/${s.customer_id}`} className="underline underline-offset-4">
                  {t('customers.openCustomer')}
                </NextLink>
              </li>
              {s.lead_id ? (
                <li>
                  <NextLink href={`/admin/leads/${s.lead_id}`} className="underline underline-offset-4">
                    {t('sales.lead')} {s.leadRef}
                  </NextLink>
                </li>
              ) : null}
              <li>
                <NextLink href={`/admin/sales/${s.id}/finance`} className="underline underline-offset-4">
                  {t('finance.title')} · {t('sales.invoiceCount', { count: s.invoiceCount })}
                </NextLink>
              </li>
            </ul>
            {isAdmin ? <ProjectFromSaleButton saleId={s.id} projectId={s.project_id} status={s.status} /> : null}
          </FormSection>
          {isAdmin && s.invoiceCount === 0 ? (
            <FormSection title={t('customers.danger')}>
              <form action={deleteSale}>
                <input type="hidden" name="id" value={s.id} />
                <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                  {t('common.delete')}
                </Button>
              </form>
            </FormSection>
          ) : null}
        </div>
      </div>
    </div>
  );
}
