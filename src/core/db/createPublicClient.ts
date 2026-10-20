import 'server-only';
import { PostgrestClient } from '@supabase/postgrest-js';
import { ok, type Result } from '@/core/errors/result';
import type { Database } from '@/types/database';
import { createDbFetch, DB_BASE_URL } from './mysql/rest/fetch';

export type PublicDbClient = PostgrestClient<Database>;

/**
 * Çerezsiz, anonim sunucu istemcisi: herkese açık içerik (menü, ayarlar, yayındaki sayfalar) için.
 * Oturum taşımadığı için `unstable_cache` içinde güvenle kullanılır — bir kullanıcının verisi herkese önbelleklenemez.
 * Ziyaretçi kuralları geçerlidir: anonim aktörün göremediği hiçbir şey buradan da gelmez (K-116).
 */
export function createPublicClient(): Result<PublicDbClient> {
  return ok(new PostgrestClient<Database>(DB_BASE_URL, { fetch: createDbFetch({ kind: 'anon' }) }));
}
