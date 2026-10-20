import 'server-only';
import { PostgrestClient } from '@supabase/postgrest-js';
import { ok, type Result } from '@/core/errors/result';
import type { Database } from '@/types/database';
import { createDbFetch, DB_BASE_URL } from './mysql/rest/fetch';

export type ServiceDbClient = PostgrestClient<Database>;

/**
 * Erişim kurallarını ATLAYAN istemci — K-56: yalnız `src/core/jobs/**` (cron işleri) içe aktarabilir; ESLint zorlar.
 * Kullanıcı isteğiyle tetiklenen hiçbir yolda (sayfa, Server Action, route handler) kullanılmaz (Kural 4).
 */
export function createServiceClient(): Result<ServiceDbClient> {
  return ok(new PostgrestClient<Database>(DB_BASE_URL, { fetch: createDbFetch({ kind: 'service' }) }));
}
