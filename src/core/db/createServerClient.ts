import 'server-only';
import { createServerClient as createSsrClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { ok, type Result } from '@/core/errors/result';
import type { Database } from '@/types/database';
import { readSupabasePublicEnv } from './publicEnv';

export type ServerDbClient = SupabaseClient<Database>;

/**
 * İstek çerezlerini taşıyan sunucu istemcisi: sunucu bileşenleri, Server Action'lar ve route handler'lar.
 * Kullanıcının kendi oturumuyla çalışır → RLS gerçek sınır olarak devrede (Kural 4). Service-role YOK.
 * Sunucu bileşeninde çerez YAZILAMAZ; yenileme middleware'de yapılır (K-13), buradaki setAll sessizce yutulur.
 */
export async function createServerClient(): Promise<Result<ServerDbClient>> {
  const env = readSupabasePublicEnv();
  if (!env.ok) return env;
  const store = await cookies();
  return ok(
    createSsrClient<Database>(env.data.url, env.data.anonKey, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            // Sunucu bileşeni bağlamı: çerez yazmak yasak, middleware zaten yeniledi.
          }
        },
      },
    }),
  );
}
