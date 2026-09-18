import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface FunnelStepInput {
  readonly name: string;
  readonly matchType: 'path' | 'path_prefix' | 'event';
  readonly matchValue: string;
}

const fail = (message: string) => err(appError('external_service', message, { module: 'analytics' }));

/** Huni + adımlar sil-yaz (yalnız admin, 0010 RLS). */
export async function saveFunnel(input: { readonly id?: string; readonly name: string; readonly description: string | null; readonly isActive: boolean; readonly steps: readonly FunnelStepInput[] }): Promise<Result<string>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let id = input.id ?? '';
  if (id) {
    const { error } = await client.data.from('funnels').update({ name: input.name, description: input.description, is_active: input.isActive }).eq('id', id);
    if (error) return fail(error.message);
  } else {
    const { data, error } = await client.data.from('funnels').insert({ name: input.name, description: input.description, is_active: input.isActive }).select('id').single();
    if (error) return fail(error.message);
    id = data.id;
  }
  const del = await client.data.from('funnel_steps').delete().eq('funnel_id', id);
  if (del.error) return fail(del.error.message);
  if (input.steps.length > 0) {
    const ins = await client.data.from('funnel_steps').insert(input.steps.map((s, i) => ({ funnel_id: id, seq: i + 1, name: s.name, match_type: s.matchType, match_value: s.matchValue })));
    if (ins.error) return fail(ins.error.message);
  }
  return ok(id);
}

export async function deleteFunnel(id: string): Promise<Result<void>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { error } = await client.data.from('funnels').delete().eq('id', id);
  if (error) return fail(error.message);
  return ok(undefined);
}
