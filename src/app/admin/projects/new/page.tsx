import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { ProjectForm } from '@/modules/projects';
import { listProjectChoices } from '@/modules/projects/server';

export default async function NewProjectPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const choices = await listProjectChoices();
  if (!choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('projects.new')} action={{ href: '/admin/projects', label: t('form.back') }} />
      <ProjectForm project={null} images={choices.data.images} categories={choices.data.categories} services={choices.data.services} />
    </div>
  );
}
