import { logger } from '@/core/observability/logger';
import { routing } from '@/i18n/routing';
import { getCachedMenus } from '../data/menuRepository';
import { buildMenuTree } from '../domain/buildMenuTree';
import type { MenuItemRow, MenuKey, MenuNode } from '../domain/types';

const KNOWN_PATHNAMES: ReadonlySet<string> = new Set(Object.keys(routing.pathnames));

// Yedek: veritabanı hata verirse site navigasyonsuz kalmaz (01-PUBLIC-PAGES › Header). Yalnız ana sayfa; metin messages'tan değil,
// menü etiketi olduğu için burada — bilinçli ve asgari.
const FALLBACK_ROWS: Readonly<Record<MenuKey, readonly MenuItemRow[]>> = {
  header: [],
  footer_primary: [],
  footer_legal: [],
  mobile_extra: [],
  account: [],
};

export async function getMenu(key: MenuKey, locale: string): Promise<MenuNode[]> {
  const result = await getCachedMenus();
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'navigation', code: result.error.code, menu: key });
    return buildMenuTree(FALLBACK_ROWS[key], { locale, knownPathnames: KNOWN_PATHNAMES });
  }
  return buildMenuTree(result.data[key], { locale, knownPathnames: KNOWN_PATHNAMES });
}
