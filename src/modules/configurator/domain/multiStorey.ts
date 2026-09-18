import { z } from 'zod';
import type { Range } from './params';

/**
 * Çok katlı çelik yapı — SAF geometri (prototip `katlı-konfigurator.html`'in `build()` mantığı; Three.js yok).
 * Kolonlar her aks kesişiminde tam boy; her katta iki yönde ana kiriş, açıklık ortasında tali kiriş; altta radye temel.
 * Aks aralığı en/boya eşit dağıtılır ve `maxColumnSpacingM`'yi aşmaz. Koordinat: x = en, y = yükseklik, z = boy (merkez 0). Metre.
 * Gösterim amaçlıdır; statik hesap değildir (uyarı metni panelden gelir).
 */
export interface MultiStoreyParams {
  readonly width: number;
  readonly length: number;
  readonly floorHeight: number;
  readonly floors: number;
}
export interface MultiStoreyLimits {
  readonly width: Range;
  readonly length: Range;
  readonly floor_height: Range;
  readonly floors: Range;
}
export type MultiStoreyGroup = 'column' | 'main_beam' | 'secondary_beam';
export interface MultiStoreyRules {
  readonly limits: MultiStoreyLimits;
  readonly maxColumnSpacingM: number;
  /** Radye: taban kalınlık (m) · bu kat sayısına kadar artmaz · sonrası kat başına ek (m). */
  readonly raftBaseM: number;
  readonly raftFreeFloors: number;
  readonly raftExtraPerFloorM: number;
  readonly raftOverhangM: number;
  readonly profiles: Readonly<Record<MultiStoreyGroup, string>>;
}

export const DEFAULT_MULTI_STOREY_RULES: MultiStoreyRules = {
  limits: { width: { min: 8, max: 60, step: 1 }, length: { min: 8, max: 80, step: 1 }, floor_height: { min: 2.5, max: 4.5, step: 0.1 }, floors: { min: 1, max: 20, step: 1 } },
  maxColumnSpacingM: 5,
  raftBaseM: 0.5,
  raftFreeFloors: 3,
  raftExtraPerFloorM: 0.1,
  raftOverhangM: 0.75,
  profiles: { column: 'HEB300', main_beam: 'IPE500', secondary_beam: 'IPE400' },
};
export const DEFAULT_MULTI_STOREY_PARAMS: MultiStoreyParams = { width: 20, length: 30, floorHeight: 3.2, floors: 5 };

const range = z.object({ min: z.number(), max: z.number(), step: z.number().positive() }).refine((r) => r.max >= r.min);
const code = z.string().trim().min(1).max(40);
export const multiStoreyRulesSchema = z.object({
  limits: z.object({ width: range, length: range, floor_height: range, floors: range }),
  maxColumnSpacingM: z.number().min(2).max(12),
  raftBaseM: z.number().min(0.2).max(3),
  raftFreeFloors: z.number().int().min(0).max(50),
  raftExtraPerFloorM: z.number().min(0).max(1),
  raftOverhangM: z.number().min(0).max(5),
  profiles: z.object({ column: code, main_beam: code, secondary_beam: code }),
});

const r3 = (v: number) => Math.round(v * 1000) / 1000;
function snap(v: number, r: Range): number {
  const clamped = Math.min(r.max, Math.max(r.min, v));
  return r3(r.min + Math.round((clamped - r.min) / r.step) * r.step);
}

export function clampMultiStorey(input: Partial<MultiStoreyParams>, limits: MultiStoreyLimits = DEFAULT_MULTI_STOREY_RULES.limits): MultiStoreyParams {
  const d = DEFAULT_MULTI_STOREY_PARAMS;
  return {
    width: snap(input.width ?? d.width, limits.width),
    length: snap(input.length ?? d.length, limits.length),
    floorHeight: snap(input.floorHeight ?? d.floorHeight, limits.floor_height),
    floors: Math.round(snap(input.floors ?? d.floors, limits.floors)),
  };
}

/** Sorgu dizesi ↔ parametre: `?w=20&l=30&h=3.2&n=5` (paylaşılabilir). */
export function parseMultiStorey(search: URLSearchParams | Record<string, string | undefined>, limits?: MultiStoreyLimits): MultiStoreyParams {
  const num = (k: string) => {
    const v = (search instanceof URLSearchParams ? search.get(k) : search[k]) ?? undefined;
    if (v === undefined) return undefined;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  };
  return clampMultiStorey({ width: num('w'), length: num('l'), floorHeight: num('h'), floors: num('n') }, limits);
}
export function serializeMultiStorey(p: MultiStoreyParams): string {
  return new URLSearchParams({ w: String(p.width), l: String(p.length), h: String(p.floorHeight), n: String(p.floors) }).toString();
}

/** Aks konumları: açıklık `maxSpacing`'i aşmayacak en az bölmeyle eşit dağıtılır. */
export function gridPositions(span: number, maxSpacing: number): { readonly pts: readonly number[]; readonly step: number } {
  const n = Math.max(1, Math.ceil(r3(span / maxSpacing)));
  const step = span / n;
  return { pts: Array.from({ length: n + 1 }, (_, i) => r3(-span / 2 + i * step)), step: r3(step) };
}

export type Vec3 = readonly [number, number, number];
export interface MultiStoreyMember {
  readonly group: MultiStoreyGroup;
  readonly p1: Vec3;
  readonly p2: Vec3;
  readonly length: number;
}
export interface MultiStoreyLine {
  readonly group: MultiStoreyGroup;
  readonly profile: string;
  readonly count: number;
  readonly totalLengthM: number;
  /** kg/m biliniyorsa (steel_profiles); yoksa null → ağırlık gösterilmez (uydurma değer yok). */
  readonly weightKg: number | null;
}
export interface MultiStoreyStructure {
  readonly params: MultiStoreyParams;
  readonly members: readonly MultiStoreyMember[];
  readonly axesX: readonly number[];
  readonly axesZ: readonly number[];
  readonly spacingX: number;
  readonly spacingZ: number;
  readonly columnCount: number;
  readonly footprintM2: number;
  readonly totalFloorAreaM2: number;
  readonly heightM: number;
  readonly raft: { readonly thicknessM: number; readonly widthM: number; readonly lengthM: number; readonly volumeM3: number };
}

export function buildMultiStorey(params: MultiStoreyParams, rules: MultiStoreyRules = DEFAULT_MULTI_STOREY_RULES): MultiStoreyStructure {
  const { width, length, floorHeight, floors } = params;
  const gx = gridPositions(width, rules.maxColumnSpacingM);
  const gz = gridPositions(length, rules.maxColumnSpacingM);
  const height = r3(floors * floorHeight);
  const members: MultiStoreyMember[] = [];
  for (const x of gx.pts) for (const z of gz.pts) members.push({ group: 'column', p1: [x, 0, z], p2: [x, height, z], length: height });
  for (let f = 1; f <= floors; f += 1) {
    const y = r3(f * floorHeight);
    for (const z of gz.pts) for (let i = 0; i < gx.pts.length - 1; i += 1) members.push({ group: 'main_beam', p1: [gx.pts[i]!, y, z], p2: [gx.pts[i + 1]!, y, z], length: gx.step });
    for (const x of gx.pts) for (let j = 0; j < gz.pts.length - 1; j += 1) members.push({ group: 'main_beam', p1: [x, y, gz.pts[j]!], p2: [x, y, gz.pts[j + 1]!], length: gz.step });
    for (let i = 0; i < gx.pts.length - 1; i += 1) {
      const xm = r3((gx.pts[i]! + gx.pts[i + 1]!) / 2);
      for (let j = 0; j < gz.pts.length - 1; j += 1) members.push({ group: 'secondary_beam', p1: [xm, y, gz.pts[j]!], p2: [xm, y, gz.pts[j + 1]!], length: gz.step });
    }
  }
  const thickness = r3(rules.raftBaseM + Math.max(0, floors - rules.raftFreeFloors) * rules.raftExtraPerFloorM);
  const raftW = r3(width + 2 * rules.raftOverhangM);
  const raftL = r3(length + 2 * rules.raftOverhangM);
  return {
    params,
    members,
    axesX: gx.pts,
    axesZ: gz.pts,
    spacingX: gx.step,
    spacingZ: gz.step,
    columnCount: gx.pts.length * gz.pts.length,
    footprintM2: r3(width * length),
    totalFloorAreaM2: r3(width * length * floors),
    heightM: height,
    raft: { thicknessM: thickness, widthM: raftW, lengthM: raftL, volumeM3: r3(raftW * raftL * thickness) },
  };
}

/** Metraj: grup başına adet ve toplam boy; ağırlık yalnız katalogda kg/m varsa. */
export function multiStoreyTakeoff(s: MultiStoreyStructure, profiles: Readonly<Record<MultiStoreyGroup, string>>, weights: Readonly<Record<string, number>> = {}): { readonly lines: readonly MultiStoreyLine[]; readonly totalWeightKg: number | null } {
  const groups: readonly MultiStoreyGroup[] = ['column', 'main_beam', 'secondary_beam'];
  const lines = groups.map((group) => {
    const own = s.members.filter((m) => m.group === group);
    const total = r3(own.reduce((a, m) => a + m.length, 0));
    const kgm = weights[profiles[group]];
    return { group, profile: profiles[group], count: own.length, totalLengthM: total, weightKg: typeof kgm === 'number' && kgm > 0 ? Math.round(total * kgm) : null };
  });
  const complete = lines.every((l) => l.weightKg !== null);
  return { lines, totalWeightKg: complete ? lines.reduce((a, l) => a + (l.weightKg ?? 0), 0) : null };
}
