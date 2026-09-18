'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { dbErrorKey } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';

const ADMINS = ['super_admin', 'admin'] as const;
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));

// Kod: ASCII büyük harf/rakam/nokta/x (HEB360, PIPE139.7x6, 2L100x100x10); toLowerCase/toUpperCase Türkçe tuzağı yok → yalnız ASCII kabul edilir (K-16)
const profileSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  code: z.string().trim().regex(/^[A-Za-z0-9.x_-]{2,40}$/),
  family: z.string().trim().min(1).max(40),
  kgPerM: z.coerce.number().positive().max(10000),
  usage: z.enum(['column', 'beam', 'rafter', 'purlin', 'girt', 'bracing', 'wind_column', 'other']).optional().or(z.literal('')),
  isActive: z.boolean(),
});

/** Profil kaydet (yalnız admin; RLS 0008 aynı sınır). kg/m 3 basamak — metraj bu değerle çarpar, uydurma yok (K-55). */
export async function saveSteelProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const raw = Object.fromEntries(formData);
  const parsed = profileSchema.safeParse({ ...raw, kgPerM: String(raw['kgPerM'] ?? '').replace(',', '.'), isActive: raw['isActive'] === 'on' });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = { code: v.code, family: v.family, kg_per_m: v.kgPerM, usage: v.usage || null, is_active: v.isActive };
  const result = v.id ? await client.data.from('steel_profiles').update(row).eq('id', v.id) : await client.data.from('steel_profiles').insert(row);
  if (result.error) {
    logger.error('Profil kaydedilemedi', { module: 'configurator', code: result.error.code, message: result.error.message });
    return failed(dbErrorKey(result.error.code));
  }
  revalidateTag(CACHE_TAGS.configurator);
  revalidatePath('/admin/configurator/profiles');
  return DONE;
}

export async function deleteSteelProfile(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('steel_profiles').delete().eq('id', id.data);
  if (error) {
    logger.error('Profil silinemedi', { module: 'configurator', code: error.code, message: error.message });
    return;
  }
  revalidateTag(CACHE_TAGS.configurator);
  revalidatePath('/admin/configurator/profiles');
}
