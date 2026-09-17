import { z } from 'zod';
import { appError, err, ok, type Result } from '@/core/errors/result';

const schema = z.object({
  url: z.url(),
  anonKey: z.string().min(1),
});

export type SupabasePublicEnv = z.infer<typeof schema>;

/**
 * Tarayıcıya inmesi tasarım gereği serbest olan iki değer. Eksikse fırlatmaz:
 * site Supabase'siz de ayağa kalkabilmeli (yerel ilk kurulum, CI build).
 */
export function readSupabasePublicEnv(): Result<SupabasePublicEnv> {
  // process.env.X biçimi birebir yazılmalı — Next bu ifadeleri derlemede metin olarak değiştirir.
  const parsed = schema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return parsed.success ? ok(parsed.data) : err(appError('not_configured', 'Supabase public env eksik veya geçersiz', { module: 'core/db' }));
}
