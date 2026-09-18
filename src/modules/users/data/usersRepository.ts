import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface ProfileRow {
  readonly id: string;
  readonly full_name: string | null;
  readonly role: string;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly last_seen_at: string | null;
}

/** RLS: admin/super_admin herkesi, diğer personel yalnız personeli görür. E-posta auth şemasında; panelde ad gösterilir. */
export async function listProfiles(): Promise<Result<ProfileRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('profiles').select('id, full_name, role, is_active, created_at, last_seen_at').order('role').order('created_at', { ascending: false }).limit(500);
  if (error) return err(appError('external_service', error.message, { module: 'users' }));
  return ok(data);
}
