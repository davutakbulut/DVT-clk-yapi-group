import { z } from 'zod';

const optional = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

/** Ziyaretçi formu (iletişim + teklif). Bal küpü `website` dolu gelirse bot. E-posta ya da telefon zorunlu. */
export const leadFormSchema = z
  .object({
    source: z.enum(['contact_form', 'quote_form']),
    locale: z.enum(['tr', 'en']),
    fullName: z.string().trim().min(2).max(120),
    company: optional(120),
    email: z.string().trim().email().max(200).optional().or(z.literal('')),
    phone: z.string().trim().regex(/^\+?[0-9\s()./-]{7,24}$/).optional().or(z.literal('')),
    city: optional(120),
    subject: optional(200),
    message: optional(4000),
    serviceId: z.string().uuid().optional().or(z.literal('')),
    projectType: optional(60),
    budget: optional(60),
    timeline: optional(60),
    consentKvkk: z.literal(true),
    consentMarketing: z.boolean(),
    website: z.literal(''),
    pageUrl: optional(500),
    utmSource: optional(120),
    utmMedium: optional(120),
    utmCampaign: optional(120),
  })
  .refine((v) => Boolean(v.email) || Boolean(v.phone), { message: 'contact', path: ['email'] });

export type LeadFormInput = z.infer<typeof leadFormSchema>;

export interface FormOption {
  readonly key: string;
  readonly label: Readonly<Record<string, string>>;
}
export interface QuoteFormOptions {
  readonly projectTypes: readonly FormOption[];
  readonly budgets: readonly FormOption[];
  readonly timelines: readonly FormOption[];
}

/** "anahtar | TR | EN" satırları → seçenek listesi (admin formu). */
export function parseOptions(text: string): FormOption[] {
  return text
    .split('\n')
    .map((line) => line.split('|').map((p) => p.trim()))
    .filter((parts) => parts[0])
    .map(([key, tr, en]) => ({ key: key!.replace(/[^a-z0-9_-]/gi, '').slice(0, 60), label: { ...(tr ? { tr } : {}), ...(en ? { en } : {}) } }))
    .filter((o) => o.key);
}

export function formatOptions(options: readonly FormOption[]): string {
  return options.map((o) => [o.key, o.label['tr'] ?? '', o.label['en'] ?? ''].join(' | ')).join('\n');
}

export function readOptions(value: unknown): QuoteFormOptions {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const list = (key: string): FormOption[] =>
    Array.isArray(v[key])
      ? (v[key] as unknown[]).flatMap((o) => {
          if (typeof o !== 'object' || o === null) return [];
          const { key: k, label } = o as { key?: unknown; label?: unknown };
          return typeof k === 'string' && typeof label === 'object' && label !== null ? [{ key: k, label: label as Record<string, string> }] : [];
        })
      : [];
  return { projectTypes: list('project_types'), budgets: list('budgets'), timelines: list('timelines') };
}
