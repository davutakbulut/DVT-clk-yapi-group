import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface AdminMenu {
  readonly id: string;
  readonly key: string;
  readonly title: Record<string, string>;
  readonly itemCount: number;
}

export interface AdminMenuItem {
  readonly id: string;
  readonly parent_id: string | null;
  readonly label: Record<string, string>;
  readonly link_type: string;
  readonly internal_path: string | null;
  readonly external_url: string | null;
  readonly anchor: string | null;
  readonly header_slot: string | null;
  readonly locales: string[];
  readonly is_cta: boolean;
  readonly open_in_new_tab: boolean;
  readonly is_active: boolean;
  readonly sort_order: number;
  readonly updated_at: string;
}

const asRecord = (v: unknown): Record<string, string> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, string>) : {});

/** Panel için önbelleksiz okuma (kullanıcının oturumu, RLS staff read). */
export async function listMenusForAdmin(): Promise<Result<AdminMenu[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('menus').select('id, key, title, menu_items(count)').order('key');
  if (error) return err(appError('external_service', error.message, { module: 'navigation' }));
  return ok(data.map((m) => ({ id: m.id, key: m.key, title: asRecord(m.title), itemCount: (m.menu_items as unknown as { count: number }[])[0]?.count ?? 0 })));
}

export async function listMenuItemsForAdmin(menuKey: string): Promise<Result<{ menu: AdminMenu; items: AdminMenuItem[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data: menu, error } = await client.data.from('menus').select('id, key, title').eq('key', menuKey).maybeSingle();
  if (error) return err(appError('external_service', error.message, { module: 'navigation' }));
  if (!menu) return err(appError('not_found', `Menü yok: ${menuKey}`, { module: 'navigation' }));
  const { data: items, error: itemsError } = await client.data
    .from('menu_items')
    .select('id, parent_id, label, link_type, internal_path, external_url, anchor, header_slot, locales, is_cta, open_in_new_tab, is_active, sort_order, updated_at')
    .eq('menu_id', menu.id)
    .order('sort_order');
  if (itemsError) return err(appError('external_service', itemsError.message, { module: 'navigation' }));
  return ok({
    menu: { id: menu.id, key: menu.key, title: asRecord(menu.title), itemCount: items.length },
    items: items.map((i) => ({ ...i, label: asRecord(i.label), sort_order: i.sort_order ?? 0 })),
  });
}
