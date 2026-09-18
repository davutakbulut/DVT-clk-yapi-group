import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/core/auth';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { Configurator, DEFAULT_RULES, getCachedRules, getCachedWeights, parseParams } from '@/modules/configurator';
import { loadPriceTable } from '@/modules/configurator/server';
import { getPublicSettings } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Configurator' });
  return { title: t('types.hall.title'), description: t('types.hall.body'), alternates: buildAlternates(locale as Locale, { tr: '/configurator/hall', en: '/configurator/hall' }) };
}

/** Durum sorgu dizesinde (?w=&l=&e=&r=&b=): paylaşılabilir; sunucu ilk parametreyi buradan okur, istemci replaceState ile günceller. */
export default async function HallConfiguratorPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [sp, rulesResult, weightsResult, settings, t, user] = await Promise.all([searchParams, getCachedRules(), getCachedWeights(), getPublicSettings(), getTranslations('Configurator'), getCurrentUser()]);
  const weights = weightsResult.ok ? weightsResult.data : { profiles: {}, panels: {} };
  const rules = rulesResult.ok ? rulesResult.data : DEFAULT_RULES;
  const initial = parseParams(sp, rules.limits);
  // K-29: fiyat yalnız üyeye — birim fiyatlar oturumlu istemciyle okunur, ziyaretçiye hiç gönderilmez
  const priceTable = user ? await loadPriceTable(rules) : null;
  const disclaimer = pickLocale(settings.configuratorDisclaimer, locale, { fallback: 'tr' }) || t('disclaimerFallback');
  return (
    <ModuleBoundary module="configurator">
      <h1 className="sr-only">{t('types.hall.title')}</h1>
      <Configurator initial={initial} limits={rules.limits} trussThresholdM={rules.trussThresholdM} purlinSpacingM={rules.purlinSpacingM} profileMap={rules.profileMap} disclaimer={disclaimer} weights={weights.profiles} panelWeights={weights.panels} priceTable={priceTable} member={Boolean(user)} nextPath={getPathname({ locale: locale as Locale, href: '/configurator/hall' })} />
    </ModuleBoundary>
  );
}
