import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { UsersTable } from '@/modules/users';
import { listProfiles } from '@/modules/users/server';

export default async function AdminUsersPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const profiles = await listProfiles();
  if (!profiles.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('users.title')}</h1>
        <p className="text-muted-foreground">{t('users.lead')}</p>
      </div>
      <UsersTable profiles={profiles.data} currentUserId={gate.data.id} canManage={gate.data.role === 'super_admin'} />
    </div>
  );
}
