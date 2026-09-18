import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, ContentTable } from '@/modules/admin-shell';
import { deleteProject, moveProject } from '@/modules/projects/actions';
import { listProjectsForAdmin } from '@/modules/projects/server';

export default async function AdminProjectsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listProjectsForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('projects.title')} lead={t('projects.lead')} action={{ href: '/admin/projects/new', label: t('projects.new') }} />
      <p className="text-sm text-muted-foreground">{t('projects.count', { count: rows.data.length })}</p>
      <ContentTable rows={rows.data.map((r) => ({ ...r, extra: [r.location['tr'], r.completed_on].filter(Boolean).join(' · ') }))} basePath="/admin/projects" extraLabel={t('projects.location')} move={moveProject} remove={deleteProject} />
    </div>
  );
}
