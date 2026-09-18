import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { CustomerForm } from '@/modules/customers';
import { listMemberChoices } from '@/modules/customers/server';

export default async function NewCustomerPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'sales'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const members = await listMemberChoices();
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('customers.new')} action={{ href: '/admin/customers', label: t('form.back') }} />
      <CustomerForm customer={null} members={members.ok ? members.data : []} canEdit />
    </div>
  );
}
