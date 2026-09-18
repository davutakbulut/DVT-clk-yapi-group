import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { TeamMemberForm } from '@/modules/corporate';
import { listMediaChoices } from '@/modules/corporate/server';

export default async function NewPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const images = await listMediaChoices('image');
  if (!images.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('corporate.team.new')} action={{ href: '/admin/team', label: t('form.back') }} />
      <TeamMemberForm member={null} images={images.data} />
    </div>
  );
}
