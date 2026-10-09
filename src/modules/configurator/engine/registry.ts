import { cladding } from './apps/cladding';
import { drywall } from './apps/drywall';
import { fence } from './apps/fence';
import { hall } from './apps/hall';
import { mezzanine } from './apps/mezzanine';
import { multiStorey } from './apps/multiStorey';
import type { AppDef } from './types';

/** Konfigüratör türleri (K-110). Yeni tür: buraya + route + Configurator.types.<key> + Engine.<key> mesajları + rehber anahtarı (K-107). */
export const ENGINE_KINDS = ['hall', 'multiStorey', 'cladding', 'mezzanine', 'fence', 'drywall'] as const;
export type EngineKind = (typeof ENGINE_KINDS)[number];
export const ENGINE_APPS: Readonly<Record<EngineKind, AppDef>> = { hall, multiStorey, cladding, mezzanine, fence, drywall };
export const isEngineKind = (v: unknown): v is EngineKind => typeof v === 'string' && (ENGINE_KINDS as readonly string[]).includes(v);
/** Kural anahtarı (configurator_rules.key, yalnız küçük harf): engine.<kind> — multiStorey → engine.multi_storey */
export const ENGINE_RULE_KEY = (kind: EngineKind): string => `engine.${kind.replace(/[A-Z]/g, (c) => `_${String.fromCharCode(c.charCodeAt(0) + 32)}`)}`;
/** Rota (i18n/routing pathnames) */
export const ENGINE_HREF: Readonly<Record<EngineKind, '/configurator/hall' | '/configurator/multi-storey' | '/configurator/cladding' | '/configurator/mezzanine' | '/configurator/fence' | '/configurator/drywall'>> = {
  hall: '/configurator/hall', multiStorey: '/configurator/multi-storey', cladding: '/configurator/cladding', mezzanine: '/configurator/mezzanine', fence: '/configurator/fence', drywall: '/configurator/drywall',
};
