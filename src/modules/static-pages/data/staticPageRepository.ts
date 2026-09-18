import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';

const MODULE = 'static-pages';

export interface StaticPageRow {
  readonly page_key: string;
  readonly kind: string;
  readonly title: LocalizedText;
  readonly body: LocalizedText;
  readonly published_locales: readonly string[];
}

/** Yayındaki hata/sistem sayfaları. RLS yalnız status='published' satırları verir; dil süzgeci çağıranda (K-08). */
async function fetchSystemPages(): Promise<Result<readonly StaticPageRow[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('static_pages').select('page_key, kind, title, body, published_locales').in('kind', ['error', 'system']);
  if (error) return err(appError('external_service', error.message, { module: MODULE }));
  const rows: StaticPageRow[] = [];
  for (const row of data) {
    if (!isLocalizedText(row.title)) continue;
    rows.push({ page_key: row.page_key, kind: row.kind, title: row.title, body: isLocalizedText(row.body) ? row.body : {}, published_locales: row.published_locales ?? [] });
  }
  return ok(rows);
}

export const getCachedSystemPages = cached(fetchSystemPages, ['static-pages', 'system'], { tags: [CACHE_TAGS.staticPages] });
