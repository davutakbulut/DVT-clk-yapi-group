import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { NotificationList } from '@/modules/notifications';
import { listNotifications } from '@/modules/notifications/server';

export default async function NotificationsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole()]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const result = await listNotifications(gate.data.id, { limit: 100 });
  if (!result.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('notifications.title')} lead={t('notifications.lead')} />
      <NotificationList items={result.data.items} />
    </div>
  );
}
