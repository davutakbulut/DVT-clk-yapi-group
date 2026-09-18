import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { TeamMemberForm } from '@/modules/corporate';
import { getTeamMemberForAdmin, listMediaChoices } from '@/modules/corporate/server';

export default async function EditPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const item = await getTeamMemberForAdmin(id);
  if (!item.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!item.data) notFound();
  const images = await listMediaChoices('image');
  if (!images.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={item.data.full_name} action={{ href: '/admin/team', label: t('form.back') }} />
      <StatusBadge status={item.data.status} locales={item.data.published_locales} />
      <TeamMemberForm member={item.data} images={images.data} />
    </div>
  );
}
