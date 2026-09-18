import { z } from 'zod';
import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

const MODULE = 'whatsapp';
const localized = z.record(z.string(), z.string()).catch({});

const schema = z.object({
  phone_e164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  display_name: localized,
  greeting: localized,
  reply_time: localized,
  message_templates: z.record(z.string(), localized).catch({}),
  hidden_paths: z.array(z.string()).catch([]),
  show_delay_seconds: z.number().int().min(0).catch(3),
});

export type WhatsAppConfig = z.infer<typeof schema>;

/** RLS yalnız is_enabled=true satırını verir; satır yoksa bileşen hiç render edilmez (numara girilene kadar KAPALI). */
async function fetchWhatsAppConfig(): Promise<Result<WhatsAppConfig | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('whatsapp_settings')
    .select('phone_e164, display_name, greeting, reply_time, message_templates, hidden_paths, show_delay_seconds')
    .eq('key', 'main')
    .eq('is_enabled', true)
    .maybeSingle();
  if (error) return err(appError('external_service', error.message, { module: MODULE }));
  if (!data) return ok(null);
  const parsed = schema.safeParse(data);
  return parsed.success ? ok(parsed.data) : err(appError('validation', 'whatsapp_settings geçersiz', { module: MODULE, cause: parsed.error }));
}

export const getCachedWhatsAppConfig = cached(fetchWhatsAppConfig, ['whatsapp', 'main'], { tags: [CACHE_TAGS.whatsapp] });
