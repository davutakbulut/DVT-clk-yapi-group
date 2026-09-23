import { z } from 'zod';
import { bool, ceil, num, pick, rangeSchema, readQuery, round, snap, writeQuery, type FieldSpec, type Range, type ResultLine, type SimpleResult } from './shared';

/**
 * Çatı & cephe kaplama konfigüratörü (K-100): beşik çatı + cephe için trapez sac / sandviç panel adedi, m², ağırlık, vida, mahya, oluk.
 * Değerler nominal; levha faydalı genişliği, bindirme ve fire kurallardan (panel).
 */
export const ROOF_TYPES = ['trapez', 'sandwich'] as const;
export const WALL_TYPES = ['none', 'trapez', 'sandwich'] as const;
export interface CladdingParams {
  readonly width: number;
  readonly length: number;
  readonly slopePct: number;
  readonly wallHeight: number;
  readonly overhang: number;
  readonly roofType: (typeof ROOF_TYPES)[number];
  readonly wallType: (typeof WALL_TYPES)[number];
  readonly insulated: boolean;
}
export interface CladdingRules {
  readonly limits: { readonly width: Range; readonly length: Range; readonly slope_pct: Range; readonly wall_height: Range; readonly overhang: Range };
  readonly sheetWidthM: number;
  readonly sheetLengthM: number;
  readonly overlapM: number;
  readonly wastePct: number;
  readonly screwsPerM2: number;
  /** kg/m² (ürün sayfasındaki ölçü tablosuyla uyumlu nominal değerler) */
  readonly weightsKgM2: { readonly trapez: number; readonly sandwich: number };
  readonly products: { readonly trapez: string; readonly sandwichRoof: string; readonly sandwichWall: string };
}
export const DEFAULT_CLADDING_RULES: CladdingRules = {
  limits: { width: { min: 6, max: 60, step: 0.5 }, length: { min: 6, max: 150, step: 0.5 }, slope_pct: { min: 5, max: 35, step: 1 }, wall_height: { min: 0, max: 14, step: 0.5 }, overhang: { min: 0, max: 1.5, step: 0.1 } },
  sheetWidthM: 1,
  sheetLengthM: 6,
  overlapM: 0.2,
  wastePct: 5,
  screwsPerM2: 6,
  weightsKgM2: { trapez: 4.5, sandwich: 11.5 },
  products: { trapez: 'trapez-sac', sandwichRoof: 'cati-sandvic-paneli', sandwichWall: 'cephe-sandvic-paneli' },
};
export const claddingRulesSchema = z.object({
  limits: z.object({ width: rangeSchema, length: rangeSchema, slope_pct: rangeSchema, wall_height: rangeSchema, overhang: rangeSchema }),
  sheetWidthM: z.number().positive(),
  sheetLengthM: z.number().positive(),
  overlapM: z.number().min(0),
  wastePct: z.number().min(0).max(50),
  screwsPerM2: z.number().min(0),
  weightsKgM2: z.object({ trapez: z.number().min(0), sandwich: z.number().min(0) }),
  products: z.object({ trapez: z.string(), sandwichRoof: z.string(), sandwichWall: z.string() }),
});
export const DEFAULT_CLADDING: CladdingParams = { width: 20, length: 40, slopePct: 15, wallHeight: 6, overhang: 0.3, roofType: 'trapez', wallType: 'trapez', insulated: false };
const Q = { w: 'width', l: 'length', s: 'slopePct', h: 'wallHeight', o: 'overhang', rt: 'roofType', wt: 'wallType', i: 'insulated' } as const;

export function clampCladding(input: Partial<Record<keyof CladdingParams, unknown>>, rules: CladdingRules = DEFAULT_CLADDING_RULES): CladdingParams {
  const L = rules.limits;
  return {
    width: snap(num(input.width, DEFAULT_CLADDING.width), L.width),
    length: snap(num(input.length, DEFAULT_CLADDING.length), L.length),
    slopePct: snap(num(input.slopePct, DEFAULT_CLADDING.slopePct), L.slope_pct),
    wallHeight: snap(num(input.wallHeight, DEFAULT_CLADDING.wallHeight), L.wall_height),
    overhang: snap(num(input.overhang, DEFAULT_CLADDING.overhang), L.overhang),
    roofType: pick(input.roofType, ROOF_TYPES, DEFAULT_CLADDING.roofType),
    wallType: pick(input.wallType, WALL_TYPES, DEFAULT_CLADDING.wallType),
    insulated: bool(input.insulated, DEFAULT_CLADDING.insulated),
  };
}
export const parseCladding = (search: URLSearchParams | Record<string, string | undefined>, rules?: CladdingRules) => clampCladding(readQuery(search, Q) as Partial<Record<keyof CladdingParams, unknown>>, rules);
export const serializeCladding = (p: CladdingParams) => writeQuery(p as unknown as Record<string, string | number | boolean>, Q);
export function claddingFields(rules: CladdingRules): readonly FieldSpec[] {
  return [
    { key: 'width', type: 'range', range: rules.limits.width, unit: 'm', decimals: 1 },
    { key: 'length', type: 'range', range: rules.limits.length, unit: 'm', decimals: 1 },
    { key: 'slopePct', type: 'range', range: rules.limits.slope_pct, unit: '%' },
    { key: 'wallHeight', type: 'range', range: rules.limits.wall_height, unit: 'm', decimals: 1 },
    { key: 'overhang', type: 'range', range: rules.limits.overhang, unit: 'm', decimals: 1 },
    { key: 'roofType', type: 'select', options: ROOF_TYPES },
    { key: 'wallType', type: 'select', options: WALL_TYPES },
  ];
}

export interface CladdingGeometry {
  readonly slopeLenM: number;
  readonly ridgeHeightM: number;
  readonly roofAreaM2: number;
  readonly wallAreaM2: number;
  readonly perimeterM: number;
}
export function claddingGeometry(p: CladdingParams): CladdingGeometry {
  const half = p.width / 2;
  const rise = half * (p.slopePct / 100);
  const slopeLenM = Math.sqrt(half * half + rise * rise) + p.overhang;
  const perimeterM = 2 * (p.width + p.length);
  return { slopeLenM, ridgeHeightM: rise, roofAreaM2: 2 * slopeLenM * (p.length + 2 * p.overhang), wallAreaM2: p.wallType === 'none' ? 0 : perimeterM * p.wallHeight, perimeterM };
}

export function computeCladding(p: CladdingParams, rules: CladdingRules = DEFAULT_CLADDING_RULES): SimpleResult {
  const g = claddingGeometry(p);
  const useful = Math.max(rules.sheetLengthM - rules.overlapM, 0.5);
  const waste = 1 + rules.wastePct / 100;
  const roofRows = ceil(g.slopeLenM / useful);
  const roofCols = ceil((p.length + 2 * p.overhang) / rules.sheetWidthM);
  const roofSheets = ceil(2 * roofRows * roofCols * waste);
  const roofKg = g.roofAreaM2 * rules.weightsKgM2[p.roofType] * waste;
  const lines: ResultLine[] = [
    { key: 'roofSheets', qty: roofSheets, unit: 'adet', spec: `${rules.sheetWidthM * 1000} × ${rules.sheetLengthM * 1000} mm`, weightKg: round(roofKg, 0), productSlug: p.roofType === 'trapez' ? rules.products.trapez : rules.products.sandwichRoof },
    { key: 'roofArea', qty: round(g.roofAreaM2 * waste, 1), unit: 'm2', spec: null, weightKg: null, productSlug: null },
    { key: 'ridgeCap', qty: round(p.length + 2 * p.overhang, 1), unit: 'm', spec: null, weightKg: null, productSlug: null },
    { key: 'gutter', qty: round(2 * (p.length + 2 * p.overhang), 1), unit: 'm', spec: null, weightKg: null, productSlug: null },
    { key: 'roofScrews', qty: ceil(g.roofAreaM2 * rules.screwsPerM2), unit: 'adet', spec: null, weightKg: null, productSlug: null },
  ];
  let wallKg = 0;
  if (p.wallType !== 'none' && p.wallHeight > 0) {
    const wallRows = ceil(p.wallHeight / useful);
    const wallCols = ceil(g.perimeterM / rules.sheetWidthM);
    const wallSheets = ceil(wallRows * wallCols * waste);
    wallKg = g.wallAreaM2 * rules.weightsKgM2[p.wallType] * waste;
    lines.push(
      { key: 'wallSheets', qty: wallSheets, unit: 'adet', spec: `${rules.sheetWidthM * 1000} × ${rules.sheetLengthM * 1000} mm`, weightKg: round(wallKg, 0), productSlug: p.wallType === 'trapez' ? rules.products.trapez : rules.products.sandwichWall },
      { key: 'wallArea', qty: round(g.wallAreaM2 * waste, 1), unit: 'm2', spec: null, weightKg: null, productSlug: null },
      { key: 'cornerFlashing', qty: round(4 * p.wallHeight, 1), unit: 'm', spec: null, weightKg: null, productSlug: null },
      { key: 'wallScrews', qty: ceil(g.wallAreaM2 * rules.screwsPerM2), unit: 'adet', spec: null, weightKg: null, productSlug: null },
    );
  }
  const totalWeightKg = round(roofKg + wallKg, 0);
  return {
    stats: [
      { key: 'roofArea', value: round(g.roofAreaM2, 0), unit: 'm²' },
      { key: 'wallArea', value: round(g.wallAreaM2, 0), unit: 'm²' },
      { key: 'slopeLen', value: round(g.slopeLenM, 2), unit: 'm', decimals: 2 },
      { key: 'ridgeHeight', value: round(g.ridgeHeightM, 2), unit: 'm', decimals: 2 },
      { key: 'weight', value: round(totalWeightKg / 1000, 2), unit: 't', decimals: 2 },
    ],
    lines,
    totalWeightKg,
  };
}
