import type { MemberGroup, ProfileKey, Structure } from './structure';

/** Profil kodu → kg/m (steel_profiles'tan; girilmemişse yok). Sayı UYDURULMAZ (K-55): bilinmeyen kod → ağırlık null. */
export type WeightTable = Readonly<Record<string, number>>;
/** Panel kg/m² (panel_types'tan; yoksa yalnız m² raporlanır). */
export interface PanelWeights {
  readonly roof?: number;
  readonly wall?: number;
}

export interface TakeoffLine {
  readonly group: MemberGroup;
  readonly profileCode: string;
  readonly pieces: number;
  readonly totalLengthM: number;
  /** null → bu profilin kg/m değeri panelde girilmemiş */
  readonly totalWeightKg: number | null;
}
export interface PanelLine {
  readonly kind: 'roof' | 'wall' | 'gable';
  readonly pieces: number;
  readonly totalAreaM2: number;
  readonly totalWeightKg: number | null;
}
export interface Takeoff {
  readonly lines: readonly TakeoffLine[];
  readonly panels: readonly PanelLine[];
  readonly plates: number;
  readonly bolts: number;
  /** Ağırlığı bilinen çelik toplamı (kg). */
  readonly steelKg: number;
  readonly panelKg: number;
  /** kg/m'si girilmemiş profil kodları — tonaj eksiktir, kullanıcıya söylenir. */
  readonly missingProfiles: readonly string[];
  readonly complete: boolean;
}

/** Sıralama: taşıyıcıdan ikincile (rapor ve satış kalemi sırası). */
const GROUP_ORDER: readonly MemberGroup[] = ['column', 'rafter', 'truss_chord', 'truss_web', 'secondary', 'wind_column', 'purlin', 'girt', 'brace_wall', 'brace_roof', 'door_frame'];

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Metraj: yapı listesini (grup × profil kodu) altında toplar; boy toplamı × kg/m. Paneller m² (× kg/m² varsa).
 * Saf ve deterministik — aynı yapı + aynı tablo → aynı çıktı; testte elle doğrulanır.
 */
export function computeTakeoff(structure: Structure, profileMap: Readonly<Record<ProfileKey, string>>, weights: WeightTable = {}, panelWeights: PanelWeights = {}): Takeoff {
  const acc = new Map<string, { group: MemberGroup; profileCode: string; pieces: number; length: number }>();
  for (const m of structure.members) {
    const code = profileMap[m.profile];
    const key = `${m.group}|${code}`;
    const cur = acc.get(key) ?? { group: m.group, profileCode: code, pieces: 0, length: 0 };
    cur.pieces += 1;
    cur.length += m.length;
    acc.set(key, cur);
  }
  const missing = new Set<string>();
  let steelKg = 0;
  const lines: TakeoffLine[] = [...acc.values()]
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.profileCode.localeCompare(b.profileCode))
    .map((l) => {
      const kgm = weights[l.profileCode];
      const w = typeof kgm === 'number' && kgm > 0 ? round3(l.length * kgm) : null;
      if (w === null) missing.add(l.profileCode);
      else steelKg += w;
      return { group: l.group, profileCode: l.profileCode, pieces: l.pieces, totalLengthM: round3(l.length), totalWeightKg: w };
    });

  let panelKg = 0;
  const panels: PanelLine[] = (['roof', 'wall', 'gable'] as const)
    .map((kind) => {
      const ps = structure.panels.filter((p) => p.kind === kind);
      const area = round3(ps.reduce((a, p) => a + p.area, 0));
      const kgm2 = kind === 'roof' ? panelWeights.roof : panelWeights.wall;
      const w = typeof kgm2 === 'number' && kgm2 > 0 ? round3(area * kgm2) : null;
      if (w !== null) panelKg += w;
      return { kind, pieces: ps.length, totalAreaM2: area, totalWeightKg: w };
    })
    .filter((p) => p.pieces > 0);

  return { lines, panels, plates: structure.plates.length, bolts: structure.boltCount, steelKg: round3(steelKg), panelKg: round3(panelKg), missingProfiles: [...missing], complete: missing.size === 0 };
}
