import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { MenuItemRow, MenuKey } from '../domain/types';

const MODULE = 'navigation';

export type MenuRows = Readonly<Record<MenuKey, readonly MenuItemRow[]>>;

/** Tüm aktif menüler tek sorguda: header + footer aynı istekte lazım, iki tur atmaya değmez. */
async function fetchMenus(): Promise<Result<MenuRows>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('menus')
    .select('key, menu_items(id, parent_id, label, link_type, internal_path, external_url, anchor, header_slot, locales, visibility, is_cta, open_in_new_tab, sort_order)')
    .eq('is_active', true)
    .eq('menu_items.is_active', true);
  if (error) return err(appError('external_service', error.message, { module: MODULE }));

  const rows: Record<MenuKey, readonly MenuItemRow[]> = { header: [], footer_primary: [], footer_legal: [], mobile_extra: [], account: [] };
  for (const menu of data) {
    // sort_order tetikleyiciyle atanır (app_private.sortable); tip null'a izin verir, veri vermez.
    if (menu.key in rows) rows[menu.key as MenuKey] = menu.menu_items.map((item) => ({ ...item, sort_order: item.sort_order ?? 0 }));
  }
  return ok(rows);
}

export const getCachedMenus = cached(fetchMenus, ['navigation', 'menus'], { tags: [CACHE_TAGS.menus] });
