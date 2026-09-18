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

type Mode = 'poster' | 'scrub' | 'loop';

/**
 * Scroll video hero (03-RESPONSIVE-ANIMATION): kaydırdıkça video KARE KARE ilerler (`currentTime` scrub; kaynak `-g 1`
 * ile kodlanır → her kare keyframe, seek takılmaz). Her kırılımda scrub: tablet ve masaüstü yatay kaynak, telefon dikey
 * kırpılmış yüksek çözünürlüklü kaynak; `reduced-motion`/`saveData`: yalnız poster (video hiç yüklenmez).
 * Poster her zaman ilk boyanır (LCP), video hazır olunca üstüne oturur. GSAP/ScrollTrigger pin YOK: CSS sticky + tek rAF.
 * iOS/zayıf cihaz: seek gecikmesi ölçülür, eşik aşılırsa otomatik döngüye düşülür. İlerleme `--hero-progress` olarak
 * bölüme yazılır (kopya solması + ilerleme çizgisi CSS'te).
 */
export function HeroVideo({ desktop, mobile, posterAlt }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('poster');
  const [wide, setWide] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tabletUp = window.matchMedia('(min-width: 768px)');
    const desktopUp = window.matchMedia('(min-width: 1024px)');
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const decide = () => {
      setWide(tabletUp.matches);
      if (reduced.matches || saveData) setMode('poster');
      else setMode('scrub'); // telefon dahil her kırılımda scrub; cihaz kaldırmazsa aşağıda döngüye düşülür
    };
    decide();
    // matchMedia dinleyicisi: kırılım/yön değişince mod yeniden seçilir (elle innerWidth kontrolü yok)
    for (const mq of [reduced, tabletUp, desktopUp]) mq.addEventListener('change', decide);
    return () => {
      for (const mq of [reduced, tabletUp, desktopUp]) mq.removeEventListener('change', decide);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (!video || !wrap || mode === 'poster') return;
    const section = wrap.closest<HTMLElement>('.hero');
    if (mode === 'loop') {
      section?.style.removeProperty('--hero-progress');
      video.loop = true;
      void video.play().catch(() => setMode('poster'));
      return;
    }
    // iOS Safari: duraklatılmış video kare çözmeye başlamaz → `currentTime` seek'i boş kalır. Sessiz + playsInline olduğu için
    // kısa bir oynat-duraklat çağrısı kod çözücüyü uyandırır; reddedilirse (düşük güç modu) poster kalır, scrub yine denenir.
    void video
      .play()
      .then(() => video.pause())
      .catch(() => undefined);
    // Scrub: kaydırma ilerlemesi (0..1) → currentTime. rAF'ta yumuşatılır; önceki seek bitmeden yenisi verilmez.
    let target = 0;
    let current = 0;
    let frame = 0;
    let seekStarted = 0;
    let slowSeeks = 0;
    let seeks = 0;
    const onScroll = () => {
      const rect = wrap.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      target = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    };
    const onSeeked = () => {
      if (!seekStarted) return;
      seeks += 1;
      if (performance.now() - seekStarted > 250) slowSeeks += 1;
      seekStarted = 0;
      // İlk 12 seek'in yarısından fazlası yavaşsa cihaz scrub'ı kaldırmıyor → döngüye düş
      if (seeks === 12 && slowSeeks > 6) setMode('loop');
    };
    const tick = () => {
      current += (target - current) * 0.14;
      if (Math.abs(target - current) < 0.0005) current = target;
      section?.style.setProperty('--hero-progress', current.toFixed(4));
      const d = video.duration;
      if (Number.isFinite(d) && d > 0 && !video.seeking) {
        // Son kareye tam oturmasın (bazı tarayıcılar `ended` durumunda siyah kare verir)
        const t = Math.min(d - 0.05, current * d);
        if (Math.abs(video.currentTime - t) > 1 / 50) {
          seekStarted = performance.now();
          video.currentTime = t;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    video.addEventListener('seeked', onSeeked);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      video.removeEventListener('seeked', onSeeked);
      cancelAnimationFrame(frame);
    };
  }, [mode, wide]);

  // Tablet ve üstü: -g 1 yatay kaynak; telefon: -g 1 dikey kırpılmış yüksek çözünürlüklü kaynak
  const source = (wide ? desktop : mobile) ?? desktop ?? mobile;
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
            key={source.src}
            ref={videoRef}
            src={source.src}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            onLoadedData={() => setReady(true)}
            onError={() => {
              // Dosya yüklenemedi (ör. önbellekteki eski adres): poster kalır, boş/siyah sahne gösterilmez
              setReady(false);
              setMode('poster');
            }}
            className={`hero-media ${ready ? '' : 'hero-media-hidden'}`}
          />
        ) : null}
      </div>
    </div>
  );
}
