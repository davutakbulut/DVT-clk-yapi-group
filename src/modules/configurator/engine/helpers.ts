import type { Catalog, Profile } from './catalog';
import type { Kit } from './kit';
import type { MaterialDesc } from './materials';
import type { BomRow, BuildContext } from './types';
import { v3, type V3, type Vec3 } from './vec';

/** Profil ölçüleri (m) + birim ağırlık: yapım fonksiyonlarının kısa yolu. */
export interface Dims { readonly h: number; readonly b: number; readonly tf: number; readonly tw: number; readonly t: number; readonly p: Profile; readonly G: number }
export function dims(ctx: BuildContext, code: string): Dims {
  const p = ctx.profile(code);
  return { ...p.m, p, G: p.G };
}

export interface TallyRow { name: string; spec: string; n: number; len: number; mult: number; double: boolean }

/**
 * Metraj sayacı: eleman çizip boyunu kalem bazında toplar; `row(key)` metraj satırını verir (kg = boy × G × çarpan).
 * `name` çevrilmiş metindir; `spec` profil kodudur (satırda etiketi ve kg/m'si yazılır).
 */
export function createTally(kit: Kit, ctx: BuildContext) {
  const Q = new Map<string, TallyRow>();
  const add = (key: string, name: string, code: string, len: number, mult = 1, n = 1, double = false) => {
    const q = Q.get(key) ?? { name, spec: code, n: 0, len: 0, mult, double };
    q.n += n; q.len += len; Q.set(key, q);
  };
  return {
    add,
    put(key: string, name: string, code: string, mat: MaterialDesc, p1: V3 | Vec3, p2: V3 | Vec3, opts: { ref?: V3 | Vec3; roll?: number; double?: number; cutX?: boolean } = {}, mult = 1, double = false): void {
      kit.member(code, mat, p1, p2, opts);
      add(key, name, code, v3(p1).distanceTo(v3(p2)), mult, 1, double);
    },
    /** Satır; kalem yoksa null. `steel=false` ağırlık toplamına çelik olarak girmez. */
    row(key: string, steel = true): BomRow | null {
      const q = Q.get(key);
      if (!q) return null;
      const G = ctx.profile(q.spec).G * q.mult;
      const label = (q.double ? '2× ' : '') + ctx.catalog.label(q.spec);
      return { key, name: q.name, spec: `${label} · ${ctx.fmt(G, G < 10 ? 2 : 1)} kg/m`, profile: q.spec, qty: q.n, amount: q.len, unit: 'm', kg: q.len * G, steel };
    },
    has: (key: string) => Q.has(key),
    get: (key: string) => Q.get(key),
  };
}
export type Tally = ReturnType<typeof createTally>;

/** Düzgün ızgara: açıklığı en fazla `span` aralıklı eşit parçalara böler (çok katlı, ara kat) */
export function grid(total: number, span: number): { readonly n: number; readonly step: number; readonly pts: readonly number[] } {
  const n = Math.max(1, Math.ceil(total / span - 1e-9));
  return { n, step: total / n, pts: Array.from({ length: n + 1 }, (_, i) => -total / 2 + (i * total) / n) };
}

/** Test/yedek bağlamı: çevirmen anahtarı döndürür, biçim tr-TR. */
export function plainContext(catalog: Catalog, t?: BuildContext['t']): BuildContext {
  const fmt = (v: number, d = 0) => Number(v).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  return {
    t: t ?? ((key, values) => (values ? `${key}(${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(',')})` : key)),
    fmt,
    fmtAuto: (v) => (Math.abs(v) >= 1000 ? fmt(v, 0) : Math.abs(v) >= 100 ? fmt(v, 1) : fmt(v, 2)),
    catalog,
    profile: (code) => catalog.get(code),
  };
}
