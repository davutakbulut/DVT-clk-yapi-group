import { logger } from '@/core/observability/logger';
import { pickLocale } from '@/lib/localized';
import { getPublicSettings } from '@/modules/site-settings';
import { getCachedWhatsAppConfig } from '../../data/whatsappRepository';
import { WhatsAppWidget } from './WhatsAppWidget';

interface Props {
  readonly locale: string;
}

/** Sunucu sarmalayıcı: ayar yoksa/kapalıysa hiçbir şey render etmez (numara engelleyici — ROADMAP). */
export async function WhatsAppButton({ locale }: Props) {
  const [result, settings] = await Promise.all([getCachedWhatsAppConfig(), getPublicSettings()]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'whatsapp', code: result.error.code });
    return null;
  }
  const config = result.data;
  if (!config) return null;

  return (
    <WhatsAppWidget
      phone={config.phone_e164}
      displayName={pickLocale(config.display_name, locale, { fallback: 'tr' })}
      greeting={pickLocale(config.greeting, locale)}
      replyTime={pickLocale(config.reply_time, locale)}
      messageTemplate={pickLocale(config.message_templates['default'], locale) || null}
      delaySeconds={config.show_delay_seconds}
      hiddenPaths={config.hidden_paths}
      // İletişim kartı: yalnız Site Ayarları'nda DOLU olan alanlar gösterilir (uydurma yok)
      email={settings.contact.email || null}
      address={pickLocale(settings.contact.address, locale, { fallback: 'tr' }) || null}
      hours={pickLocale(settings.contact.workingHours, locale, { fallback: 'tr' }) || null}
    />
  );
}
