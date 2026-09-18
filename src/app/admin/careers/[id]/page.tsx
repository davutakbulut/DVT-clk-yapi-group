import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { JobPostingForm } from '@/modules/corporate';
import { getJobPostingForAdmin } from '@/modules/corporate/server';

export default async function EditPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const item = await getJobPostingForAdmin(id);
  if (!item.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!item.data) notFound();

  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={item.data.title['tr'] || t('form.untitled')} action={{ href: '/admin/careers', label: t('form.back') }} />
      <StatusBadge status={item.data.status} locales={item.data.published_locales} />
      <JobPostingForm job={item.data}  />
    </div>
  );
}
