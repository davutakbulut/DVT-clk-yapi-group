'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';

export interface CarouselItem {
  readonly id: string;
  readonly authorName: string;
  readonly authorTitle: string;
  readonly company: string | null;
  readonly rating: number;
  readonly body: string;
  readonly isVerified: boolean;
  readonly source: 'manual' | 'google' | 'visitor';
  readonly avatarSrc: string | null;
  readonly reviewedOn: string | null;
}

/** Yıldızlar: metin eşdeğeri sr-only; görsel yıldızlar aria-hidden. */
export function Stars({ rating, label }: { readonly rating: number; readonly label: string }) {
  return (
    <span className="stars" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden="true" className={i <= rating ? 'star star-on' : 'star'}>
          ★
        </span>
      ))}
    </span>
  );
}

/**
 * Yorum carousel'i (01-PUBLIC-PAGES): yerel scroll-snap — sürükleme, klavye ve dokunma tarayıcıdan gelir (K-60, Embla yok).
 * Oklar + nokta göstergeleri; otomatik kayma fareyle/odakla durur, prefers-reduced-motion'da hiç başlamaz; mobilde tek kart.
 */
export function TestimonialsCarousel({ items, autoplayMs = 6000 }: { readonly items: readonly CarouselItem[]; readonly autoplayMs?: number }) {
  const t = useTranslations('Testimonials');
  const id = useId();
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = (index: number) => {
    const el = track.current;
    if (!el) return;
    const target = ((index % items.length) + items.length) % items.length;
    const card = el.children[target] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  };

  // Aktif kart: görünür alanın ortasına en yakın kart (nokta göstergesi ve vurgu)
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let dist = Number.POSITIVE_INFINITY;
      Array.from(el.children).forEach((c, i) => {
        const card = c as HTMLElement;
        const d = Math.abs(card.offsetLeft - el.offsetLeft + card.offsetWidth / 2 - center);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      setActive(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [items.length]);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => goTo(active + 1), autoplayMs);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goTo kararlı; active değişince zamanlayıcı yenilenir
  }, [active, paused, items.length, autoplayMs]);

  return (
    <div className="testimonials" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <ul ref={track} className="testimonials-track" aria-roledescription="carousel" aria-label={t('carouselLabel')} id={`${id}-track`}>
        {items.map((item, i) => (
          <li key={item.id} className="testimonial" data-active={i === active ? '' : undefined} aria-roledescription="slide" aria-label={`${i + 1} / ${items.length}`}>
            <figure className="testimonial-card">
              <Stars rating={item.rating} label={t('ratingLabel', { rating: item.rating })} />
              <blockquote className="testimonial-body">
                <p>{item.body}</p>
              </blockquote>
              <figcaption className="testimonial-author">
                {item.avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Google profil görseli ya da Storage (K-49)
                  <img src={item.avatarSrc} alt="" width={40} height={40} loading="lazy" decoding="async" className="testimonial-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <span className="testimonial-avatar testimonial-avatar-fallback" aria-hidden="true">
                    {item.authorName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="grid">
                  <span className="font-semibold">{item.authorName}</span>
                  <span className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]">
                    {[item.authorTitle, item.company].filter(Boolean).join(' · ')}
                    {item.source === 'google' ? ` · ${t('viaGoogle')}` : item.isVerified ? ` · ${t('verified')}` : ''}
                  </span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      {items.length > 1 ? (
        <div className="testimonials-controls">
          <button type="button" className="testimonials-arrow" onClick={() => goTo(active - 1)} aria-label={t('prev')} aria-controls={`${id}-track`}>
            ←
          </button>
          <div className="testimonials-dots" role="tablist" aria-label={t('dotsLabel')}>
            {items.map((item, i) => (
              <button key={item.id} type="button" role="tab" aria-selected={i === active} aria-label={t('goTo', { index: i + 1 })} className="testimonials-dot" onClick={() => goTo(i)} />
            ))}
          </div>
          <button type="button" className="testimonials-arrow" onClick={() => goTo(active + 1)} aria-label={t('next')} aria-controls={`${id}-track`}>
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
