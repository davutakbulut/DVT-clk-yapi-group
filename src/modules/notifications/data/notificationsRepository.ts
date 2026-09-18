import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface NotificationRow {
  readonly id: string;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly link_path: string | null;
  readonly created_at: string;
  readonly isRead: boolean;
}

const fail = (message: string) => err(appError('external_service', message, { module: 'notifications' }));

/** Kullanıcının bildirimleri (RLS: kendi + rolü). Okundu bilgisi read_by dizisinden. */
export async function listNotifications(userId: string, opts: { readonly limit?: number; readonly unreadOnly?: boolean } = {}): Promise<Result<{ items: NotificationRow[]; unread: number }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let q = client.data.from('notifications').select('id, type, payload, link_path, created_at, read_by').order('created_at', { ascending: false }).limit(opts.limit ?? 50);
  if (opts.unreadOnly) q = q.not('read_by', 'cs', `{${userId}}`);
  const [list, unread] = await Promise.all([q, client.data.from('notifications').select('id', { count: 'exact', head: true }).not('read_by', 'cs', `{${userId}}`)]);
  if (list.error) return fail(list.error.message);
  return ok({
    items: list.data.map((n) => ({ id: n.id, type: n.type, payload: (typeof n.payload === 'object' && n.payload !== null ? n.payload : {}) as Record<string, unknown>, link_path: n.link_path, created_at: n.created_at, isRead: (n.read_by ?? []).includes(userId) })),
    unread: unread.count ?? 0,
  });
}
