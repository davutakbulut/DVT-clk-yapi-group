'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';

const schema = z.object({
  pageKey: z.enum(['error-404', 'error-403', 'error-500', 'maintenance']),
  titleTr: z.string().trim().min(1).max(160),
  titleEn: z.string().trim().max(160).optional().or(z.literal('')),
  bodyTr: z.string().trim().max(2000).optional().or(z.literal('')),
  bodyEn: z.string().trim().max(2000).optional().or(z.literal('')),
  reviewedEn: z.coerce.boolean(),
  publishEn: z.coerce.boolean(),
});

/**
 * K-08: `en`, published_locales'e yalnız insan onayı (translation_meta.en.reviewed) ve EN başlık varsa girer.
 * Kısıt (is_publishable) bunu DB'de de zorlar; burada anlaşılır hata için önden kontrol.
 */
export async function saveErrorPage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(['super_admin', 'admin', 'editor']);
  if (!gate.ok) return failed('forbidden');
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), reviewedEn: formData.get('reviewedEn') === 'on', publishEn: formData.get('publishEn') === 'on' });
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  if (v.publishEn && !(v.reviewedEn && v.titleEn)) return failed('validation', { publishEn: 'validation' });
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const title: Record<string, string> = { tr: v.titleTr, ...(v.titleEn ? { en: v.titleEn } : {}) };
  const body: Record<string, string> = { ...(v.bodyTr ? { tr: v.bodyTr } : {}), ...(v.bodyEn ? { en: v.bodyEn } : {}) };
  const { error } = await client.data
    .from('static_pages')
    .update({
      title,
      body,
      published_locales: v.publishEn ? ['tr', 'en'] : ['tr'],
      translation_meta: { en: { machine: false, reviewed: v.reviewedEn, reviewed_by: v.reviewedEn ? gate.data.id : null } },
    })
    .eq('page_key', v.pageKey);
  if (error) {
    logger.error('Hata sayfası kaydedilemedi', { module: 'static-pages', code: error.code, message: error.message });
    return failed(error.code === '42501' ? 'forbidden' : 'unexpected');
  }
  revalidateTag(CACHE_TAGS.staticPages);
  return DONE;
}
