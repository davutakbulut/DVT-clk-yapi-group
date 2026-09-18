import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/core/auth';
import { ModuleBoundary } from '@/core/errors';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { Configurator, DEFAULT_RULES, getCachedRules, getCachedWeights, parseParams } from '@/modules/configurator';
import { setSharing } from '@/modules/configurator/actions';
import { getConfigurationByToken, loadPriceTable } from '@/modules/configurator/server';
import { LeadFormSection } from '@/modules/leads';
import { getPublicSettings } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string; token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Configurator' });
  return { title: t('shared.title'), robots: { index: false } };
}

/** Paylaşım sayfası (K-30: token = yetki belgesi): model + metraj, paylaşılan fiyat, yeni sürüm, teklif formu (kaynak: configurator), yazdır. */
export default async function SharedConfigurationPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale as Locale);
  const config = await getConfigurationByToken(token);
  if (!config) notFound();
  const [t, format, rulesResult, weightsResult, settings, user] = await Promise.all([getTranslations('Configurator'), getFormatter(), getCachedRules(), getCachedWeights(), getPublicSettings(), getCurrentUser()]);
  const rules = rulesResult.ok ? rulesResult.data : DEFAULT_RULES;
  const weights = weightsResult.ok ? weightsResult.data : { profiles: {}, panels: {} };
  const initial = parseParams(Object.fromEntries(Object.entries(config.params).map(([k, v]) => [k, v === true ? '1' : v === false ? '0' : String(v)])), rules.limits);
  const priceTable = user ? await loadPriceTable(rules) : null;
  const disclaimer = pickLocale(settings.configuratorDisclaimer, locale, { fallback: 'tr' }) || t('disclaimerFallback');
  return (
    <ModuleBoundary module="configurator">
      <div className="grid gap-4 p-5 lg:p-6">
        <header className="grid gap-1">
          <h1 className="text-[length:var(--fs-h3)]">{config.name || t('shared.title')}</h1>
          <p className="label-mono text-[var(--color-text-inverse-subtle)]">
            {t('shared.ref')} {config.ref_code} · {t('shared.version')} {config.version} · {t('shared.updated')} {format.dateTime(new Date(config.updated_at), { dateStyle: 'medium' })}
            {config.tonnage_kg !== null ? ` · ${t('shared.tonnage')} ${format.number(config.tonnage_kg / 1000, { maximumFractionDigits: 2 })} t` : ''}
          </p>
          {config.estimated_price !== null && config.currency ? (
            <p className="text-[length:var(--fs-sm)]" data-testid="shared-price">
              {t('shared.price')}: <strong>{format.number(config.estimated_price, { style: 'currency', currency: config.currency, maximumFractionDigits: 0 })}</strong>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-[length:var(--fs-xs)]">
            <form action={setSharing} className="flex items-center gap-2">
              <input type="hidden" name="token" value={token} />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="sharePrice" defaultChecked={config.share_price} /> {t('shared.sharePrice')}
              </label>
              <button type="submit" className="btn btn-ghost">
                {t('shared.sharePriceSave')}
              </button>
            </form>
            <Link href={{ pathname: '/configurator/k/[token]/print', params: { token } }} className="btn btn-ghost">
              {t('shared.print')}
            </Link>
          </div>
        </header>
      </div>
      <Configurator
        initial={initial}
        limits={rules.limits}
        trussThresholdM={rules.trussThresholdM}
        purlinSpacingM={rules.purlinSpacingM}
        profileMap={rules.profileMap}
        disclaimer={disclaimer}
        weights={weights.profiles}
        panelWeights={weights.panels}
        priceTable={priceTable}
        member={Boolean(user)}
        existing={{ id: config.id, token, refCode: config.ref_code, name: config.name, version: config.version }}
      />
      <section id="quote" className="grid max-w-[70ch] gap-3 p-5 lg:p-6" aria-labelledby="quote-title">
        <h2 id="quote-title" className="text-[length:var(--fs-h4)]">
          {t('shared.quoteTitle')}
        </h2>
        <p className="text-[length:var(--fs-sm)] text-[var(--color-text-inverse-subtle)]">{t('shared.quoteLead')}</p>
        <div className="configurator-lead">
          <LeadFormSection locale={locale} variant="configurator" hiddenFields={{ configurationToken: token }} />
        </div>
      </section>
    </ModuleBoundary>
  );
}
