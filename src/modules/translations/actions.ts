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
const ADMIN_PATH = '/admin/translations';

function bump() {
  revalidateTag(CACHE_TAGS.translations);
  revalidatePath(ADMIN_PATH);
  revalidatePath('/', 'layout');
}

const overrideSchema = z.object({
  namespace: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9]*$/).max(60),
  key: z.string().trim().regex(/^[A-Za-z0-9_.-]+$/).max(200),
  locale: z.enum(['tr', 'en']),
  value: z.string().trim().min(1).max(2000),
});

/** Etiket override'ı: (namespace, key, locale) benzersiz → upsert. Boş değer kabul edilmez; sıfırlamak için resetOverride. */
export async function saveOverride(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = overrideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.from('ui_translations').upsert({ namespace: v.namespace, key: v.key, locale: v.locale, value: v.value, updated_by: gate.data.id }, { onConflict: 'namespace,key,locale' });
  if (error) {
    logger.error('Etiket kaydedilemedi', { module: 'translations', code: error.code, message: error.message });
    return failed(dbErrorKey(error.code));
  }
  bump();
  return DONE;
}

/** Varsayılana dön: override satırı silinir; mesaj dosyasındaki metin geri gelir. */
export async function resetOverride(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('ui_translations').delete().eq('id', id.data);
  if (error) logger.error('Etiket sifirlanamadi', { module: 'translations', code: error.code, message: error.message });
  bump();
}

const glossarySchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  termTr: z.string().trim().min(1).max(120),
  termEn: z.string().trim().min(1).max(120),
  context: z.string().trim().max(120).optional().or(z.literal('')),
  doNotTranslate: z.boolean(),
  isCaseSensitive: z.boolean(),
});

export async function saveGlossaryTerm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = glossarySchema.safeParse({ ...Object.fromEntries(formData), doNotTranslate: checkbox(formData, 'doNotTranslate'), isCaseSensitive: checkbox(formData, 'isCaseSensitive') });
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = { term_tr: v.termTr, term_en: v.termEn, context: v.context ?? '', do_not_translate: v.doNotTranslate, is_case_sensitive: v.isCaseSensitive };
  const result = v.id ? await client.data.from('translation_glossary').update(row).eq('id', v.id) : await client.data.from('translation_glossary').insert(row);
  if (result.error) {
    logger.error('Sozluk terimi kaydedilemedi', { module: 'translations', code: result.error.code, message: result.error.message });
    return failed(dbErrorKey(result.error.code));
  }
  revalidatePath(`${ADMIN_PATH}/glossary`);
  return DONE;
}

export async function deleteGlossaryTerm(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('translation_glossary').delete().eq('id', id.data);
  if (error) logger.error('Sozluk terimi silinemedi', { module: 'translations', code: error.code, message: error.message });
  revalidatePath(`${ADMIN_PATH}/glossary`);
}
