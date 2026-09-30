import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { CampaignList, getSendingOverview, listCampaigns } from '@/modules/mail-campaigns/server';

/** Toplu E-posta (K-108): kampanya listesi + gönderim durumu. Yalnız super_admin/admin (RPC ve RLS de aynı rolü ister). */
export default async function CampaignsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [rows, overview] = await Promise.all([listCampaigns(), getSendingOverview()]);
  if (!rows.ok || !overview.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('campaigns.title')} lead={t('campaigns.lead')} action={{ href: '/admin/campaigns/new', label: t('campaigns.new') }} />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <NextLink href="/admin/campaigns/templates" className="underline underline-offset-4">{t('campaigns.templates.title')}</NextLink>
        <NextLink href="/admin/campaigns/suppressions" className="underline underline-offset-4">{t('campaigns.suppression.title')}</NextLink>
        <NextLink href="/admin/campaigns/settings" className="underline underline-offset-4">{t('campaigns.settings.title')}</NextLink>
        <NextLink href="/admin/mail-templates" className="underline underline-offset-4">{t('campaigns.mailLogs')}</NextLink>
      </p>
      <CampaignList rows={rows.data} overview={overview.data} />
    </div>
  );
}
