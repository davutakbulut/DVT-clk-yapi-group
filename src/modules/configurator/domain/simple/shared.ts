import { z } from 'zod';

/** Basit konfigüratörler (K-100): ortak tipler — aralık, alan tanımı, sonuç satırı. Saf TS; istemci ve sunucu ortak. */
export interface Range {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}
export const rangeSchema = z.object({ min: z.number(), max: z.number(), step: z.number().positive() });

export type FieldSpec =
  | { readonly key: string; readonly type: 'range'; readonly range: Range; readonly unit: string; readonly decimals?: number }
  | { readonly key: string; readonly type: 'select'; readonly options: readonly string[] }
  | { readonly key: string; readonly type: 'toggle' };

export type Unit = 'adet' | 'm' | 'm2' | 'm3' | 'kg';

export interface ResultLine {
  readonly key: string;
  readonly qty: number;
  readonly unit: Unit;
  /** Profil/malzeme kodu (ör. "IPE 200", "60×60×3"); etiket değil, olduğu gibi gösterilir. */
  readonly spec?: string | null;
  readonly weightKg?: number | null;
  /** Sepete eklenirken bağlanacak ürün slug'ı (TR); ürün yoksa satır yalnız listelenir. */
  readonly productSlug?: string | null;
}
export interface Stat {
  readonly key: string;
  readonly value: number;
  readonly unit: string;
  readonly decimals?: number;
}
export interface SimpleResult {
  readonly stats: readonly Stat[];
  readonly lines: readonly ResultLine[];
  readonly totalWeightKg: number;
}

export function snap(v: number, r: Range): number {
  const clamped = Math.min(r.max, Math.max(r.min, Number.isFinite(v) ? v : r.min));
  const steps = Math.round((clamped - r.min) / r.step);
  return Math.round((r.min + steps * r.step) * 1000) / 1000;
}
export const ceil = (v: number): number => Math.ceil(v - 1e-9);
export const round = (v: number, d = 2): number => Math.round(v * 10 ** d) / 10 ** d;

/** Sorgu dizesi → ham nesne (sayı/dize); anahtar kısaltmaları her konfigüratörün kendi eşlemesinde. */
export function readQuery(search: URLSearchParams | Record<string, string | undefined>, map: Readonly<Record<string, string>>): Record<string, string> {
  const get = (k: string) => (search instanceof URLSearchParams ? search.get(k) : search[k]) ?? undefined;
  const out: Record<string, string> = {};
  for (const [short, key] of Object.entries(map)) {
    const v = get(short);
    if (v !== undefined && v !== '') out[key] = v;
  }
  return out;
}
export function writeQuery(params: Record<string, string | number | boolean>, map: Readonly<Record<string, string>>): string {
  const sp = new URLSearchParams();
  for (const [short, key] of Object.entries(map)) {
    const v = params[key];
    if (v !== undefined) sp.set(short, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  return sp.toString();
}
export const bool = (v: unknown, fallback: boolean): boolean => (v === undefined ? fallback : v === true || v === '1' || v === 'true');
export const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback);
/** Boş/undefined → varsayılan (Number('') = 0 tuzağı: kaydırıcılar en küçük değere düşüyordu). */
export const num = (v: unknown, fallback: number): number => {
  if (v === undefined || v === null || v === '') return fallback;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};
