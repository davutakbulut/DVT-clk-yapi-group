import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { GuideForm } from '@/modules/configurator-pages';
import { getGuideForAdmin, listGuideImageChoices } from '@/modules/configurator-pages/server';

export default async function EditConfiguratorPagePage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [guide, images] = await Promise.all([getGuideForAdmin(id), listGuideImageChoices()]);
  if (!guide.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!guide.data) notFound();
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={guide.data.title['tr'] || t('form.untitled')} action={{ href: '/admin/configurator-pages', label: t('form.back') }} />
      <StatusBadge status={guide.data.status} locales={guide.data.published_locales} />
      <GuideForm guide={guide.data} images={images} />
    </div>
  );
}
