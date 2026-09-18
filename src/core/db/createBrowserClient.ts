'use client';

import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let client: SupabaseClient<Database> | null = null;

/** Tarayıcı istemcisi (tekil). Yalnız oturum durumu gibi istemci tarafı ihtiyaçlar için; veri çekimi sunucuda kalır. */
export function getBrowserClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  client ??= createSsrBrowserClient<Database>(url, anonKey);
  return client;
}
