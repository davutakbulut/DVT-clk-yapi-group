import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { Database } from '@/types/database';
import { readSupabasePublicEnv } from './publicEnv';
import { gateHeaders } from './gateHeaders';

export type ServiceDbClient = SupabaseClient<Database>;

/**
 * Service-role istemcisi — RLS'i ATLAR. K-56: yalnız `src/core/jobs/**` (cron işleri) içe aktarabilir; ESLint zorlar.
 * Kullanıcı isteğiyle tetiklenen hiçbir yolda (sayfa, Server Action, route handler) kullanılmaz (Kural 4).
 * Cron route'u yalnız CRON_SECRET taşıyan makine isteğini kabul eder ve işi core/jobs'a devreder.
 */
export function createServiceClient(): Result<ServiceDbClient> {
  const env = readSupabasePublicEnv();
  if (!env.ok) return env;
  const secret = process.env['SUPABASE_SECRET_KEY'];
  if (!secret) return err(appError('not_configured', 'SUPABASE_SECRET_KEY yok', { module: 'core/db' }));
  return ok(createClient<Database>(env.data.url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: gateHeaders() } }));
}
