'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { dbErrorKey, localized } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import { parseYouTubeId } from './domain/youtube';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const schema = z.object({
  id: uuid,
  titleTr: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().max(120).optional().or(z.literal('')),
  captionTr: z.string().trim().max(240).optional().or(z.literal('')),
  captionEn: z.string().trim().max(240).optional().or(z.literal('')),
  source: z.enum(['youtube', 'upload']),
  youtubeUrl: z.string().trim().max(300).optional().or(z.literal('')),
  videoId: uuid,
  posterId: uuid,
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(1).max(999).optional().or(z.literal('')),
});

/** Saha videosu kaydet (editör+; RLS aynı sınır). YouTube bağlantısı kimliğe çevrilir; kaynak tutarlılığı DB CHECK ile de korunur. */
export async function saveFieldVideo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse({ ...raw, isActive: raw['isActive'] === 'on' });
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const youtubeId = v.source === 'youtube' ? parseYouTubeId(v.youtubeUrl ?? '') : null;
  if (v.source === 'youtube' && !youtubeId) return failed('validation', { youtubeUrl: 'validation' });
  if (v.source === 'upload' && !v.videoId) return failed('validation', { videoId: 'validation' });
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = {
    title: localized(v.titleTr, v.titleEn),
    caption: localized(v.captionTr, v.captionEn),
    source: v.source,
    youtube_id: youtubeId,
    video_id: v.source === 'upload' ? v.videoId || null : null,
    poster_id: v.posterId || null,
    is_active: v.isActive,
    ...(typeof v.sortOrder === 'number' ? { sort_order: v.sortOrder } : {}),
  };
  const result = v.id ? await client.data.from('field_videos').update(row).eq('id', v.id) : await client.data.from('field_videos').insert(row);
  if (result.error) {
    logger.error('Saha videosu kaydedilemedi', { module: 'field-videos', code: result.error.code, message: result.error.message });
    return failed(dbErrorKey(result.error.code));
  }
  revalidateTag(CACHE_TAGS.fieldVideos);
  revalidatePath('/admin/field-videos');
  return DONE;
}

export async function deleteFieldVideo(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('field_videos').delete().eq('id', id.data);
  if (error) logger.error('Saha videosu silinemedi', { module: 'field-videos', code: error.code, message: error.message });
  revalidateTag(CACHE_TAGS.fieldVideos);
  revalidatePath('/admin/field-videos');
}
