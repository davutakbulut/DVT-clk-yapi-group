import NextLink from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { markMyNotificationsRead } from '../../actions';
import { listMyNotifications } from '../../data/accountRepository';

const KNOWN = ['lead_replied', 'lead_status'] as const; // bildirim türü 'lead.replied' → mesaj anahtarı (next-intl nokta kabul etmez)
export async function NotificationsList({ userId }: { readonly userId: string }) {
  const [t, format, rows] = await Promise.all([getTranslations('Account.notifications'), getFormatter(), listMyNotifications(userId)]);
  if (!rows.ok) return null;
  if (rows.data.length === 0) return <p className="text-[var(--color-text-muted)]">{t('empty')}</p>;
  const unread = rows.data.filter((n) => !n.read);
  return (
    <div className="grid gap-4">
      {unread.length > 0 ? (
        <form action={markMyNotificationsRead}>
          {unread.map((n) => <input key={n.id} type="hidden" name="id" value={n.id} />)}
          <button type="submit" className="btn btn-ghost">{t('markRead')}</button>
        </form>
      ) : null}
      <ul className="account-list">
        {rows.data.map((n) => {
          const key = n.type.replace(/\./g, '_');
          const type = (KNOWN as readonly string[]).includes(key) ? (key as (typeof KNOWN)[number]) : 'default';
          const ref = typeof n.payload['ref_no'] === 'string' ? (n.payload['ref_no'] as string) : null;
          return (
            <li key={n.id} className="account-row" data-unread={!n.read || undefined}>
              <span className="account-row-main">{t(`types.${type}`)}{ref ? <span className="label-mono ml-2">{ref}</span> : null}</span>
              <span className="account-row-meta">{format.dateTime(new Date(n.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}</span>
              {n.linkPath ? <NextLink href={n.linkPath} className="underline underline-offset-4">{t('open')}</NextLink> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
