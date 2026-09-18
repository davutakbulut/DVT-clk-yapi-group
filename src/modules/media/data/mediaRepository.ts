import { createServerClient, type ServerDbClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface MediaRow {
  readonly id: string;
  readonly storage_bucket: string;
  readonly storage_path: string;
  readonly file_name: string;
  readonly mime_type: string;
  readonly size_bytes: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly duration_ms: number | null;
  readonly alt: Record<string, string>;
  readonly folder: string | null;
  readonly variants: Record<string, string>;
  readonly created_at: string;
}

const rec = (v: unknown): Record<string, string> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, string>) : {});
const toRow = (m: Omit<MediaRow, 'alt' | 'variants'> & { alt: unknown; variants: unknown }): MediaRow => ({ ...m, alt: rec(m.alt), variants: rec(m.variants) });

export async function listMedia(folder: string | null, limit = 200): Promise<Result<{ items: MediaRow[]; folders: string[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let query = client.data
    .from('media_library')
    .select('id, storage_bucket, storage_path, file_name, mime_type, size_bytes, width, height, duration_ms, alt, folder, variants, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (folder) query = query.eq('folder', folder);
  const [{ data, error }, foldersRes] = await Promise.all([query, client.data.from('media_library').select('folder').not('folder', 'is', null)]);
  if (error) return err(appError('external_service', error.message, { module: 'media' }));
  const folders = [...new Set((foldersRes.data ?? []).map((f) => f.folder).filter((f): f is string => Boolean(f)))].sort();
  return ok({ items: data.map(toRow), folders });
}

export async function getMediaById(client: ServerDbClient, id: string): Promise<Result<MediaRow>> {
  const { data, error } = await client.from('media_library').select('id, storage_bucket, storage_path, file_name, mime_type, size_bytes, width, height, duration_ms, alt, folder, variants, created_at').eq('id', id).maybeSingle();
  if (error) return err(appError('external_service', error.message, { module: 'media' }));
  if (!data) return err(appError('not_found', 'Medya yok', { module: 'media' }));
  return ok(toRow(data));
}
