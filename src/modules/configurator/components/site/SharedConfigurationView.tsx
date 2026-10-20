import { getFormatter, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/core/auth';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { LeadFormSection } from '@/modules/leads/server';
import { getPublicSettings } from '@/modules/site-settings';
import { setSharing } from '../../actions';
import type { SharedConfiguration } from '../../data/configurationsRepository';
import { EMPTY_ENGINE_RULE, getCachedCatalogRows, getCachedEngineRules, toOverrides } from '../../data/engineRepository';
import { loadPriceTable } from '../../data/pricesRepository';
import { DEFAULT_RULES, getCachedRules } from '../../data/rulesRepository';
import { ENGINE_HREF } from '../../engine/registry';
import { parseSavedParams } from '../../engine/server';
import { EngineConfigurator } from './EngineConfigurator';

/** Paylaşım sayfası gövdesi (K-30: token = yetki belgesi): üst bilgi + fiyat paylaşımı + model (yeni sürüm kaydı) + teklif formu. */
export async function SharedConfigurationView({ config, token, locale }: { readonly config: SharedConfiguration; readonly token: string; readonly locale: string }) {
  const { kind, raw } = parseSavedParams(config.params);
  const [t, format, rows, engineRules, rules, settings, user] = await Promise.all([getTranslations('Configurator'), getFormatter(), getCachedCatalogRows(), getCachedEngineRules(), getCachedRules(), getPublicSettings(), getCurrentUser()]);
  const rule = engineRules.ok ? engineRules.data[kind] : EMPTY_ENGINE_RULE;
  const priceTable = user ? await loadPriceTable(rules.ok ? rules.data : DEFAULT_RULES) : null;
  const disclaimer = pickLocale(settings.configuratorDisclaimer, locale, { fallback: 'tr' }) || t('disclaimerFallback');
  const notes = (locale === 'en' && rule.notes.en.length ? rule.notes.en : rule.notes.tr).filter(Boolean);
  return (
    <>
      <div className="grid gap-4 p-5 lg:p-6">
        <header className="grid gap-1">
          <h1 className="text-[length:var(--fs-h3)]">{config.name || t('shared.title')}</h1>
          <p className="label-mono text-[var(--color-text-inverse-subtle)]">
            {t(`types.${kind}.title`)} · {t('shared.ref')} {config.ref_code} · {t('shared.version')} {config.version} · {t('shared.updated')} {format.dateTime(new Date(config.updated_at), { dateStyle: 'medium' })}
            {config.tonnage_kg !== null ? ` · ${t('shared.tonnage')} ${format.number(config.tonnage_kg / 1000, { maximumFractionDigits: 2 })} t` : ''}
          </p>
          {config.estimated_price !== null && config.currency ? (
            <p className="text-[length:var(--fs-sm)]" data-testid="shared-price">{t('shared.price')}: <strong>{format.number(config.estimated_price, { style: 'currency', currency: config.currency, maximumFractionDigits: 0 })}</strong></p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-[length:var(--fs-xs)]">
            <form action={setSharing} className="flex items-center gap-2">
              <input type="hidden" name="token" value={token} />
              <label className="flex items-center gap-2"><input type="checkbox" name="sharePrice" defaultChecked={config.share_price} /> {t('shared.sharePrice')}</label>
              <button type="submit" className="btn btn-ghost">{t('shared.sharePriceSave')}</button>
            </form>
            <Link href={{ pathname: '/configurator/k/[token]/print', params: { token } }} className="btn btn-ghost">{t('shared.print')}</Link>
          </div>
        </header>
      </div>
      <EngineConfigurator kind={kind} initial={raw} overrides={toOverrides(rule)} catalogRows={rows.ok ? rows.data : []} notes={notes} disclaimer={disclaimer} priceTable={priceTable} member={Boolean(user)} nextPath={ENGINE_HREF[kind]} existing={{ id: config.id, token, refCode: config.ref_code, name: config.name, version: config.version }} />
      <section id="quote" className="grid max-w-[70ch] gap-3 p-5 lg:p-6" aria-labelledby="quote-title">
        <h2 id="quote-title" className="text-[length:var(--fs-h4)]">{t('shared.quoteTitle')}</h2>
        <p className="text-[length:var(--fs-sm)] text-[var(--color-text-inverse-subtle)]">{t('shared.quoteLead')}</p>
        <div className="configurator-lead"><LeadFormSection locale={locale as Locale} variant="configurator" hiddenFields={{ configurationToken: token }} /></div>
      </section>
    </>
  );
}
