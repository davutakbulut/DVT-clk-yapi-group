import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { pickLocale } from '@/lib/localized';
import { ENGINE_HREF, ENGINE_KINDS } from '@/modules/configurator';
import { getPublicSettings } from '@/modules/site-settings';
import { Button } from '@/ui/Button';
import { ConfiguratorGlyph } from '@/ui/ConfiguratorGlyph';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

/** 04 · 3D konfigüratör (K-111): solda metin + düğme (home.page.configurator), sağda altı tür bağlantısı (Configurator.types). */
export async function ConfiguratorSection({ locale, index = '04' }: { readonly locale: string; readonly index?: string }) {
  const [settings, t, tc] = await Promise.all([getPublicSettings(), getTranslations('Home'), getTranslations('Configurator')]);
  const L = (v: Readonly<Partial<Record<string, string>>> | null | undefined) => pickLocale(v, locale, { fallback: 'tr' });
  const copy = settings.homePage.configurator;
  const title = L(copy.title) || t('configuratorTitle');

  return (
    <section className="border-t border-[var(--color-border)]" aria-labelledby="configurator-title">
      <Container className="home-cfg py-[var(--section-y)]">
        <div className="grid gap-8">
          <SectionHeading index={index} kicker={t('configuratorKicker')} title={<span id="configurator-title">{title.split('\n').map((l, i) => (i === 0 ? l : <span key={i}><br />{l}</span>))}</span>} lead={L(copy.lede) || undefined} />
          <div><Button href="/configurator">{L(copy.button) || t('openConfigurator')}</Button></div>
        </div>
        <ul className="home-cfg-list">
          {ENGINE_KINDS.map((kind) => (
            <li key={kind}>
              <Link href={ENGINE_HREF[kind]} className="home-cfg-item">
                <ConfiguratorGlyph type={kind} className="home-cfg-glyph" />
                <span className="home-cfg-text">
                  <strong>{tc(`types.${kind}.title`)}</strong>
                  <small>{tc(`types.${kind}.body`)}</small>
                </span>
                <span className="home-cfg-go" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
