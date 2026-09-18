import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, ContentTable } from '@/modules/admin-shell';
import { deleteSolution, moveSolution } from '@/modules/solutions/actions';
import { listSolutionsForAdmin } from '@/modules/solutions/server';

export default async function AdminSolutionsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listSolutionsForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('solutions.title')} lead={t('solutions.lead')} action={{ href: '/admin/solutions/new', label: t('solutions.new') }} />
      <p className="text-sm text-muted-foreground">{t('solutions.count', { count: rows.data.length })}</p>
      <ContentTable rows={rows.data.map((r) => ({ id: r.id, title: r.title, slug: r.slug, status: r.status, published_locales: r.published_locales, extra: r.serviceTitle }))} basePath="/admin/solutions" extraLabel={t('solutions.service')} move={moveSolution} remove={deleteSolution} />
    </div>
  );
}
