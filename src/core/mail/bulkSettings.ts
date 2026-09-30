import { z } from 'zod';

/**
 * Toplu e-posta gönderim ayarları (K-108): site_settings 'mail.bulk'. Panel: Toplu E-posta → Gönderim ayarları.
 * core'da durur: hem cron işi (core/jobs) hem panel modülü aynı şemayı okur. Bozuk alan varsayılana düşer, iş durmaz.
 */
const lt = z.object({ tr: z.string().catch(''), en: z.string().catch('') }).catch({ tr: '', en: '' });

export const bulkMailSettingsSchema = z.object({
  /** Saatte gönderilebilecek EN FAZLA ileti (kampanya + otomatik iletiler birlikte sayılır). Hosting sınırının altında tutulur. */
  hourly_limit: z.number().int().min(1).max(5000).catch(100),
  /** Bir cron koşusunda (dakikada bir) gönderilecek en fazla ileti. */
  batch_size: z.number().int().min(1).max(50).catch(10),
  reply_to: z.string().max(254).catch(''),
  name_fallback: lt,
  footer: lt,
  unsubscribe_label: lt,
});
export type BulkMailSettings = z.infer<typeof bulkMailSettingsSchema>;

export function parseBulkMailSettings(value: unknown): BulkMailSettings {
  return bulkMailSettingsSchema.parse(typeof value === 'object' && value !== null ? value : {});
}

export type MailLocale = 'tr' | 'en';

/** Sayfa (onay düğmeli) ve tek tık (RFC 8058, List-Unsubscribe-Post) adresleri. Yol adları i18n/routing.ts ile aynı olmalı. */
export function unsubscribeUrls(siteUrl: string, locale: MailLocale, token: string): { readonly page: string; readonly oneClick: string } {
  const base = siteUrl.replace(/\/+$/, '');
  const path = locale === 'en' ? '/en/unsubscribe' : '/tr/abonelik-iptal';
  return { page: `${base}${path}?t=${token}`, oneClick: `${base}/api/unsubscribe?t=${token}` };
}

/** Alıcıya özel değişkenler; ad yoksa ayarlardaki hitap ("Yetkili") kullanılır. */
export function campaignVariables(recipient: { readonly email: string; readonly full_name: string | null; readonly company: string | null }, settings: BulkMailSettings, locale: MailLocale): Record<string, string> {
  return { full_name: recipient.full_name?.trim() || settings.name_fallback[locale] || settings.name_fallback.tr, company: recipient.company?.trim() ?? '', email: recipient.email };
}
