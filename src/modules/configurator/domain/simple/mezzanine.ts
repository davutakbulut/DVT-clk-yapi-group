import { z } from 'zod';
import { ceil, num, pick, rangeSchema, readQuery, round, snap, writeQuery, type FieldSpec, type Range, type ResultLine, type SimpleResult } from './shared';

/**
 * Ara kat (mezzanine) platformu konfigüratörü (K-100): kolon ızgarası, ana/tali kirişler, döşeme sacı + beton, merdiven, korkuluk.
 * Profil seçimi ve kg/m değerleri kurallardan (panelde düzenlenir; varsayılanlar standart tablo değerleridir, K-75). Ön boyutlandırma; statik hesap değildir.
 */
export const LOAD_CLASSES = ['light', 'medium', 'heavy'] as const;
export const DECK_TYPES = ['composite', 'grating'] as const;
export interface MezzanineParams {
  readonly width: number;
  readonly length: number;
  readonly height: number;
  readonly grid: number;
  readonly load: (typeof LOAD_CLASSES)[number];
  readonly deck: (typeof DECK_TYPES)[number];
}
export interface MezzanineRules {
  readonly limits: { readonly width: Range; readonly length: Range; readonly height: Range; readonly grid: Range };
  readonly loadKnM2: Record<(typeof LOAD_CLASSES)[number], number>;
  readonly columnProfile: Record<(typeof LOAD_CLASSES)[number], string>;
  /** Açıklık (m) üst sınırı → ana kiriş profili; sıralı */
  readonly mainBeamBySpan: readonly { readonly maxSpanM: number; readonly profile: Record<(typeof LOAD_CLASSES)[number], string> }[];
  readonly secondaryProfile: Record<(typeof LOAD_CLASSES)[number], string>;
  readonly secondarySpacingM: number;
  readonly kgPerM: Readonly<Record<string, number>>;
  readonly deckKgM2: Record<(typeof DECK_TYPES)[number], number>;
  readonly concreteThicknessM: number;
  readonly stairEveryM2: number;
  readonly products: { readonly column: string; readonly beam: string; readonly deck: string };
}
export const DEFAULT_MEZZANINE_RULES: MezzanineRules = {
  limits: { width: { min: 4, max: 40, step: 0.5 }, length: { min: 4, max: 80, step: 0.5 }, height: { min: 2.5, max: 7, step: 0.1 }, grid: { min: 3, max: 8, step: 0.5 } },
  loadKnM2: { light: 2.5, medium: 5, heavy: 7.5 },
  columnProfile: { light: 'HEA 140', medium: 'HEA 160', heavy: 'HEA 200' },
  mainBeamBySpan: [
    { maxSpanM: 4, profile: { light: 'IPE 200', medium: 'IPE 240', heavy: 'IPE 270' } },
    { maxSpanM: 6, profile: { light: 'IPE 270', medium: 'IPE 300', heavy: 'IPE 330' } },
    { maxSpanM: 8, profile: { light: 'IPE 330', medium: 'IPE 360', heavy: 'IPE 400' } },
  ],
  secondaryProfile: { light: 'IPE 140', medium: 'IPE 160', heavy: 'IPE 180' },
  secondarySpacingM: 1.5,
  // TS EN 10365 nominal kg/m
  kgPerM: { 'HEA 140': 24.7, 'HEA 160': 30.4, 'HEA 200': 42.3, 'IPE 140': 12.9, 'IPE 160': 15.8, 'IPE 180': 18.8, 'IPE 200': 22.4, 'IPE 240': 30.7, 'IPE 270': 36.1, 'IPE 300': 42.2, 'IPE 330': 49.1, 'IPE 360': 57.1, 'IPE 400': 66.3 },
  deckKgM2: { composite: 9.5, grating: 32 },
  concreteThicknessM: 0.1,
  stairEveryM2: 400,
  products: { column: 'hea', beam: 'ipe', deck: 'betonalti-trapez-saci' },
};
const loadRec = z.object({ light: z.number(), medium: z.number(), heavy: z.number() });
const loadStr = z.object({ light: z.string(), medium: z.string(), heavy: z.string() });
export const mezzanineRulesSchema = z.object({
  limits: z.object({ width: rangeSchema, length: rangeSchema, height: rangeSchema, grid: rangeSchema }),
  loadKnM2: loadRec,
  columnProfile: loadStr,
  mainBeamBySpan: z.array(z.object({ maxSpanM: z.number().positive(), profile: loadStr })).min(1),
  secondaryProfile: loadStr,
  secondarySpacingM: z.number().positive(),
  kgPerM: z.record(z.string(), z.number().min(0)),
  deckKgM2: z.object({ composite: z.number().min(0), grating: z.number().min(0) }),
  concreteThicknessM: z.number().min(0),
  stairEveryM2: z.number().positive(),
  products: z.object({ column: z.string(), beam: z.string(), deck: z.string() }),
});
export const DEFAULT_MEZZANINE: MezzanineParams = { width: 12, length: 24, height: 3.5, grid: 6, load: 'medium', deck: 'composite' };
const Q = { w: 'width', l: 'length', h: 'height', g: 'grid', ld: 'load', d: 'deck' } as const;

export function clampMezzanine(input: Partial<Record<keyof MezzanineParams, unknown>>, rules: MezzanineRules = DEFAULT_MEZZANINE_RULES): MezzanineParams {
  const L = rules.limits;
  return {
    width: snap(num(input.width, DEFAULT_MEZZANINE.width), L.width),
    length: snap(num(input.length, DEFAULT_MEZZANINE.length), L.length),
    height: snap(num(input.height, DEFAULT_MEZZANINE.height), L.height),
    grid: snap(num(input.grid, DEFAULT_MEZZANINE.grid), L.grid),
    load: pick(input.load, LOAD_CLASSES, DEFAULT_MEZZANINE.load),
    deck: pick(input.deck, DECK_TYPES, DEFAULT_MEZZANINE.deck),
  };
}
export const parseMezzanine = (search: URLSearchParams | Record<string, string | undefined>, rules?: MezzanineRules) => clampMezzanine(readQuery(search, Q) as Partial<Record<keyof MezzanineParams, unknown>>, rules);
export const serializeMezzanine = (p: MezzanineParams) => writeQuery(p as unknown as Record<string, string | number | boolean>, Q);
export function mezzanineFields(rules: MezzanineRules): readonly FieldSpec[] {
  return [
    { key: 'width', type: 'range', range: rules.limits.width, unit: 'm', decimals: 1 },
    { key: 'length', type: 'range', range: rules.limits.length, unit: 'm', decimals: 1 },
    { key: 'height', type: 'range', range: rules.limits.height, unit: 'm', decimals: 1 },
    { key: 'grid', type: 'range', range: rules.limits.grid, unit: 'm', decimals: 1 },
    { key: 'load', type: 'select', options: LOAD_CLASSES },
    { key: 'deck', type: 'select', options: DECK_TYPES },
  ];
}
export interface MezzanineGrid {
  readonly nx: number;
  readonly nz: number;
  readonly spanX: number;
  readonly spanZ: number;
  readonly columns: number;
}
export function mezzanineGrid(p: MezzanineParams): MezzanineGrid {
  const nx = ceil(p.width / p.grid) + 1;
  const nz = ceil(p.length / p.grid) + 1;
  return { nx, nz, spanX: p.width / (nx - 1), spanZ: p.length / (nz - 1), columns: nx * nz };
}
export function computeMezzanine(p: MezzanineParams, rules: MezzanineRules = DEFAULT_MEZZANINE_RULES): SimpleResult {
  const g = mezzanineGrid(p);
  const area = p.width * p.length;
  const kg = (profile: string, totalLen: number) => (rules.kgPerM[profile] !== undefined ? round(rules.kgPerM[profile]! * totalLen, 0) : null);
  const column = rules.columnProfile[p.load];
  const mainRule = rules.mainBeamBySpan.find((r) => g.spanX <= r.maxSpanM) ?? rules.mainBeamBySpan[rules.mainBeamBySpan.length - 1]!;
  const main = mainRule.profile[p.load];
  const secondary = rules.secondaryProfile[p.load];
  const mainCount = g.nz * (g.nx - 1);
  const mainLen = mainCount * g.spanX;
  const secPerBay = Math.max(1, Math.round(g.spanX / rules.secondarySpacingM) - 1);
  const secCount = secPerBay * (g.nx - 1) * (g.nz - 1);
  const secLen = secCount * g.spanZ;
  const colLen = g.columns * p.height;
  const deckKg = round(area * rules.deckKgM2[p.deck], 0);
  const stairs = Math.max(1, ceil(area / rules.stairEveryM2));
  const handrail = round(2 * (p.width + p.length), 1);
  const lines: ResultLine[] = [
    { key: 'columns', qty: g.columns, unit: 'adet', spec: column, weightKg: kg(column, colLen), productSlug: rules.products.column },
    { key: 'mainBeams', qty: mainCount, unit: 'adet', spec: main, weightKg: kg(main, mainLen), productSlug: rules.products.beam },
    { key: 'secondaryBeams', qty: secCount, unit: 'adet', spec: secondary, weightKg: kg(secondary, secLen), productSlug: rules.products.beam },
    { key: 'deck', qty: round(area, 1), unit: 'm2', spec: null, weightKg: deckKg, productSlug: p.deck === 'composite' ? rules.products.deck : null },
    ...(p.deck === 'composite' ? [{ key: 'concrete', qty: round(area * rules.concreteThicknessM, 1), unit: 'm3' as const, spec: `${rules.concreteThicknessM * 100} cm`, weightKg: null, productSlug: null }] : []),
    { key: 'stairs', qty: stairs, unit: 'adet', spec: null, weightKg: null, productSlug: null },
    { key: 'handrail', qty: handrail, unit: 'm', spec: null, weightKg: null, productSlug: null },
  ];
  const steelKg = lines.slice(0, 3).reduce((a, l) => a + (l.weightKg ?? 0), 0);
  return {
    stats: [
      { key: 'area', value: round(area, 0), unit: 'm²' },
      { key: 'load', value: rules.loadKnM2[p.load], unit: 'kN/m²', decimals: 1 },
      { key: 'grid', value: round(g.spanX, 2), unit: `× ${round(g.spanZ, 2)} m`, decimals: 2 },
      { key: 'columns', value: g.columns, unit: '' },
      { key: 'steel', value: round(steelKg / 1000, 2), unit: 't', decimals: 2 },
    ],
    lines,
    totalWeightKg: round(steelKg + deckKg, 0),
  };
}
