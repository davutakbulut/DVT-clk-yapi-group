import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { PanelWeights, WeightTable } from '../domain/takeoff';

export interface CatalogWeights {
  readonly profiles: WeightTable;
  readonly panels: PanelWeights;
}

/**
 * Metraj ağırlıkları (herkese açık okuma, K-29): aktif `steel_profiles.kg_per_m` ve `panel_types.kg_per_m2`
 * (çatı/duvar için sıralamadaki ilk aktif tip). Tohum yok (K-55) → boş tablo = "kg/m girilmedi", sayı uydurulmaz.
 */
async function fetchWeights(): Promise<Result<CatalogWeights>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const [profiles, panels] = await Promise.all([
    client.data.from('steel_profiles').select('code, kg_per_m').eq('is_active', true),
    client.data.from('panel_types').select('usage, kg_per_m2').eq('is_active', true).order('sort_order'),
  ]);
  if (profiles.error) return err(appError('external_service', profiles.error.message, { module: 'configurator' }));
  if (panels.error) return err(appError('external_service', panels.error.message, { module: 'configurator' }));
  const table: Record<string, number> = {};
  for (const p of profiles.data) table[p.code] = Number(p.kg_per_m);
  const pw: { roof?: number; wall?: number } = {};
  for (const p of panels.data) {
    const kind = p.usage as 'roof' | 'wall';
    if (pw[kind] === undefined && p.kg_per_m2 !== null) pw[kind] = Number(p.kg_per_m2);
  }
  return ok({ profiles: table, panels: pw });
}

export const getCachedWeights = cached(fetchWeights, ['configurator', 'weights'], { tags: [CACHE_TAGS.configurator] });
