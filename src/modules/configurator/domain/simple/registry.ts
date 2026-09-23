import { claddingFields, claddingRulesSchema, clampCladding, computeCladding, DEFAULT_CLADDING, DEFAULT_CLADDING_RULES, parseCladding, serializeCladding, type CladdingParams, type CladdingRules } from './cladding';
import { drywallFields, drywallRulesSchema, clampDrywall, computeDrywall, DEFAULT_DRYWALL, DEFAULT_DRYWALL_RULES, parseDrywall, serializeDrywall, type DrywallParams, type DrywallRules } from './drywall';
import { fenceFields, fenceRulesSchema, clampFence, computeFence, DEFAULT_FENCE, DEFAULT_FENCE_RULES, parseFence, serializeFence, type FenceParams, type FenceRules } from './fence';
import { mezzanineFields, mezzanineRulesSchema, clampMezzanine, computeMezzanine, DEFAULT_MEZZANINE, DEFAULT_MEZZANINE_RULES, parseMezzanine, serializeMezzanine, type MezzanineParams, type MezzanineRules } from './mezzanine';
import type { FieldSpec, SimpleResult } from './shared';

/** Basit konfigüratör türleri (K-100). Yeni tür: buraya kayıt + route + mesajlar + kural anahtarı. */
export const SIMPLE_KINDS = ['cladding', 'mezzanine', 'fence', 'drywall'] as const;
export type SimpleKind = (typeof SIMPLE_KINDS)[number];

export type SimpleParamsOf = { cladding: CladdingParams; mezzanine: MezzanineParams; fence: FenceParams; drywall: DrywallParams };
export type SimpleRulesOf = { cladding: CladdingRules; mezzanine: MezzanineRules; fence: FenceParams extends never ? never : FenceRules; drywall: DrywallRules };
export type AnyParams = CladdingParams | MezzanineParams | FenceParams | DrywallParams;
export type AnyRules = CladdingRules | MezzanineRules | FenceRules | DrywallRules;

export interface SimpleDefinition<P, R> {
  readonly kind: SimpleKind;
  readonly defaults: P;
  readonly defaultRules: R;
  readonly rulesSchema: { safeParse: (v: unknown) => { success: true; data: R } | { success: false } };
  readonly clamp: (input: Partial<Record<keyof P, unknown>>, rules: R) => P;
  readonly parse: (search: URLSearchParams | Record<string, string | undefined>, rules: R) => P;
  readonly serialize: (p: P) => string;
  readonly fields: (rules: R) => readonly FieldSpec[];
  readonly compute: (p: P, rules: R) => SimpleResult;
  /** Sorgu dizesinde kullanılan kısa anahtarlar (taslak/URL ayrımı için) */
  readonly queryKeys: readonly string[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- kayıt tablosu; çağıran tarafta kind ile daraltılır
export const SIMPLE: Record<SimpleKind, SimpleDefinition<any, any>> = {
  cladding: { kind: 'cladding', defaults: DEFAULT_CLADDING, defaultRules: DEFAULT_CLADDING_RULES, rulesSchema: claddingRulesSchema, clamp: clampCladding, parse: parseCladding, serialize: serializeCladding, fields: claddingFields, compute: computeCladding, queryKeys: ['w', 'l', 's', 'h', 'o', 'rt', 'wt', 'i'] },
  mezzanine: { kind: 'mezzanine', defaults: DEFAULT_MEZZANINE, defaultRules: DEFAULT_MEZZANINE_RULES, rulesSchema: mezzanineRulesSchema, clamp: clampMezzanine, parse: parseMezzanine, serialize: serializeMezzanine, fields: mezzanineFields, compute: computeMezzanine, queryKeys: ['w', 'l', 'h', 'g', 'ld', 'd'] },
  fence: { kind: 'fence', defaults: DEFAULT_FENCE, defaultRules: DEFAULT_FENCE_RULES, rulesSchema: fenceRulesSchema, clamp: clampFence, parse: parseFence, serialize: serializeFence, fields: fenceFields, compute: computeFence, queryKeys: ['l', 'h', 'ps', 'r', 'f', 'bs', 'g', 'z'] },
  drywall: { kind: 'drywall', defaults: DEFAULT_DRYWALL, defaultRules: DEFAULT_DRYWALL_RULES, rulesSchema: drywallRulesSchema, clamp: clampDrywall, parse: parseDrywall, serialize: serializeDrywall, fields: drywallFields, compute: computeDrywall, queryKeys: ['l', 'h', 'ds', 'ly', 'ss', 'd', 'i', 'bt', 'bs'] },
};
/** Kural anahtarı (configurator_rules.key) */
export const SIMPLE_RULE_KEY: Record<SimpleKind, string> = { cladding: 'cladding', mezzanine: 'mezzanine', fence: 'fence', drywall: 'drywall' };
/** Sonuç satırlarının bağlandığı ürün slug'ları (sayfa, sepet için kimlikleri çözer) */
export function simpleProductSlugs(kind: SimpleKind, rules: AnyRules): string[] {
  const p = (rules as { products: Record<string, string> }).products;
  return [...new Set(Object.values(p).filter(Boolean))];
}
export { computeCladding, computeMezzanine, computeFence, computeDrywall };
