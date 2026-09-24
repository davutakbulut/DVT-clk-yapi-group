import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { PagesSettingsForm } from '@/modules/site-settings';
import { loadSettingsForAdmin } from '@/modules/site-settings/server';

/** Hizmetler & Projeler sayfa metinleri (K-106): sıfır statik veri — hero, gruplar, süreç, SSS, CTA panelden. */
export default async function PagesSettingsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const data = await loadSettingsForAdmin();
  if (!data.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('pagesSettings.title')} lead={t('pagesSettings.lead')} />
      <PagesSettingsForm services={data.data.settings.servicesPage} projects={data.data.settings.projectsPage} />
    </div>
  );
}
