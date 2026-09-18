'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox, dbErrorKey } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const ADMIN_PATH = '/admin/redirects';

function bump() {
  revalidateTag(CACHE_TAGS.redirects);
  revalidatePath(ADMIN_PATH);
}

const PATH = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/;
const schema = z
  .object({
    id: z.string().uuid().optional().or(z.literal('')),
    sourcePath: z.string().trim().regex(PATH).max(500),
    targetPath: z.string().trim().max(1000).optional().or(z.literal('')),
    statusCode: z.coerce.number().pipe(z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308), z.literal(410)])),
    isActive: z.boolean(),
    note: z.string().trim().max(300).optional().or(z.literal('')),
  })
  // 410 Gone'un hedefi olmaz; diğerlerinin hedefi göreli yol ya da https URL olmalı; kaynak = hedef yasak (0001 CHECK'leri sunucuda da)
  .refine((v) => v.statusCode === 410 || Boolean(v.targetPath && (PATH.test(v.targetPath) || /^https:\/\//.test(v.targetPath))), { path: ['targetPath'] })
  .refine((v) => v.targetPath !== v.sourcePath, { path: ['targetPath'] });

export async function saveRedirect(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), isActive: checkbox(formData, 'isActive') });
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = { source_path: v.sourcePath.replace(/\/+$/, '') || '/', target_path: v.statusCode === 410 ? null : v.targetPath || null, status_code: v.statusCode, is_active: v.isActive, note: v.note || null, created_by: gate.data.id };
  const result = v.id ? await client.data.from('redirects').update(row).eq('id', v.id) : await client.data.from('redirects').insert(row);
  if (result.error) {
    logger.error('Yonlendirme kaydedilemedi', { module: 'redirects', code: result.error.code, message: result.error.message });
    return failed(dbErrorKey(result.error.code));
  }
  bump();
  return DONE;
}

export async function deleteRedirect(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('redirects').delete().eq('id', id.data);
  if (error) logger.error('Yonlendirme silinemedi', { module: 'redirects', code: error.code, message: error.message });
  bump();
}
