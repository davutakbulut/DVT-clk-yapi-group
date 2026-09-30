import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { getSiteUrl } from '@/core/config/site';
import { AdminPageHeader } from '@/modules/admin-shell';
import { CampaignForm, CampaignStatusBadge, RECIPIENT_STATUSES, type RecipientStatus } from '@/modules/mail-campaigns';
import { deleteCampaign, saveCampaignAsTemplate } from '@/modules/mail-campaigns/actions';
import { CampaignReport, getCampaign, getSendingOverview, listAudienceCities, listCampaignTemplates, listRecipients } from '@/modules/mail-campaigns/server';

interface Props {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ status?: string; q?: string }>;
}

/** Kampanya: taslakken düzenleme formu, başlatıldıktan sonra ilerleme raporu (içerik kilitlenir). */
export default async function CampaignPage({ params, searchParams }: Props) {
  const [t, gate, { id }, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin']), params, searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [campaign, overview] = await Promise.all([getCampaign(id), getSendingOverview()]);
  if (!campaign.ok || !overview.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!campaign.data) notFound();
  const c = campaign.data;
  const o = overview.data;
  const header = <AdminPageHeader title={c.name} lead={t('campaigns.detailLead')} action={{ href: '/admin/campaigns', label: t('form.back') }} />;
  if (c.status === 'draft') {
    const [cities, templates] = await Promise.all([listAudienceCities(), listCampaignTemplates(true)]);
    return (
      <div className="grid gap-6">
        {header}
        <p><CampaignStatusBadge status={c.status} /></p>
        <CampaignForm campaign={c} templates={templates.ok ? templates.data : []} cities={cities.ok ? cities.data : []} settings={o.settings} siteName={o.siteName} siteUrl={getSiteUrl().origin} userEmail={gate.data.email} userName={gate.data.fullName} providerConfigured={o.providerConfigured} />
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <form action={saveCampaignAsTemplate}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="name" value={c.name} />
            <Button type="submit" size="sm" variant="outline">{t('campaigns.templates.saveAs')}</Button>
          </form>
          <form action={deleteCampaign}>
            <input type="hidden" name="id" value={c.id} />
            <Button type="submit" size="sm" variant="destructive">{t('campaigns.deleteDraft')}</Button>
          </form>
        </div>
      </div>
    );
  }
  const filter = { ...(RECIPIENT_STATUSES.includes(sp.status as RecipientStatus) ? { status: sp.status as RecipientStatus } : {}), ...(sp.q ? { q: sp.q.slice(0, 80) } : {}) };
  const recipients = await listRecipients(id, filter);
  if (!recipients.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      {header}
      <p><CampaignStatusBadge status={c.status} /></p>
      <CampaignReport campaign={c} recipients={recipients.data} overview={o} filter={filter} />
    </div>
  );
}
