import { logger } from '@/core/observability/logger';
import { pickLocale } from '@/lib/localized';
import { getCachedSystemPages } from '../data/staticPageRepository';

export type ErrorPageKey = 'error-404' | 'error-403' | 'error-500' | 'maintenance';

export interface ErrorPageText {
  readonly title: string;
  readonly body: string;
}

/**
 * Admin'den düzenlenen hata metni; o dilde yayında değilse null → çağıran messages'taki nötr metne düşer.
 * K-08: `en` insan onayı olmadan published_locales'e giremez, dolayısıyla İngilizce sitede makine taslağı görünmez.
 */
export async function getErrorPage(key: ErrorPageKey, locale: string): Promise<ErrorPageText | null> {
  const result = await getCachedSystemPages();
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'static-pages', code: result.error.code, page: key });
    return null;
  }
  const row = result.data.find((r) => r.page_key === key);
  if (!row || !row.published_locales.includes(locale)) return null;
  const title = pickLocale(row.title, locale);
  return title ? { title, body: pickLocale(row.body, locale) } : null;
}
