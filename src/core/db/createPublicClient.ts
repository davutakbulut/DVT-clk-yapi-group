import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '@/core/errors/result';
import type { Database } from '@/types/database';
import { readSupabasePublicEnv } from './publicEnv';

export type PublicDbClient = SupabaseClient<Database>;

/**
 * Çerezsiz, anonim sunucu istemcisi: herkese açık içerik (menü, ayarlar, yayındaki sayfalar) için.
 * Oturum taşımadığı için `unstable_cache` içinde güvenle kullanılır — bir kullanıcının verisi herkese önbelleklenemez.
 * RLS yine geçerlidir: anon rolünün göremediği hiçbir şey buradan da gelmez.
 */
export function createPublicClient(): Result<PublicDbClient> {
  const env = readSupabasePublicEnv();
  if (!env.ok) return env;
  return {
    ok: true,
    data: createClient<Database>(env.data.url, env.data.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }),
  };
}
