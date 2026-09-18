import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../domain/params';
import { DEFAULT_PROFILE_MAP } from '../domain/profiles';
import { buildStructure } from '../domain/structure';
import { computeTakeoff } from '../domain/takeoff';

// Ağırlıklar TEST içindir (sentetik, yuvarlak): gerçek kg/m panelden girilir (K-55). Elle doğrulama: 20×40×6/8, aks 6 → 8 aks.
describe('takeoff (elle doğrulanmış)', () => {
  const s = buildStructure(DEFAULT_PARAMS);

  it('kolon: 16 × 6 m = 96 m × 100 kg/m = 9.600 kg; makas: 16 × 10,198 = 163,17 m × 50 = 8.158,5 kg; aşık (aks 6 > 5 → UNP200) 18 × 40 = 720 m', () => {
    const t = computeTakeoff(s, DEFAULT_PROFILE_MAP, { HEB360: 100, IPE500: 50, UNP200: 10 });
    const col = t.lines.find((l) => l.group === 'column')!;
    expect(col).toMatchObject({ profileCode: 'HEB360', pieces: 16, totalLengthM: 96, totalWeightKg: 9600 });
    const rafter = t.lines.find((l) => l.group === 'rafter')!;
    expect(rafter.totalLengthM).toBeCloseTo(163.171, 2);
    expect(rafter.totalWeightKg).toBeCloseTo(8158.5, 0);
    const purlin = t.lines.find((l) => l.group === 'purlin')!;
    expect(purlin).toMatchObject({ profileCode: 'UNP200', pieces: 18, totalLengthM: 720, totalWeightKg: 7200 });
    // IPE300 (ikincil, rüzgar kolonu), boru (çapraz), L140x60 (kapı) girilmedi → eksik listesi, tonaj tamamlanmadı
    expect([...t.missingProfiles].sort()).toEqual(['IPE300', 'L140x60', 'PIPE139.7x6']);
    expect(t.complete).toBe(false);
    // kuşaklar da aşık profilini kullanır: 10 × 40 = 400 m × 10 = 4.000 kg
    expect(t.lines.find((l) => l.group === 'girt')).toMatchObject({ profileCode: 'UNP200', pieces: 10, totalLengthM: 400, totalWeightKg: 4000 });
    expect(t.steelKg).toBeCloseTo(9600 + 8158.5 + 7200 + 4000, 0);
    expect(t.lines[0]!.group).toBe('column');
  });

  it('paneller: çatı 2×40×10,198 ≈ 815,8 m² × 5 kg = 4.079 kg; duvar 480 m²; alın 255 m²; kg/m² yoksa null', () => {
    const t = computeTakeoff(s, DEFAULT_PROFILE_MAP, {}, { roof: 5 });
    const roof = t.panels.find((p) => p.kind === 'roof')!;
    expect(roof.totalAreaM2).toBeCloseTo(815.8, 0);
    expect(roof.totalWeightKg).toBeCloseTo(4079, 0);
    expect(t.panels.find((p) => p.kind === 'wall')!).toMatchObject({ totalAreaM2: 480, totalWeightKg: null });
    expect(t.panels.find((p) => p.kind === 'gable')!.totalAreaM2).toBeCloseTo(255, 0);
    expect(t.panelKg).toBeCloseTo(4079, 0);
    expect(t.bolts).toBe(s.boltCount);
    expect(t.plates).toBe(s.plates.length);
  });
});
