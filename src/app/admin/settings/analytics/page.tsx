import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { AnalyticsSettingsForm } from '@/modules/analytics';
import { getPublicSettings } from '@/modules/site-settings';

export default async function AnalyticsSettingsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const settings = await getPublicSettings();
  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title={t('analyticsSettings.title')} lead={t('analyticsSettings.lead')} />
      <AnalyticsSettingsForm config={settings.analytics} />
    </div>
  );
}
