import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

/** Genel kurallar (configurator_rules): işçilik katsayısı ve fiyat eşlemesi. Tür bazlı motor ayarları `engineRepository`de (K-110). */
export interface ConfiguratorRules {
  readonly laborFactor: number;
  /** Fiyat kalemi → material_prices.code ('' = fiyatlanmaz). */
  readonly priceMap: { readonly steel: string; readonly roof_panel: string; readonly wall_panel: string; readonly bolt: string };
}
export const DEFAULT_RULES: ConfiguratorRules = { laborFactor: 1, priceMap: { steel: '', roof_panel: '', wall_panel: '', bolt: '' } };

/** configurator_rules (anonim okur, 0008). Bozuk/yok → varsayılan (asla fırlatmaz). */
async function fetchRules(): Promise<Result<ConfiguratorRules>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('configurator_rules').select('key, value').in('key', ['labor_factor', 'price_map']);
  if (error) return err(appError('external_service', error.message, { module: 'configurator' }));
  const map = new Map(data.map((r) => [r.key, r.value]));
  const labor = Number(map.get('labor_factor'));
  const pr = map.get('price_map');
  const priceMap = { ...DEFAULT_RULES.priceMap } as Record<keyof ConfiguratorRules['priceMap'], string>;
  if (typeof pr === 'object' && pr !== null) for (const [k, v] of Object.entries(pr)) if (k in priceMap && typeof v === 'string') priceMap[k as keyof typeof priceMap] = v;
  return ok({ laborFactor: Number.isFinite(labor) && labor > 0 ? labor : 1, priceMap });
}
export const getCachedRules = cached(fetchRules, ['configurator', 'rules'], { tags: [CACHE_TAGS.configurator] });
