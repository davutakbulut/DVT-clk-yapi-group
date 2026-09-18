import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface AdminRedirect {
  readonly id: string;
  readonly source_path: string;
  readonly target_path: string | null;
  readonly status_code: number;
  readonly is_active: boolean;
  readonly hit_count: number;
  readonly last_hit_at: string | null;
  readonly note: string | null;
  readonly updated_at: string;
}

export interface SlugHistoryRow {
  readonly id: string;
  readonly entity_type: string;
  readonly locale: string;
  readonly old_slug: string;
  readonly created_at: string;
}

const fail = (message: string) => err(appError('external_service', message, { module: 'redirects' }));

export async function listRedirectsForAdmin(): Promise<Result<AdminRedirect[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('redirects').select('id, source_path, target_path, status_code, is_active, hit_count, last_hit_at, note, updated_at').order('source_path');
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, hit_count: Number(r.hit_count) })));
}

/** Otomatik 308'ler (K-15): slug değişince slug_history'ye düşer; burada yalnız gösterilir. */
export async function listSlugHistory(): Promise<Result<SlugHistoryRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('slug_history').select('id, entity_type, locale, old_slug, created_at').order('created_at', { ascending: false }).limit(50);
  if (error) return fail(error.message);
  return ok(data);
}
