import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { publicStorageUrl } from '@/core/storage';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedTestimonials } from '../../data/testimonialsRepository';
import { ReviewForm } from './ReviewForm';
import { Stars } from './TestimonialsCarousel';
import { realRatings } from '../../domain/testimonials';
import { RatingBadge } from './TestimonialsSections';

interface Choice {
  readonly id: string;
  readonly label: string;
}

/** /yorumlar: tüm yayındaki yorumlar (ızgara) + "deneyiminizi paylaşın" formu. Şema yok (02-SEO: yalnız varlık sayfasında). */
export async function ReviewsPage({ locale, services }: { readonly locale: string; readonly services: readonly Choice[] }) {
  const [result, env, t] = await Promise.all([getCachedTestimonials(locale), readSupabasePublicEnv(), getTranslations('Testimonials')]);
  if (!result.ok) logger.warn(result.error.message, { module: 'testimonials', code: result.error.code });
  const items = result.ok ? result.data : [];
  const url = env.ok ? env.data.url : null;
  return (
    <Container as="section" className="grid gap-12 py-[var(--section-y)]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading as="h1" kicker={t('kicker')} title={t('title')} lead={t('lead')} />
        <RatingBadge ratings={realRatings(items)} />
      </div>
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <ul className="card-grid">
          {items.map((i) => (
            <li key={i.id}>
              <figure className="card testimonial-card">
                <Stars rating={i.rating} label={t('ratingLabel', { rating: i.rating })} />
                <blockquote className="testimonial-body">
                  <p>{i.body}</p>
                </blockquote>
                <figcaption className="testimonial-author">
                  {i.avatar && url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Storage (K-49)
                    <img src={publicStorageUrl(url, i.avatar)} alt="" width={40} height={40} loading="lazy" decoding="async" className="testimonial-avatar" />
                  ) : i.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Google profil görseli
                    <img src={i.avatarUrl} alt="" width={40} height={40} loading="lazy" decoding="async" className="testimonial-avatar" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="testimonial-avatar testimonial-avatar-fallback" aria-hidden="true">
                      {i.authorName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="grid">
                    <span className="font-semibold">{i.authorName}</span>
                    <span className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]">
                      {[i.authorTitle, i.company].filter(Boolean).join(' · ')}
                      {i.isSample ? ` · ${t('sample')}` : i.source === 'google' ? ` · ${t('viaGoogle')}` : i.isVerified ? ` · ${t('verified')}` : ''}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
      <section aria-labelledby="review-form-title" className="grid gap-6 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:p-10">
        <div className="grid gap-2">
          <h2 id="review-form-title" className="text-[length:var(--fs-h3)]">
            {t('form.title')}
          </h2>
          <p className="text-[var(--color-text-muted)]">{t('form.lead')}</p>
        </div>
        <ReviewForm services={services} />
      </section>
    </Container>
  );
}
