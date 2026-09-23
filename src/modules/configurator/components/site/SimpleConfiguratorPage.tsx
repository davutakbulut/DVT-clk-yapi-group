import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { getCachedProductList } from '@/modules/products';
import { getPublicSettings } from '@/modules/site-settings';
import { DEFAULT_RULES, getCachedRules } from '../../data/rulesRepository';
import { SIMPLE, simpleProductSlugs, type AnyRules, type SimpleKind } from '../../domain/simple/registry';
import { SimpleConfigurator } from './SimpleConfigurator';

const PATHS: Record<SimpleKind, '/configurator/cladding' | '/configurator/mezzanine' | '/configurator/fence' | '/configurator/drywall'> = { cladding: '/configurator/cladding', mezzanine: '/configurator/mezzanine', fence: '/configurator/fence', drywall: '/configurator/drywall' };

export async function simpleConfiguratorMetadata(kind: SimpleKind, locale: string): Promise<Metadata> {
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Configurator' });
  return { title: t(`types.${kind}.title`), description: t(`types.${kind}.body`), alternates: buildAlternates(locale as Locale, { tr: PATHS[kind], en: PATHS[kind] }) };
}

/** Basit konfigüratör sayfası (K-100): durum sorgu dizesinde; kurallar panelden; sepet için ürün kimlikleri slug ile çözülür. */
export async function SimpleConfiguratorPage({ kind, locale, searchParams }: { readonly kind: SimpleKind; readonly locale: string; readonly searchParams: Record<string, string | undefined> }) {
  setRequestLocale(locale as Locale);
  const [rulesResult, settings, t, list] = await Promise.all([getCachedRules(), getPublicSettings(), getTranslations('Configurator'), getCachedProductList(locale)]);
  const rules: AnyRules = (rulesResult.ok ? rulesResult.data : DEFAULT_RULES).simple[kind];
  const disclaimer = pickLocale(settings.configuratorDisclaimer, locale, { fallback: 'tr' }) || t('disclaimerFallback');
  const wanted = new Set(simpleProductSlugs(kind, rules));
  const products: Record<string, { id: string; name: string }> = {};
  // Ürün slug'ları TR'dir (kural dosyası); listede TR slug'ı bulmak için her iki dilde de kontrol
  for (const p of list.ok ? list.data : []) if (wanted.has(p.slug)) products[p.slug] = { id: p.id, name: p.name };
  if (locale !== 'tr') {
    const tr = await getCachedProductList('tr');
    for (const p of tr.ok ? tr.data : []) if (wanted.has(p.slug) && !products[p.slug]) products[p.slug] = { id: p.id, name: p.name };
  }
  return (
    <ModuleBoundary module={`configurator/${kind}`}>
      <h1 className="sr-only">{t(`types.${kind}.title`)}</h1>
      <SimpleConfigurator kind={kind} initial={SIMPLE[kind].parse(searchParams, rules)} rules={rules} disclaimer={disclaimer} products={products} unitLabel={t('simple.unit')} />
    </ModuleBoundary>
  );
}
