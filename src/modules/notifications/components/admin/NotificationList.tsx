'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { markReadForm } from '../../actions';
import type { NotificationRow } from '../../data/notificationsRepository';
import { useNotificationText } from './NotificationBell';

/** /admin/notifications: tam liste; okundu formu JS'siz çalışır. */
export function NotificationList({ items }: { readonly items: readonly NotificationRow[] }) {
  const t = useTranslations('Admin');
  const text = useNotificationText();
  const unread = items.filter((i) => !i.isRead);
  return (
    <div className="grid gap-3">
      {unread.length > 0 ? (
        <form action={markReadForm}>
          {unread.map((n) => (
            <input key={n.id} type="hidden" name="id" value={n.id} />
          ))}
          <Button type="submit" size="sm" variant="outline">
            {t('notifications.markAll')} ({unread.length})
          </Button>
        </form>
      ) : null}
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : null}
      <ul className="grid gap-2">
        {items.map((n) => (
          <li key={n.id} className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm ${n.isRead ? '' : 'bg-muted'}`}>
            <span className={n.isRead ? 'text-muted-foreground' : 'font-medium'}>{n.link_path ? <NextLink href={n.link_path}>{text(n)}</NextLink> : text(n)}</span>
            <span className="text-xs text-muted-foreground">{n.created_at.slice(0, 16).replace('T', ' ')}</span>
            {!n.isRead ? (
              <form action={markReadForm} className="ml-auto">
                <input type="hidden" name="id" value={n.id} />
                <Button type="submit" size="sm" variant="ghost">
                  {t('notifications.markRead')}
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
