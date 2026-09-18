import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { JobPostingForm } from '@/modules/corporate';

export default async function NewPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;

  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('corporate.careers.new')} action={{ href: '/admin/careers', label: t('form.back') }} />
      <JobPostingForm job={null}  />
    </div>
  );
}
