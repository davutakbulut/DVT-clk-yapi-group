import { z } from 'zod';
import { type LocalizedText } from '@/lib/localized';

const localized = z.record(z.string(), z.string()).nullable().catch(null);
const text = z.string().min(1).nullable().catch(null);

/** 0012 referans verisindeki anahtarlar. Bilinmeyen/bozuk değer alanı null'a düşürür, sayfayı düşürmez. */
const schema = z.object({
  'site.name': localized,
  'site.tagline': localized,
  'site.logo_media_id': text,
  'site.logo_dark_media_id': text,
  'contact.phone': text,
  'contact.email': text,
  'contact.address': localized,
  'contact.map_url': text,
  'contact.working_hours': localized,
  'social.links': z.array(z.object({ platform: z.string().min(1), url: z.string().url() })).catch([]),
  'seo.default_description': localized,
});

export interface PublicSettings {
  readonly siteName: LocalizedText;
  readonly tagline: LocalizedText | null;
  readonly logoMediaId: string | null;
  readonly logoDarkMediaId: string | null;
  readonly contact: {
    readonly phone: string | null;
    readonly email: string | null;
    readonly address: LocalizedText | null;
    readonly mapUrl: string | null;
    readonly workingHours: LocalizedText | null;
  };
  readonly socialLinks: readonly { readonly platform: string; readonly url: string }[];
  readonly seoDescription: LocalizedText | null;
}

// Veritabanı ulaşılamazsa bile site ayakta kalır (03-ERROR-ISOLATION Katman 2). Yer tutucu iletişim bilgisi YOK.
export const DEFAULT_SETTINGS: PublicSettings = {
  siteName: { tr: 'CLK Yapı Group', en: 'CLK Yapı Group' }, // static-ok: marka adı, veri gelmezse son çare
  tagline: null,
  logoMediaId: null,
  logoDarkMediaId: null,
  contact: { phone: null, email: null, address: null, mapUrl: null, workingHours: null },
  socialLinks: [],
  seoDescription: null,
};

export function parseSettings(rows: readonly { readonly key: string; readonly value: unknown }[]): PublicSettings {
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const s = schema.parse(raw);
  return {
    siteName: s['site.name'] ?? DEFAULT_SETTINGS.siteName,
    tagline: s['site.tagline'],
    logoMediaId: s['site.logo_media_id'],
    logoDarkMediaId: s['site.logo_dark_media_id'],
    contact: {
      phone: s['contact.phone'],
      email: s['contact.email'],
      address: s['contact.address'],
      mapUrl: s['contact.map_url'],
      workingHours: s['contact.working_hours'],
    },
    socialLinks: s['social.links'],
    seoDescription: s['seo.default_description'],
  };
}
