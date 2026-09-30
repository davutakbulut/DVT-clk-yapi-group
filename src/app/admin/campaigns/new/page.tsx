import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { getSiteUrl } from '@/core/config/site';
import { AdminPageHeader } from '@/modules/admin-shell';
import { CampaignForm } from '@/modules/mail-campaigns';
import { getSendingOverview, listAudienceCities } from '@/modules/mail-campaigns/server';

export default async function NewCampaignPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [overview, cities] = await Promise.all([getSendingOverview(), listAudienceCities()]);
  if (!overview.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const o = overview.data;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('campaigns.new')} lead={t('campaigns.newLead')} action={{ href: '/admin/campaigns', label: t('form.back') }} />
      <CampaignForm campaign={null} cities={cities.ok ? cities.data : []} settings={o.settings} siteName={o.siteName} siteUrl={getSiteUrl().origin} userEmail={gate.data.email} userName={gate.data.fullName} providerConfigured={o.providerConfigured} />
    </div>
  );
}
