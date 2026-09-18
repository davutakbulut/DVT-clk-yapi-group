import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { SaleForm } from '@/modules/sales';
import { latestRates, listSaleChoices } from '@/modules/sales/server';

export default async function NewSalePage({ searchParams }: { readonly searchParams: Promise<{ customer?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'sales']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [choices, rates] = await Promise.all([listSaleChoices(), latestRates()]);
  if (!choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const isAdmin = gate.data.role !== 'sales';
  return (
    <div className="grid max-w-5xl gap-6">
      <AdminPageHeader title={t('sales.new')} action={{ href: '/admin/sales', label: t('form.back') }} />
      <SaleForm sale={null} customers={choices.data.customers} staff={choices.data.staff} projects={choices.data.projects} rates={rates.ok ? rates.data : []} isAdmin={isAdmin} canEdit defaultCustomerId={sp.customer && /^[0-9a-f-]{36}$/.test(sp.customer) ? sp.customer : undefined} />
    </div>
  );
}
