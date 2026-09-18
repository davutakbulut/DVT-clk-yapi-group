import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { ServicesTable } from '@/modules/services';
import { listServicesForAdmin } from '@/modules/services/server';

export default async function AdminServicesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listServicesForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('services.title')} lead={t('services.lead')} action={{ href: '/admin/services/new', label: t('services.new') }} />
      <p className="text-sm text-muted-foreground">{t('services.count', { count: rows.data.length })}</p>
      <ServicesTable rows={rows.data} />
    </div>
  );
}
