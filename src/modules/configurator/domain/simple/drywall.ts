import { z } from 'zod';
import { bool, ceil, num, pick, rangeSchema, readQuery, round, snap, writeQuery, type FieldSpec, type Range, type ResultLine, type SimpleResult } from './shared';

/**
 * Alçıpan bölme duvar konfigüratörü (K-100): levha, C dikme, U ray, vida, derz bandı, derz dolgu, yalıtım metrajı.
 * Sarf katsayıları kurallardan (panel); levha ağırlıkları ürün türüne göre nominal.
 */
export const BOARD_TYPES = ['white', 'green', 'red'] as const;
export const BOARD_SIZES = ['1200x2500', '1200x2000', '1200x3000'] as const;
export interface DrywallParams {
  readonly length: number;
  readonly height: number;
  readonly doubleSided: boolean;
  readonly layers: number;
  readonly studSpacing: number;
  readonly doors: number;
  readonly insulated: boolean;
  readonly boardType: (typeof BOARD_TYPES)[number];
  readonly boardSize: (typeof BOARD_SIZES)[number];
}
export interface DrywallRules {
  readonly limits: { readonly length: Range; readonly height: Range; readonly layers: Range; readonly doors: Range };
  readonly studSpacings: readonly number[];
  readonly boardKgM2: Record<(typeof BOARD_TYPES)[number], number>;
  readonly wastePct: number;
  readonly screwsPerM2FirstLayer: number;
  readonly screwsPerM2SecondLayer: number;
  readonly tapeMPerM2: number;
  readonly compoundKgPerM2: number;
  readonly profileKgPerM: { readonly stud: number; readonly track: number };
  readonly doorAreaM2: number;
  readonly insulationKgM2: number;
  readonly products: Record<(typeof BOARD_TYPES)[number], string> & { readonly insulation: string };
}
export const DEFAULT_DRYWALL_RULES: DrywallRules = {
  limits: { length: { min: 1, max: 200, step: 0.5 }, height: { min: 2.2, max: 5, step: 0.1 }, layers: { min: 1, max: 2, step: 1 }, doors: { min: 0, max: 20, step: 1 } },
  studSpacings: [0.4, 0.6],
  boardKgM2: { white: 9.5, green: 10, red: 10.5 },
  wastePct: 8,
  screwsPerM2FirstLayer: 15,
  screwsPerM2SecondLayer: 25,
  tapeMPerM2: 1.4,
  compoundKgPerM2: 0.4,
  profileKgPerM: { stud: 0.8, track: 0.6 },
  doorAreaM2: 1.9,
  insulationKgM2: 2.5,
  products: { white: 'beyaz-alcipan', green: 'yesil-alcipan', red: 'kirmizi-alcipan', insulation: 'tas-yunu' },
};
export const drywallRulesSchema = z.object({
  limits: z.object({ length: rangeSchema, height: rangeSchema, layers: rangeSchema, doors: rangeSchema }),
  studSpacings: z.array(z.number().positive()).min(1),
  boardKgM2: z.object({ white: z.number().min(0), green: z.number().min(0), red: z.number().min(0) }),
  wastePct: z.number().min(0).max(50),
  screwsPerM2FirstLayer: z.number().min(0),
  screwsPerM2SecondLayer: z.number().min(0),
  tapeMPerM2: z.number().min(0),
  compoundKgPerM2: z.number().min(0),
  profileKgPerM: z.object({ stud: z.number().min(0), track: z.number().min(0) }),
  doorAreaM2: z.number().min(0),
  insulationKgM2: z.number().min(0),
  products: z.object({ white: z.string(), green: z.string(), red: z.string(), insulation: z.string() }),
});
export const DEFAULT_DRYWALL: DrywallParams = { length: 10, height: 2.8, doubleSided: true, layers: 1, studSpacing: 0.6, doors: 1, insulated: true, boardType: 'white', boardSize: '1200x2500' };
const Q = { l: 'length', h: 'height', ds: 'doubleSided', ly: 'layers', ss: 'studSpacing', d: 'doors', i: 'insulated', bt: 'boardType', bs: 'boardSize' } as const;

export function clampDrywall(input: Partial<Record<keyof DrywallParams, unknown>>, rules: DrywallRules = DEFAULT_DRYWALL_RULES): DrywallParams {
  const L = rules.limits;
  const ss = num(input.studSpacing, DEFAULT_DRYWALL.studSpacing);
  const studSpacing = rules.studSpacings.includes(ss) ? ss : (rules.studSpacings[rules.studSpacings.length - 1] ?? 0.6);
  return {
    length: snap(num(input.length, DEFAULT_DRYWALL.length), L.length),
    height: snap(num(input.height, DEFAULT_DRYWALL.height), L.height),
    doubleSided: bool(input.doubleSided, DEFAULT_DRYWALL.doubleSided),
    layers: snap(num(input.layers, DEFAULT_DRYWALL.layers), L.layers),
    studSpacing,
    doors: snap(num(input.doors, DEFAULT_DRYWALL.doors), L.doors),
    insulated: bool(input.insulated, DEFAULT_DRYWALL.insulated),
    boardType: pick(input.boardType, BOARD_TYPES, DEFAULT_DRYWALL.boardType),
    boardSize: pick(input.boardSize, BOARD_SIZES, DEFAULT_DRYWALL.boardSize),
  };
}
export const parseDrywall = (search: URLSearchParams | Record<string, string | undefined>, rules?: DrywallRules) => clampDrywall(readQuery(search, Q) as Partial<Record<keyof DrywallParams, unknown>>, rules);
export const serializeDrywall = (p: DrywallParams) => writeQuery(p as unknown as Record<string, string | number | boolean>, Q);
export function drywallFields(rules: DrywallRules): readonly FieldSpec[] {
  return [
    { key: 'length', type: 'range', range: rules.limits.length, unit: 'm', decimals: 1 },
    { key: 'height', type: 'range', range: rules.limits.height, unit: 'm', decimals: 1 },
    { key: 'boardType', type: 'select', options: BOARD_TYPES },
    { key: 'boardSize', type: 'select', options: BOARD_SIZES },
    { key: 'layers', type: 'range', range: rules.limits.layers, unit: '' },
    { key: 'studSpacing', type: 'select', options: rules.studSpacings.map(String) },
    { key: 'doors', type: 'range', range: rules.limits.doors, unit: '' },
    { key: 'doubleSided', type: 'toggle' },
    { key: 'insulated', type: 'toggle' },
  ];
}
export function boardAreaM2(size: DrywallParams['boardSize']): number {
  const [w, h] = size.split('x').map(Number);
  return ((w ?? 1200) * (h ?? 2500)) / 1e6;
}
export function computeDrywall(p: DrywallParams, rules: DrywallRules = DEFAULT_DRYWALL_RULES): SimpleResult {
  const grossArea = p.length * p.height;
  const netArea = Math.max(0, grossArea - p.doors * rules.doorAreaM2);
  const sides = p.doubleSided ? 2 : 1;
  const faceArea = netArea * sides * p.layers;
  const waste = 1 + rules.wastePct / 100;
  const boards = ceil((faceArea * waste) / boardAreaM2(p.boardSize));
  const boardKg = round(faceArea * rules.boardKgM2[p.boardType], 0);
  const studs = Math.floor(p.length / p.studSpacing + 1e-9) + 1 + p.doors * 2;
  const studLen = studs * p.height;
  const trackLen = 2 * p.length;
  const screws = ceil(netArea * sides * (p.layers >= 2 ? rules.screwsPerM2FirstLayer + rules.screwsPerM2SecondLayer : rules.screwsPerM2FirstLayer));
  const tape = round(netArea * sides * rules.tapeMPerM2, 0);
  const compound = round(netArea * sides * rules.compoundKgPerM2, 1);
  const lines: ResultLine[] = [
    { key: 'boards', qty: boards, unit: 'adet', spec: p.boardSize.replace('x', ' × ') + ' mm', weightKg: boardKg, productSlug: rules.products[p.boardType] },
    { key: 'studs', qty: studs, unit: 'adet', spec: `C · ${round(p.height, 2)} m`, weightKg: round(studLen * rules.profileKgPerM.stud, 0), productSlug: null },
    { key: 'tracks', qty: round(trackLen, 1), unit: 'm', spec: 'U', weightKg: round(trackLen * rules.profileKgPerM.track, 0), productSlug: null },
    { key: 'screws', qty: screws, unit: 'adet', spec: null, weightKg: null, productSlug: null },
    { key: 'tape', qty: tape, unit: 'm', spec: null, weightKg: null, productSlug: null },
    { key: 'compound', qty: compound, unit: 'kg', spec: null, weightKg: null, productSlug: null },
  ];
  let insKg = 0;
  if (p.insulated) {
    insKg = round(netArea * rules.insulationKgM2, 0);
    lines.push({ key: 'insulation', qty: round(netArea * waste, 1), unit: 'm2', spec: null, weightKg: insKg, productSlug: rules.products.insulation });
  }
  const totalWeightKg = round(boardKg + studLen * rules.profileKgPerM.stud + trackLen * rules.profileKgPerM.track + insKg, 0);
  return {
    stats: [
      { key: 'netArea', value: round(netArea, 1), unit: 'm²', decimals: 1 },
      { key: 'faceArea', value: round(faceArea, 1), unit: 'm²', decimals: 1 },
      { key: 'boards', value: boards, unit: '' },
      { key: 'weight', value: totalWeightKg, unit: 'kg' },
    ],
    lines,
    totalWeightKg,
  };
}
