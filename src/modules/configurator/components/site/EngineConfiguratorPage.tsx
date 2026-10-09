import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/core/auth';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { getPublicSettings } from '@/modules/site-settings';
import { EMPTY_ENGINE_RULE, getCachedCatalogRows, getCachedEngineRules, toOverrides } from '../../data/engineRepository';
import { loadPriceTable } from '../../data/pricesRepository';
import { DEFAULT_RULES, getCachedRules } from '../../data/rulesRepository';
import { ENGINE_HREF, type EngineKind } from '../../engine/registry';
import { EngineConfigurator } from './EngineConfigurator';

export async function engineMetadata(kind: EngineKind, locale: string): Promise<Metadata> {
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Configurator' });
  return { title: t(`types.${kind}.title`), description: t(`types.${kind}.body`), alternates: buildAlternates(locale as Locale, { tr: ENGINE_HREF[kind], en: ENGINE_HREF[kind] }) };
}

/**
 * Konfigüratör sayfası (K-110): katalog + panel kuralları + ayarlar; durum sorgu dizesinden (paylaşılabilir). Fiyat yalnız üyeye (K-29).
 * Rota dosyaları ince: tür ve searchParams'ı buraya verir.
 */
export async function EngineConfiguratorPage({ kind, locale, searchParams }: { readonly kind: EngineKind; readonly locale: string; readonly searchParams: Record<string, string | undefined> }) {
  setRequestLocale(locale as Locale);
  const [rows, engineRules, rules, settings, t, user] = await Promise.all([getCachedCatalogRows(), getCachedEngineRules(), getCachedRules(), getPublicSettings(), getTranslations('Configurator'), getCurrentUser()]);
  const rule = engineRules.ok ? engineRules.data[kind] : EMPTY_ENGINE_RULE;
  const priceTable = user ? await loadPriceTable(rules.ok ? rules.data : DEFAULT_RULES) : null;
  const disclaimer = pickLocale(settings.configuratorDisclaimer, locale, { fallback: 'tr' }) || t('disclaimerFallback');
  const notes = (locale === 'en' && rule.notes.en.length ? rule.notes.en : rule.notes.tr).filter(Boolean);
  return (
    <ModuleBoundary module={`configurator/${kind}`}>
      <EngineConfigurator kind={kind} initial={searchParams} overrides={toOverrides(rule)} catalogRows={rows.ok ? rows.data : []} notes={notes} disclaimer={disclaimer} priceTable={priceTable} member={Boolean(user)} nextPath={getPathname({ locale: locale as Locale, href: ENGINE_HREF[kind] })} />
    </ModuleBoundary>
  );
}
