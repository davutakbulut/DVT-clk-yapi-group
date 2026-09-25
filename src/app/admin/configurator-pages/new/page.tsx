import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { GuideForm } from '@/modules/configurator-pages';
import { listGuideImageChoices } from '@/modules/configurator-pages/server';

export default async function NewConfiguratorPagePage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const images = await listGuideImageChoices();
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('configuratorPages.new')} action={{ href: '/admin/configurator-pages', label: t('form.back') }} />
      <GuideForm guide={null} images={images} />
    </div>
  );
}
