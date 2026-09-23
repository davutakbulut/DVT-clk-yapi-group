'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import { getMediaById } from './data/mediaRepository';
import { processUpload } from './services/processUpload';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;

export async function uploadMedia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return failed('validation', { file: 'validation' });
  const meta = z
    .object({ folder: z.string().trim().max(60).optional().or(z.literal('')), newFolder: z.string().trim().max(60).optional().or(z.literal('')), altTr: z.string().trim().max(200).optional().or(z.literal('')), altEn: z.string().trim().max(200).optional().or(z.literal('')) })
    .safeParse(Object.fromEntries(formData));
  if (!meta.success) return failed('validation');
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const result = await processUpload(client.data, {
    bytes: Buffer.from(await file.arrayBuffer()),
    declaredMime: file.type,
    originalName: file.name,
    folder: meta.data.newFolder || meta.data.folder || 'uploads',
    altTr: meta.data.altTr ?? '',
    altEn: meta.data.altEn ?? '',
    uploadedBy: gate.data.id,
  });
  if (!result.ok) return failed(result.error);
  revalidateTag(CACHE_TAGS.media);
  return DONE;
}

export type InlineUploadResult = { readonly ok: true; readonly id: string; readonly path: string; readonly mime: string } | { readonly ok: false; readonly error: 'forbidden' | 'validation' | 'notConfigured' | 'fileSize' | 'fileType' | 'fileMagic' | 'unexpected' };

/** Form içi yükleme (MediaPicker, K-85): sonuç yönlendirme değil veri döner; aynı boru hattı ve RLS. */
export async function uploadMediaInline(formData: FormData): Promise<InlineUploadResult> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return { ok: false, error: 'forbidden' };
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'validation' };
  const folder = z.string().trim().min(1).max(60).safeParse(formData.get('folder'));
  if (!folder.success) return { ok: false, error: 'validation' };
  const client = await createServerClient();
  if (!client.ok) return { ok: false, error: 'notConfigured' };
  const result = await processUpload(client.data, { bytes: Buffer.from(await file.arrayBuffer()), declaredMime: file.type, originalName: file.name, folder: folder.data, altTr: '', altEn: '', uploadedBy: gate.data.id });
  if (!result.ok) return { ok: false, error: result.error };
  revalidateTag(CACHE_TAGS.media);
  return { ok: true, id: result.data.id, path: result.data.path, mime: file.type.startsWith('image/') ? 'image/webp' : file.type };
}

export async function updateMediaAlt(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = z.object({ id: z.string().uuid(), altTr: z.string().trim().max(200), altEn: z.string().trim().max(200) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation');
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const alt = { ...(parsed.data.altTr ? { tr: parsed.data.altTr } : {}), ...(parsed.data.altEn ? { en: parsed.data.altEn } : {}) };
  const { error } = await client.data.from('media_library').update({ alt }).eq('id', parsed.data.id);
  if (error) return failed(error.code === '42501' ? 'forbidden' : 'unexpected');
  revalidateTag(CACHE_TAGS.media);
  return DONE;
}

/** Storage nesneleri (tam boy + varyantlar) ve satır birlikte silinir; FK'lı içerik referansları `set null`/`cascade`. */
export async function deleteMedia(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const row = await getMediaById(client.data, id.data);
  if (!row.ok) return;
  const paths = [row.data.storage_path, ...Object.values(row.data.variants)];
  const { error: storageError } = await client.data.storage.from(row.data.storage_bucket).remove(paths);
  if (storageError) logger.warn('Storage silme hatası', { module: 'media', message: storageError.message });
  const { error } = await client.data.from('media_library').delete().eq('id', id.data);
  if (error) logger.error('Medya satırı silinemedi', { module: 'media', code: error.code });
  revalidateTag(CACHE_TAGS.media);
}
