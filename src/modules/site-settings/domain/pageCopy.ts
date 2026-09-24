import { z } from 'zod';
import type { LocalizedText } from '@/lib/localized';

/**
 * Hizmetler / Projeler sayfa metinleri (K-106): site_settings 'services.page' ve 'projects.page'.
 * Sıfır statik veri: hero, gruplar, "neden çelik", süreç, araçlar, SSS, CTA, sayaçlar panelden düzenlenir.
 * Bozuk/eksik alan sayfayı düşürmez: ilgili bölüm sessizce atlanır (catch → boş).
 */
const lt = z.record(z.string(), z.string()).catch({});
const item = z.object({ title: lt, text: lt });
const items = z.array(item).catch([]);
const section = z.object({ title: lt, lede: lt.optional(), items }).catch({ title: {}, items: [] });
const toolItems = z.array(z.object({ href: z.string().max(200), title: lt, text: lt, cta: lt })).catch([]);
const faqItems = z.array(z.object({ q: lt, a: lt })).catch([]);

export const SERVICE_GROUP_KEYS = ['steel', 'engineering', 'construction'] as const;
export type ServiceGroupKey = (typeof SERVICE_GROUP_KEYS)[number];

export const servicesPageSchema = z.object({
  hero: z.object({ title: lt, lede: lt }).catch({ title: {}, lede: {} }),
  groups: z.array(z.object({ key: z.enum(SERVICE_GROUP_KEYS), title: lt, lede: lt })).catch([]),
  why: section,
  steps: section,
  tools: z.object({ title: lt, lede: lt.optional(), items: toolItems }).catch({ title: {}, items: [] }),
  faq: z.object({ title: lt, lede: lt.optional(), items: faqItems }).catch({ title: {}, items: [] }),
  cta: z.object({ title: lt, lede: lt }).catch({ title: {}, lede: {} }),
});
export const projectsPageSchema = z.object({
  hero: z.object({ title: lt, lede: lt }).catch({ title: {}, lede: {} }),
  stats: z.array(z.object({ value: lt, label: lt })).catch([]),
  steps: section,
  empty: z.object({ title: lt, text: lt }).catch({ title: {}, text: {} }),
  cta: z.object({ title: lt, lede: lt }).catch({ title: {}, lede: {} }),
});
export type ServicesPageCopy = z.infer<typeof servicesPageSchema>;
export type ProjectsPageCopy = z.infer<typeof projectsPageSchema>;

export const EMPTY_SERVICES_PAGE: ServicesPageCopy = { hero: { title: {}, lede: {} }, groups: [], why: { title: {}, items: [] }, steps: { title: {}, items: [] }, tools: { title: {}, items: [] }, faq: { title: {}, items: [] }, cta: { title: {}, lede: {} } };
export const EMPTY_PROJECTS_PAGE: ProjectsPageCopy = { hero: { title: {}, lede: {} }, stats: [], steps: { title: {}, items: [] }, empty: { title: {}, text: {} }, cta: { title: {}, lede: {} } };

export function parseServicesPage(value: unknown): ServicesPageCopy {
  const r = servicesPageSchema.safeParse(value);
  return r.success ? r.data : EMPTY_SERVICES_PAGE;
}
export function parseProjectsPage(value: unknown): ProjectsPageCopy {
  const r = projectsPageSchema.safeParse(value);
  return r.success ? r.data : EMPTY_PROJECTS_PAGE;
}

/* ── Panel formu: "Başlık | Metin" satırları ↔ dizi (process_steps ile aynı sözleşme) ── */
export function linesToItems(tr: string, en: string): { title: LocalizedText; text: LocalizedText }[] {
  const split = (s: string) => s.split('\n').map((l) => l.split('|').map((p) => p.trim())).filter((p) => p[0]);
  const a = split(tr), b = split(en);
  return a.map(([t, x = ''], i) => {
    const e = b[i];
    const title: Record<string, string> = { tr: t! }; const text: Record<string, string> = {};
    if (x) text['tr'] = x; if (e?.[0]) title['en'] = e[0]; if (e?.[1]) text['en'] = e[1];
    return { title, text };
  });
}
export function itemsToLines(list: readonly { title: LocalizedText; text: LocalizedText }[], locale: 'tr' | 'en'): string {
  return list.map((i) => [i.title[locale] ?? '', i.text[locale] ?? ''].join(' | ').replace(/ \| $/, '')).filter((l) => l.trim() && l.trim() !== '|').join('\n');
}
