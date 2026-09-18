import { logger } from '@/core/observability/logger';
import { getCachedPublicSettings } from './data/settingsRepository';
import { DEFAULT_SETTINGS, type PublicSettings } from './domain/settings';

export type { PublicSettings } from './domain/settings';

/** Asla fırlatmaz: veri gelmezse loglar ve varsayılanı döner — header/footer her koşulda render edilir. */
export async function getPublicSettings(): Promise<PublicSettings> {
  const result = await getCachedPublicSettings();
  if (result.ok) return result.data;
  logger.warn(result.error.message, { module: 'site-settings', code: result.error.code });
  return DEFAULT_SETTINGS;
}
