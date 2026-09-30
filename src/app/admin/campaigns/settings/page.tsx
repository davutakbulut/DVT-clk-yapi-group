import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { BulkSettingsForm } from '@/modules/mail-campaigns';
import { getSendingOverview } from '@/modules/mail-campaigns/server';

export default async function CampaignSettingsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const overview = await getSendingOverview();
  if (!overview.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('campaigns.settings.title')} lead={t('campaigns.settings.lead')} action={{ href: '/admin/campaigns', label: t('form.back') }} />
      <BulkSettingsForm settings={overview.data.settings} />
    </div>
  );
}
