import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, pickLocale, type LocalizedText } from '@/lib/localized';

export interface FieldVideoData {
  readonly id: string;
  readonly title: string;
  readonly caption: string;
  readonly source: 'youtube' | 'upload';
  readonly youtubeId: string | null;
  readonly video: { readonly bucket: string; readonly path: string } | null;
  readonly poster: { readonly bucket: string; readonly path: string; readonly width: number | null; readonly height: number | null } | null;
}

type MediaRow = { storage_bucket: string; storage_path: string; width: number | null; height: number | null } | null;
const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});

/** Yayındaki saha videoları (RLS: yalnız is_active). Başlık o dilde yoksa TR gösterilir (saha adı çoğunlukla özel isimdir). */
async function fetchFieldVideos(locale: string): Promise<Result<FieldVideoData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('field_videos')
    .select('id, title, caption, source, youtube_id, video:media_library!field_videos_video_id_fkey(storage_bucket, storage_path, width, height), poster:media_library!field_videos_poster_id_fkey(storage_bucket, storage_path, width, height)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .limit(24);
  if (error) return err(appError('external_service', error.message, { module: 'field-videos' }));
  const items: FieldVideoData[] = [];
  for (const row of data) {
    const title = pickLocale(lt(row.title), locale, { fallback: 'tr' });
    const video = row.video as MediaRow;
    const poster = row.poster as MediaRow;
    if (!title) continue;
    if (row.source === 'upload' && !video) continue;
    items.push({
      id: row.id,
      title,
      caption: pickLocale(lt(row.caption), locale, { fallback: 'tr' }),
      source: row.source === 'upload' ? 'upload' : 'youtube',
      youtubeId: row.youtube_id,
      video: video ? { bucket: video.storage_bucket, path: video.storage_path } : null,
      poster: poster ? { bucket: poster.storage_bucket, path: poster.storage_path, width: poster.width, height: poster.height } : null,
    });
  }
  return ok(items);
}

export const getCachedFieldVideos = cached(fetchFieldVideos, ['field-videos', 'list'], { tags: [CACHE_TAGS.fieldVideos, CACHE_TAGS.media] });
