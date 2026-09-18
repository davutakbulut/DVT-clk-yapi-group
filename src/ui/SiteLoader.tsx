'use client';

import { useEffect, useRef, useState } from 'react';
import { HERO_PROGRESS_EVENT, LOADER_SESSION_KEY } from './siteLoaderShared';

interface Props {
  readonly label: string;
  readonly siteName: string;
}


const MIN_VISIBLE_MS = 1400; // kurulum animasyonu okunabilsin
const MAX_VISIBLE_MS = 7000; // ağ ne olursa olsun içerik en geç burada açılır

/**
 * İlk giriş yükleyicisi: çelik çerçeve GERÇEK yükleme ilerledikçe kurulur (kolonlar yükselir → makaslar mahyada buluşur →
 * aşıklar → çaprazlar → bulonlar). İlerleme = hero videosunun indirilmesi (%70) + sayfanın `load` olayı ve fontlar (%30).
 *
 * Güvenlik ağları (loader içeriği ASLA kalıcı örtmemeli):
 *  · Katman CSS'te varsayılan GİZLİ; yalnız gövde başındaki satır içi betik `html.clk-loading` eklerse görünür → JS yoksa hiç çıkmaz.
 *  · Oturumda bir kez (sessionStorage). Otomasyon/botlarda (navigator.webdriver) çıkmaz → E2E, Lighthouse ve tarayıcılar etkilenmez.
 *  · 7 sn üst sınır burada; React hiç çalışmazsa CSS animasyonu 9. saniyede katmanı kendisi kaldırır.
 *  · Sayfa altta tam render edilir (SSR içeriği, başlık, bağlantılar DOM'da) — katman yalnız üstünü örter.
 */
export function SiteLoader({ label, siteName }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const root = rootRef.current;
    if (!root || !html.classList.contains('clk-loading')) {
      setGone(true);
      return;
    }
    const started = performance.now();
    let hero = 0;
    let page = document.readyState === 'complete' ? 1 : 0;
    let fonts = 0;
    let shown = 0;
    let frame = 0;
    let finished = false;

    const onHero = (e: Event) => {
      hero = Math.max(hero, Math.min(1, Number((e as CustomEvent<number>).detail) || 0));
    };
    const onLoad = () => {
      page = 1;
    };
    window.addEventListener(HERO_PROGRESS_EVENT, onHero);
    window.addEventListener('load', onLoad);
    void document.fonts.ready.then(() => {
      fonts = 1;
    });
    // Hero'su olmayan sayfa: video beklenmez
    const noHeroTimer = window.setTimeout(() => {
      if (!document.querySelector('.hero')) hero = 1;
    }, 300);

    const finish = () => {
      if (finished) return;
      finished = true;
      try {
        sessionStorage.setItem(LOADER_SESSION_KEY, '1');
      } catch {
        // özel mod
      }
      root.style.setProperty('--p', '1');
      html.classList.add('clk-loaded');
      window.setTimeout(() => {
        html.classList.remove('clk-loading', 'clk-loaded');
        setGone(true);
      }, 700);
    };

    const tick = () => {
      const elapsed = performance.now() - started;
      const target = hero * 0.7 + page * 0.2 + fonts * 0.1;
      // Gerçek ilerleme hızlı bitse de kurulum en az MIN sürede oynar; yavaşsa zamanla %90'a kadar sızar (donmuş görünmez)
      const floor = Math.min(0.9, elapsed / MAX_VISIBLE_MS);
      const cap = Math.min(1, elapsed / MIN_VISIBLE_MS);
      const goal = Math.min(cap, Math.max(target, floor));
      shown += (goal - shown) * 0.12;
      if (goal - shown < 0.002) shown = goal;
      root.style.setProperty('--p', shown.toFixed(4));
      const pct = root.querySelector('[data-loader-pct]');
      if (pct) pct.textContent = String(Math.round(shown * 100)).padStart(3, '0');
      if ((target >= 0.999 && shown >= 0.995) || elapsed > MAX_VISIBLE_MS) {
        finish();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(noHeroTimer);
      window.removeEventListener(HERO_PROGRESS_EVENT, onHero);
      window.removeEventListener('load', onLoad);
    };
  }, []);

  if (gone) return null;

  // Her eleman pathLength=1; --s (başlangıç) ve --d (süre) ile toplam ilerlemenin bir diliminde çizilir (CSS'te clamp).
  const piece = (s: number, d: number) => ({ '--s': s, '--d': d }) as React.CSSProperties;
  return (
    <div ref={rootRef} className="site-loader" role="status" aria-live="polite" aria-label={label} data-on-dark="">
      <div className="site-loader-inner">
        <svg className="site-loader-frame" viewBox="0 0 320 200" fill="none" aria-hidden="true" focusable="false">
          {/* zemin + temel pabuçları */}
          <path className="ld ld-ground" pathLength={1} style={piece(0, 0.1)} d="M10 176 H310" />
          {[60, 160, 260].map((x, i) => (
            <path key={`f${x}`} className="ld ld-thin" pathLength={1} style={piece(0.04 + i * 0.02, 0.06)} d={`M${x - 12} 176 h24 v-6 h-24 z`} />
          ))}
          {/* kolonlar (çift çizgi = H profil) */}
          {[60, 160, 260].map((x, i) => (
            <g key={`c${x}`}>
              <path className="ld ld-main" pathLength={1} style={piece(0.1 + i * 0.05, 0.22)} d={`M${x - 4} 170 V${x === 160 ? 62 : 96}`} />
              <path className="ld ld-main" pathLength={1} style={piece(0.12 + i * 0.05, 0.22)} d={`M${x + 4} 170 V${x === 160 ? 62 : 96}`} />
            </g>
          ))}
          {/* makaslar: saçaklardan mahyaya */}
          <path className="ld ld-main" pathLength={1} style={piece(0.4, 0.2)} d="M52 98 L160 56" />
          <path className="ld ld-main" pathLength={1} style={piece(0.4, 0.2)} d="M268 98 L160 56" />
          <path className="ld ld-thin" pathLength={1} style={piece(0.46, 0.18)} d="M56 106 L160 66" />
          <path className="ld ld-thin" pathLength={1} style={piece(0.46, 0.18)} d="M264 106 L160 66" />
          {/* aşıklar */}
          {[0.2, 0.4, 0.6, 0.8].map((t, i) => (
            <g key={`p${t}`}>
              <path className="ld ld-accent" pathLength={1} style={piece(0.6 + i * 0.03, 0.06)} d={`M${52 + 108 * t - 5} ${98 - 42 * t - 6} h10`} />
              <path className="ld ld-accent" pathLength={1} style={piece(0.6 + i * 0.03, 0.06)} d={`M${268 - 108 * t - 5} ${98 - 42 * t - 6} h10`} />
            </g>
          ))}
          {/* çaprazlar */}
          <path className="ld ld-brace" pathLength={1} style={piece(0.7, 0.14)} d="M64 170 L156 100" />
          <path className="ld ld-brace" pathLength={1} style={piece(0.74, 0.14)} d="M156 170 L64 100" />
          <path className="ld ld-brace" pathLength={1} style={piece(0.78, 0.14)} d="M164 170 L256 100" />
          <path className="ld ld-brace" pathLength={1} style={piece(0.82, 0.14)} d="M256 170 L164 100" />
          {/* bulonlar */}
          {[
            [60, 96],
            [160, 60],
            [260, 96],
            [60, 172],
            [160, 172],
            [260, 172],
          ].map(([x, y], i) => (
            <circle key={`b${i}`} className="ld-bolt" style={piece(0.9 + i * 0.012, 0.04)} cx={x} cy={y} r={3} />
          ))}
          {/* kaynak kıvılcımı: mahyada, kurulum sürerken atar */}
          <circle className="ld-spark" cx={160} cy={56} r={2.5} />
        </svg>
        <div className="site-loader-meta">
          <span className="site-loader-brand">{siteName}</span>
          <span className="site-loader-pct" aria-hidden="true">
            <span data-loader-pct>000</span>%
          </span>
        </div>
        <div className="site-loader-bar" aria-hidden="true" />
        <p className="sr-only">{label}</p>
      </div>
    </div>
  );
}
