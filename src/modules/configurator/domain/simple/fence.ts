import { z } from 'zod';
import { ceil, num, pick, rangeSchema, readQuery, round, snap, writeQuery, type FieldSpec, type Range, type ResultLine, type SimpleResult } from './shared';

/**
 * Çit / korkuluk konfigüratörü (K-100): kutu profil direk + yatay kuşak + dolgu (dikey çubuk, lama, panel), kapı.
 * kg/m ve boya yüzeyi kurallardan (ürün sayfalarındaki kutu profil tablosuyla uyumlu nominal değerler).
 */
export const INFILL = ['bars', 'lama', 'panel', 'none'] as const;
export interface FenceParams {
  readonly length: number;
  readonly height: number;
  readonly postSpacing: number;
  readonly rails: number;
  readonly infill: (typeof INFILL)[number];
  readonly barSpacing: number;
  readonly gates: number;
  readonly galvanized: boolean;
}
export interface FenceRules {
  readonly limits: { readonly length: Range; readonly height: Range; readonly post_spacing: Range; readonly rails: Range; readonly bar_spacing: Range; readonly gates: Range };
  readonly profiles: { readonly post: string; readonly rail: string; readonly bar: string; readonly lama: string };
  readonly kgPerM: { readonly post: number; readonly rail: number; readonly bar: number; readonly lama: number };
  readonly paintM2PerM: { readonly post: number; readonly rail: number; readonly bar: number; readonly lama: number };
  readonly postEmbedM: number;
  readonly lamaRowSpacingM: number;
  readonly gateWidthM: number;
  readonly panelKgM2: number;
  readonly galvanizeKgPerM2: number;
  readonly products: { readonly post: string; readonly rail: string; readonly bar: string; readonly lama: string };
}
export const DEFAULT_FENCE_RULES: FenceRules = {
  limits: { length: { min: 2, max: 500, step: 0.5 }, height: { min: 0.8, max: 3, step: 0.1 }, post_spacing: { min: 1.5, max: 3, step: 0.25 }, rails: { min: 2, max: 4, step: 1 }, bar_spacing: { min: 0.08, max: 0.2, step: 0.01 }, gates: { min: 0, max: 10, step: 1 } },
  profiles: { post: '60×60×3', rail: '40×20×2', bar: '20×20×1,5', lama: '30×5' },
  // TS EN 10219 nominal kg/m (kutu profil tablosu) · TS EN 10058 lama
  kgPerM: { post: 5.19, rail: 1.7, bar: 0.83, lama: 1.18 },
  paintM2PerM: { post: 0.233, rail: 0.113, bar: 0.073, lama: 0.07 },
  postEmbedM: 0.5,
  lamaRowSpacingM: 0.15,
  gateWidthM: 1.2,
  panelKgM2: 8,
  galvanizeKgPerM2: 0.61,
  products: { post: 'kutu-profil', rail: 'kutu-profil', bar: 'kutu-profil', lama: 'lama' },
};
const four = z.object({ post: z.number().min(0), rail: z.number().min(0), bar: z.number().min(0), lama: z.number().min(0) });
export const fenceRulesSchema = z.object({
  limits: z.object({ length: rangeSchema, height: rangeSchema, post_spacing: rangeSchema, rails: rangeSchema, bar_spacing: rangeSchema, gates: rangeSchema }),
  profiles: z.object({ post: z.string(), rail: z.string(), bar: z.string(), lama: z.string() }),
  kgPerM: four,
  paintM2PerM: four,
  postEmbedM: z.number().min(0),
  lamaRowSpacingM: z.number().positive(),
  gateWidthM: z.number().positive(),
  panelKgM2: z.number().min(0),
  galvanizeKgPerM2: z.number().min(0),
  products: z.object({ post: z.string(), rail: z.string(), bar: z.string(), lama: z.string() }),
});
export const DEFAULT_FENCE: FenceParams = { length: 50, height: 1.8, postSpacing: 2.5, rails: 3, infill: 'bars', barSpacing: 0.12, gates: 1, galvanized: false };
const Q = { l: 'length', h: 'height', ps: 'postSpacing', r: 'rails', f: 'infill', bs: 'barSpacing', g: 'gates', z: 'galvanized' } as const;

export function clampFence(input: Partial<Record<keyof FenceParams, unknown>>, rules: FenceRules = DEFAULT_FENCE_RULES): FenceParams {
  const L = rules.limits;
  const galv = input.galvanized;
  return {
    length: snap(num(input.length, DEFAULT_FENCE.length), L.length),
    height: snap(num(input.height, DEFAULT_FENCE.height), L.height),
    postSpacing: snap(num(input.postSpacing, DEFAULT_FENCE.postSpacing), L.post_spacing),
    rails: snap(num(input.rails, DEFAULT_FENCE.rails), L.rails),
    infill: pick(input.infill, INFILL, DEFAULT_FENCE.infill),
    barSpacing: snap(num(input.barSpacing, DEFAULT_FENCE.barSpacing), L.bar_spacing),
    gates: snap(num(input.gates, DEFAULT_FENCE.gates), L.gates),
    galvanized: galv === undefined ? DEFAULT_FENCE.galvanized : galv === true || galv === '1' || galv === 'true',
  };
}
export const parseFence = (search: URLSearchParams | Record<string, string | undefined>, rules?: FenceRules) => clampFence(readQuery(search, Q) as Partial<Record<keyof FenceParams, unknown>>, rules);
export const serializeFence = (p: FenceParams) => writeQuery(p as unknown as Record<string, string | number | boolean>, Q);
export function fenceFields(rules: FenceRules): readonly FieldSpec[] {
  return [
    { key: 'length', type: 'range', range: rules.limits.length, unit: 'm', decimals: 1 },
    { key: 'height', type: 'range', range: rules.limits.height, unit: 'm', decimals: 1 },
    { key: 'postSpacing', type: 'range', range: rules.limits.post_spacing, unit: 'm', decimals: 2 },
    { key: 'rails', type: 'range', range: rules.limits.rails, unit: '' },
    { key: 'infill', type: 'select', options: INFILL },
    { key: 'barSpacing', type: 'range', range: rules.limits.bar_spacing, unit: 'm', decimals: 2 },
    { key: 'gates', type: 'range', range: rules.limits.gates, unit: '' },
    { key: 'galvanized', type: 'toggle' },
  ];
}
export function computeFence(p: FenceParams, rules: FenceRules = DEFAULT_FENCE_RULES): SimpleResult {
  const posts = Math.floor(p.length / p.postSpacing + 1e-9) + 1 + p.gates * 2;
  const postLen = p.height + rules.postEmbedM;
  const postTotal = posts * postLen;
  const railTotal = p.rails * p.length;
  const kgPost = round(postTotal * rules.kgPerM.post, 0);
  const kgRail = round(railTotal * rules.kgPerM.rail, 0);
  let paint = postTotal * rules.paintM2PerM.post + railTotal * rules.paintM2PerM.rail;
  const lines: ResultLine[] = [
    { key: 'posts', qty: posts, unit: 'adet', spec: `${rules.profiles.post} · ${round(postLen, 2)} m`, weightKg: kgPost, productSlug: rules.products.post },
    { key: 'rails', qty: round(railTotal, 1), unit: 'm', spec: rules.profiles.rail, weightKg: kgRail, productSlug: rules.products.rail },
  ];
  let infillKg = 0;
  if (p.infill === 'bars') {
    const bars = ceil(p.length / p.barSpacing);
    const barLen = bars * p.height;
    infillKg = round(barLen * rules.kgPerM.bar, 0);
    paint += barLen * rules.paintM2PerM.bar;
    lines.push({ key: 'bars', qty: bars, unit: 'adet', spec: `${rules.profiles.bar} · ${round(p.height, 2)} m`, weightKg: infillKg, productSlug: rules.products.bar });
  } else if (p.infill === 'lama') {
    const rows = Math.max(1, Math.floor(p.height / rules.lamaRowSpacingM));
    const lamaLen = rows * p.length;
    infillKg = round(lamaLen * rules.kgPerM.lama, 0);
    paint += lamaLen * rules.paintM2PerM.lama;
    lines.push({ key: 'lama', qty: round(lamaLen, 1), unit: 'm', spec: `${rules.profiles.lama} × ${rows}`, weightKg: infillKg, productSlug: rules.products.lama });
  } else if (p.infill === 'panel') {
    const area = p.length * p.height;
    infillKg = round(area * rules.panelKgM2, 0);
    lines.push({ key: 'panels', qty: ceil(p.length / p.postSpacing), unit: 'adet', spec: `${round(area, 1)} m²`, weightKg: infillKg, productSlug: null });
  }
  if (p.gates > 0) lines.push({ key: 'gates', qty: p.gates, unit: 'adet', spec: `${rules.gateWidthM} × ${round(p.height, 2)} m`, weightKg: null, productSlug: null });
  const totalWeightKg = kgPost + kgRail + infillKg;
  const galv = p.galvanized ? round(paint * rules.galvanizeKgPerM2, 1) : 0;
  return {
    stats: [
      { key: 'length', value: round(p.length, 1), unit: 'm', decimals: 1 },
      { key: 'posts', value: posts, unit: '' },
      { key: 'paint', value: round(paint, 1), unit: 'm²', decimals: 1 },
      { key: 'weight', value: round(totalWeightKg, 0), unit: 'kg' },
      ...(p.galvanized ? [{ key: 'galvanize', value: galv, unit: 'kg', decimals: 1 }] : []),
    ],
    lines,
    totalWeightKg: round(totalWeightKg + galv, 0),
  };
}
