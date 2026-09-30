import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { getSiteUrl } from '@/core/config/site';
import { AdminPageHeader } from '@/modules/admin-shell';
import { TemplateForm } from '@/modules/mail-campaigns';
import { getSendingOverview } from '@/modules/mail-campaigns/server';

export default async function NewCampaignTemplatePage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const overview = await getSendingOverview();
  if (!overview.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const o = overview.data;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('campaigns.templates.new')} lead={t('campaigns.templates.newLead')} action={{ href: '/admin/campaigns/templates', label: t('form.back') }} />
      <TemplateForm template={null} settings={o.settings} siteName={o.siteName} siteUrl={getSiteUrl().origin} userEmail={gate.data.email} userName={gate.data.fullName} />
    </div>
  );
}
