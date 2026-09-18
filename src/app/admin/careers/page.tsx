import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, ContentTable } from '@/modules/admin-shell';
import { deleteJobPosting } from '@/modules/corporate/actions';
import { listJobPostingsForAdmin } from '@/modules/corporate/server';

export default async function Page() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listJobPostingsForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('corporate.careers.title')} lead={t('corporate.careers.lead')} action={{ href: '/admin/careers/new', label: t('corporate.careers.new') }} />
      <ContentTable rows={rows.data.map((j) => ({ id: j.id, title: j.title, slug: j.slug, status: j.status, published_locales: j.published_locales, extra: [j.is_open ? t('corporate.careers.open') : null, j.application_deadline].filter(Boolean).join(' · ') }))} basePath="/admin/careers" extraLabel={t('corporate.careers.status')} remove={deleteJobPosting} />
    </div>
  );
}
