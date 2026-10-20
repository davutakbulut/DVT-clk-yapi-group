import 'server-only';
import { PostgrestClient } from '@supabase/postgrest-js';
import { getSessionActor } from '@/core/auth/session';
import { ok, type Result } from '@/core/errors/result';
import type { Database } from '@/types/database';
import { createDbFetch, DB_BASE_URL } from './mysql/rest/fetch';

export type ServerDbClient = PostgrestClient<Database>;

/**
 * İstek çerezindeki oturumla çalışan sunucu istemcisi: sunucu bileşenleri, Server Action'lar ve route handler'lar.
 * K-116: sorgular MariaDB'de, oturumun aktörüyle (rol) — RLS'in karşılığı sorgu katmanında (access.generated). Service YOK.
 */
export async function createServerClient(): Promise<Result<ServerDbClient>> {
  const actor = await getSessionActor();
  return ok(new PostgrestClient<Database>(DB_BASE_URL, { fetch: createDbFetch(actor) }));
}
