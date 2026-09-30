import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { getSiteUrl } from '@/core/config/site';
import { AdminPageHeader } from '@/modules/admin-shell';
import { TemplateForm } from '@/modules/mail-campaigns';
import { deleteCampaignTemplate } from '@/modules/mail-campaigns/actions';
import { getCampaignTemplate, getSendingOverview } from '@/modules/mail-campaigns/server';

export default async function CampaignTemplatePage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [template, overview] = await Promise.all([getCampaignTemplate(id), getSendingOverview()]);
  if (!template.ok || !overview.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!template.data) notFound();
  const o = overview.data;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={template.data.name} lead={t('campaigns.templates.editLead')} action={{ href: '/admin/campaigns/templates', label: t('form.back') }} />
      <TemplateForm key={template.data.id} template={template.data} settings={o.settings} siteName={o.siteName} siteUrl={getSiteUrl().origin} userEmail={gate.data.email} userName={gate.data.fullName} />
      <form action={deleteCampaignTemplate} className="border-t pt-4">
        <input type="hidden" name="id" value={template.data.id} />
        <Button type="submit" size="sm" variant="destructive">{t('campaigns.templates.delete')}</Button>
      </form>
    </div>
  );
}
