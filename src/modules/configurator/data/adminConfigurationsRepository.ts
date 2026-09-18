import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface AdminConfigurationRow {
  readonly id: string;
  readonly ref_code: string;
  readonly name: string;
  readonly owner: string;
  readonly current_version: number;
  readonly tonnage_kg: number | null;
  readonly estimated_price: number | null;
  readonly currency: string;
  readonly status: string;
  readonly lead_id: string | null;
  readonly sale_id: string | null;
  readonly locale: string;
  readonly updated_at: string;
}
export interface AdminConfigurationItem {
  readonly id: string;
  readonly element_group: string;
  readonly profile_code_snapshot: string | null;
  readonly piece_count: number | null;
  readonly total_length_m: number | null;
  readonly total_area_m2: number | null;
  readonly total_weight_kg: number | null;
}
export interface AdminConfigurationVersion {
  readonly id: string;
  readonly version: number;
  readonly tonnage_kg: number | null;
  readonly estimated_price: number | null;
  readonly created_at: string;
}
export interface AdminConfigurationDetail extends AdminConfigurationRow {
  readonly params: Readonly<Record<string, unknown>>;
  readonly public_token: string;
  readonly owner_email: string | null;
  readonly items: readonly AdminConfigurationItem[];
  readonly versions: readonly AdminConfigurationVersion[];
  readonly leadRef: string | null;
  readonly saleNo: string | null;
}

const ownerLabel = (c: { owner_email: string | null; profile: { full_name: string | null } | null }) => c.profile?.full_name ?? c.owner_email ?? '—';

/** Gönderimler (staff read RLS): en yeni önce, durum süzgeci. */
export async function listConfigurationsForAdmin(filter: { readonly status?: string } = {}): Promise<Result<AdminConfigurationRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let q = client.data.from('configurations').select('id, ref_code, name, owner_email, current_version, tonnage_kg, estimated_price, currency, status, lead_id, sale_id, locale, updated_at, profile:profiles(full_name)').order('updated_at', { ascending: false }).limit(300);
  if (filter.status) q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) return err(appError('external_service', error.message, { module: 'configurator' }));
  return ok(data.map((c) => ({ ...c, owner: ownerLabel(c), tonnage_kg: c.tonnage_kg === null ? null : Number(c.tonnage_kg), estimated_price: c.estimated_price === null ? null : Number(c.estimated_price) })));
}

export async function getConfigurationForAdmin(id: string): Promise<Result<AdminConfigurationDetail | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  // leads/sales ile iki yönlü FK var (configurations.lead_id ↔ leads.configuration_id) → gömme belirsiz; ayrı sorgular.
  const { data: c, error } = await client.data.from('configurations').select('id, ref_code, name, owner_email, params, public_token, current_version, tonnage_kg, estimated_price, currency, status, lead_id, sale_id, locale, updated_at, profile:profiles(full_name)').eq('id', id).maybeSingle();
  if (error) return err(appError('external_service', error.message, { module: 'configurator' }));
  if (!c) return ok(null);
  const [versions, lead, sale] = await Promise.all([
    client.data.from('configuration_versions').select('id, version, tonnage_kg, estimated_price, created_at').eq('configuration_id', id).order('version', { ascending: false }),
    c.lead_id ? client.data.from('leads').select('ref_no').eq('id', c.lead_id).maybeSingle() : Promise.resolve({ data: null }),
    c.sale_id ? client.data.from('sales_without_cost').select('sale_no').eq('id', c.sale_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (versions.error) return err(appError('external_service', versions.error.message, { module: 'configurator' }));
  const current = versions.data.find((v) => v.version === c.current_version);
  const items = current ? await client.data.from('configuration_items').select('id, element_group, profile_code_snapshot, piece_count, total_length_m, total_area_m2, total_weight_kg').eq('configuration_version_id', current.id).order('sort_order') : { data: [], error: null };
  if (items.error) return err(appError('external_service', items.error.message, { module: 'configurator' }));
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return ok({
    ...c,
    params: (c.params ?? {}) as Record<string, unknown>,
    owner: ownerLabel(c),
    tonnage_kg: num(c.tonnage_kg),
    estimated_price: num(c.estimated_price),
    leadRef: lead.data?.ref_no ?? null,
    saleNo: sale.data?.sale_no ?? null,
    versions: versions.data.map((v) => ({ ...v, tonnage_kg: num(v.tonnage_kg), estimated_price: num(v.estimated_price) })),
    items: items.data.map((i) => ({ id: i.id, element_group: i.element_group, profile_code_snapshot: i.profile_code_snapshot, piece_count: i.piece_count, total_length_m: num(i.total_length_m), total_area_m2: num(i.total_area_m2), total_weight_kg: num(i.total_weight_kg) })),
  });
}

export interface RuleChoices {
  readonly profiles: readonly string[];
  readonly materials: readonly { readonly code: string; readonly label: string }[];
}
/** Kural düzenleyici seçenekleri: aktif profil kodları ve malzeme fiyat kodları (admin). */
export async function listRuleChoices(): Promise<Result<RuleChoices>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [profiles, materials] = await Promise.all([
    client.data.from('steel_profiles').select('code').eq('is_active', true).order('code'),
    client.data.from('material_prices').select('code, unit, unit_price, currency').order('code'),
  ]);
  if (profiles.error) return err(appError('external_service', profiles.error.message, { module: 'configurator' }));
  if (materials.error) return err(appError('external_service', materials.error.message, { module: 'configurator' }));
  return ok({ profiles: profiles.data.map((p) => p.code), materials: materials.data.map((m) => ({ code: m.code, label: `${m.code} · ${m.unit_price} ${m.currency}/${m.unit}` })) });
}
