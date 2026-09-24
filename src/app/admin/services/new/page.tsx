import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { ServiceForm } from '@/modules/services';
import { listImageChoices, listProjectCategoryChoices } from '@/modules/services/server';

export default async function NewServicePage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [images, projectCategories] = await Promise.all([listImageChoices(), listProjectCategoryChoices()]);
  if (!images.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('services.new')} action={{ href: '/admin/services', label: t('form.back') }} />
      <ServiceForm service={null} images={images.data} projectCategories={projectCategories} />
    </div>
  );
}
