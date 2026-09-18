import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { isSiteIndexable } from '@/core/config/site';
import { AdminPageHeader } from '@/modules/admin-shell';
import { listMediaChoices } from '@/modules/corporate/server';
import { getPublicSettings, SeoSettingsForm } from '@/modules/site-settings';

export default async function SeoSettingsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [settings, images] = await Promise.all([getPublicSettings(), listMediaChoices('image')]);
  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title={t('seoSettings.title')} lead={t('seoSettings.lead')} />
      <SeoSettingsForm settings={settings} images={images.ok ? images.data : []} indexable={isSiteIndexable()} />
    </div>
  );
}
