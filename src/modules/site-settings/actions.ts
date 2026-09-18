'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import { parseSocialLines } from './domain/social';

const MODULE = 'site-settings';
const MANAGERS = ['super_admin', 'admin'] as const;

const optional = z.string().trim().max(500).optional().or(z.literal(''));
const schema = z.object({
  siteNameTr: z.string().trim().min(1).max(120),
  siteNameEn: optional,
  taglineTr: optional,
  taglineEn: optional,
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  addressTr: optional,
  addressEn: optional,
  mapUrl: z.string().trim().url().optional().or(z.literal('')),
  hoursTr: optional,
  hoursEn: optional,
  social: z.string().max(4000).optional().or(z.literal('')),
  logoMediaId: z.string().uuid().optional().or(z.literal('')),
  logoDarkMediaId: z.string().uuid().optional().or(z.literal('')),
  seoTr: optional,
  seoEn: optional,
});

// value jsonb NOT NULL: JS null SQL NULL'a döner (23502). Boş değer JSON'da '' / {} / [] olarak yazılır;
// okuma şeması (domain/settings.ts) bunları null'a indirger.
const localized = (tr?: string, en?: string) => {
  const out: Record<string, string> = {};
  if (tr) out['tr'] = tr;
  if (en) out['en'] = en;
  return out;
};

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(MANAGERS);
  if (!gate.ok) return failed('forbidden');
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const values: Record<string, unknown> = {
    'site.name': localized(v.siteNameTr, v.siteNameEn),
    'site.tagline': localized(v.taglineTr, v.taglineEn),
    'site.logo_media_id': v.logoMediaId || '',
    'site.logo_dark_media_id': v.logoDarkMediaId || '',
    'contact.phone': v.phone || '',
    'contact.email': v.email || '',
    'contact.address': localized(v.addressTr, v.addressEn),
    'contact.map_url': v.mapUrl || '',
    'contact.working_hours': localized(v.hoursTr, v.hoursEn),
    'social.links': parseSocialLines(v.social ?? ''),
    'seo.default_description': localized(v.seoTr, v.seoEn),
  };
  // Anahtar başına update (upsert değil): is_public/description referans verisinde kalır, yalnız değer değişir.
  for (const [key, value] of Object.entries(values)) {
    const { error } = await client.data.from('site_settings').update({ value: value as never, updated_by: gate.data.id }).eq('key', key);
    if (error) {
      logger.error('Ayar kaydedilemedi', { module: MODULE, key, code: error.code });
      return failed(error.code === '42501' ? 'forbidden' : 'unexpected');
    }
  }
  revalidateTag(CACHE_TAGS.siteSettings);
  return DONE;
}
