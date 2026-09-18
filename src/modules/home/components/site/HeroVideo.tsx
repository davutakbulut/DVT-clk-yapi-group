'use client';

import { useEffect, useRef, useState } from 'react';

interface Source {
  readonly src: string;
  readonly poster: string | null;
  readonly posterWidth: number | null;
  readonly posterHeight: number | null;
}

interface Props {
  readonly desktop: Source | null;
  readonly mobile: Source | null;
  readonly posterAlt: string;
}

/**
 * Scroll video hero (03-RESPONSIVE-ANIMATION): masaüstünde scroll ile scrub, mobil/`saveData`/`reduced-motion`'da
 * poster + otomatik döngü. Poster her zaman ilk boyanır (LCP), video hazır olunca üstüne oturur. GSAP/ScrollTrigger yok:
 * tek rAF döngüsü + `currentTime`; mobilde pin kullanılmaz (K-20). Faz 26'daki Three.js buraya asla girmez (K-24).
 */
export function HeroVideo({ desktop, mobile, posterAlt }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'poster' | 'scrub' | 'loop'>('poster');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduced || saveData) return;
    const desktopLike = window.matchMedia('(hover: hover) and (min-width: 1024px)').matches;
    setMode(desktopLike ? 'scrub' : 'loop');
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (!video || !wrap || mode === 'poster') return;
    if (mode === 'loop') {
      video.loop = true;
      void video.play().catch(() => setMode('poster'));
      return;
    }
    // Scrub: kaydırma ilerlemesi (0..1) → currentTime. rAF ile yumuşatılır; her scroll olayında seek yapılmaz.
    let target = 0;
    let current = 0;
    let frame = 0;
    const onScroll = () => {
      const rect = wrap.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      target = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    };
    const tick = () => {
      current += (target - current) * 0.12;
      if (Number.isFinite(video.duration) && video.duration > 0 && Math.abs(video.currentTime - current * video.duration) > 0.02) video.currentTime = current * video.duration;
      frame = requestAnimationFrame(tick);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [mode]);

  const source = (mode !== 'scrub' && mobile) || desktop || mobile;
  const poster = source?.poster ?? desktop?.poster ?? mobile?.poster ?? null;

  return (
    <div ref={wrapRef} className={mode === 'scrub' ? 'hero-scrub' : 'hero-static'}>
      <div className="hero-stage">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- Storage WebP, LCP adayı; fetchPriority high
          <img src={poster} alt={posterAlt} width={source?.posterWidth ?? undefined} height={source?.posterHeight ?? undefined} fetchPriority="high" decoding="async" className={`hero-media ${ready ? 'hero-media-hidden' : ''}`} />
        ) : null}
        {mode !== 'poster' && source ? (
          <video
            ref={videoRef}
            src={source.src}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            onLoadedData={() => setReady(true)}
            onError={() => setMode('poster')}
            className={`hero-media ${ready ? '' : 'hero-media-hidden'}`}
          />
        ) : null}
      </div>
    </div>
  );
}
