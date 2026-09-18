import { z } from 'zod';
import { type LocalizedText } from '@/lib/localized';

// Boş nesne {} de 'yok' sayılır (panel boş alanı {} yazar; jsonb NOT NULL).
const localized = z
  .record(z.string(), z.string())
  .transform((v) => (Object.values(v).some((s) => s.trim() !== '') ? v : null))
  .nullable()
  .catch(null);
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
  'seo.default_og_media_id': text,
  'seo.verification': z.object({ google: z.string().optional(), bing: z.string().optional(), yandex: z.string().optional() }).catch({}),
  'cookie_banner': z.record(z.string(), z.object({ title: z.string(), body: z.string(), accept: z.string(), reject: z.string(), settings: z.string() })).nullable().catch(null),
  'maintenance': z.object({ enabled: z.boolean().catch(false), message: z.record(z.string(), z.string()).catch({}) }).catch({ enabled: false, message: {} }),
  'modules.enabled': z.record(z.string(), z.boolean()).catch({}),
  'configurator.disclaimer': z.record(z.string(), z.string()).catch({}),
  'analytics.config': z
    .object({ enabled: z.boolean().catch(true), sample_rate: z.number().min(0).max(1).catch(1), ga4_id: z.string().catch(''), ads_id: z.string().catch(''), meta_pixel_id: z.string().catch('') })
    .catch({ enabled: true, sample_rate: 1, ga4_id: '', ads_id: '', meta_pixel_id: '' }),
});

/** Kill switch anahtarları (K-43/K-61). Listede olmayan ya da bayrağı yazılmamış modül AÇIK sayılır. */
export const MODULE_KEYS = ['services', 'projects', 'blog', 'products', 'solutions', 'pricing', 'testimonials', 'careers', 'leads', 'quoteBasket', 'whatsapp', 'consent', 'configurator'] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

/** Menü bağlantısı → modül: kapalı modülün iç bağlantısı header/footer'da gizlenir. */
export const MODULE_BY_PATH: Readonly<Record<string, ModuleKey>> = {
  '/services': 'services',
  '/projects': 'projects',
  '/blog': 'blog',
  '/products': 'products',
  '/solutions': 'solutions',
  '/pricing': 'pricing',
  '/reviews': 'testimonials',
  '/careers': 'careers',
  '/contact': 'leads',
  '/get-quote': 'leads',
  '/quote-basket': 'quoteBasket',
  '/configurator': 'configurator',
};

export function isModuleEnabled(modules: Readonly<Record<string, boolean>>, key: ModuleKey): boolean {
  return modules[key] !== false;
}

export interface CookieBannerText {
  readonly title: string;
  readonly body: string;
  readonly accept: string;
  readonly reject: string;
  readonly settings: string;
}

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
  readonly seoOgMediaId: string | null;
  readonly seoVerification: { readonly google?: string; readonly bing?: string; readonly yandex?: string };
  readonly cookieBanner: Readonly<Record<string, CookieBannerText>> | null;
  readonly maintenance: { readonly enabled: boolean; readonly message: LocalizedText };
  /** Kill switch (K-43): yalnız kapatılanlar false olarak bulunur. */
  readonly modules: Readonly<Record<string, boolean>>;
  /** İzleyici + üçüncü parti kimlikleri (K-39; yükleme onaya bağlı). */
  readonly analytics: { readonly enabled: boolean; readonly sampleRate: number; readonly ga4Id: string; readonly adsId: string; readonly metaPixelId: string };
  /** Konfigüratör yasal uyarısı (04-CONFIGURATOR zorunlu). */
  readonly configuratorDisclaimer: LocalizedText;
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
  seoOgMediaId: null,
  seoVerification: {},
  cookieBanner: null,
  maintenance: { enabled: false, message: {} },
  modules: {},
  analytics: { enabled: false, sampleRate: 1, ga4Id: '', adsId: '', metaPixelId: '' },
  configuratorDisclaimer: {},
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
    seoOgMediaId: s['seo.default_og_media_id'],
    seoVerification: s['seo.verification'],
    cookieBanner: s['cookie_banner'],
    maintenance: s['maintenance'],
    modules: s['modules.enabled'],
    configuratorDisclaimer: s['configurator.disclaimer'],
    analytics: { enabled: s['analytics.config'].enabled, sampleRate: s['analytics.config'].sample_rate, ga4Id: s['analytics.config'].ga4_id, adsId: s['analytics.config'].ads_id, metaPixelId: s['analytics.config'].meta_pixel_id },
  };
}
