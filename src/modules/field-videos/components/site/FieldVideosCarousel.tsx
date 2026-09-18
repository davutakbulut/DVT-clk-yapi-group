'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { youTubeEmbedUrl } from '../../domain/youtube';

export interface FieldVideoItem {
  readonly id: string;
  readonly title: string;
  readonly caption: string;
  readonly source: 'youtube' | 'upload';
  readonly youtubeId: string | null;
  readonly videoSrc: string | null;
  readonly posterSrc: string | null;
}

/**
 * Dikey video şeridi: masaüstünde yan yana kartlar (ok düğmeleri sağ altta), mobilde orta-kart (komşular eğik ve soluk,
 * oklar + hap nokta). Yerel scroll-snap (K-60). Video YALNIZ tıklanınca yüklenir: YouTube çerezsiz alan adından gömülür
 * (youtube-nocookie), yüklenmiş dosya <video> ile oynar → ilk yüklemede üçüncü taraf isteği ve ağır medya yok.
 * Aynı anda tek video oynar; başka karta geçince önceki durur.
 */
export function FieldVideosCarousel({ items }: { readonly items: readonly FieldVideoItem[] }) {
  const t = useTranslations('FieldVideos');
  const id = useId();
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);

  const goTo = (index: number) => {
    const el = track.current;
    if (!el) return;
    const target = Math.max(0, Math.min(items.length - 1, index));
    const card = el.children[target] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' });
  };

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

  return (
    <div className="fv">
      <ul ref={track} className="fv-track" aria-roledescription="carousel" aria-label={t('carouselLabel')} id={`${id}-track`} tabIndex={0}>
        {items.map((item, i) => (
          <li key={item.id} className="fv-item" data-active={i === active ? '' : undefined} data-side={i < active ? 'left' : i > active ? 'right' : undefined}>
            <div className="fv-card">
              {playing === item.id ? (
                item.source === 'youtube' && item.youtubeId ? (
                  <iframe className="fv-media" src={youTubeEmbedUrl(item.youtubeId)} title={t('frameTitle', { title: item.title })} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                ) : item.videoSrc ? (
                  // Saha görüntüsü: konuşma içermez; açıklama kartın altındaki başlıkta
                  <video className="fv-media" src={item.videoSrc} poster={item.posterSrc ?? undefined} controls autoPlay playsInline onEnded={() => setPlaying(null)} />
                ) : null
              ) : (
                <button type="button" className="fv-poster" onClick={() => setPlaying(item.id)} aria-label={t('play', { title: item.title })}>
                  {item.posterSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Storage WebP ya da YouTube küçük resmi (K-49)
                    <img src={item.posterSrc} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                  ) : item.videoSrc ? (
                    // Kapak yoksa videonun ilk karesi: yalnız üst veri indirilir
                    <video src={`${item.videoSrc}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true" />
                  ) : null}
                  <span className="fv-play" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  {item.caption ? <span className="fv-caption">{item.caption}</span> : null}
                </button>
              )}
            </div>
            <p className="fv-title">{item.title}</p>
          </li>
        ))}
      </ul>
      {items.length > 1 ? (
        <div className="fv-controls">
          <button type="button" className="fv-arrow" onClick={() => goTo(active - 1)} aria-label={t('prev')} aria-controls={`${id}-track`} disabled={active === 0}>
            <Chevron dir="left" />
          </button>
          <div className="fv-dots" role="tablist" aria-label={t('dotsLabel')}>
            {items.map((item, i) => (
              <button key={item.id} type="button" role="tab" aria-selected={i === active} aria-label={t('goTo', { index: i + 1 })} className="testimonials-dot" onClick={() => goTo(i)} />
            ))}
          </div>
          <button type="button" className="fv-arrow fv-arrow-next" onClick={() => goTo(active + 1)} aria-label={t('next')} aria-controls={`${id}-track`} disabled={active === items.length - 1}>
            <Chevron dir="right" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ dir }: { readonly dir: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}
