import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { Configurator, DEFAULT_RULES, getCachedRules, getCachedWeights, parseParams } from '@/modules/configurator';
import { getPublicSettings } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Configurator' });
  return { title: t('title'), description: t('lead'), alternates: buildAlternates(locale as Locale, { tr: '/configurator', en: '/configurator' }) };
}

/** Durum sorgu dizesinde (?w=&l=&e=&r=&b=): paylaşılabilir; sunucu ilk parametreyi buradan okur, istemci replaceState ile günceller. */
export default async function ConfiguratorPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [sp, rulesResult, weightsResult, settings, t] = await Promise.all([searchParams, getCachedRules(), getCachedWeights(), getPublicSettings(), getTranslations('Configurator')]);
  const weights = weightsResult.ok ? weightsResult.data : { profiles: {}, panels: {} };
  const rules = rulesResult.ok ? rulesResult.data : DEFAULT_RULES;
  const initial = parseParams(sp, rules.limits);
  const disclaimer = pickLocale(settings.configuratorDisclaimer, locale, { fallback: 'tr' }) || t('disclaimerFallback');
  return (
    <ModuleBoundary module="configurator">
      <h1 className="sr-only">{t('title')}</h1>
      <Configurator initial={initial} limits={rules.limits} trussThresholdM={rules.trussThresholdM} purlinSpacingM={rules.purlinSpacingM} profileMap={rules.profileMap} disclaimer={disclaimer} weights={weights.profiles} panelWeights={weights.panels} />
    </ModuleBoundary>
  );
}
