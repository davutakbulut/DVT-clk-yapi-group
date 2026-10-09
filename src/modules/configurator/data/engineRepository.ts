import { z } from 'zod';
import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { FAMILY_KEYS, FAMILY_KIND, type CatalogRow, type FamilyKey, type ProfileKind } from '../engine/catalog';
import { ENGINE_KINDS, ENGINE_RULE_KEY, type EngineKind } from '../engine/registry';
import type { EngineOverrides } from '../engine/runtime';

const KINDS: readonly ProfileKind[] = ['I', 'U', 'C', 'L', 'RHS', 'CHS', 'FL'];
const dimsSchema = z.object({ h: z.number(), b: z.number(), tw: z.number().optional(), tf: z.number().optional(), r: z.number().optional(), t: z.number().optional() });

/**
 * Profil kataloğu (herkese açık okuma, K-29): steel_profiles → CatalogRow. Ölçüsü/türü eksik satır (eski elle giriş) katalog dışı kalır;
 * kg/m veritabanından (K-65 tek ağırlık kaynağı). Etiket 'configurator_rules' ile aynı önbellek etiketini taşır.
 */
async function fetchCatalogRows(): Promise<Result<CatalogRow[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('steel_profiles').select('code, label, family, kind, kg_per_m, dimensions, is_active, sort_order').eq('is_active', true).order('family').order('sort_order').order('code');
  if (error) return err(appError('external_service', error.message, { module: 'configurator' }));
  const rows: CatalogRow[] = [];
  for (const r of data) {
    const family = (FAMILY_KEYS as readonly string[]).includes(r.family) ? (r.family as FamilyKey) : null;
    const kind = r.kind && (KINDS as readonly string[]).includes(r.kind) ? (r.kind as ProfileKind) : family ? FAMILY_KIND[family] : null;
    const dims = dimsSchema.safeParse(r.dimensions);
    if (!family || !kind || !dims.success) continue;
    rows.push({ code: r.code, label: r.label || r.code, family, kind, dims: dims.data, kgPerM: Number(r.kg_per_m) > 0 ? Number(r.kg_per_m) : null, isActive: true });
  }
  return ok(rows);
}
export const getCachedCatalogRows = cached(fetchCatalogRows, ['configurator', 'catalog'], { tags: [CACHE_TAGS.configurator] });

const overrideSchema = z.object({ min: z.number().optional(), max: z.number().optional(), step: z.number().positive().optional(), value: z.union([z.number(), z.string(), z.boolean()]).optional() });
export const engineRuleSchema = z.object({
  fields: z.record(z.string(), overrideSchema).catch({}),
  profiles: z.record(z.string(), z.string()).catch({}),
  notes: z.object({ tr: z.array(z.string().max(1000)).catch([]), en: z.array(z.string().max(1000)).catch([]) }).catch({ tr: [], en: [] }),
});
export type EngineRule = z.infer<typeof engineRuleSchema>;
export const EMPTY_ENGINE_RULE: EngineRule = { fields: {}, profiles: {}, notes: { tr: [], en: [] } };

/** Motor kuralları (configurator_rules engine.*): panel ayarı; bozuk/yok → boş (kod varsayılanları). */
async function fetchEngineRules(): Promise<Result<Record<EngineKind, EngineRule>>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('configurator_rules').select('key, value').like('key', 'engine.%');
  if (error) return err(appError('external_service', error.message, { module: 'configurator' }));
  const map = new Map(data.map((r) => [r.key, r.value]));
  const out = {} as Record<EngineKind, EngineRule>;
  for (const kind of ENGINE_KINDS) {
    const parsed = engineRuleSchema.safeParse(map.get(ENGINE_RULE_KEY(kind)) ?? {});
    out[kind] = parsed.success ? parsed.data : EMPTY_ENGINE_RULE;
  }
  return ok(out);
}
export const getCachedEngineRules = cached(fetchEngineRules, ['configurator', 'engine-rules'], { tags: [CACHE_TAGS.configurator] });

export const toOverrides = (r: EngineRule): EngineOverrides => ({ fields: r.fields, profiles: r.profiles });
