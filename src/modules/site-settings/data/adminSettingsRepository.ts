import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { parseSettings, type PublicSettings } from '../domain/settings';

export interface LogoOption {
  readonly id: string;
  readonly path: string;
  readonly fileName: string;
}

/** Panel: önbelleksiz, kullanıcının oturumuyla (staff read). Logo seçenekleri media_library'den (görseller). */
export async function loadSettingsForAdmin(): Promise<Result<{ settings: PublicSettings; logos: LogoOption[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [{ data, error }, media] = await Promise.all([
    client.data.from('site_settings').select('key, value').eq('is_public', true),
    client.data.from('media_library').select('id, storage_path, file_name').like('mime_type', 'image/%').order('folder').order('file_name').limit(500),
  ]);
  if (error) return err(appError('external_service', error.message, { module: 'site-settings' }));
  return ok({ settings: parseSettings(data), logos: (media.data ?? []).map((m) => ({ id: m.id, path: m.storage_path, fileName: m.file_name })) });
}
