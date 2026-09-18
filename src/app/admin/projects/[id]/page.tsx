import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { ProjectForm } from '@/modules/projects';
import { getProjectForAdmin, listProjectChoices } from '@/modules/projects/server';

export default async function EditProjectPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [project, choices] = await Promise.all([getProjectForAdmin(id), listProjectChoices()]);
  if (!project.ok || !choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!project.data) notFound();

  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={project.data.title['tr'] || t('form.untitled')} action={{ href: '/admin/projects', label: t('form.back') }} />
      <StatusBadge status={project.data.status} locales={project.data.published_locales} />
      <ProjectForm project={project.data} images={choices.data.images} categories={choices.data.categories} services={choices.data.services} />
    </div>
  );
}
