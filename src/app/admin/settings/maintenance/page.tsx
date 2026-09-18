import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { getPublicSettings, MaintenanceForm } from '@/modules/site-settings';

export default async function MaintenancePage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const settings = await getPublicSettings();
  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title={t('maintenanceSettings.title')} lead={t('maintenanceSettings.lead')} />
      <MaintenanceForm settings={settings} />
    </div>
  );
}
