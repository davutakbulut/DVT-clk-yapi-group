import { getFormatter, getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedTestimonials, type TestimonialData } from '../../data/testimonialsRepository';
import { summarize } from '../../domain/testimonials';
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

/** Ana sayfa (footer'dan önce): yayında yorum yoksa bölüm HİÇ render edilmez. */
export async function TestimonialsSection({ locale, index = '05' }: { readonly locale: string; readonly index?: string }) {
  const [result, env, t] = await Promise.all([getCachedTestimonials(locale), readSupabasePublicEnv(), getTranslations('Testimonials')]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'testimonials', code: result.error.code });
    return null;
  }
  if (result.data.length === 0) return null;
  const items = result.data.slice(0, 12);
  return (
    <section className="bg-[var(--color-surface)]" aria-labelledby="testimonials-title">
      <Container className="grid gap-10 py-[var(--section-y)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading index={index} kicker={t('kicker')} title={<span id="testimonials-title">{t('homeTitle')}</span>} />
          <div className="grid justify-items-end gap-2">
            <RatingBadge ratings={result.data.map((i) => i.rating)} />
            <Link href="/reviews" className="text-[length:var(--fs-sm)] underline-offset-4 hover:underline">
              {t('all')}
            </Link>
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
        <RatingBadge ratings={items.map((i) => i.rating)} />
      </div>
      <TestimonialsCarousel items={toCarousel(items, env.ok ? env.data.url : null)} autoplayMs={8000} />
    </Container>
  );
}
