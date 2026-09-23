import { isLocalizedText, type LocalizedText } from '@/lib/localized';

/** Ürün seçim seçenekleri (products.options, K-88): kalite listesi, stok boyları, özel boy izni, adet birimi. */
export interface ProductOptions {
  readonly grades: readonly string[];
  readonly lengthsM: readonly number[];
  readonly customLength: boolean;
  readonly unit: string | null;
}
export const EMPTY_OPTIONS: ProductOptions = { grades: [], lengthsM: [], customLength: false, unit: null };

const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()).slice(0, 20) : []);
const numList = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isFinite(n) && n > 0).slice(0, 20) : []);

export function readOptions(raw: unknown): ProductOptions {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return EMPTY_OPTIONS;
  const o = raw as Record<string, unknown>;
  return { grades: strList(o['grades']), lengthsM: numList(o['lengths_m']), customLength: o['custom_length'] === true, unit: typeof o['unit'] === 'string' && o['unit'].trim() ? o['unit'].trim().slice(0, 20) : null };
}
export function writeOptions(o: ProductOptions): Record<string, unknown> {
  return { grades: [...o.grades], lengths_m: [...o.lengthsM], custom_length: o.customLength, unit: o.unit };
}
/** Panel: "S235JRH, S275J0H" ve "6, 12" biçimli alanlardan. */
export function parseList(text: string): string[] {
  return text.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
}
export function parseNumberList(text: string): number[] {
  return parseList(text).map((s) => Number(s.replace(',', '.'))).filter((n) => Number.isFinite(n) && n > 0);
}

/** Başlık altı "kısa gerçekler" şeridi (products.facts): etiket + değer, iki dilli. */
export interface Fact {
  readonly label: LocalizedText;
  readonly value: LocalizedText;
}
export function readFacts(raw: unknown): Fact[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is { label: unknown; value: unknown } => typeof f === 'object' && f !== null).map((f) => ({ label: isLocalizedText(f.label) ? f.label : {}, value: isLocalizedText(f.value) ? f.value : {} })).filter((f) => f.label['tr'] || f.value['tr']).slice(0, 8);
}
/** Panel satırı: "Etiket | Değer"; TR ve EN satırları sırayla eşleşir. */
export function parseFacts(tr: string, en: string): Fact[] {
  const split = (t: string) => t.split('\n').map((l) => l.split('|').map((p) => p.trim())).filter((p) => p[0] || p[1]);
  const a = split(tr);
  const b = split(en);
  return a.slice(0, 8).map((row, i) => {
    const e = b[i];
    const pick = (idx: number): LocalizedText => ({ ...(row[idx] ? { tr: row[idx] } : {}), ...(e?.[idx] ? { en: e[idx] } : {}) });
    return { label: pick(0), value: pick(1) };
  });
}
export function formatFacts(facts: readonly Fact[], locale: 'tr' | 'en'): string {
  return facts.map((f) => `${f.label[locale] ?? ''} | ${f.value[locale] ?? ''}`).join('\n');
}

/** Kesit değerleri (product_variants.props): sabit anahtar sırası ve birimleri. */
export const PROP_KEYS = ['A', 'Ix', 'Iy', 'Wx', 'Wy', 'ix', 'iy', 'u'] as const;
export type PropKey = (typeof PROP_KEYS)[number];
export const PROP_UNITS: Record<PropKey, string> = { A: 'cm²', Ix: 'cm⁴', Iy: 'cm⁴', Wx: 'cm³', Wy: 'cm³', ix: 'cm', iy: 'cm', u: 'm²/m' };
export function readProps(raw: unknown): Partial<Record<PropKey, number>> {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Partial<Record<PropKey, number>> = {};
  for (const k of PROP_KEYS) {
    const v = Number((raw as Record<string, unknown>)[k]);
    if (Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}

/** Seçici için asgari varyant kesiti (sunucu ve istemci ortak). */
export interface SelectableVariant {
  readonly id: string;
  readonly sizeLabel: string;
  readonly widthMm: number | null;
  readonly heightMm: number | null;
  readonly thicknessMm: number | null;
  readonly lengthMm: number | null;
  readonly kgPerM: number | null;
  readonly stockCode: string | null;
  readonly group: string | null;
  readonly props: Partial<Record<PropKey, number>>;
}

/** Seçici anlamlı mı: ölçü ya da ağırlık bilgisi olan en az bir varyant. */
export function isConfigurable(variants: readonly SelectableVariant[]): boolean {
  return variants.some((v) => v.kgPerM !== null || (v.widthMm !== null && v.heightMm !== null));
}
/** "H × B" anahtarı (yükseklik × genişlik); ölçüsüz varyantta etiket. */
export function sizeKey(v: SelectableVariant): string {
  return v.heightMm !== null && v.widthMm !== null ? `${fmt(v.heightMm)}×${fmt(v.widthMm)}` : v.sizeLabel;
}
export const fmt = (n: number): string => String(Math.round(n * 100) / 100).replace('.', ',');
export function groupsOf(variants: readonly SelectableVariant[]): string[] {
  return [...new Set(variants.map((v) => v.group).filter((g): g is string => Boolean(g)))];
}
export function sizesOf(variants: readonly SelectableVariant[], group: string | null): string[] {
  return [...new Set(variants.filter((v) => group === null || v.group === group).map(sizeKey))];
}
export function thicknessesOf(variants: readonly SelectableVariant[], group: string | null, size: string): number[] {
  return [...new Set(variants.filter((v) => (group === null || v.group === group) && sizeKey(v) === size && v.thicknessMm !== null).map((v) => v.thicknessMm!))].sort((a, b) => a - b);
}
export function findVariant(variants: readonly SelectableVariant[], group: string | null, size: string, thickness: number | null): SelectableVariant | null {
  return variants.find((v) => (group === null || v.group === group) && sizeKey(v) === size && (thickness === null || v.thicknessMm === thickness)) ?? null;
}
/** TS EN 10219-2 köşe yarıçapı: t ≤ 6 → 2t; 6 < t ≤ 10 → 2,5t; t > 10 → 3t (dış); iç = dış − t. */
export function cornerRadii(t: number): { readonly outer: number; readonly inner: number } {
  const outer = t <= 6 ? 2 * t : t <= 10 ? 2.5 * t : 3 * t;
  return { outer, inner: Math.max(outer - t, 0) };
}
/** Ağırlık: kg/m × boy (m) × adet. */
export function weightOf(kgPerM: number | null, lengthM: number, qty: number): { readonly perBar: number | null; readonly total: number | null } {
  if (kgPerM === null || !(lengthM > 0) || !(qty > 0)) return { perBar: null, total: null };
  const perBar = kgPerM * lengthM;
  return { perBar, total: perBar * qty };
}
/** Arama normalizasyonu: "100x50", "100×50", "100*50" aynı; ondalık virgül → nokta. */
export function normSearch(s: string): string {
  return s.toLocaleLowerCase('en-US').replace(/[x*×]/g, 'x').replace(/,/g, '.').replace(/\s/g, '');
}
