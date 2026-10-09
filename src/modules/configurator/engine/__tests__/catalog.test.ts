import { describe, expect, it } from 'vitest';
import { Catalog, computeSectionProps, profileOutline, STANDARD_PROFILES } from '../catalog';

// Katalog tablolarındaki yayınlanmış değerlerle karşılaştırma (±%2): kesit integrali doğru çalışıyor mu?
const near = (v: number, ref: number, tol = 0.02) => expect(Math.abs(v - ref) / ref).toBeLessThan(tol);

describe('profil kataloğu (K-110)', () => {
  const cat = Catalog.standard();

  it('~280 standart profil; kodlar ASCII ve benzersiz; etiketler Türkçe biçimde', () => {
    expect(STANDARD_PROFILES.length).toBeGreaterThan(250);
    expect(new Set(STANDARD_PROFILES.map((p) => p.code)).size).toBe(STANDARD_PROFILES.length);
    for (const p of STANDARD_PROFILES) expect(p.code, p.code).toMatch(/^[A-Z0-9.x]+$/);
    expect(cat.label('SHS40x40x3')).toBe('Kutu 40×40×3');
    expect(cat.label('CHS139.7x6')).toBe('Boru 139,7×6');
    expect(cat.label('L100x100x10')).toBe('L 100×100×10');
  });

  it('IPE 200 · HEB 300 · UPN 200 · L 100×100×10 · CHS 139,7×6 · SHS 40×40×3 · FL 50×5 katalog değerlerine yakın', () => {
    const ipe = computeSectionProps(cat.get('IPE200'));
    near(ipe.A, 28.5); near(ipe.G, 22.4); near(ipe.Iy, 1943); near(ipe.Wply, 220.6); near(ipe.Iz, 142.4); near(ipe.iy, 8.26);
    const heb = computeSectionProps(cat.get('HEB300'));
    near(heb.A, 149.1); near(heb.G, 117); near(heb.Iy, 25170); near(heb.Wply, 1869);
    const upn = computeSectionProps(cat.get('UPN200'));
    near(upn.A, 32.2, 0.04); near(upn.G, 25.3, 0.04); near(upn.Iy, 1910, 0.04); // UPN konik başlık ortalama kalınlıkla paralel kabul edilir (orijinal kabul)
    const l = computeSectionProps(cat.get('L100x100x10'));
    near(l.A, 19.2); near(l.G, 15.0); near(l.Iy, 177, 0.03); expect(l.Iv).toBeDefined();
    const chs = computeSectionProps(cat.get('CHS139.7x6'));
    near(chs.A, 25.2); near(chs.G, 19.8); near(chs.Iy, 564);
    const shs = computeSectionProps(cat.get('SHS40x40x3'));
    near(shs.A, 4.21, 0.03); near(shs.G, 3.30, 0.03);
    const fl = computeSectionProps(cat.get('FL50x5'));
    near(fl.A, 2.5); near(fl.G, 1.96);
  });

  it('kesit çokgeni kapalı ve delikler boru/kutuda var; CW profili C kesit', () => {
    const o = profileOutline(cat.get('RHS200x100x6'));
    expect(o.holes).toHaveLength(1);
    expect(o.outer.length).toBeGreaterThan(8);
    expect(profileOutline(cat.get('CHS88.9x4')).holes).toHaveLength(1);
    expect(profileOutline(cat.get('CW75')).holes).toHaveLength(0);
    expect(cat.get('CW75').kind).toBe('C');
  });

  it('veritabanı kg/m geometrinin önüne geçer; bilinmeyen kod hata; aile yedeği', () => {
    const c = new Catalog([{ ...STANDARD_PROFILES.find((p) => p.code === 'IPE200')!, kgPerM: 22.4, isActive: true }, { ...STANDARD_PROFILES.find((p) => p.code === 'IPE220')!, kgPerM: null, isActive: false }]);
    expect(c.get('IPE200').G).toBe(22.4);
    expect(c.has('IPE220')).toBe(false);
    expect(() => c.get('HEB100')).toThrow(/Katalogda olmayan/);
    expect(c.fallback('HEB100', ['IPE'])).toBe('IPE200');
    expect(c.ofFamilies(['IPE'])).toHaveLength(1);
  });
});

describe('kesit çokgeni kenar durumları', () => {
  it('boru deliği tam tur örneklenir (boş delik earcut hatası)', () => {
    const cat = Catalog.standard();
    const o = profileOutline(cat.get('CHS139.7x6'), 5);
    expect(o.outer.length).toBeGreaterThan(12);
    expect(o.holes[0]!.length).toBeGreaterThan(12);
    for (const r of [...o.holes, o.outer]) for (const p of r) expect(Number.isFinite(p[0]) && Number.isFinite(p[1])).toBe(true);
  });
});
