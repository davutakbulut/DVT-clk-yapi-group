import type { ProfileKey } from './structure';

/**
 * Görsel kesit ölçüleri (m) — yalnız 3D için (prototip v4). AĞIRLIK (kg/m) buradan değil `steel_profiles` tablosundan gelir (K-55).
 * Profil kodu, admin'in girdiği `steel_profiles.code` ile eşleşir (0038 profile_map).
 */
export interface ISection {
  readonly kind: 'i';
  readonly h: number;
  readonly b: number;
  readonly tf: number;
  readonly tw: number;
}
export interface PipeSection {
  readonly kind: 'pipe';
  readonly od: number;
  readonly wall: number;
}
export interface DoubleAngleSection {
  readonly kind: 'l2';
  readonly leg: number;
  readonly t: number;
  readonly gap: number;
}
export interface UnpSection {
  readonly kind: 'unp';
  readonly h: number;
  readonly b: number;
  readonly tf: number;
  readonly tw: number;
}
export type Section = ISection | PipeSection | DoubleAngleSection | UnpSection;

export const SECTIONS: Readonly<Record<string, Section>> = {
  HEB360: { kind: 'i', h: 0.36, b: 0.3, tf: 0.0225, tw: 0.0125 },
  HEB300: { kind: 'i', h: 0.3, b: 0.3, tf: 0.019, tw: 0.011 },
  IPE400: { kind: 'i', h: 0.4, b: 0.18, tf: 0.0135, tw: 0.0086 },
  IPE500: { kind: 'i', h: 0.5, b: 0.2, tf: 0.016, tw: 0.0102 },
  IPE300: { kind: 'i', h: 0.3, b: 0.15, tf: 0.0107, tw: 0.0071 },
  UNP160: { kind: 'unp', h: 0.16, b: 0.065, tf: 0.0105, tw: 0.0075 },
  UNP200: { kind: 'unp', h: 0.2, b: 0.075, tf: 0.0115, tw: 0.0085 },
  'PIPE139.7x6': { kind: 'pipe', od: 0.1397, wall: 0.006 },
  '2L100x100x10': { kind: 'l2', leg: 0.1, t: 0.01, gap: 0.012 },
  L140x60: { kind: 'i', h: 0.14, b: 0.06, tf: 0.006, tw: 0.004 },
};

export const DEFAULT_PROFILE_MAP: Readonly<Record<ProfileKey, string>> = {
  column: 'HEB360',
  rafter: 'IPE500',
  secondary: 'IPE300',
  wind_column: 'IPE300',
  purlin_small_bay: 'UNP160',
  purlin_large_bay: 'UNP200',
  brace: 'PIPE139.7x6',
  truss_chord: '2L100x100x10',
  door_frame: 'L140x60',
};

export function sectionFor(code: string): Section {
  return SECTIONS[code] ?? SECTIONS['IPE300']!;
}
