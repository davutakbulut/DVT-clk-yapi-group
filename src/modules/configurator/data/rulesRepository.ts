import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { DEFAULT_LIMITS, limitsSchema, type Limits } from '../domain/params';
import { DEFAULT_PROFILE_MAP } from '../domain/profiles';
import type { ProfileKey } from '../domain/structure';

export interface ConfiguratorRules {
  readonly limits: Limits;
  readonly trussThresholdM: number;
  readonly purlinSpacingM: number;
  readonly laborFactor: number;
  readonly profileMap: Readonly<Record<ProfileKey, string>>;
}

export const DEFAULT_RULES: ConfiguratorRules = { limits: DEFAULT_LIMITS, trussThresholdM: 30, purlinSpacingM: 1, laborFactor: 1, profileMap: DEFAULT_PROFILE_MAP };

/** configurator_rules (anonim okur, 0008): limitler, sistem eşiği, profil eşlemesi. Bozuk/yok → varsayılan (asla fırlatmaz). */
async function fetchRules(): Promise<Result<ConfiguratorRules>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('configurator_rules').select('key, value');
  if (error) return err(appError('external_service', error.message, { module: 'configurator' }));
  const map = new Map(data.map((r) => [r.key, r.value]));
  const limits = limitsSchema.safeParse(map.get('limits'));
  const num = (k: string, fallback: number) => {
    const v = Number(map.get(k));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  const pm = map.get('profile_map');
  const profileMap = { ...DEFAULT_PROFILE_MAP } as Record<ProfileKey, string>;
  if (typeof pm === 'object' && pm !== null) for (const [k, v] of Object.entries(pm)) if (k in profileMap && typeof v === 'string' && v) profileMap[k as ProfileKey] = v;
  return ok({ limits: limits.success ? limits.data : DEFAULT_LIMITS, trussThresholdM: num('truss_threshold_m', 30), purlinSpacingM: num('purlin_spacing_m', 1), laborFactor: num('labor_factor', 1), profileMap });
}

export const getCachedRules = cached(fetchRules, ['configurator', 'rules'], { tags: [CACHE_TAGS.configurator] });
