import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { parseSettings, type PublicSettings } from '../domain/settings';

const MODULE = 'site-settings';

async function fetchPublicSettings(): Promise<Result<PublicSettings>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  // RLS zaten is_public=false satırları vermez; filtre niyeti belgeler.
  const { data, error } = await client.data.from('site_settings').select('key, value').eq('is_public', true);
  if (error) return err(appError('external_service', error.message, { module: MODULE }));
  try {
    return ok(parseSettings(data));
  } catch (cause) {
    return err(appError('validation', 'site_settings ayrıştırılamadı', { module: MODULE, cause }));
  }
}

export const getCachedPublicSettings = cached(fetchPublicSettings, ['site-settings', 'public'], { tags: [CACHE_TAGS.siteSettings] });
