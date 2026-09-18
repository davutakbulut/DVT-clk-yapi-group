import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface RedirectRule {
  readonly source: string;
  readonly target: string | null;
  readonly status: 301 | 302 | 307 | 308 | 410;
}

/** Aktif yönlendirmeler (anonim okur, 0001). Middleware /api/redirects üzerinden 60 sn önbellekle çeker (K-61). */
async function fetchActiveRedirects(): Promise<Result<RedirectRule[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('redirects').select('source_path, target_path, status_code').eq('is_active', true).limit(2000);
  if (error) return err(appError('external_service', error.message, { module: 'redirects' }));
  return ok(data.map((r) => ({ source: r.source_path, target: r.target_path, status: r.status_code as RedirectRule['status'] })));
}

export const getCachedRedirects = cached(fetchActiveRedirects, ['redirects', 'active'], { tags: [CACHE_TAGS.redirects], revalidate: 300 });

/** İsabet sayacı (security definer RPC; yalnız aktif kayıt). Hata yutulur — yönlendirme sayaçtan önemli. */
export async function recordRedirectHit(path: string): Promise<void> {
  const client = createPublicClient();
  if (!client.ok) return;
  await client.data.rpc('record_redirect_hit', { p_path: path });
}
