'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';

const optional = z.string().trim().max(500).optional().or(z.literal(''));
const schema = z
  .object({
    enabled: z.coerce.boolean(),
    phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional().or(z.literal('')),
    nameTr: optional,
    nameEn: optional,
    greetingTr: optional,
    greetingEn: optional,
    replyTr: optional,
    replyEn: optional,
    // Şablon ya boş (varsayılan mesaj kullanılır) ya da anlamlı bir cümle: tek karakterlik yanlış giriş müşteriye "/" göndertir
    templateTr: optional.refine((v) => !v || v.trim().length >= 10, { message: 'validation' }),
    templateEn: optional.refine((v) => !v || v.trim().length >= 10, { message: 'validation' }),
    delay: z.coerce.number().int().min(0).max(120),
    hiddenPaths: z.string().max(2000).optional().or(z.literal('')),
  })
  .refine((v) => !v.enabled || v.phone, { path: ['phone'] });

const localized = (tr?: string, en?: string) => ({ ...(tr ? { tr } : {}), ...(en ? { en } : {}) });

export async function saveWhatsApp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(['super_admin', 'admin']);
  if (!gate.ok) return failed('forbidden');
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), enabled: formData.get('enabled') === 'on' });
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const { error } = await client.data
    .from('whatsapp_settings')
    .update({
      is_enabled: v.enabled,
      phone_e164: v.phone || null,
      display_name: localized(v.nameTr, v.nameEn),
      greeting: localized(v.greetingTr, v.greetingEn),
      reply_time: localized(v.replyTr, v.replyEn),
      message_templates: { default: localized(v.templateTr, v.templateEn) },
      show_delay_seconds: v.delay,
      hidden_paths: (v.hiddenPaths ?? '').split('\n').map((p) => p.trim()).filter((p) => p.startsWith('/')),
    })
    .eq('key', 'main');
  if (error) {
    logger.error('WhatsApp ayarı kaydedilemedi', { module: 'whatsapp', code: error.code });
    return failed(error.code === '42501' ? 'forbidden' : 'unexpected');
  }
  revalidateTag(CACHE_TAGS.whatsapp);
  return DONE;
}
