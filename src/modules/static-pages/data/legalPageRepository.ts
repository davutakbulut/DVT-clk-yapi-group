import { cache as reactCache } from 'react';
import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { isVisibleIn, type Publishable } from '@/core/content';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';

export type LegalPageKey = 'privacy-policy' | 'cookie-policy' | 'data-protection' | 'terms-of-use';
export const LEGAL_PAGE_KEYS: readonly LegalPageKey[] = ['privacy-policy', 'cookie-policy', 'data-protection', 'terms-of-use'];

export interface LegalPageRow extends Publishable {
  readonly page_key: string;
  readonly title: LocalizedText;
  readonly body: LocalizedText;
  readonly updated_at: string;
}

async function fetchLegalPages(): Promise<Result<readonly LegalPageRow[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('static_pages').select('page_key, title, body, status, published_locales, published_at, updated_at').eq('kind', 'legal');
  if (error) return err(appError('external_service', error.message, { module: 'static-pages' }));
  return ok(data.filter((r) => isLocalizedText(r.title)).map((r) => ({ page_key: r.page_key, title: r.title as LocalizedText, body: isLocalizedText(r.body) ? r.body : {}, status: r.status, published_locales: r.published_locales, published_at: r.published_at, updated_at: r.updated_at })));
}

export const getCachedLegalPages = reactCache(cached(fetchLegalPages, ['static-pages', 'legal'], { tags: [CACHE_TAGS.staticPages] })); // K-104: istek içinde tekil

/** O dilde yayındaysa (K-07/K-08) sayfa; değilse null → 404. */
export async function getLegalPage(key: LegalPageKey, locale: string): Promise<{ title: string; body: string; updatedAt: string } | null> {
  const result = await getCachedLegalPages();
  if (!result.ok) return null;
  const row = result.data.find((r) => r.page_key === key);
  if (!row || !isVisibleIn(row, locale)) return null;
  const title = row.title[locale];
  return title ? { title, body: row.body[locale] ?? '', updatedAt: row.updated_at } : null;
}
