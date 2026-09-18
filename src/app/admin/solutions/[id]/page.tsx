import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { SolutionForm } from '@/modules/solutions';
import { getSolutionForAdmin, listSolutionChoices } from '@/modules/solutions/server';

export default async function EditSolutionPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [solution, choices] = await Promise.all([getSolutionForAdmin(id), listSolutionChoices()]);
  if (!solution.ok || !choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!solution.data) notFound();
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={solution.data.title['tr'] || t('form.untitled')} action={{ href: '/admin/solutions', label: t('form.back') }} />
      <StatusBadge status={solution.data.status} locales={solution.data.published_locales} />
      <SolutionForm solution={solution.data} images={choices.data.images} services={choices.data.services} />
    </div>
  );
}
