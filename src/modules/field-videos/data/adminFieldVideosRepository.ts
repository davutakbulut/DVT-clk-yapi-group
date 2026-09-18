import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';

export interface AdminFieldVideo {
  readonly id: string;
  readonly title: LocalizedText;
  readonly caption: LocalizedText;
  readonly source: 'youtube' | 'upload';
  readonly youtube_id: string | null;
  readonly video_id: string | null;
  readonly poster_id: string | null;
  readonly is_active: boolean;
  readonly sort_order: number | null;
}
export interface MediaChoice {
  readonly id: string;
  readonly path: string;
}

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});

export async function listFieldVideosForAdmin(): Promise<Result<AdminFieldVideo[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('field_videos').select('id, title, caption, source, youtube_id, video_id, poster_id, is_active, sort_order').order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'field-videos' }));
  return ok(data.map((r) => ({ ...r, title: lt(r.title), caption: lt(r.caption), source: r.source === 'upload' ? 'upload' : 'youtube' })));
}

/** Form seçenekleri: medya kütüphanesindeki videolar ve görseller (yükleme /admin/media'dan yapılır). */
export async function listFieldVideoChoices(): Promise<Result<{ videos: MediaChoice[]; images: MediaChoice[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [videos, images] = await Promise.all([
    client.data.from('media_library').select('id, storage_path').like('mime_type', 'video/%').order('created_at', { ascending: false }).limit(200),
    client.data.from('media_library').select('id, storage_path').like('mime_type', 'image/%').order('created_at', { ascending: false }).limit(500),
  ]);
  if (videos.error) return err(appError('external_service', videos.error.message, { module: 'field-videos' }));
  if (images.error) return err(appError('external_service', images.error.message, { module: 'field-videos' }));
  return ok({ videos: videos.data.map((m) => ({ id: m.id, path: m.storage_path })), images: images.data.map((m) => ({ id: m.id, path: m.storage_path })) });
}
