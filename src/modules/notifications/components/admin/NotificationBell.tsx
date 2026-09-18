'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { markNotificationsRead } from '../../actions';

interface Item {
  readonly id: string;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly link_path: string | null;
  readonly created_at: string;
  readonly isRead: boolean;
}

/** Bildirim metni: tip → i18n (payload değişkenleri). Bilinmeyen tip ham anahtarla gösterilir. */
export function useNotificationText() {
  const t = useTranslations('Admin');
  return (n: { type: string; payload: Readonly<Record<string, unknown>> }) => {
    const vars = Object.fromEntries(Object.entries(n.payload).map(([k, v]) => [k, typeof v === 'string' || typeof v === 'number' ? v : JSON.stringify(v)]));
    try {
      return t(`notifications.types.${n.type.replace(/\./g, '_') as 'lead_created'}`, vars);
    } catch {
      return n.type;
    }
  };
}

/**
 * Panel zili (02-ADMIN-PANEL): 60 sn'de bir yoklama (sekme görünürken), Realtime yok (K-52: tarayıcıda Supabase istemcisi yok).
 * Açılır liste: son 8 bildirim, "tümünü okundu" ve tam liste bağlantısı.
 */
export function NotificationBell({ initialUnread }: { readonly initialUnread: number }) {
  const t = useTranslations('Admin');
  const text = useNotificationText();
  const id = useId();
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const body = (await res.json()) as { unread: number; items: Item[] };
      setUnread(body.unread);
      setItems(body.items);
    } catch {
      // ağ yok: eski değer kalır
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAll = async () => {
    const ids = items.filter((i) => !i.isRead).map((i) => i.id);
    if (ids.length === 0) return;
    await markNotificationsRead(ids);
    await load();
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" className="relative inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm" aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-panel`} aria-label={unread > 0 ? t('notifications.bellWithCount', { count: unread }) : t('notifications.bell')} onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true">🔔</span>
        {unread > 0 ? (
          <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div id={`${id}-panel`} role="dialog" aria-label={t('notifications.title')} className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-card p-2 shadow-md">
          <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-muted-foreground">
            <span>{t('notifications.unreadCount', { count: unread })}</span>
            <button type="button" className="underline underline-offset-4" onClick={markAll} disabled={items.every((i) => i.isRead)}>
              {t('notifications.markAll')}
            </button>
          </div>
          <ul className="grid max-h-80 gap-1 overflow-y-auto">
            {items.length === 0 ? <li className="px-2 py-3 text-sm text-muted-foreground">{t('common.empty')}</li> : null}
            {items.map((n) => (
              <li key={n.id} className={`rounded px-2 py-1.5 text-sm ${n.isRead ? 'text-muted-foreground' : 'bg-muted font-medium'}`}>
                {n.link_path ? (
                  <NextLink href={n.link_path} onClick={() => setOpen(false)} className="block">
                    {text(n)}
                  </NextLink>
                ) : (
                  <span>{text(n)}</span>
                )}
                <span className="block text-[11px] text-muted-foreground">{n.created_at.slice(0, 16).replace('T', ' ')}</span>
              </li>
            ))}
          </ul>
          <NextLink href="/admin/notifications" onClick={() => setOpen(false)} className="block px-2 py-2 text-xs underline underline-offset-4">
            {t('notifications.all')}
          </NextLink>
        </div>
      ) : null}
    </div>
  );
}
