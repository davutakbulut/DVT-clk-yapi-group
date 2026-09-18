import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface AdminSteelProfile {
  readonly id: string;
  readonly code: string;
  readonly family: string;
  readonly kg_per_m: number;
  readonly usage: string | null;
  readonly is_active: boolean;
  readonly updated_at: string;
}

/** Profil kataloğu (admin): kod, aile, kg/m (metrajın TEK ağırlık kaynağı), kullanım, aktiflik. */
export async function listSteelProfilesForAdmin(): Promise<Result<AdminSteelProfile[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('steel_profiles').select('id, code, family, kg_per_m, usage, is_active, updated_at').order('family').order('code');
  if (error) return err(appError('external_service', error.message, { module: 'configurator' }));
  return ok(data.map((p) => ({ ...p, kg_per_m: Number(p.kg_per_m) })));
}
