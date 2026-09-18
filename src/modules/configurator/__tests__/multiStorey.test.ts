import { describe, expect, it } from 'vitest';
import { buildMultiStorey, clampMultiStorey, DEFAULT_MULTI_STOREY_RULES, gridPositions, multiStoreyTakeoff, parseMultiStorey, serializeMultiStorey } from '../domain/multiStorey';

describe('çok katlı konfigüratör', () => {
  it('aks aralığı en fazla 5 m ve eşit dağılır', () => {
    expect(gridPositions(20, 5)).toEqual({ pts: [-10, -5, 0, 5, 10], step: 5 });
    const g = gridPositions(22, 5);
    expect(g.pts).toHaveLength(6);
    expect(g.step).toBe(4.4);
  });

  it('prototip varsayılanı (20×30, 5 kat): 5×7 aks = 35 kolon; kat başına 58 ana + 24 tali kiriş', () => {
    const s = buildMultiStorey({ width: 20, length: 30, floorHeight: 3.2, floors: 5 });
    expect(s.columnCount).toBe(35);
    expect(s.heightM).toBe(16);
    const count = (g: string) => s.members.filter((m) => m.group === g).length;
    expect(count('column')).toBe(35);
    expect(count('main_beam')).toBe(5 * (7 * 4 + 5 * 6));
    expect(count('secondary_beam')).toBe(5 * (4 * 6));
    expect(s.totalFloorAreaM2).toBe(3000);
  });

  it('radye: 3 kata kadar 50 cm, sonrası kat başına +10 cm; taşma iki yanda 0,75 m', () => {
    expect(buildMultiStorey({ width: 20, length: 30, floorHeight: 3, floors: 3 }).raft.thicknessM).toBe(0.5);
    const s = buildMultiStorey({ width: 20, length: 30, floorHeight: 3, floors: 8 });
    expect(s.raft.thicknessM).toBe(1);
    expect(s.raft.widthM).toBe(21.5);
    expect(s.raft.volumeM3).toBe(21.5 * 31.5);
  });

  it('sınırlar ve sorgu dizesi gidiş-dönüş; kat adedi tam sayı', () => {
    expect(clampMultiStorey({ width: 999, floors: 7.6, floorHeight: 1 })).toMatchObject({ width: 60, floors: 8, floorHeight: 2.5 });
    const p = parseMultiStorey({ w: '24', l: '36', h: '3,5', n: '4' });
    expect(p).toEqual({ width: 24, length: 36, floorHeight: 3.5, floors: 4 });
    expect(parseMultiStorey(new URLSearchParams(serializeMultiStorey(p)))).toEqual(p);
  });

  it('metraj: kg/m yoksa ağırlık null (uydurma değer yok); varsa toplanır', () => {
    const s = buildMultiStorey({ width: 10, length: 10, floorHeight: 3, floors: 1 });
    const profiles = DEFAULT_MULTI_STOREY_RULES.profiles;
    const none = multiStoreyTakeoff(s, profiles);
    expect(none.totalWeightKg).toBeNull();
    expect(none.lines[0]).toMatchObject({ group: 'column', count: 9, totalLengthM: 27, weightKg: null });
    const full = multiStoreyTakeoff(s, profiles, { HEB300: 100, IPE500: 10, IPE400: 1 });
    expect(full.lines[0]!.weightKg).toBe(2700);
    expect(full.totalWeightKg).toBe(2700 + 60 * 10 + 20 * 1);
  });
});
