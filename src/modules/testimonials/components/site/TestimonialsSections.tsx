import { getFormatter, getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { publicStorageUrl } from '@/core/storage';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedTestimonials, type TestimonialData } from '../../data/testimonialsRepository';
import { realRatings, summarize } from '../../domain/testimonials';
import { Stars, TestimonialsCarousel, type CarouselItem } from './TestimonialsCarousel';

function toCarousel(items: readonly TestimonialData[], supabaseUrl: string | null): CarouselItem[] {
  return items.map((i) => ({
    id: i.id,
    authorName: i.authorName,
    authorTitle: i.authorTitle,
    company: i.company,
    rating: i.rating,
    body: i.body,
    isVerified: i.isVerified,
    isSample: i.isSample,
    source: i.source,
    avatarSrc: i.avatar && supabaseUrl ? publicStorageUrl(supabaseUrl, i.avatar) : i.avatarUrl,
    reviewedOn: i.reviewedOn,
  }));
}

/** Rozet: yayındaki yorumlardan otomatik ("4,9 / 5 · 27 değerlendirme"). Ana sayfa carousel'i JSON-LD yaymaz (02-SEO). */
export async function RatingBadge({ ratings }: { readonly ratings: readonly number[] }) {
  const [t, format] = await Promise.all([getTranslations('Testimonials'), getFormatter()]);
  const s = summarize(ratings);
  if (!s) return null;
  return (
    <p className="rating-badge">
      <Stars rating={Math.round(s.average)} label={t('ratingLabel', { rating: s.average })} />
      <span className="font-mono tabular-nums">{format.number(s.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5</span>
      <span className="text-[var(--color-text-subtle)]">· {t('reviewCount', { count: s.count })}</span>
    </p>
  );
}

/** Ana sayfa (footer'dan önce): yayında yorum varsa carousel, yoksa yorum yazmaya davet kartı (uydurma yorum yok). Veri hatasında hiç render edilmez. */
export async function TestimonialsSection({ locale, index }: { readonly locale: string; readonly index?: string }) {
  const [result, env, t] = await Promise.all([getCachedTestimonials(locale), readSupabasePublicEnv(), getTranslations('Testimonials')]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'testimonials', code: result.error.code });
    return null;
  }
  // Yayında yorum yok: sahte yorum YAZILMAZ (CLAUDE.md) → bölüm dürüst bir davet kartıyla görünür; ilk gerçek yorum onaylanınca carousel'e döner
  if (result.data.length === 0) {
    return (
      <section className="testimonials-section border-t border-[var(--color-border)]" aria-labelledby="testimonials-title">
        <Container className="grid gap-8 py-[var(--section-y)]">
          <SectionHeading index={index} kicker={t('kicker')} title={<span id="testimonials-title">{t('homeTitle')}</span>} lead={t('invite.lead')} />
          <div className="testimonials-invite">
            <span className="stars testimonials-invite-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="star star-on">
                  ★
                </span>
              ))}
            </span>
            <p className="testimonials-invite-title">{t('invite.title')}</p>
            <p className="text-[var(--color-text-muted)]">{t('invite.body')}</p>
            <Button href="/reviews">{t('invite.cta')}</Button>
          </div>
        </Container>
      </section>
    );
  }
  const items = result.data.slice(0, 12);
  return (
    <section className="testimonials-section border-t border-[var(--color-border)]" aria-labelledby="testimonials-title">
      <Container className="grid gap-10 py-[var(--section-y)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading index={index} kicker={t('kicker')} title={<span id="testimonials-title">{t('homeTitle')}</span>} lead={t('homeLead')} />
          <div className="grid justify-items-start gap-3 sm:justify-items-end">
            <RatingBadge ratings={realRatings(result.data)} />
            <Button href="/reviews" variant="ghost">
              {t('all')}
            </Button>
          </div>
        </div>
        <TestimonialsCarousel items={toCarousel(items, env.ok ? env.data.url : null)} />
      </Container>
    </section>
  );
}

/** Hizmet/proje/ürün detayı: yalnız o varlığa bağlı yorumlar; yoksa hiç render edilmez. JSON-LD'yi route katmanı ekler. */
export async function TestimonialsFor({ items, headingId = 'entity-reviews' }: { readonly items: readonly TestimonialData[]; readonly headingId?: string }) {
  if (items.length === 0) return null;
  const [env, t] = await Promise.all([readSupabasePublicEnv(), getTranslations('Testimonials')]);
  return (
    <Container as="section" aria-labelledby={headingId} className="grid gap-8 pb-[var(--section-y)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id={headingId} className="text-[length:var(--fs-h3)]">
          {t('forEntity')}
        </h2>
        <RatingBadge ratings={realRatings(items)} />
      </div>
      <TestimonialsCarousel items={toCarousel(items, env.ok ? env.data.url : null)} autoplayMs={8000} />
    </Container>
  );
}
