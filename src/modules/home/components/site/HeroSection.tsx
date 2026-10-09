import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { getPublicSettings } from '@/modules/site-settings';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { getCachedHero, type MediaRef } from '../../data/homeRepository';
import { HeroOverlay } from './HeroOverlay';

interface Props {
  readonly locale: string;
  readonly siteName: string;
}

const PATH_ANCHORS = ['#malzeme', '#uygulama'] as const;

/**
 * Hero (K-111): iki sütun — solda üst etiket, çok satırlı başlık, giriş, üç düğme ve konfigüratör notu; sağda iki "yol" kartı
 * (malzeme / uygulama; sayfa içi çapalar). Zemin ızgaralı koyu band; hero_media videosu varsa sessiz döngüde arka planda
 * (reduced-motion'da yalnız poster). Metinler: başlık/giriş/birincil CTA hero_media, kalanı site_settings home.page.
 * Veri gelmezse metin hero'ya düşer (Katman 2); CTA yalnız route'u olan yola bağlanır (K-50).
 */
export async function HeroSection({ locale, siteName }: Props) {
  const [result, env, t, settings] = await Promise.all([getCachedHero(), readSupabasePublicEnv(), getTranslations('Home'), getPublicSettings()]);
  if (!result.ok) logger.warn(result.error.message, { module: 'home', code: result.error.code });
  const hero = result.ok ? result.data : null;
  const copy = settings.homePage.hero;
  const L = (v: Readonly<Partial<Record<string, string>>> | null | undefined) => pickLocale(v, locale, { fallback: 'tr' });
  const url = (m: MediaRef | null | undefined) => (m && env.ok ? publicStorageUrl(env.data.url, { bucket: m.bucket, path: m.path }) : null);
  const headline = pickLocale(hero?.headline, locale) || siteName;
  const lede = pickLocale(hero?.subheadline, locale) || t('underConstruction');
  const ctaLabel = pickLocale(hero?.ctaLabel, locale);
  const ctaPath = hero?.ctaPath && hero.ctaPath in routing.pathnames ? hero.ctaPath : null;
  const video = url(hero?.desktopVideo) ?? url(hero?.mobileVideo);
  const poster = url(hero?.desktopPoster) ?? url(hero?.mobilePoster);
  const paths = copy.paths.map((p, i) => ({ href: PATH_ANCHORS[i] ?? PATH_ANCHORS[1], tag: L(p.tag), title: L(p.title), text: L(p.text) })).filter((p) => p.title).slice(0, 2);
  const eyebrow = L(copy.eyebrow);
  const note = L(copy.note);

  return (
    <section className="hero home-hero" aria-labelledby="hero-title" data-on-dark="">
      <HeroOverlay />
      {video ? (
        <div className="home-hero-media" aria-hidden="true">
          {/* Dekoratif arka plan: ses yok, metin yok; reduced-motion'da CSS gizler, poster kalır */}
          <video className="home-hero-video" src={video} poster={poster ?? undefined} autoPlay muted loop playsInline preload="metadata" tabIndex={-1} />
          {/* eslint-disable-next-line @next/next/no-img-element -- Storage poster, reduced-motion yedeği */}
          {poster ? <img className="home-hero-poster" src={poster} alt="" /> : null}
        </div>
      ) : null}
      <Container className="home-hero-grid">
        <div className="home-hero-copy hero-reveal">
          {eyebrow ? <p className="hero-kicker">{eyebrow}</p> : <p className="hero-kicker">{siteName}</p>}
          <h1 id="hero-title" className="home-hero-title">
            {headline.split('\n').map((line, i) => (i === 0 ? line : <span key={i}><br />{line}</span>))}
          </h1>
          <p className="hero-lead">{lede}</p>
          <div className="home-hero-ctas">
            {ctaLabel && ctaPath ? <Button href={ctaPath as never}>{ctaLabel}</Button> : null}
            {L(copy.materialsCta) ? <a href="#malzeme" className="btn btn-outline-light">{L(copy.materialsCta)}</a> : null}
            {L(copy.servicesCta) ? <a href="#uygulama" className="btn btn-outline-light">{L(copy.servicesCta)}</a> : null}
          </div>
          {note && L(copy.noteLink) ? (
            <p className="home-hero-note">
              {note} <Link href="/configurator">{L(copy.noteLink)} →</Link>
            </p>
          ) : null}
        </div>
        {paths.length > 0 ? (
          <div className="home-paths">
            {paths.map((p, i) => (
              <a key={p.href} href={p.href} className="home-path">
                <span className="home-path-ico" aria-hidden="true">
                  {i === 0 ? (
                    <svg width="32" height="32" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.8" focusable="false"><rect x="3" y="18" width="12" height="12" /><rect x="19" y="18" width="12" height="12" /><rect x="11" y="4" width="12" height="12" /></svg>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.8" focusable="false"><path d="M4 30V13L17 4l13 9v17" /><path d="M4 30h26M11 30V18h12v12M11 22h12M11 26h12" /></svg>
                  )}
                </span>
                <span className="home-path-body">
                  {p.tag ? <span className="label-mono text-[var(--color-accent-on-dark)]">{p.tag}</span> : null}
                  <strong>{p.title}</strong>
                  {p.text ? <span className="home-path-text">{p.text}</span> : null}
                </span>
                <span className="home-path-go" aria-hidden="true">→</span>
              </a>
            ))}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
