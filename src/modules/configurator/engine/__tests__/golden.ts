import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'vitest';
import { Catalog, STANDARD_PROFILES } from '../catalog';
import { plainContext } from '../helpers';
import { Kit } from '../kit';
import { isGroup, type AppDef, type AppState, type BomRow } from '../types';

/**
 * Altın veri karşılaştırması: orijinal prototip (yeni-konfiguratorler/<id>.html) tarayıcıda koşturulup metraj tablosu kaydedildi
 * (golden/<id>.json). Port aynı durumda aynı satırları (adet, miktar, ağırlık) ve aynı toplamları vermeli (±%0,6 — yuvarlama).
 */
interface GoldenRow { group?: string; name?: string; spec?: string; qty?: string; amount?: string; kg?: string }
interface GoldenCase { variant: Record<string, string | number>; rows: GoldenRow[]; kpis: [string, string][]; totals: string; flag: string; chip: string }

/** "1.234,5 m" → 1234.5 ; "–" → null */
export const num = (s: string | undefined): number | null => {
  if (!s || s === '–') return null;
  const m = /-?[\d.]+(?:,\d+)?/.exec(s.replace(/\s/g, ''));
  if (!m) return null;
  return Number(m[0].replace(/\./g, '').replace(',', '.'));
};
const close = (a: number, b: number, tol = 0.006) => Math.abs(a - b) <= Math.max(tol * Math.abs(b), 0.5);

/** Orijinal profil adı → katalog kodu (altın durumlarda profil alanı yok; yalnız gerektiğinde) */
const LEGACY: Record<string, string> = {};
for (const p of STANDARD_PROFILES) LEGACY[p.label] = p.code;

export function loadGolden(file: string): GoldenCase[] {
  return JSON.parse(readFileSync(join(__dirname, 'golden', `${file}.json`), 'utf8')) as GoldenCase[];
}

export function defaultState(app: AppDef): AppState {
  const s: AppState = {};
  for (const sec of app.sections) for (const f of sec.fields) s[f.id] = f.value;
  for (const p of app.profiles) s[p.id] = p.value;
  return s;
}

export function applyVariant(app: AppDef, variant: Record<string, string | number>): AppState {
  const s = defaultState(app);
  const fields = app.sections.flatMap((x) => x.fields);
  for (const [k, raw] of Object.entries(variant)) {
    const f = fields.find((x) => x.id === k);
    if (!f) { if (typeof raw === 'string' && LEGACY[raw]) s[k] = LEGACY[raw]; continue; }
    if (f.type === 'toggle') s[k] = raw === '1' || raw === 1;
    else if (f.type === 'range') s[k] = Number(raw);
    else { const opt = f.options?.find((o) => String(o.value) === String(raw)); if (opt) s[k] = opt.value; }
  }
  return s;
}

/** Portun bir durumdaki çıktısı: metraj satırları + toplamlar (orijinal `renderResult` ile aynı toplama kuralı). */
export function runApp(app: AppDef, state: AppState) {
  const catalog = Catalog.standard();
  const ctx = plainContext(catalog);
  const s = { ...state };
  app.normalize?.(s, null, ctx);
  const kit = new Kit(catalog);
  const res = app.build(s, kit, ctx);
  const rows: BomRow[] = res.bom.filter((r): r is BomRow => !isGroup(r));
  const groups = res.bom.filter(isGroup).length;
  const plates = kit.plateCount, bolts = [...kit.boltCounts.entries()].sort();
  const extra: BomRow[] = [];
  if (plates || bolts.length) {
    if (plates) extra.push({ name: 'plates', qty: plates, unit: 'pcs', kg: kit.plateKg, steel: true });
    for (const [label, c] of bolts) extra.push({ name: `bolt ${label}`, qty: c.n, unit: 'pcs', kg: c.kg, steel: true });
  }
  const all = [...rows, ...extra];
  const steelKg = all.reduce((t, r) => t + (r.steel && r.kg ? r.kg : 0), 0);
  const allKg = all.reduce((t, r) => t + (r.kg ?? 0), 0);
  return { res, rows: all, groups: groups + (extra.length ? 1 : 0), steelKg, allKg, kit };
}

/** Bir altın durumu portla karşılaştırır; hata mesajında satır adı ve beklenen/çıkan değer yazar. */
export function expectMatchesGolden(app: AppDef, g: GoldenCase): void {
  const state = applyVariant(app, g.variant);
  const out = runApp(app, state);
  const gRows = g.rows.filter((r) => !r.group);
  const label = (i: number) => `${JSON.stringify(g.variant)} satır ${i}: ${gRows[i]?.name} ↔ ${out.rows[i]?.name}`;
  expect(out.rows.length, `${JSON.stringify(g.variant)} satır sayısı`).toBe(gRows.length);
  expect(out.groups, `${JSON.stringify(g.variant)} grup sayısı`).toBe(g.rows.filter((r) => r.group).length);
  gRows.forEach((gr, i) => {
    const r = out.rows[i]!;
    const q = num(gr.qty), a = num(gr.amount), kg = num(gr.kg);
    if (q !== null) expect(close(r.qty ?? 0, q), `${label(i)} adet ${r.qty} ≠ ${q}`).toBe(true); else expect(r.qty, `${label(i)} adet olmamalı`).toBeUndefined();
    if (a !== null) expect(close(r.amount ?? 0, a, 0.01), `${label(i)} miktar ${r.amount} ≠ ${a}`).toBe(true); else expect(r.amount, `${label(i)} miktar olmamalı`).toBeUndefined();
    if (kg !== null) expect(close(r.kg ?? 0, kg), `${label(i)} kg ${r.kg} ≠ ${kg}`).toBe(true); else expect(r.kg ? Math.round(r.kg) : 0, `${label(i)} kg olmamalı`).toBe(0);
  });
  const steel = /Toplam çelik \(tonaj\)\s*([\d.,]+) t/.exec(g.totals);
  const total = /Toplam ağırlık\s*([\d.,]+) kg/.exec(g.totals);
  if (steel) expect(close(out.steelKg / 1000, num(steel[1]!)!, 0.003), `${JSON.stringify(g.variant)} çelik ${out.steelKg} ≠ ${steel[1]} t`).toBe(true);
  if (total) expect(close(out.allKg, num(total[1]!)!, 0.003), `${JSON.stringify(g.variant)} toplam ${out.allKg} ≠ ${total[1]} kg`).toBe(true);
  else expect(out.allKg - out.steelKg, `${JSON.stringify(g.variant)} çelik dışı ağırlık ≤ 1 kg olmalı`).toBeLessThanOrEqual(1);
  // Orijinal arayüz "Toplam çelik" KPI'sını kendisi ekler; port bunu UI katmanında yapar
  const goldenKpis = g.kpis.filter(([k]) => k !== 'Toplam çelik').length;
  expect(out.res.kpis.length, `${JSON.stringify(g.variant)} KPI sayısı`).toBe(goldenKpis);
}
