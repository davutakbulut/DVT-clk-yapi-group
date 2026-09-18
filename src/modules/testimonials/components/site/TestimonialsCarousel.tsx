'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';

export interface CarouselItem {
  readonly id: string;
  readonly authorName: string;
  readonly authorTitle: string;
  readonly company: string | null;
  readonly rating: number;
  readonly body: string;
  readonly isVerified: boolean;
  readonly isSample?: boolean;
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
 * Orta kart vurgulu (çerçeve + gölge), yan kartlar soluk ve kenarlardan kırpık; yüzen yuvarlak oklar + hap biçimli aktif nokta; otomatik kayma fareyle/odakla durur, prefers-reduced-motion'da hiç başlamaz; mobilde tek kart.
 */
export function TestimonialsCarousel({ items, autoplayMs = 6000 }: { readonly items: readonly CarouselItem[]; readonly autoplayMs?: number }) {
  const t = useTranslations('Testimonials');
  const format = useFormatter();
  const id = useId();
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = (index: number) => {
    const el = track.current;
    if (!el) return;
    const target = ((index % items.length) + items.length) % items.length;
    const card = el.children[target] as HTMLElement | undefined;
    // Kartı görünür alanın ORTASINA getir (orta-kart düzeni)
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' });
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

  const sourceLabel = (source: CarouselItem['source']) => (source === 'google' ? t('sourceGoogle') : source === 'visitor' ? t('sourceVisitor') : t('sourceCustomer'));
  return (
    <div className="testimonials" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="testimonials-stage">
        {/* tabIndex: kaydırılan bölge klavyeyle de kaydırılabilsin (axe scrollable-region-focusable) */}
        <ul ref={track} className="testimonials-track" aria-roledescription="carousel" aria-label={t('carouselLabel')} id={`${id}-track`} tabIndex={0}>
          {items.map((item, i) => (
            <li
              key={item.id}
              className="testimonial"
              data-active={i === active ? '' : undefined}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${items.length}`}
              // Yan kartlar soluk birer önizlemedir: ortaya gelene dek etkisiz (inert) ve yardımcı teknolojiden gizli →
              // soluk metin okunmak zorunda kalmaz; kaydırınca/okla ortaya gelen kart etkinleşir.
              inert={i !== active}
              aria-hidden={i !== active}
            >
              <figure className="testimonial-card">
                <div className="testimonial-top">
                  {item.isSample ? (
                    <span className="t-badge t-badge-sample">{t('sample')}</span>
                  ) : (
                    <span className={`t-badge t-badge-${item.source}`}>
                      <i aria-hidden="true" />
                      {sourceLabel(item.source)}
                    </span>
                  )}
                  {item.isVerified ? (
                    <span className="t-badge t-badge-verified">
                      <Check />
                      {t('verified')}
                    </span>
                  ) : null}
                  <span className="ml-auto">
                    <Stars rating={item.rating} label={t('ratingLabel', { rating: item.rating })} />
                  </span>
                </div>
                <blockquote className="testimonial-body">
                  <p>{item.body}</p>
                </blockquote>
                <figcaption className="testimonial-author">
                  {item.avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Google profil görseli ya da Storage (K-49)
                    <img src={item.avatarSrc} alt="" width={44} height={44} loading="lazy" decoding="async" className="testimonial-avatar" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="testimonial-avatar testimonial-avatar-fallback" aria-hidden="true">
                      {item.authorName.slice(0, 1).toLocaleUpperCase('tr-TR')}
                    </span>
                  )}
                  <span className="grid min-w-0">
                    <span className="testimonial-name">
                      <span className="truncate">{item.authorName}</span>
                      {item.isVerified ? <Check /> : null}
                    </span>
                    {item.authorTitle || item.company ? <span className="testimonial-role">{[item.authorTitle, item.company].filter(Boolean).join(' · ')}</span> : null}
                  </span>
                  {item.reviewedOn ? (
                    <span className="testimonial-date">
                      <time dateTime={item.reviewedOn}>{format.dateTime(new Date(item.reviewedOn), { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                    </span>
                  ) : null}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
        {items.length > 1 ? (
          <>
            <button type="button" className="testimonials-arrow testimonials-arrow-prev" onClick={() => goTo(active - 1)} aria-label={t('prev')} aria-controls={`${id}-track`}>
              <Arrow dir="left" />
            </button>
            <button type="button" className="testimonials-arrow testimonials-arrow-next" onClick={() => goTo(active + 1)} aria-label={t('next')} aria-controls={`${id}-track`}>
              <Arrow dir="right" />
            </button>
          </>
        ) : null}
      </div>
      {items.length > 1 ? (
        <div className="testimonials-dots" role="tablist" aria-label={t('dotsLabel')}>
          {items.map((item, i) => (
            <button key={item.id} type="button" role="tab" aria-selected={i === active} aria-label={t('goTo', { index: i + 1 })} className="testimonials-dot" onClick={() => goTo(i)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Arrow({ dir }: { readonly dir: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={dir === 'left' ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'} />
    </svg>
  );
}
