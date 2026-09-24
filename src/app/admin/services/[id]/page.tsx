import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { ServiceForm } from '@/modules/services';
import { getServiceForAdmin, listImageChoices, listProjectCategoryChoices } from '@/modules/services/server';

export default async function EditServicePage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [service, images, projectCategories] = await Promise.all([getServiceForAdmin(id), listImageChoices(), listProjectCategoryChoices()]);
  if (!service.ok || !images.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!service.data) notFound();

  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={service.data.title['tr'] || t('form.untitled')} action={{ href: '/admin/services', label: t('form.back') }} />
      <StatusBadge status={service.data.status} locales={service.data.published_locales} />
      <ServiceForm service={service.data} images={images.data} projectCategories={projectCategories} />
    </div>
  );
}
