import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { SEARCH_KINDS, type SearchHit } from '../domain/types';

/** search_site RPC (0049): yayındaki içerikte arama; RLS altında anonim. Sonuç 5 dakika önbellekte (içerik etiketleriyle düşer). */
async function fetchSearch(locale: string, q: string, limit: number): Promise<Result<SearchHit[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('search_site', { p_locale: locale, p_q: q, p_limit: limit });
  if (error) return err(appError('external_service', error.message, { module: 'search' }));
  const rows = (data ?? []) as { kind: string; slug: string; title: string; field: string; snippet: string; rank: number | string }[];
  return ok(rows.filter((r) => (SEARCH_KINDS as readonly string[]).includes(r.kind)).map((r) => ({ kind: r.kind as SearchHit['kind'], slug: r.slug, title: r.title, field: r.field as SearchHit['field'], snippet: r.snippet ?? '', rank: Number(r.rank) })));
}

export const getCachedSearch = cached(fetchSearch, ['search', 'site'], { tags: [CACHE_TAGS.products, CACHE_TAGS.blog, CACHE_TAGS.services, CACHE_TAGS.solutions, CACHE_TAGS.projects, CACHE_TAGS.staticPages, CACHE_TAGS.faqs], revalidate: 300 });
