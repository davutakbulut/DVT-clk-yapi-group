import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { SEARCH_KINDS, type SearchHit } from '../domain/types';

/**
 * search_site RPC (0049/0052): yayındaki içerikte arama; RLS altında anonim. K-104: sorgu başına `unstable_cache` YOK —
 * her farklı sorgu diske yeni dosya yazıyor, sınırsız büyüyordu. Yerine süreç içi, 300 girişlik, 5 dakikalık LRU.
 */
const TTL_MS = 5 * 60_000;
const MAX = 300;
const lru = new Map<string, { at: number; value: Result<SearchHit[]> }>();

async function fetchSearch(locale: string, q: string, limit: number): Promise<Result<SearchHit[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('search_site', { p_locale: locale, p_q: q, p_limit: limit });
  if (error) return err(appError('external_service', error.message, { module: 'search' }));
  const rows = (data ?? []) as { kind: string; slug: string; title: string; field: string; snippet: string; rank: number | string }[];
  return ok(rows.filter((r) => (SEARCH_KINDS as readonly string[]).includes(r.kind)).map((r) => ({ kind: r.kind as SearchHit['kind'], slug: r.slug, title: r.title, field: r.field as SearchHit['field'], snippet: r.snippet ?? '', rank: Number(r.rank) })));
}

export async function getCachedSearch(locale: string, q: string, limit: number): Promise<Result<SearchHit[]>> {
  const key = `${locale}:${limit}:${q.toLocaleLowerCase('tr')}`;
  const now = Date.now();
  const hit = lru.get(key);
  if (hit && now - hit.at < TTL_MS) { lru.delete(key); lru.set(key, hit); return hit.value; } // en son kullanılan sona
  const value = await fetchSearch(locale, q, limit);
  if (value.ok) {
    lru.set(key, { at: now, value });
    if (lru.size > MAX) lru.delete(lru.keys().next().value as string);
  }
  return value;
}
