import { z } from 'zod';

/** Parametreler (04-CONFIGURATOR): en (w) · boy (l) · saçak (e) · mahya (r) · aks aralığı (b) + görsel anahtarlar. Metre. */
export interface Params {
  readonly width: number;
  readonly length: number;
  readonly eave: number;
  readonly ridge: number;
  readonly bay: number;
  readonly purlins: boolean;
  readonly door: boolean;
  readonly panels: boolean;
}

export interface Range {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}
export interface Limits {
  readonly width: Range;
  readonly length: Range;
  readonly eave: Range;
  readonly ridge_extra: Range;
  readonly bay: Range;
}

export const DEFAULT_LIMITS: Limits = {
  width: { min: 8, max: 60, step: 1 },
  length: { min: 10, max: 120, step: 1 },
  eave: { min: 3, max: 12, step: 0.5 },
  ridge_extra: { min: 0.5, max: 6, step: 0.5 },
  bay: { min: 4, max: 8, step: 0.5 },
};

export const DEFAULT_PARAMS: Params = { width: 20, length: 40, eave: 6, ridge: 8, bay: 6, purlins: true, door: true, panels: false };

const rangeSchema = z.object({ min: z.number(), max: z.number(), step: z.number().positive() });
export const limitsSchema = z.object({ width: rangeSchema, length: rangeSchema, eave: rangeSchema, ridge_extra: rangeSchema, bay: rangeSchema });

function snap(v: number, r: Range): number {
  const clamped = Math.min(r.max, Math.max(r.min, v));
  const steps = Math.round((clamped - r.min) / r.step);
  return Math.round((r.min + steps * r.step) * 1000) / 1000;
}

/** Sınırlara ve adıma oturtur; mahya ≥ saçak + min ek yükseklik. Her zaman geçerli parametre döner. */
export function clampParams(input: Partial<Params>, limits: Limits = DEFAULT_LIMITS): Params {
  const width = snap(input.width ?? DEFAULT_PARAMS.width, limits.width);
  const length = snap(input.length ?? DEFAULT_PARAMS.length, limits.length);
  const eave = snap(input.eave ?? DEFAULT_PARAMS.eave, limits.eave);
  const extra = snap((input.ridge ?? DEFAULT_PARAMS.ridge) - eave, limits.ridge_extra);
  const bay = snap(input.bay ?? DEFAULT_PARAMS.bay, limits.bay);
  return { width, length, eave, ridge: Math.round((eave + extra) * 1000) / 1000, bay, purlins: input.purlins ?? DEFAULT_PARAMS.purlins, door: input.door ?? DEFAULT_PARAMS.door, panels: input.panels ?? DEFAULT_PARAMS.panels };
}

/** Sorgu dizesi ↔ parametre: `?w=20&l=40&e=6&r=8&b=6&p=1&d=1&c=0` (paylaşılabilir, satış ekibi link gönderir). */
export function parseParams(search: URLSearchParams | Record<string, string | undefined>, limits: Limits = DEFAULT_LIMITS): Params {
  const get = (k: string) => (search instanceof URLSearchParams ? search.get(k) : search[k]) ?? undefined;
  const num = (k: string) => {
    const v = get(k);
    if (v === undefined) return undefined;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  };
  const flag = (k: string, fallback: boolean) => {
    const v = get(k);
    return v === undefined ? fallback : v === '1' || v === 'true';
  };
  return clampParams({ width: num('w'), length: num('l'), eave: num('e'), ridge: num('r'), bay: num('b'), purlins: flag('p', DEFAULT_PARAMS.purlins), door: flag('d', DEFAULT_PARAMS.door), panels: flag('c', DEFAULT_PARAMS.panels) }, limits);
}

export function serializeParams(p: Params): string {
  const q = new URLSearchParams({ w: String(p.width), l: String(p.length), e: String(p.eave), r: String(p.ridge), b: String(p.bay), p: p.purlins ? '1' : '0', d: p.door ? '1' : '0', c: p.panels ? '1' : '0' });
  return q.toString();
}
