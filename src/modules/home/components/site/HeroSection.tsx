import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { publicStorageUrl } from '@/core/storage';
import { routing } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { Button } from '@/ui/Button';
import { getCachedHero, type MediaRef } from '../../data/homeRepository';
import { HeroOverlay } from './HeroOverlay';
import { HeroVideo } from './HeroVideo';

interface Props {
  readonly locale: string;
  readonly siteName: string;
}

/**
 * Hero: video varsa scroll-scrub/loop (HeroVideo), yoksa koyu sahne + kademe motifi. Veri gelmezse bölüm sessizce
 * metin hero'ya düşer (Katman 2). CTA yalnız route'u olan yola bağlanır (K-50 mantığı).
 */
export async function HeroSection({ locale, siteName }: Props) {
  const [result, env, t] = await Promise.all([getCachedHero(), readSupabasePublicEnv(), getTranslations('Home')]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'home', code: result.error.code });
    return null;
  }
  const hero = result.data;
  const url = (m: MediaRef | null) => (m && env.ok ? publicStorageUrl(env.data.url, { bucket: m.bucket, path: m.path }) : null);
  const src = (video: MediaRef | null, poster: MediaRef | null) => {
    const v = url(video);
    return v ? { src: v, poster: url(poster), posterWidth: poster?.width ?? null, posterHeight: poster?.height ?? null } : null;
  };
  const headline = pickLocale(hero?.headline, locale) || siteName;
  const subheadline = pickLocale(hero?.subheadline, locale) || t('underConstruction');
  const ctaLabel = pickLocale(hero?.ctaLabel, locale);
  const ctaPath = hero?.ctaPath && hero.ctaPath in routing.pathnames ? hero.ctaPath : null;
  const hasVideo = Boolean(hero?.desktopVideo || hero?.mobileVideo);
  const posterAlt = pickLocale(hero?.desktopPoster?.alt ?? hero?.mobilePoster?.alt, locale);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <HeroOverlay />
      {hasVideo ? (
        <HeroVideo desktop={src(hero!.desktopVideo, hero!.desktopPoster)} mobile={src(hero!.mobileVideo, hero!.mobilePoster)} posterAlt={posterAlt} />
      ) : (
        <div className="hero-static" aria-hidden="true">
          <div className="hero-stage hero-stage-pattern">
            {/* Brand step motif, same geometry as BrandMark: the hero's single large element */}
            <svg className="hero-kademe" viewBox="0 0 40 30" preserveAspectRatio="xMaxYMax meet" focusable="false">
              <rect x="0" y="18" width="9" height="12" />
              <rect x="13" y="10" width="9" height="20" />
              <rect x="26" y="2" width="9" height="28" />
            </svg>
          </div>
        </div>
      )}
      <div className="hero-copy container-x hero-reveal" data-on-dark="">
        <p className="hero-kicker">{siteName}</p>
        <h1 id="hero-title" className="hero-title">
          {headline}
        </h1>
        <p className="hero-lead">{subheadline}</p>
        {ctaLabel && ctaPath ? (
          <div>
            <Button href={ctaPath as never}>{ctaLabel}</Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
