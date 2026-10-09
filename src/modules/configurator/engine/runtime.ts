import type { Catalog } from './catalog';
import { Kit, type Model } from './kit';
import { PLATE_T, isGroup, type AppDef, type AppState, type BomItem, type BomRow, type BuildContext, type BuildResult, type FieldDef, type ProfileFieldDef } from './types';

/**
 * Çalışma zamanı yardımcıları (saf): durum kurma/doğrulama, sorgu dizesi, yapım + metraj toplamları.
 * Panel ayarları (`EngineOverrides`) alan sınırlarını, varsayılanları ve varsayılan profilleri değiştirir; kod yalnız mantığı taşır.
 */
export interface FieldOverride { readonly min?: number; readonly max?: number; readonly step?: number; readonly value?: number | string | boolean }
export interface EngineOverrides {
  readonly fields?: Readonly<Record<string, FieldOverride>>;
  readonly profiles?: Readonly<Record<string, string>>;
}

/** Tanım + panel ayarı → etkin alan/profil tanımları. */
export function effectiveDef(app: AppDef, o: EngineOverrides = {}, catalog?: Catalog): AppDef {
  const field = (f: FieldDef): FieldDef => {
    const ov = o.fields?.[f.id];
    if (!ov) return f;
    const out: FieldDef = { ...f, ...(ov.min !== undefined ? { min: ov.min } : {}), ...(ov.max !== undefined ? { max: ov.max } : {}), ...(ov.step !== undefined && ov.step > 0 ? { step: ov.step } : {}), ...(ov.value !== undefined ? { value: ov.value } : {}) };
    // Varsayılan sınırların içinde kalsın
    if (out.type === 'range' && typeof out.value === 'number') return { ...out, value: snapField(out, out.value) };
    if ((out.type === 'seg' || out.type === 'select') && !out.options?.some((x) => String(x.value) === String(out.value))) return { ...out, value: f.value };
    return out;
  };
  // Panelden gelen kod katalogda yoksa (silinmiş/pasif) kod varsayılanı kalır
  const profile = (p: ProfileFieldDef): ProfileFieldDef => (o.profiles?.[p.id] && (!catalog || catalog.has(o.profiles[p.id]!)) ? { ...p, value: o.profiles[p.id]! } : p);
  return { ...app, sections: app.sections.map((s) => ({ ...s, fields: s.fields.map(field) })), profiles: app.profiles.map(profile) };
}

export function snapField(f: FieldDef, v: number): number {
  const min = f.min ?? 0, max = f.max ?? min, step = f.step ?? 1;
  const c = Math.min(max, Math.max(min, Number.isFinite(v) ? v : Number(f.value)));
  return +(Math.round((c - min) / step) * step + min).toFixed(6);
}

export const allFields = (app: AppDef): FieldDef[] => app.sections.flatMap((s) => s.fields);

/** Varsayılan durum; katalogda olmayan varsayılan profil ailenin ilk profiline düşer. */
export function defaultState(app: AppDef, catalog: Catalog): AppState {
  const s: AppState = {};
  for (const f of allFields(app)) s[f.id] = f.value;
  for (const p of app.profiles) s[p.id] = catalog.fallback(p.value, p.families);
  return s;
}

/**
 * Ham girdiyi (sorgu dizesi, taslak, kayıt) geçerli duruma indirger: aralık → sınır+adım, seçenek → listede, anahtar → bool,
 * profil → katalogda ve ailede. Bilinmeyen anahtar yok sayılır; eksik alan varsayılanı alır.
 */
export function coerceState(app: AppDef, catalog: Catalog, raw: Readonly<Record<string, unknown>>): AppState {
  const s = defaultState(app, catalog);
  for (const f of allFields(app)) {
    const v = raw[f.id];
    if (v === undefined || v === null || v === '') continue;
    if (f.type === 'toggle') s[f.id] = v === true || v === '1' || v === 'true' || v === 1;
    else if (f.type === 'range') { const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.')); if (Number.isFinite(n)) s[f.id] = snapField(f, n); }
    else { const opt = f.options?.find((o) => String(o.value) === String(v)); if (opt) s[f.id] = opt.value; }
  }
  for (const p of app.profiles) {
    const v = raw[p.id];
    if (typeof v === 'string' && catalog.has(v) && p.families.includes(catalog.get(v).family)) s[p.id] = v;
  }
  return s;
}

export function serializeState(app: AppDef, s: AppState): string {
  const q = new URLSearchParams();
  for (const f of allFields(app)) { const v = s[f.id]; q.set(f.id, typeof v === 'boolean' ? (v ? '1' : '0') : String(v)); }
  for (const p of app.profiles) q.set(p.id, String(s[p.id]));
  return q.toString();
}

export interface RunOutput {
  readonly result: BuildResult;
  readonly model: Model;
  /** Metraj satırları: yapım satırları + bağlantı elemanları (levha, cıvata) */
  readonly bom: readonly BomItem[];
  readonly steelKg: number;
  readonly allKg: number;
}

/** Normalize + yapım + bağlantı elemanı satırları + toplamlar (orijinal `renderResult` kuralı). */
export function runApp(app: AppDef, state: AppState, ctx: BuildContext): RunOutput {
  const s: AppState = { ...state };
  app.normalize?.(s, null, ctx);
  const kit = new Kit(ctx.catalog);
  const result = app.build(s, kit, ctx);
  const model = kit.model();
  const bom: BomItem[] = [...result.bom];
  if (model.plateCount || model.boltCounts.size) {
    bom.push({ group: ctx.t('common.groups.connections') });
    if (model.plateCount) bom.push({ key: 'plates', name: ctx.t('common.bom.plates'), spec: ctx.t('common.spec.plates', { t: PLATE_T * 1000 }), qty: model.plateCount, unit: 'pcs', kg: model.plateKg, steel: true });
    for (const [label, c] of [...model.boltCounts.entries()].sort()) {
      bom.push({ key: `bolt_${label}`, name: ctx.t('common.bom.bolt', { label }), spec: label === 'M24' ? ctx.t('common.spec.anchorBolt') : ctx.t('common.spec.bolt'), qty: c.n, unit: 'pcs', kg: c.kg, steel: true });
    }
  }
  const rows = bom.filter((r): r is BomRow => !isGroup(r));
  const steelKg = rows.reduce((t, r) => t + (r.steel && r.kg ? r.kg : 0), 0);
  const allKg = rows.reduce((t, r) => t + (r.kg ?? 0), 0);
  return { result, model, bom, steelKg, allKg };
}

/** Alanın görünürlüğü (show koşulu) */
export const visible = (f: { readonly show?: (s: AppState) => boolean }, s: AppState): boolean => !f.show || f.show(s);

/** CSV (noktalı virgül, UTF-8 BOM; Excel açar) */
export function bomCsv(out: RunOutput, ctx: BuildContext, unitLabel: (u: string | undefined) => string): string {
  const lines: (string | number)[][] = [[ctx.t('common.csv.item'), ctx.t('common.csv.spec'), ctx.t('common.csv.qty'), ctx.t('common.csv.amount'), ctx.t('common.csv.unit'), ctx.t('common.csv.kg')]];
  for (const r of out.bom) {
    if (isGroup(r)) { lines.push([r.group.toLocaleUpperCase('tr-TR')]); continue; }
    lines.push([r.name, r.spec ?? '', r.qty ?? '', r.amount !== undefined ? ctx.fmt(r.amount, 2) : '', unitLabel(r.unit2 ?? r.unit), r.kg ? ctx.fmt(r.kg, 1) : '']);
  }
  lines.push([], [ctx.t('common.csv.steelTotal'), '', '', '', '', ctx.fmt(out.steelKg, 1)], [ctx.t('common.csv.allTotal'), '', '', '', '', ctx.fmt(out.allKg, 1)]);
  return '﻿' + lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
}
