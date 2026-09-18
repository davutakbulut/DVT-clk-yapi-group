import { z } from 'zod';
import { createPublicClient } from '@/core/db/createPublicClient';
import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

const itemSchema = z.object({
  element_group: z.string(),
  profile_code: z.string().nullable(),
  piece_count: z.number().nullable(),
  total_length_m: z.coerce.number().nullable(),
  total_area_m2: z.coerce.number().nullable(),
  total_weight_kg: z.coerce.number().nullable(),
});
const sharedSchema = z.object({
  id: z.string().uuid(),
  ref_code: z.string(),
  name: z.string(),
  params: z.record(z.string(), z.unknown()),
  version: z.number(),
  tonnage_kg: z.coerce.number().nullable(),
  locale: z.string(),
  updated_at: z.string(),
  status: z.string(),
  share_price: z.boolean(),
  is_member: z.boolean(),
  estimated_price: z.coerce.number().nullable(),
  currency: z.string().nullable(),
  versions: z.number(),
  items: z.array(itemSchema),
});
export type SharedConfiguration = z.infer<typeof sharedSchema>;
export type SharedItem = z.infer<typeof itemSchema>;

/** Token ile paylaşılan konfigürasyon (anonim RPC, K-30): yok/bozuk → null (asla fırlatmaz). Önbelleksiz: sürüm değişir. */
export async function getConfigurationByToken(token: string): Promise<SharedConfiguration | null> {
  if (!z.string().uuid().safeParse(token).success) return null;
  const client = createPublicClient();
  if (!client.ok) return null;
  const { data, error } = await client.data.rpc('get_configuration_by_token', { p_token: token });
  if (error || !data) return null;
  const parsed = sharedSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export interface MyConfiguration {
  readonly id: string;
  readonly ref_code: string;
  readonly name: string;
  readonly public_token: string;
  readonly current_version: number;
  readonly tonnage_kg: number | null;
  readonly status: string;
  readonly updated_at: string;
}

/** Üyenin kayıtları (RLS: own configurations). */
export async function listMyConfigurations(): Promise<Result<MyConfiguration[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('configurations').select('id, ref_code, name, public_token, current_version, tonnage_kg, status, updated_at').order('updated_at', { ascending: false }).limit(50);
  if (error) return err(appError('external_service', error.message, { module: 'configurator' }));
  return ok(data.map((c) => ({ ...c, tonnage_kg: c.tonnage_kg === null ? null : Number(c.tonnage_kg) })));
}
