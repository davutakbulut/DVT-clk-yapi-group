import { logger } from '@/core/observability/logger';
import { routing } from '@/i18n/routing';
import { hiddenMenuPaths } from '@/modules/site-settings';
import { getCachedMenus } from '../data/menuRepository';
import { buildMenuTree } from '../domain/buildMenuTree';
import type { MenuItemRow, MenuKey, MenuNode } from '../domain/types';

/** Kill switch (K-43): kapalı modülün iç bağlantısı menüde görünmez (sayfası zaten 404). Alt öğeler de süzülür. */
function withoutHidden(nodes: readonly MenuNode[], hidden: ReadonlySet<string>): MenuNode[] {
  return nodes
    .filter((n) => !(n.link.kind === 'internal' && hidden.has(n.link.pathname)))
    .map((n) => (n.children.length > 0 ? { ...n, children: withoutHidden(n.children, hidden) } : n));
}

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
  const [result, hidden] = await Promise.all([getCachedMenus(), hiddenMenuPaths()]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'navigation', code: result.error.code, menu: key });
    return withoutHidden(buildMenuTree(FALLBACK_ROWS[key], { locale, knownPathnames: KNOWN_PATHNAMES }), hidden);
  }
  return withoutHidden(buildMenuTree(result.data[key], { locale, knownPathnames: KNOWN_PATHNAMES }), hidden);
}
