import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface WhatsAppAdminRow {
  readonly is_enabled: boolean;
  readonly phone_e164: string | null;
  readonly display_name: Record<string, string>;
  readonly greeting: Record<string, string>;
  readonly reply_time: Record<string, string>;
  readonly template: Record<string, string>;
  readonly show_delay_seconds: number;
  readonly hidden_paths: string[];
}

const rec = (v: unknown): Record<string, string> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, string>) : {});

export async function loadWhatsAppForAdmin(): Promise<Result<WhatsAppAdminRow>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('whatsapp_settings').select('*').eq('key', 'main').maybeSingle();
  if (error) return err(appError('external_service', error.message, { module: 'whatsapp' }));
  if (!data) return err(appError('not_found', 'whatsapp_settings.main yok', { module: 'whatsapp' }));
  const templates = rec(data.message_templates);
  return ok({
    is_enabled: data.is_enabled,
    phone_e164: data.phone_e164,
    display_name: rec(data.display_name),
    greeting: rec(data.greeting),
    reply_time: rec(data.reply_time),
    template: rec(templates['default']),
    show_delay_seconds: data.show_delay_seconds,
    hidden_paths: data.hidden_paths ?? [],
  });
}
