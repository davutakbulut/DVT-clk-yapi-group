import { z } from 'zod';

/** Toplu e-posta (K-108) — alan tanımları. Kitle kuralları veritabanında (0057 app_private.mail_audience) uygulanır. */

export const CAMPAIGN_SEGMENTS = ['customers_corporate', 'customers_individual', 'leads'] as const;
export type CampaignSegment = (typeof CAMPAIGN_SEGMENTS)[number];

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'paused', 'sent', 'cancelled'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const RECIPIENT_STATUSES = ['pending', 'sending', 'sent', 'failed', 'skipped'] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

export const SUPPRESSION_REASONS = ['unsubscribed', 'bounced', 'complaint', 'manual'] as const;
export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];

export const MANUAL_LIMIT = 2000;

export interface ManualRecipient {
  readonly email: string;
  readonly name?: string;
}

export interface CampaignAudience {
  readonly segments: readonly CampaignSegment[];
  readonly city?: string;
  readonly manual: readonly ManualRecipient[];
  readonly manual_attested: boolean;
}

export const EMPTY_AUDIENCE: CampaignAudience = { segments: [], manual: [], manual_attested: false };

const audienceSchema = z.object({
  segments: z.array(z.enum(CAMPAIGN_SEGMENTS)).catch([]),
  city: z.string().max(80).optional().catch(undefined),
  manual: z.array(z.object({ email: z.string().max(254), name: z.string().max(160).optional() })).max(MANUAL_LIMIT).catch([]),
  manual_attested: z.boolean().catch(false),
});

/** Veritabanındaki audience JSON'u (bozuksa boş kitle). */
export function parseAudience(value: unknown): CampaignAudience {
  const parsed = audienceSchema.safeParse(typeof value === 'object' && value !== null ? value : {});
  if (!parsed.success) return EMPTY_AUDIENCE;
  const { city, ...rest } = parsed.data;
  return { ...rest, manual: rest.manual.map((m) => (m.name ? { email: m.email, name: m.name } : { email: m.email })), ...(city ? { city } : {}) };
}

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** E-posta ASCII'dir: yalnız A–Z aralığı küçültülür (Türkçe toLowerCase tuzağı: 'I' → 'ı'). */
function asciiLower(text: string): string {
  return text.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

export interface ManualParseResult {
  readonly recipients: readonly ManualRecipient[];
  /** Adres biçimine uymadığı için alınmayan satırlar (ilk 20). */
  readonly invalid: readonly string[];
  readonly duplicates: number;
}

/**
 * Yapıştırılan liste → alıcılar. Satır başına bir kişi; kabul edilen biçimler:
 *   adres@alan.com · Ad Soyad <adres@alan.com> · adres@alan.com; Ad Soyad · Ad Soyad, adres@alan.com (Excel'den kopyalanan iki sütun, sekmeyle)
 */
export function parseManualList(text: string): ManualParseResult {
  const seen = new Set<string>();
  const recipients: ManualRecipient[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const angle = /^(.*)<([^<>\s]+)>\s*$/.exec(line);
    const parts = angle ? [angle[2]!, angle[1]!] : line.split(/[;,\t]/).map((p) => p.trim());
    const emailPart = parts.find((p) => p.includes('@')) ?? '';
    const email = asciiLower(emailPart.trim());
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      if (invalid.length < 20) invalid.push(line.slice(0, 80));
      continue;
    }
    if (seen.has(email)) { duplicates++; continue; }
    seen.add(email);
    const name = parts.filter((p) => p !== emailPart).join(' ').replace(/["']/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
    recipients.push(name ? { email, name } : { email });
    if (recipients.length >= MANUAL_LIMIT) break;
  }
  return { recipients, invalid, duplicates };
}

/** Düzenleme alanına geri yazım: "Ad Soyad <adres>" ya da yalnız adres. */
export function formatManualList(recipients: readonly ManualRecipient[]): string {
  return recipients.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)).join('\n');
}

export const campaignSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  name: z.string().trim().min(2).max(120),
  locale: z.enum(['tr', 'en']),
  subject: z.string().trim().max(200),
  preheader: z.string().trim().max(200),
  body: z.string().max(20000),
  ctaLabel: z.string().trim().max(80),
  ctaUrl: z.string().trim().max(500).regex(/^(https:\/\/\S+)?$/),
  city: z.string().trim().max(80),
  manualList: z.string().max(200_000),
});
export type CampaignInput = z.infer<typeof campaignSchema>;

/** Gönderim ilerlemesi (0–100); alıcı yoksa 0. */
export function progressPercent(stats: { readonly total: number; readonly pending: number }): number {
  if (stats.total <= 0) return 0;
  return Math.round(((stats.total - stats.pending) / stats.total) * 100);
}

/**
 * Kalan alıcılar için kaba süre (dakika). Saatlik sınırın içinde kalan gönderim dakikada `batchSize` hızla gider;
 * sınırı aşan gönderim saat başına `hourlyLimit` hızına düşer.
 */
export function estimateMinutes(pending: number, hourlyLimit: number, batchSize: number): number {
  if (pending <= 0) return 0;
  const perMinute = Math.max(1, batchSize);
  if (pending <= hourlyLimit) return Math.ceil(pending / perMinute);
  return Math.ceil((pending / Math.max(1, Math.min(hourlyLimit, perMinute * 60))) * 60);
}

// ── Hazır şablonlar (K-109) ─────────────────────────────────────────────────────────────────────────────────────────────

export const TEMPLATE_CATEGORIES = ['announcement', 'product', 'pricing', 'followup', 'event', 'greeting', 'relationship', 'operations'] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface LocalizedPair {
  readonly tr: string;
  readonly en: string;
}

export interface CampaignTemplate {
  readonly id: string;
  readonly name: string;
  readonly category: TemplateCategory;
  readonly description: string;
  readonly subject: LocalizedPair;
  readonly preheader: LocalizedPair;
  readonly body: LocalizedPair;
  readonly cta_label: LocalizedPair;
  readonly cta_url: LocalizedPair;
  readonly sort_order: number;
  readonly is_active: boolean;
}

/** Şablonun seçilen dildeki içeriği; o dilde boş olan alan Türkçeye düşer. */
export function templateContent(template: CampaignTemplate, locale: 'tr' | 'en'): { readonly subject: string; readonly preheader: string; readonly body: string; readonly ctaLabel: string; readonly ctaUrl: string } {
  // Metin o dilde yoksa TÜM alanlar Türkçe kalır (yarısı İngilizce ileti çıkmasın)
  const use = template.body[locale] ? locale : 'tr';
  return { subject: template.subject[use] || template.subject.tr, preheader: template.preheader[use], body: template.body[use], ctaLabel: template.cta_label[use], ctaUrl: template.cta_url[use] };
}

/**
 * Doldurulmamış şablon alanları: köşeli parantez içindeki metinler ([tarih], [ürün adı]).
 * Bağlantı biçimi [metin](https://…) alan DEĞİLDİR. Aynı alan bir kez döner, en çok 12.
 */
export function findPlaceholders(...texts: readonly string[]): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(/\[([^\]\n]{1,80})\](?!\()/g)) {
      found.add(`[${match[1]}]`);
      if (found.size >= 12) return [...found];
    }
  }
  return [...found];
}

const httpsOrEmpty = z.string().trim().max(500).regex(/^(https:\/\/\S+)?$/);

export const templateSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  name: z.string().trim().min(2).max(120),
  category: z.enum(TEMPLATE_CATEGORIES),
  description: z.string().trim().max(300),
  subjectTr: z.string().trim().min(1).max(200),
  subjectEn: z.string().trim().max(200),
  preheaderTr: z.string().trim().max(200),
  preheaderEn: z.string().trim().max(200),
  bodyTr: z.string().max(20000).refine((v) => v.trim().length > 0),
  bodyEn: z.string().max(20000),
  ctaLabelTr: z.string().trim().max(80),
  ctaLabelEn: z.string().trim().max(80),
  ctaUrlTr: httpsOrEmpty,
  ctaUrlEn: httpsOrEmpty,
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
});
export type TemplateInput = z.infer<typeof templateSchema>;
