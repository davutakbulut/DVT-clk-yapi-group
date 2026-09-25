import type { LocalizedText } from '@/lib/localized';

/** Konfigüratör anahtarı ↔ rota (K-107). Yeni konfigüratör: buraya + DB CHECK + chooser TYPES. */
export const CONFIGURATOR_KEYS = ['hall', 'multi_storey', 'cladding', 'mezzanine', 'fence', 'drywall'] as const;
export type ConfiguratorKey = (typeof CONFIGURATOR_KEYS)[number];
export const CONFIGURATOR_HREF: Readonly<Record<ConfiguratorKey, '/configurator/hall' | '/configurator/multi-storey' | '/configurator/cladding' | '/configurator/mezzanine' | '/configurator/fence' | '/configurator/drywall'>> = {
  hall: '/configurator/hall',
  multi_storey: '/configurator/multi-storey',
  cladding: '/configurator/cladding',
  mezzanine: '/configurator/mezzanine',
  fence: '/configurator/fence',
  drywall: '/configurator/drywall',
};
/** Chooser TYPES anahtarları (camelCase) → DB anahtarı */
export const CHOOSER_TO_KEY: Readonly<Record<string, ConfiguratorKey>> = { hall: 'hall', multiStorey: 'multi_storey', cladding: 'cladding', mezzanine: 'mezzanine', fence: 'fence', drywall: 'drywall' };

export interface TitledItem { readonly title: LocalizedText; readonly description: LocalizedText }
export interface FaqItem { readonly question: LocalizedText; readonly answer: LocalizedText }

const split = (s: string) => s.split('\n').map((l) => l.split('|').map((p) => p.trim())).filter((p) => p[0]);
/** "Başlık | Açıklama" satırları (TR/EN sıraya göre) → dizi; process_steps ile aynı sözleşme */
export function parsePairs(tr: string, en: string): TitledItem[] {
  const a = split(tr), b = split(en);
  return a.map(([t, d = ''], i) => {
    const title: Record<string, string> = { tr: t! }; const description: Record<string, string> = {};
    if (d) description['tr'] = d; if (b[i]?.[0]) title['en'] = b[i]![0]!; if (b[i]?.[1]) description['en'] = b[i]![1]!;
    return { title, description };
  });
}
export function formatPairs(items: readonly TitledItem[], locale: 'tr' | 'en'): string {
  return items.map((i) => [i.title[locale] ?? '', i.description[locale] ?? ''].join(' | ').replace(/ \| $/, '')).filter((l) => l.trim() && l.trim() !== '|').join('\n');
}
export function parseFaqs(tr: string, en: string): FaqItem[] {
  return parsePairs(tr, en).map((p) => ({ question: p.title, answer: p.description }));
}
export function formatFaqs(items: readonly FaqItem[], locale: 'tr' | 'en'): string {
  return formatPairs(items.map((f) => ({ title: f.question, description: f.answer })), locale);
}
const isLt = (v: unknown): v is LocalizedText => typeof v === 'object' && v !== null && !Array.isArray(v);
export function readPairs(v: unknown): TitledItem[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((e) => (typeof e === 'object' && e !== null && isLt((e as { title?: unknown }).title) ? [{ title: (e as { title: LocalizedText }).title, description: isLt((e as { description?: unknown }).description) ? (e as { description: LocalizedText }).description : {} }] : []));
}
export function readFaqs(v: unknown): FaqItem[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((e) => (typeof e === 'object' && e !== null && isLt((e as { question?: unknown }).question) ? [{ question: (e as { question: LocalizedText }).question, answer: isLt((e as { answer?: unknown }).answer) ? (e as { answer: LocalizedText }).answer : {} }] : []));
}
