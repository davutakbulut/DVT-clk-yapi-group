import 'server-only';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Catalog, type CatalogRow } from './catalog';
import { ENGINE_APPS, isEngineKind, type EngineKind } from './registry';
import { coerceState, effectiveDef, runApp, type EngineOverrides, type RunOutput } from './runtime';
import type { AppState, BomRow, BuildContext } from './types';
import { isGroup } from './types';

/** Sunucuda yapım bağlamı: next-intl çevirmeni (Engine) + biçimlendirici; kayıt/yazdırma/teklif aynı sayıları üretir. */
export async function serverContext(locale: string, rows: readonly CatalogRow[]): Promise<BuildContext> {
  const [t, format] = await Promise.all([getTranslations({ locale: locale as 'tr' | 'en', namespace: 'Engine' }), getFormatter({ locale: locale as 'tr' | 'en' })]);
  const catalog = new Catalog(rows);
  const fmt = (v: number, d = 0) => format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d });
  const tx = t as unknown as BuildContext['t'];
  return { t: tx, fmt, fmtAuto: (v) => (Math.abs(v) >= 1000 ? fmt(v, 0) : Math.abs(v) >= 100 ? fmt(v, 1) : fmt(v, 2)), catalog, profile: (c) => catalog.get(c) };
}

/** Eski hol bağlantısı/kaydı kısa anahtarları → motor alan kimlikleri (Faz 26–29 paylaşım bağlantıları çalışmaya devam eder). */
export const LEGACY_HALL_KEYS: Readonly<Record<string, string>> = { w: 'width', l: 'length', e: 'eave', r: 'ridge', b: 'bay', p: 'purlins', d: 'door', c: 'panels' };

/** Kayıtlı `params` ({kind,state} ya da eski hol biçimi {w,l,e,r,b,p,d,c}) → tür + durum. */
export function parseSavedParams(params: Readonly<Record<string, unknown>>): { kind: EngineKind; raw: Record<string, unknown> } {
  if (isEngineKind(params['kind']) && typeof params['state'] === 'object' && params['state'] !== null) return { kind: params['kind'], raw: params['state'] as Record<string, unknown> };
  // Eski hol kayıtları (Faz 26–29): kısa anahtarlar
  const raw: Record<string, unknown> = {};
  for (const [k, id] of Object.entries(LEGACY_HALL_KEYS)) if (params[k] !== undefined) raw[id] = params[k];
  return { kind: 'hall', raw };
}

export interface EngineRun { readonly kind: EngineKind; readonly state: AppState; readonly out: RunOutput }
export async function runEngine(kind: EngineKind, raw: Readonly<Record<string, unknown>>, overrides: EngineOverrides, rows: readonly CatalogRow[], locale: string): Promise<EngineRun> {
  const ctx = await serverContext(locale, rows);
  const def = effectiveDef(ENGINE_APPS[kind], overrides, ctx.catalog);
  const state = coerceState(def, ctx.catalog, raw);
  return { kind, state, out: runApp(def, state, ctx) };
}

/** Metraj satırı → configuration_items kalemi (sunucu hesaplar, istemci sayısı kabul edilmez) */
export function bomToItems(out: RunOutput): Record<string, unknown>[] {
  return out.bom.filter((r): r is BomRow => !isGroup(r)).map((r) => ({
    element_group: (r.key ?? r.name).slice(0, 40),
    profile_code: r.profile ?? null,
    piece_count: r.qty && r.qty > 0 ? Math.round(r.qty) : null,
    total_length_m: r.unit === 'm' && r.amount !== undefined ? r.amount : null,
    total_area_m2: (r.unit === 'm2' || r.unit2 === 'm2') && r.amount !== undefined ? (r.unit2 === 'm2' ? r.amount : r.amount) : null,
    total_weight_kg: r.kg ?? null,
  }));
}
