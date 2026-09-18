import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, ContentTable } from '@/modules/admin-shell';
import { deletePost } from '@/modules/blog/actions';
import { listPostsForAdmin } from '@/modules/blog/server';

export default async function AdminBlogPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listPostsForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('blog.title')} lead={t('blog.lead')} action={{ href: '/admin/blog/new', label: t('blog.new') }} />
      <p className="text-sm text-muted-foreground">{t('blog.count', { count: rows.data.length })}</p>
      <ContentTable rows={rows.data.map((r) => ({ ...r, extra: [r.categoryName, r.published_at ? r.published_at.slice(0, 10) : null].filter(Boolean).join(' · ') }))} basePath="/admin/blog" extraLabel={t('blog.categoryCol')} remove={deletePost} />
    </div>
  );
}
