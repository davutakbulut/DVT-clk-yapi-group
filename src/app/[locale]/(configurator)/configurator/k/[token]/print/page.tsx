import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { PrintButton } from '@/modules/configurator';
import { getConfigurationByToken } from '@/modules/configurator/server';
import { getPublicSettings } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string; token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Configurator' });
  return { title: t('print.title'), robots: { index: false } };
}

/** Yazdırma / PDF görünümü (K-67): metraj tablosu, tonaj, paylaşılmışsa fiyat, yasal uyarı. Kütüphanesiz — tarayıcının PDF'i. */
export default async function PrintConfigurationPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale as Locale);
  const config = await getConfigurationByToken(token);
  if (!config) notFound();
  const [t, tk, format, settings] = await Promise.all([getTranslations('Configurator.print'), getTranslations('Configurator.takeoff'), getFormatter(), getPublicSettings()]);
  const disclaimer = pickLocale(settings.configuratorDisclaimer, locale, { fallback: 'tr' });
  const p = config.params as Record<string, unknown>;
  const num = (k: string) => format.number(Number(p[k] ?? 0), { maximumFractionDigits: 2 });
  const groupLabel = (g: string) => (g.startsWith('panel_') || g === 'plates' || g === 'bolts' ? t(`groups.${g as 'plates'}`) : tk(`groups.${g as 'column'}`));
  return (
    <article className="configurator-print">
      <header className="grid gap-1">
        <h1 className="text-[length:var(--fs-h3)]">{config.name || t('title')}</h1>
        <p className="text-sm">
          {pickLocale(settings.siteName, locale, { fallback: 'tr' })} · {config.ref_code} · v{config.version} · {t('generated')} {format.dateTime(new Date(), { dateStyle: 'medium' })}
        </p>
        <p className="text-sm">
          {t('params')}: {t('dims', { width: num('w'), length: num('l'), eave: num('e'), ridge: num('r'), bay: num('b') })}
        </p>
      </header>
      <table>
        <thead>
          <tr>
            <th scope="col">{t('element')}</th>
            <th scope="col">{t('profile')}</th>
            <th scope="col">{t('pieces')}</th>
            <th scope="col">{t('length')}</th>
            <th scope="col">{t('area')}</th>
            <th scope="col">{t('weight')}</th>
          </tr>
        </thead>
        <tbody>
          {config.items.map((i, idx) => (
            <tr key={idx}>
              <th scope="row">{groupLabel(i.element_group)}</th>
              <td>{i.profile_code ?? '—'}</td>
              <td>{i.piece_count ?? '—'}</td>
              <td>{i.total_length_m === null ? '—' : format.number(i.total_length_m, { maximumFractionDigits: 1 })}</td>
              <td>{i.total_area_m2 === null ? '—' : format.number(i.total_area_m2, { maximumFractionDigits: 1 })}</td>
              <td>{i.total_weight_kg === null ? '—' : format.number(i.total_weight_kg, { maximumFractionDigits: 0 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <strong>{t('tonnage')}:</strong> {config.tonnage_kg === null ? '—' : `${format.number(config.tonnage_kg / 1000, { maximumFractionDigits: 2 })} t`}
        {config.estimated_price !== null && config.currency ? (
          <>
            {' · '}
            <strong>{t('price')}:</strong> {format.number(config.estimated_price, { style: 'currency', currency: config.currency, maximumFractionDigits: 0 })}
          </>
        ) : null}
      </p>
      {disclaimer ? <p className="text-xs">{disclaimer}</p> : null}
      <PrintButton />
    </article>
  );
}
