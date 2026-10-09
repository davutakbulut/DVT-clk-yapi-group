import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { pickLocale } from '@/lib/localized';
import { getCachedServiceList } from '@/modules/services';
import { getPublicSettings, isModuleEnabled, SERVICE_GROUP_KEYS } from '@/modules/site-settings';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { TechDrawing } from '@/ui/TechDrawing';

/**
 * 02 · Uygulama (K-111): öne çıkan hizmet (geniş kart: etiket, başlık, özet, öne çıkanlar, teknik çizim/kapak) + üç grup kartı
 * (çelik / mühendislik / inşaat: grup metni services.page, bağlantılar veritabanındaki hizmetler; mühendislik grubuna
 * konfigüratör ve fiyat rehberi bağlantıları eklenir). Hizmet yoksa bölüm çizilmez.
 */
export async function ApplicationSection({ locale, index = '02' }: { readonly locale: string; readonly index?: string }) {
  const [result, env, settings, t] = await Promise.all([getCachedServiceList(locale), readSupabasePublicEnv(), getPublicSettings(), getTranslations('Home')]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'home', code: result.error.code });
    return null;
  }
  if (result.data.length === 0) return null;
  const L = (v: Readonly<Partial<Record<string, string>>> | null | undefined) => pickLocale(v, locale, { fallback: 'tr' });
  const copy = settings.homePage.services;
  const url = env.ok ? env.data.url : null;
  const items = result.data;
  const feature = items.find((s) => s.isFeatured) ?? items[0]!;
  const groups = SERVICE_GROUP_KEYS.map((key, i) => ({ key, n: String(i + 1).padStart(2, '0'), items: items.filter((s) => s.group === key), copy: settings.servicesPage.groups.find((g) => g.key === key) })).filter((g) => g.items.length > 0);
  const title = L(copy.title) || t('servicesTitle');
  const extraLinks = [
    ...(isModuleEnabled(settings.modules, 'configurator') ? [{ href: '/configurator' as const, label: t('configuratorLink') }] : []),
    ...(isModuleEnabled(settings.modules, 'pricing') ? [{ href: '/pricing' as const, label: t('pricingLink') }] : []),
  ];

  return (
    <section id="uygulama" className="border-t border-[var(--color-border)]" aria-labelledby="application-title">
      <Container className="grid gap-10 py-[var(--section-y)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading index={index} kicker={t('servicesKicker')} title={<span id="application-title">{title.split('\n').map((l, i) => (i === 0 ? l : <span key={i}><br />{l}</span>))}</span>} lead={L(copy.lede) || undefined} />
          <Button href="/services" variant="ghost">{t('allServices')}</Button>
        </div>
        <Link href={{ pathname: '/services/[slug]', params: { slug: feature.slug } }} className="home-feature" data-on-dark="">
          <div className="home-feature-txt">
            <span className="label-mono text-[var(--color-accent-on-dark)]">{t('featuredService')}</span>
            <h3>{feature.title}</h3>
            {feature.excerpt ? <p>{feature.excerpt}</p> : null}
            {feature.highlights.length > 0 ? (
              <ul className="home-feature-list">
                {feature.highlights.map((h) => <li key={h}>{h}</li>)}
              </ul>
            ) : null}
            <span className="btn btn-primary">{feature.title} →</span>
          </div>
          <div className="tech-art home-feature-art" aria-hidden="true">
            {feature.cover && url ? (
              // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
              <img src={publicStorageUrl(url, feature.cover)} srcSet={mediaSrcSet(url, feature.cover)} sizes="(min-width: 1024px) 45vw, 90vw" alt={mediaAlt(feature.cover, locale)} loading="lazy" decoding="async" />
            ) : (
              <TechDrawing name={feature.drawing ?? 'kentsel'} />
            )}
          </div>
        </Link>
        {groups.length > 0 ? (
          <ul className="home-svc-groups">
            {groups.map((g) => (
              <li key={g.key} className="home-svc">
                <span className="label-mono text-[var(--color-accent-text)]">{g.n}</span>
                <h3>{g.copy ? L(g.copy.title) : t(`groups.${g.key}`)}</h3>
                {g.copy && L(g.copy.lede) ? <p>{L(g.copy.lede)}</p> : null}
                <ul>
                  {g.items.map((s) => (
                    <li key={s.id}>
                      <Link href={{ pathname: '/services/[slug]', params: { slug: s.slug } }}>{s.title} <span aria-hidden="true">→</span></Link>
                    </li>
                  ))}
                  {g.key === 'engineering'
                    ? extraLinks.map((x) => (
                        <li key={x.href}>
                          <Link href={x.href}>{x.label} <span aria-hidden="true">→</span></Link>
                        </li>
                      ))
                    : null}
                </ul>
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </section>
  );
}
