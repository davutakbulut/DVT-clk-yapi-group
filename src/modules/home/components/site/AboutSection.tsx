import { isVisibleIn } from '@/core/content';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { pickLocale } from '@/lib/localized';
import { renderMarkdown } from '@/lib/markdown';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedAbout } from '../../data/homeRepository';

/** Hakkımızda: metin + görsel + istatistikler (01-PUBLIC-PAGES). O dilde yayında değilse (K-07/K-08) bölüm hiç render edilmez. */
export async function AboutSection({ locale, index = '01' }: { readonly locale: string; readonly index?: string }) {
  const [result, env] = await Promise.all([getCachedAbout(), readSupabasePublicEnv()]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'home', code: result.error.code });
    return null;
  }
  const about = result.data;
  const title = pickLocale(about?.title, locale);
  if (!about || !title || !isVisibleIn(about, locale)) return null;
  const body = pickLocale(about.body, locale);
  const image =
    about.image && env.ok
      ? {
          src: publicStorageUrl(env.data.url, { bucket: about.image.bucket, path: about.image.path }),
          srcSet: mediaSrcSet(env.data.url, { ...about.image, blurDataUrl: about.image.blur }),
          alt: pickLocale(about.image.alt, locale),
          w: about.image.width,
          h: about.image.height,
        }
      : null;
  const stats = about.stats.filter((s) => pickLocale(s.label, locale));

  return (
    <Container as="section" className="about grid gap-12 py-[var(--section-y)]" id="hakkimizda" aria-labelledby="about-title">
      <div className={`grid gap-10 ${image ? 'lg:grid-cols-[7fr_5fr] lg:items-start' : ''}`}>
        <div className="grid gap-8">
          <SectionHeading index={index} kicker={pickLocale(about.eyebrow, locale)} title={<span id="about-title">{title}</span>} />
          {body ? <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} /> : null}
        </div>
        {image ? (
          <figure className="about-figure lg:mt-16">
            {/* eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49) */}
            <img src={image.src} srcSet={image.srcSet} sizes="(min-width: 1024px) 40vw, 100vw" alt={image.alt} width={image.w ?? undefined} height={image.h ?? undefined} loading="lazy" decoding="async" />
          </figure>
        ) : null}
      </div>
      {stats.length > 0 ? (
        <dl className="stat-grid">
          {stats.map((stat) => (
            <div key={`${stat.value}-${pickLocale(stat.label, locale)}`} className="stat">
              <dd className="stat-num">{stat.value}</dd>
              <dt className="stat-label">{pickLocale(stat.label, locale)}</dt>
            </div>
          ))}
        </dl>
      ) : null}
    </Container>
  );
}
