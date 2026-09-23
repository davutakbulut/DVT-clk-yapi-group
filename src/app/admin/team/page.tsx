import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, ContentTable, thumbSrc } from '@/modules/admin-shell';
import { deleteTeamMember, moveTeamMember } from '@/modules/corporate/actions';
import { listTeamForAdmin } from '@/modules/corporate/server';

export default async function Page() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listTeamForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('corporate.team.title')} lead={t('corporate.team.lead')} action={{ href: '/admin/team/new', label: t('corporate.team.new') }} />
      <ContentTable rows={rows.data.map((m) => ({ id: m.id, title: { tr: m.full_name }, slug: null, status: m.status, published_locales: m.published_locales, extra: m.position['tr'] ?? '', thumb: thumbSrc(m.thumb) }))} basePath="/admin/team" extraLabel={t('corporate.team.position')} move={moveTeamMember} remove={deleteTeamMember} />
    </div>
  );
}
