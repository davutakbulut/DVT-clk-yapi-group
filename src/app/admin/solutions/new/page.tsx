import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { SolutionForm } from '@/modules/solutions';
import { listSolutionChoices } from '@/modules/solutions/server';

export default async function NewSolutionPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const choices = await listSolutionChoices();
  if (!choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('solutions.new')} action={{ href: '/admin/solutions', label: t('form.back') }} />
      <SolutionForm solution={null} images={choices.data.images} services={choices.data.services} />
    </div>
  );
}
