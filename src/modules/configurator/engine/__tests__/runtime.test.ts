import { describe, expect, it } from 'vitest';
import { hall } from '../apps/hall';
import { mezzanine } from '../apps/mezzanine';
import { Catalog } from '../catalog';
import { plainContext } from '../helpers';
import { coerceState, defaultState, effectiveDef, runApp, serializeState } from '../runtime';

describe('motor çalışma zamanı (K-110)', () => {
  const catalog = Catalog.standard();

  it('coerceState: sınır/adım kırpma, anahtar ve seçenek doğrulama, katalog dışı profil varsayılana düşer', () => {
    const s = coerceState(hall, catalog, { width: '999', length: '5', eave: '6.37', purlins: '0', door: 'true', col: 'YOK', brace: 'HEB300', raf: 'IPE400' });
    expect(s['width']).toBe(60); expect(s['length']).toBe(8); expect(s['eave']).toBe(6.5);
    expect(s['purlins']).toBe(false); expect(s['door']).toBe(true);
    expect(s['col']).toBe('HEB360'); // bilinmeyen kod → varsayılan
    expect(s['brace']).toBe('CHS139.7x6'); // aile dışı (HEB çapraz olamaz) → varsayılan
    expect(s['raf']).toBe('IPE400');
    const m = coerceState(mezzanine, catalog, { load: 'bilinmez', deck: 'izgara' });
    expect(m['load']).toBe('orta'); expect(m['deck']).toBe('izgara');
  });

  it('serializeState ↔ coerceState gidiş-dönüş', () => {
    const s = defaultState(hall, catalog);
    const q = serializeState(hall, { ...s, width: 33, purlins: false, col: 'HEA200' });
    const back = coerceState(hall, catalog, Object.fromEntries(new URLSearchParams(q)));
    expect(back['width']).toBe(33); expect(back['purlins']).toBe(false); expect(back['col']).toBe('HEA200');
  });

  it('panel ayarı: aralık sınırı, varsayılan ve varsayılan profil geçersiz kılınır; geçersiz varsayılan kod varsayılanına döner', () => {
    const def = effectiveDef(hall, { fields: { bay: { max: 7, value: 7.5 }, width: { value: 25 } }, profiles: { col: 'HEB300' } });
    const bay = def.sections.flatMap((x) => x.fields).find((f) => f.id === 'bay')!;
    expect(bay.max).toBe(7); expect(bay.value).toBe(7); // 7,5 sınıra kırpıldı
    const s = defaultState(def, catalog);
    expect(s['width']).toBe(25); expect(s['col']).toBe('HEB300');
    const bad = effectiveDef(hall, { profiles: { col: 'YOK' } }, catalog);
    expect(defaultState(bad, catalog)['col']).toBe('HEB360');
  });

  it('runApp: bağlantı elemanı satırları eklenir ve toplamlar tutarlı', () => {
    const out = runApp(hall, defaultState(hall, catalog), plainContext(catalog));
    const names = out.bom.map((r) => ('group' in r ? `#${r.group}` : r.key ?? r.name));
    expect(names).toContain('plates');
    expect(names).toContain('bolt_M20');
    expect(out.steelKg).toBeGreaterThan(80_000);
    expect(out.allKg).toBeGreaterThan(out.steelKg);
    expect(out.model.members.length).toBeGreaterThan(50);
    expect(out.model.bolts.length).toBeGreaterThan(0);
  });
});
