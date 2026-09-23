import { z } from 'zod';

/** Referrer türü (06-ANALYTICS "AI kaynaklı trafik"): host'a göre; UTM varsa reklam/e-posta öne geçer. */
export type ReferrerKind = 'direct' | 'search' | 'social' | 'ai' | 'referral' | 'ads' | 'email';

const AI_HOSTS = ['chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com', 'you.com', 'bing.com/chat'];
const SEARCH_HOSTS = ['google.', 'bing.com', 'yandex.', 'duckduckgo.com', 'yahoo.', 'baidu.com', 'ecosia.org'];
const SOCIAL_HOSTS = ['facebook.com', 'instagram.com', 'linkedin.com', 'x.com', 'twitter.com', 't.co', 'youtube.com', 'tiktok.com', 'pinterest.', 'whatsapp.com', 'telegram.'];

export function classifyReferrer(referrer: string | null | undefined, utm: Readonly<Record<string, string>>, ownHost: string): { kind: ReferrerKind; host: string | null } {
  const medium = (utm['medium'] ?? '').toLocaleLowerCase('en');
  if (medium === 'cpc' || medium === 'ppc' || medium === 'paid' || utm['gclid'] || utm['fbclid']) return { kind: 'ads', host: hostOf(referrer) };
  if (medium === 'email' || medium === 'newsletter') return { kind: 'email', host: hostOf(referrer) };
  const host = hostOf(referrer);
  if (!host || host === ownHost || host.endsWith(`.${ownHost}`)) return { kind: 'direct', host: null };
  if (AI_HOSTS.some((h) => host === h || host.endsWith(`.${h}`) || (referrer ?? '').includes(h))) return { kind: 'ai', host };
  if (SEARCH_HOSTS.some((h) => host.includes(h))) return { kind: 'search', host };
  if (SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`) || host.includes(h))) return { kind: 'social', host };
  return { kind: 'referral', host };
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLocaleLowerCase('en') || null;
  } catch {
    return null;
  }
}

export function detectDevice(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < 768) return 'mobile';
  if (width < 1120) return 'tablet';
  return 'desktop';
}

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python-requests|facebookexternalhit|embedly|quora link|pinterestbot|bitlybot|playwright/i;
/** Bot trafiği yazılmadan süzülür; test tarayıcıları E2E'de `?e2e_track=1` ile açıkça izin alır. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_RE.test(userAgent);
}

/** Kaba tarayıcı/OS adı (sürüm yok — kişisel veri asgari). */
export function parseUserAgent(ua: string | null | undefined): { browser: string; os: string } {
  const s = ua ?? '';
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /SamsungBrowser/.test(s) ? 'Samsung' : /Firefox\//.test(s) ? 'Firefox' : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Other';
  const os = /Android/.test(s) ? 'Android' : /iPhone|iPad|iPod/.test(s) ? 'iOS' : /Windows/.test(s) ? 'Windows' : /Mac OS/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : 'Other';
  return { browser, os };
}

/** IPv4 son oktet sıfırlanır, IPv6 ilk 4 blok kalır (KVKK maskeleme). */
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const v = ip.split(',')[0]!.trim();
  if (v.includes(':')) return `${v.split(':').slice(0, 4).join(':')}::`;
  const parts = v.split('.');
  return parts.length === 4 ? `${parts.slice(0, 3).join('.')}.0` : null;
}

const uuid = z.string().uuid();
const path = z.string().min(1).max(500);
const device = z.enum(['mobile', 'tablet', 'desktop']);

/** İstemciden gelen toplu paket (sendBeacon). Alan içerikleri asla yok; metinler kısa. K-104: utm ≤ 10 anahtar, olay payload ≤ 1 KB. */
export const collectSchema = z.object({
  session: z.object({
    id: uuid,
    visitor: z.string().min(8).max(64),
    device,
    locale: z.enum(['tr', 'en']).optional(),
    referrer: z.string().max(1000).optional(),
    utm: z.record(z.string().max(60), z.string().max(200)).refine((v) => Object.keys(v).length <= 10, 'utm').default({}),
    landing_path: path.optional(),
    viewport_w: z.number().int().min(0).max(10_000).optional(),
    viewport_h: z.number().int().min(0).max(10_000).optional(),
  }),
  pageviews: z.array(z.object({ id: uuid, path, locale: z.enum(['tr', 'en']).optional(), viewed_at: z.string().optional(), duration_ms: z.number().int().min(0).max(86_400_000).optional(), max_scroll_pct: z.number().int().min(0).max(100).optional(), viewport_w: z.number().int().optional(), viewport_h: z.number().int().optional() })).max(50).default([]),
  events: z.array(z.object({ pageview_id: uuid.optional(), type: z.enum(['click', 'rage_click', 'dead_click', 'attention', 'form_focus', 'form_abandon', 'conversion', 'custom']), path, x_pct: z.number().min(0).max(100).optional(), y_pct: z.number().min(0).max(100).optional(), selector: z.string().max(200).optional(), element_text: z.string().max(80).optional(), payload: z.record(z.string().max(60), z.unknown()).refine((v) => JSON.stringify(v).length <= 1024, 'payload').default({}), occurred_at: z.string().optional() })).max(200).default([]),
  vitals: z.array(z.object({ path, metric: z.enum(['LCP', 'CLS', 'INP', 'TTFB', 'FCP']), value: z.number().min(0), rating: z.enum(['good', 'needs_improvement', 'poor']).optional() })).max(20).default([]),
  forms: z.array(z.object({ form_key: z.string().min(1).max(60), field_name: z.string().min(1).max(60), focus: z.number().int().min(0).optional(), abandon: z.number().int().min(0).optional(), error: z.number().int().min(0).optional(), time_ms: z.number().int().min(0).optional() })).max(50).default([]),
});
export type CollectBatch = z.infer<typeof collectSchema>;

/** Web Vitals eşikleri (web.dev): iyi / iyileştirilmeli / kötü. */
export function rateVital(metric: 'LCP' | 'CLS' | 'INP' | 'TTFB' | 'FCP', value: number): 'good' | 'needs_improvement' | 'poor' {
  const t: Record<typeof metric, [number, number]> = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], TTFB: [800, 1800], FCP: [1800, 3000] };
  const [good, poor] = t[metric];
  return value <= good ? 'good' : value <= poor ? 'needs_improvement' : 'poor';
}
