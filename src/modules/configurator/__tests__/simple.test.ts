import { describe, expect, it } from 'vitest';
import { clampCladding, computeCladding, DEFAULT_CLADDING_RULES, parseCladding, serializeCladding } from '../domain/simple/cladding';
import { computeDrywall, DEFAULT_DRYWALL, parseDrywall } from '../domain/simple/drywall';
import { clampFence, computeFence, DEFAULT_FENCE } from '../domain/simple/fence';
import { computeMezzanine, DEFAULT_MEZZANINE, mezzanineGrid, parseMezzanine } from '../domain/simple/mezzanine';
import { SIMPLE, SIMPLE_KINDS } from '../domain/simple/registry';

// K-100: dört basit konfigüratör — hesaplar elle doğrulanabilir sayılarla
describe('çatı & cephe kaplama', () => {
  it('20×40, %15 eğim, 6 m duvar: alanlar, levha adedi, ağırlık', () => {
    const p = clampCladding({ width: 20, length: 40, slopePct: 15, wallHeight: 6, overhang: 0, roofType: 'trapez', wallType: 'trapez' });
    const r = computeCladding(p);
    // eğik uzunluk = √(10² + 1,5²) = 10,112; çatı alanı = 2 × 10,112 × 40 = 808,9 m²
    expect(r.stats.find((s) => s.key === 'roofArea')?.value).toBe(809);
    expect(r.stats.find((s) => s.key === 'wallArea')?.value).toBe(720); // 2 × (20 + 40) × 6
    // 6 m levha, 0,2 bindirme → 5,8 m faydalı; 10,112 / 5,8 → 2 sıra; 40 / 1 m → 40 sütun; 2 mahya yüzü × 2 × 40 × 1,05 = 168
    expect(r.lines.find((l) => l.key === 'roofSheets')).toMatchObject({ qty: 168, unit: 'adet', productSlug: 'trapez-sac' });
    expect(r.lines.find((l) => l.key === 'wallSheets')?.qty).toBe(252); // 2 sıra × 120 sütun × 1,05
    expect(r.lines.find((l) => l.key === 'ridgeCap')?.qty).toBe(40);
    expect(r.totalWeightKg).toBe(Math.round((808.9 * 4.5 + 720 * 4.5) * 1.05));
    expect(parseCladding(new URLSearchParams(serializeCladding(p)))).toEqual(p);
    expect(clampCladding({ width: 999, roofType: 'x' }, DEFAULT_CLADDING_RULES)).toMatchObject({ width: 60, roofType: 'trapez' });
  });
  it('duvar yok → duvar satırları yok; sandviç panel ürünleri', () => {
    const r = computeCladding(clampCladding({ wallType: 'none', roofType: 'sandwich' }));
    expect(r.lines.some((l) => l.key === 'wallSheets')).toBe(false);
    expect(r.lines.find((l) => l.key === 'roofSheets')?.productSlug).toBe('cati-sandvic-paneli');
  });
});

describe('ara kat platformu', () => {
  it('12×24, 6 m ızgara, orta yük: 3×5 kolon, IPE 300 ana kiriş, 12 kolon adedi değil 15', () => {
    const g = mezzanineGrid(DEFAULT_MEZZANINE);
    expect(g).toMatchObject({ nx: 3, nz: 5, columns: 15, spanX: 6, spanZ: 6 });
    const r = computeMezzanine(DEFAULT_MEZZANINE);
    expect(r.lines.find((l) => l.key === 'columns')).toMatchObject({ qty: 15, spec: 'HEA 160', weightKg: Math.round(15 * 3.5 * 30.4) });
    expect(r.lines.find((l) => l.key === 'mainBeams')).toMatchObject({ qty: 10, spec: 'IPE 300' }); // 5 sıra × 2 açıklık
    expect(r.lines.find((l) => l.key === 'secondaryBeams')?.qty).toBe(3 * 2 * 4); // aks başına 3 tali × 2 × 4 aralık
    expect(r.lines.find((l) => l.key === 'concrete')?.qty).toBe(28.8); // 288 m² × 0,1
    expect(r.stats.find((s) => s.key === 'area')?.value).toBe(288);
    expect(parseMezzanine({ w: '8', l: '8', h: '3', g: '4', ld: 'heavy', d: 'grating' })).toMatchObject({ width: 8, load: 'heavy', deck: 'grating' });
    expect(computeMezzanine({ ...DEFAULT_MEZZANINE, deck: 'grating' }).lines.some((l) => l.key === 'concrete')).toBe(false);
  });
});

describe('çit / korkuluk', () => {
  it('50 m, 1,8 m, 2,5 m aks, 3 kuşak, 12 cm çubuk, 1 kapı, galvaniz', () => {
    const r = computeFence(clampFence({ ...DEFAULT_FENCE, galvanized: true }));
    expect(r.lines.find((l) => l.key === 'posts')).toMatchObject({ qty: 23, productSlug: 'kutu-profil' }); // 20 + 1 + 2 kapı direği
    expect(r.lines.find((l) => l.key === 'rails')?.qty).toBe(150);
    expect(r.lines.find((l) => l.key === 'bars')?.qty).toBe(Math.ceil(50 / 0.12));
    expect(r.stats.some((s) => s.key === 'galvanize')).toBe(true);
    expect(computeFence(clampFence({ ...DEFAULT_FENCE, infill: 'lama' })).lines.find((l) => l.key === 'lama')?.productSlug).toBe('lama');
    expect(computeFence(clampFence({ ...DEFAULT_FENCE, infill: 'none', gates: 0 })).lines.map((l) => l.key)).toEqual(['posts', 'rails']);
  });
});

describe('alçıpan bölme duvar', () => {
  it('10 × 2,8 m, çift yüz tek kat, 60 cm dikme, 1 kapı, yalıtımlı', () => {
    const r = computeDrywall(DEFAULT_DRYWALL);
    // net alan = 28 − 1,9 = 26,1; yüz alanı = 52,2; levha 1200×2500 = 3 m² → 52,2 × 1,08 / 3 = 18,8 → 19
    expect(r.stats.find((s) => s.key === 'netArea')?.value).toBe(26.1);
    expect(r.lines.find((l) => l.key === 'boards')).toMatchObject({ qty: 19, productSlug: 'beyaz-alcipan' });
    expect(r.lines.find((l) => l.key === 'studs')?.qty).toBe(Math.floor(10 / 0.6) + 1 + 2);
    expect(r.lines.find((l) => l.key === 'tracks')?.qty).toBe(20);
    expect(r.lines.find((l) => l.key === 'insulation')?.productSlug).toBe('tas-yunu');
    expect(parseDrywall({ l: '4', h: '3', ds: '0', ly: '2', ss: '0.4', bt: 'green' })).toMatchObject({ length: 4, doubleSided: false, layers: 2, studSpacing: 0.4, boardType: 'green' });
    expect(parseDrywall({ ss: '0.5' }).studSpacing).toBe(0.6); // listede yoksa varsayılan
  });
});

describe('kayıt', () => {
  it('her tür: varsayılan parametre kendi kuralıyla geçerli, sorgu gidiş-dönüş, kural şeması varsayılanı kabul eder; BOŞ sorgu → varsayılanlar', () => {
    for (const k of SIMPLE_KINDS) {
      const d = SIMPLE[k];
      expect(d.parse({}, d.defaultRules)).toEqual(d.defaults);
      expect(d.parse(new URLSearchParams(''), d.defaultRules)).toEqual(d.defaults);
      expect(d.clamp({}, d.defaultRules)).toEqual(d.defaults);
      const p = d.clamp(d.defaults, d.defaultRules);
      expect(p).toEqual(d.defaults);
      expect(d.parse(new URLSearchParams(d.serialize(p)), d.defaultRules)).toEqual(p);
      expect(d.rulesSchema.safeParse(d.defaultRules).success).toBe(true);
      expect(d.compute(p, d.defaultRules).lines.length).toBeGreaterThan(1);
    }
  });
});
