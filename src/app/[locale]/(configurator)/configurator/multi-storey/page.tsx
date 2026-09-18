import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { DEFAULT_RULES, getCachedRules, getCachedWeights, MultiStoreyConfigurator, parseMultiStorey } from '@/modules/configurator';
import { getPublicSettings } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Configurator' });
  return { title: t('types.multiStorey.title'), description: t('types.multiStorey.body'), alternates: buildAlternates(locale as Locale, { tr: '/configurator/multi-storey', en: '/configurator/multi-storey' }) };
}

/** Çok katlı çelik yapı konfigüratörü. Durum sorgu dizesinde (?w=&l=&h=&n=): paylaşılabilir; kurallar panelden (configurator_rules.multi_storey). */
export default async function MultiStoreyConfiguratorPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [sp, rulesResult, weightsResult, settings, t] = await Promise.all([searchParams, getCachedRules(), getCachedWeights(), getPublicSettings(), getTranslations('Configurator')]);
  const rules = (rulesResult.ok ? rulesResult.data : DEFAULT_RULES).multiStorey;
  const disclaimer = pickLocale(settings.configuratorDisclaimer, locale, { fallback: 'tr' }) || t('disclaimerFallback');
  return (
    <ModuleBoundary module="configurator/multi-storey">
      <h1 className="sr-only">{t('types.multiStorey.title')}</h1>
      <MultiStoreyConfigurator initial={parseMultiStorey(sp, rules.limits)} rules={rules} disclaimer={disclaimer} weights={weightsResult.ok ? weightsResult.data.profiles : {}} />
    </ModuleBoundary>
  );
}
