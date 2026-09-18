import { describe, expect, it } from 'vitest';
import { clampParams, DEFAULT_PARAMS, parseParams, serializeParams } from '../domain/params';
import { buildStructure, computeSegments, heightAtX } from '../domain/structure';

describe('params', () => {
  it('sınır + adım + mahya ≥ saçak; URL gidiş-dönüş', () => {
    const p = clampParams({ width: 7.3, length: 1000, eave: 5.26, ridge: 5.1, bay: 6.24 });
    expect(p).toMatchObject({ width: 8, length: 120, eave: 5.5, ridge: 6, bay: 6 });
    const q = serializeParams({ ...DEFAULT_PARAMS, panels: true });
    expect(q).toBe('w=20&l=40&e=6&r=8&b=6&p=1&d=1&c=1');
    expect(parseParams(new URLSearchParams(q))).toEqual({ ...DEFAULT_PARAMS, panels: true });
    expect(parseParams({ w: 'abc' })).toEqual(DEFAULT_PARAMS);
  });
});

describe('structure (prototip v4 ile birebir)', () => {
  const s = buildStructure(DEFAULT_PARAMS); // 20 × 40 × 6 / 8, aks 6

  it('akslar ve sistem: 40/6 → 7 açıklık, 8 aks, portal (≤30 m)', () => {
    expect(s.bays).toBe(7);
    expect(s.axes.length).toBe(8);
    expect(s.baySpacing).toBeCloseTo(5.714, 3);
    expect(s.system).toBe('portal');
    expect(s.footprint).toBe(800);
    expect(buildStructure({ ...DEFAULT_PARAMS, width: 36 }).system).toBe('truss');
  });

  it('eleman sayıları: kolon 16, makas 16, ikincil 14+7, rüzgar kolonu 3×2, çaprazlar, aşık/kuşak', () => {
    const count = (g: string) => s.members.filter((m) => m.group === g).length;
    expect(count('column')).toBe(16);
    expect(count('rafter')).toBe(16);
    expect(count('secondary')).toBe(14 + 7);
    expect(computeSegments(20).numSeg).toBe(4);
    expect(count('wind_column')).toBe(3 * 2);
    // duvar çaprazı: 2 kenar × ceil(7/2)=4 aks çifti × 2 = 16; çatı: 2 taraf × 4 aks çifti × nSegSide(round(10/5)=2) × 2 = 32
    expect(count('brace_wall')).toBe(16);
    expect(count('brace_roof')).toBe(32);
    // eğim uzunluğu √(10²+2²)=10.198 → 10 sıra, 10. sıra t=0.98 ≥ 0.98 düşer → 9 × 2 taraf = 18 aşık; kuşak: y=1..5 (5.7 < 6−0.3) → 5 × 2 = 10
    expect(count('purlin')).toBe(18);
    expect(count('girt')).toBe(10);
    expect(count('door_frame')).toBe(3);
    // kapı: 4 dilim (5 m) → dilim 2 = [0,5]; 4 m kapı dilim ortasında → 0.5–4.5 (prototip v4)
    expect(s.door).toEqual({ x1: 0.5, x2: 4.5, h: 5, segmentIndex: 2 });
  });

  it('uzunluklar ve alanlar: kolon = saçak, makas = √(10²+2²), aşık = boy; panel alanı', () => {
    const col = s.members.find((m) => m.group === 'column')!;
    expect(col.length).toBe(6);
    const rafter = s.members.find((m) => m.group === 'rafter')!;
    expect(rafter.length).toBeCloseTo(10.198, 3);
    const purlin = s.members.find((m) => m.group === 'purlin')!;
    expect(purlin.length).toBe(40);
    expect(heightAtX(0, 10, 6, 8)).toBe(8);
    const wallArea = s.panels.filter((p) => p.kind === 'wall').reduce((a, p) => a + p.area, 0);
    expect(wallArea).toBeCloseTo(2 * 40 * 6, 1);
    const roofArea = s.panels.filter((p) => p.kind === 'roof').reduce((a, p) => a + p.area, 0);
    expect(roofArea).toBeCloseTo(2 * 40 * 10.198, 0);
    const gable = s.panels.filter((p) => p.kind === 'gable').reduce((a, p) => a + p.area, 0);
    // alın: (6+8)/2 × 20 = 140 m² × 2 = 280; kapı dilimi (5 m genişlik) 5 m yüksekliğe kadar boş → −25 → 255 (prototip v4 ile aynı)
    expect(gable).toBeCloseTo(255, 0);
  });
});
