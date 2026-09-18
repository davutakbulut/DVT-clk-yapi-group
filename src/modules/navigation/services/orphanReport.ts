import { routing } from '@/i18n/routing';
import { getCachedMenus } from '../data/menuRepository';

/**
 * Öksüz sayfa denetimi (K-38): dinamik olmayan route'lardan hiçbir menüde (header/footer/legal/mobil) iç bağlantısı olmayanlar.
 * Her zaman başka yoldan bağlı sayfalar (ana sayfa, oturum akışı, sepet/hesap, site haritası) listeden düşer.
 */
const ALWAYS_LINKED: ReadonlySet<string> = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password', '/account', '/quote-basket', '/sitemap', '/get-quote']);

export async function orphanRoutes(): Promise<{ readonly path: string; readonly tr: string }[]> {
  const result = await getCachedMenus();
  const linked = new Set<string>();
  if (result.ok) for (const rows of Object.values(result.data)) for (const row of rows) if (row.internal_path) linked.add(row.internal_path);
  return Object.entries(routing.pathnames)
    .filter(([path]) => !path.includes('[') && !linked.has(path) && !ALWAYS_LINKED.has(path))
    .map(([path, map]) => ({ path, tr: typeof map === 'string' ? map : (map as { tr: string }).tr }));
}
