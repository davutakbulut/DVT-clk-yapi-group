import { isLocalizedText, pickLocale, type LocalizedText } from '@/lib/localized';

/** Kesit türü → 2B çizim + 3B dış hat (K-90). `plate`: kg/m² ve plaka ebadıyla hesap. */
export const DRAW_KINDS = ['box', 'pipe', 'I', 'Itaper', 'U', 'L', 'T', 'flat', 'trap', 'plate'] as const;
export type DrawKind = (typeof DRAW_KINDS)[number];
export const SURFACE_KEYS = ['black', 'galv', 'red', 'raw', 'alu', 'ss'] as const;
export type SurfaceKey = (typeof SURFACE_KEYS)[number];
/** Yüzey örnek renkleri (CSS `background`); etiketler next-intl `Products.surf.*`. */
export const SURFACE_SWATCH: Record<SurfaceKey, string> = {
  black: '#34373c',
  galv: 'linear-gradient(135deg,#dfe4ea,#aab3bd)',
  red: '#8e2f22',
  raw: 'linear-gradient(135deg,#c7ccd2,#8f979f)',
  alu: 'linear-gradient(135deg,#eef1f4,#bfc6ce)',
  ss: 'linear-gradient(135deg,#f1f3f5,#aeb6bf)',
};

export interface ProductGroup {
  readonly code: string;
  readonly label: LocalizedText;
}
export interface PlateFormat {
  readonly w: number;
  readonly l: number;
}

/** Ürün seçim seçenekleri (products.options, K-88 + K-90). */
export interface ProductOptions {
  readonly grades: readonly string[];
  readonly gradesByGroup: Readonly<Record<string, readonly string[]>>;
  readonly lengthsM: readonly number[];
  readonly customLength: boolean;
  readonly unit: string | null;
  readonly draw: DrawKind | null;
  readonly pattern: 'tear' | null;
  readonly groups: readonly ProductGroup[];
  readonly groupLabel: LocalizedText;
  readonly sizeLabel: LocalizedText;
  readonly variantLabel: LocalizedText;
  readonly gradeLabel: LocalizedText;
  readonly lengthLabel: LocalizedText;
  readonly oneLabel: LocalizedText;
  readonly tableNote: LocalizedText;
  readonly sizeUi: 'chips' | 'select';
  readonly qtyDefault: number | null;
  readonly formats: Readonly<Record<string, readonly PlateFormat[]>>;
  readonly surfaces: readonly SurfaceKey[];
  readonly surfacesByGroup: Readonly<Record<string, readonly SurfaceKey[]>>;
}
export const EMPTY_OPTIONS: ProductOptions = {
  grades: [], gradesByGroup: {}, lengthsM: [], customLength: false, unit: null, draw: null, pattern: null, groups: [],
  groupLabel: {}, sizeLabel: {}, variantLabel: {}, gradeLabel: {}, lengthLabel: {}, oneLabel: {}, tableNote: {},
  sizeUi: 'select', qtyDefault: null, formats: {}, surfaces: [], surfacesByGroup: {},
};

const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()).slice(0, 20) : []);
const numList = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isFinite(n) && n > 0).slice(0, 20) : []);
const surfList = (v: unknown): SurfaceKey[] => strList(v).filter((s): s is SurfaceKey => (SURFACE_KEYS as readonly string[]).includes(s));
const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const byGroup = <T>(v: unknown, map: (x: unknown) => T[]): Record<string, T[]> => Object.fromEntries(Object.entries(obj(v)).map(([k, x]) => [k, map(x)]).filter(([, list]) => (list as T[]).length > 0));
const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const code = (s: string): string => s.trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12);

export function readOptions(raw: unknown): ProductOptions {
  const o = obj(raw);
  if (Object.keys(o).length === 0) return EMPTY_OPTIONS;
  const draw = typeof o['draw'] === 'string' && (DRAW_KINDS as readonly string[]).includes(o['draw']) ? (o['draw'] as DrawKind) : null;
  const groups = Array.isArray(o['groups'])
    ? o['groups'].map((g) => obj(g)).map((g) => ({ code: code(String(g['code'] ?? '')), label: lt(g['label']) })).filter((g) => g.code).slice(0, 12)
    : [];
  const formats = byGroup(o['formats'], (list) => (Array.isArray(list) ? list.map((f) => obj(f)).map((f) => ({ w: Number(f['w']), l: Number(f['l']) })).filter((f) => f.w > 0 && f.l > 0).slice(0, 12) : []));
  return {
    grades: strList(o['grades']),
    gradesByGroup: byGroup(o['grades_by_group'], strList),
    lengthsM: numList(o['lengths_m']),
    customLength: o['custom_length'] === true,
    unit: typeof o['unit'] === 'string' && o['unit'].trim() ? o['unit'].trim().slice(0, 20) : null,
    draw,
    pattern: o['pattern'] === 'tear' ? 'tear' : null,
    groups,
    groupLabel: lt(o['group_label']),
    sizeLabel: lt(o['size_label']),
    variantLabel: lt(o['variant_label']),
    gradeLabel: lt(o['grade_label']),
    lengthLabel: lt(o['length_label']),
    oneLabel: lt(o['one_label']),
    tableNote: lt(o['table_note']),
    sizeUi: o['size_ui'] === 'chips' ? 'chips' : 'select',
    qtyDefault: Number.isFinite(Number(o['qty_default'])) && Number(o['qty_default']) > 0 ? Math.floor(Number(o['qty_default'])) : null,
    formats,
    surfaces: surfList(o['surfaces']),
    surfacesByGroup: byGroup(o['surfaces_by_group'], surfList),
  };
}
export function writeOptions(o: ProductOptions): Record<string, unknown> {
  const nonEmpty = (t: LocalizedText) => (Object.values(t).some(Boolean) ? t : undefined);
  const out: Record<string, unknown> = {
    grades: [...o.grades], lengths_m: [...o.lengthsM], custom_length: o.customLength, unit: o.unit,
    draw: o.draw, pattern: o.pattern, size_ui: o.sizeUi, qty_default: o.qtyDefault,
    groups: o.groups.map((g) => ({ code: g.code, label: g.label })),
    grades_by_group: o.gradesByGroup, formats: o.formats, surfaces: [...o.surfaces], surfaces_by_group: o.surfacesByGroup,
    group_label: nonEmpty(o.groupLabel), size_label: nonEmpty(o.sizeLabel), variant_label: nonEmpty(o.variantLabel), grade_label: nonEmpty(o.gradeLabel),
    length_label: nonEmpty(o.lengthLabel), one_label: nonEmpty(o.oneLabel), table_note: nonEmpty(o.tableNote),
  };
  for (const k of Object.keys(out)) if (out[k] === undefined || out[k] === null) delete out[k];
  return out;
}
/** Panel: "S235JRH, S275J0H" ve "6, 12" biçimli alanlardan. */
export function parseList(text: string): string[] {
  return text.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
}
export function parseNumberList(text: string): number[] {
  return parseList(text).map((s) => Number(s.replace(',', '.'))).filter((n) => Number.isFinite(n) && n > 0);
}
/**
 * Panel: grup bazlı liste. Satır "KOD: a, b" → gruba özel; ':' içermeyen satır(lar) → genel liste.
 * Ör. kaliteler "DKP: DC01, DC03\nHRP: S235JR" ya da düz "S235JR, S275JR".
 */
export function parseGrouped(text: string): { readonly flat: string[]; readonly byGroup: Record<string, string[]> } {
  const flat: string[] = [];
  const byGroup: Record<string, string[]> = {};
  for (const line of text.split('\n')) {
    const m = /^\s*([A-Za-z0-9_-]{1,12})\s*:\s*(.+)$/.exec(line);
    if (m) byGroup[m[1]!] = parseList(m[2]!);
    else flat.push(...parseList(line));
  }
  return { flat: flat.slice(0, 20), byGroup };
}
export function formatGrouped(flat: readonly string[], byGroup: Readonly<Record<string, readonly string[]>>): string {
  return [...(flat.length ? [flat.join(', ')] : []), ...Object.entries(byGroup).map(([g, list]) => `${g}: ${list.join(', ')}`)].join('\n');
}
/** Panel: gruplar "K | Kare | Square" satırları. */
export function parseGroups(text: string): ProductGroup[] {
  return text.split('\n').map((l) => l.split('|').map((p) => p.trim())).filter((p) => p[0]).map((p) => ({ code: code(p[0]!), label: { ...(p[1] ? { tr: p[1] } : {}), ...(p[2] ? { en: p[2] } : {}) } })).filter((g) => g.code).slice(0, 12);
}
export function formatGroups(groups: readonly ProductGroup[]): string {
  return groups.map((g) => [g.code, g.label['tr'] ?? '', g.label['en'] ?? ''].join(' | ').replace(/( \|)+$/, '')).join('\n');
}
/** Panel: plaka ebatları "HRP: 1000×2000, 1500×3000" (grup zorunlu; tek gruplu üründe grup kodu yazılır). */
export function parseFormats(text: string): Record<string, PlateFormat[]> {
  const out: Record<string, PlateFormat[]> = {};
  for (const [g, list] of Object.entries(parseGrouped(text).byGroup)) {
    const fs = list.map((s) => /^(\d+)\s*[x×*]\s*(\d+)$/i.exec(s.replace(/\s/g, ''))).filter((m): m is RegExpExecArray => m !== null).map((m) => ({ w: Number(m[1]), l: Number(m[2]) }));
    if (fs.length) out[g] = fs;
  }
  return out;
}
export function formatFormats(formats: Readonly<Record<string, readonly PlateFormat[]>>): string {
  return Object.entries(formats).map(([g, fs]) => `${g}: ${fs.map((f) => `${f.w}×${f.l}`).join(', ')}`).join('\n');
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

/** Kesit değerleri (product_variants.props): sabit anahtar sırası ve birimleri (teknik sabitler; etiketler next-intl). */
export const PROP_KEYS = ['A', 'Ix', 'Iy', 'Wx', 'Wy', 'ix', 'iy', 'I', 'W', 'i', 'iv', 'ey', 'ex', 'e', 'u', 'we', 'coil', 'h', 'p'] as const;
export type PropKey = (typeof PROP_KEYS)[number];
export const PROP_UNITS: Record<PropKey, string> = { A: 'cm²', Ix: 'cm⁴', Iy: 'cm⁴', Wx: 'cm³', Wy: 'cm³', ix: 'cm', iy: 'cm', I: 'cm⁴', W: 'cm³', i: 'cm', iv: 'cm', ey: 'cm', ex: 'cm', e: 'cm', u: 'm²/m', we: 'mm', coil: 'mm', h: 'mm', p: 'mm' };
/** Kesit değeri sütunları (tabloda "kesit değerlerini göster" ile açılır); `u` ve trapez ölçüleri hep görünür. */
export const SECTION_PROP_KEYS: readonly PropKey[] = ['A', 'Ix', 'Iy', 'Wx', 'Wy', 'ix', 'iy', 'I', 'W', 'i', 'iv', 'ey', 'ex', 'e'];
export function propDecimals(key: PropKey, value: number): number {
  if (key === 'u') return 3;
  if (key === 'we' || key === 'coil' || key === 'h') return 0;
  if (key === 'p') return 1;
  return Math.abs(value) >= 100 ? 1 : 2;
}
export function readProps(raw: unknown): Partial<Record<PropKey, number>> {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Partial<Record<PropKey, number>> = {};
  for (const k of PROP_KEYS) {
    const v = Number((raw as Record<string, unknown>)[k] ?? (k === 'u' ? (raw as Record<string, unknown>)['U'] : undefined));
    if (Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}
/** Kesit geometrisi (mm) + görünen ölçü metni ("dim"); yalnız sayılar ve kısa metinler. */
export type Dims = Readonly<Record<string, number | string>>;
export function readDims(raw: unknown): Dims {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[A-Za-z][A-Za-z0-9]{0,11}$/.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string' && v.trim() && v.length <= 60) out[k] = v.trim();
  }
  return out;
}

/** Seçici için asgari varyant kesiti (sunucu ve istemci ortak). */
export interface SelectableVariant {
  readonly id: string;
  readonly sizeLabel: string;
  readonly sizeKey: string | null;
  readonly widthMm: number | null;
  readonly heightMm: number | null;
  readonly thicknessMm: number | null;
  readonly lengthMm: number | null;
  readonly kgPerM: number | null;
  readonly kgPerM2: number | null;
  readonly stockCode: string | null;
  readonly group: string | null;
  readonly props: Partial<Record<PropKey, number>>;
  readonly dims: Dims;
}

/** Seçici anlamlı mı: ölçü ya da ağırlık bilgisi olan en az bir varyant. */
export function isConfigurable(variants: readonly SelectableVariant[]): boolean {
  return variants.some((v) => v.kgPerM !== null || v.kgPerM2 !== null || (v.widthMm !== null && v.heightMm !== null));
}
export const fmt = (n: number): string => String(Math.round(n * 100) / 100).replace('.', ',');
/** Ölçü anahtarı: kayıtlı `size_key`; yoksa "H×B" (yükseklik × genişlik); ölçüsüz varyantta etiket. */
export function sizeKey(v: SelectableVariant): string {
  if (v.sizeKey) return v.sizeKey;
  return v.heightMm !== null && v.widthMm !== null ? `${fmt(v.heightMm)}×${fmt(v.widthMm)}` : v.sizeLabel;
}
const num = (d: Dims, k: string): number | null => (typeof d[k] === 'number' ? (d[k] as number) : null);
/** Tabloda görünen ölçü metni: kayıtlı `dims.dim`; yoksa kesit türüne göre türetilir. */
export function dimText(v: SelectableVariant, draw: DrawKind | null): string {
  if (typeof v.dims['dim'] === 'string') return v.dims['dim'];
  const d = v.dims;
  switch (draw) {
    case 'pipe':
      return num(d, 'D') !== null ? `Ø${fmt(num(d, 'D')!)}` : v.widthMm !== null ? `Ø${fmt(v.widthMm)}` : v.sizeLabel;
    case 'flat':
      return num(d, 'w') !== null && num(d, 't') !== null ? `${fmt(num(d, 'w')!)} × ${fmt(num(d, 't')!)}` : v.sizeLabel;
    case 'plate':
      return v.thicknessMm !== null ? `${fmt(v.thicknessMm)} mm` : v.sizeLabel;
    case 'T':
      return num(d, 'h') !== null && num(d, 'b') !== null && num(d, 't') !== null ? `${fmt(num(d, 'h')!)} × ${fmt(num(d, 'b')!)} × ${fmt(num(d, 't')!)}` : v.sizeLabel;
    default:
      return v.heightMm !== null && v.widthMm !== null ? `${fmt(v.heightMm)} × ${fmt(v.widthMm)}` : v.sizeLabel;
  }
}
export function groupsOf(variants: readonly SelectableVariant[], options?: ProductOptions): string[] {
  const inData = [...new Set(variants.map((v) => v.group).filter((g): g is string => Boolean(g)))];
  if (!options?.groups.length) return inData;
  // Panelde tanımlı sıra; veride olmayan grup gösterilmez
  return [...options.groups.map((g) => g.code).filter((c) => inData.includes(c)), ...inData.filter((c) => !options.groups.some((g) => g.code === c))];
}
export function groupLabel(options: ProductOptions, code: string | null, locale: string): string {
  if (code === null) return '';
  const g = options.groups.find((x) => x.code === code);
  return g ? pickLocale(g.label, locale, { fallback: code }) || code : code;
}
export function sizesOf(variants: readonly SelectableVariant[], group: string | null): string[] {
  return [...new Set(variants.filter((v) => group === null || v.group === group).map(sizeKey))];
}
/** Et/kalınlık listesi: plakada grup içindeki tüm kalınlıklar (ölçü adımı yok). */
export function thicknessesOf(variants: readonly SelectableVariant[], group: string | null, size: string, plate = false): number[] {
  return [...new Set(variants.filter((v) => (group === null || v.group === group) && (plate || sizeKey(v) === size) && v.thicknessMm !== null).map((v) => v.thicknessMm!))].sort((a, b) => a - b);
}
export function findVariant(variants: readonly SelectableVariant[], group: string | null, size: string, thickness: number | null, plate = false): SelectableVariant | null {
  return variants.find((v) => (group === null || v.group === group) && (plate || sizeKey(v) === size) && (thickness === null || v.thicknessMm === thickness)) ?? null;
}
export function gradesFor(options: ProductOptions, group: string | null): readonly string[] {
  return (group !== null && options.gradesByGroup[group]) || options.grades;
}
export function formatsFor(options: ProductOptions, group: string | null): readonly PlateFormat[] {
  return (group !== null && options.formats[group]) || options.formats['*'] || [];
}
/** Yüzey seçenekleri: grup bazlı liste, yoksa genel liste; hiçbiri yoksa seçim gösterilmez. */
export function surfacesFor(options: ProductOptions, group: string | null): readonly SurfaceKey[] {
  return (group !== null && options.surfacesByGroup[group]) || options.surfaces;
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
/** Plaka: kg/m² × (genişlik × uzunluk, mm → m²) × adet. */
export function plateWeightOf(kgPerM2: number | null, wMm: number, lMm: number, qty: number): { readonly areaM2: number; readonly perSheet: number | null; readonly total: number | null } {
  const areaM2 = wMm > 0 && lMm > 0 ? (wMm * lMm) / 1e6 : 0;
  if (kgPerM2 === null || areaM2 <= 0 || !(qty > 0)) return { areaM2, perSheet: null, total: null };
  const perSheet = kgPerM2 * areaM2;
  return { areaM2, perSheet, total: perSheet * qty };
}
/**
 * Sıcak daldırma galvaniz payı (≈85 µm, 0,61 kg/m² tek yüz): plakada iki yüz (1,22 kg/m²); profilde boya yüzeyi × 0,61,
 * kapalı kesitte (kutu/boru) iç yüzey de kaplanır → ×2. Galvanizli üretilen gruplarda (GLV) uygulanmaz.
 */
export function galvanizeExtraKg(args: { readonly draw: DrawKind | null; readonly paintAreaM2PerM: number | null; readonly per: number; readonly qty: number }): number {
  const { draw, paintAreaM2PerM, per, qty } = args;
  if (draw === 'plate') return 1.22 * per * qty;
  if (paintAreaM2PerM === null) return 0;
  return paintAreaM2PerM * 0.61 * (draw === 'box' || draw === 'pipe' ? 2 : 1) * per * qty;
}
/** Arama normalizasyonu: "100x50", "100×50", "100*50" aynı; ondalık virgül → nokta; Ø ve boşluk atılır. */
export function normSearch(s: string): string {
  return s.toLocaleLowerCase('en-US').replace(/[x*×]/g, 'x').replace(/,/g, '.').replace(/[\sø"]/g, '');
}
