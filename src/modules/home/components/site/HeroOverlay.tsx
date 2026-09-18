'use client';

import { useEffect } from 'react';

/**
 * Header'ın hero üstünde şeffaf başlayıp kaydırınca koyulaşması. Sabitleme CSS'te (`body:has(.hero)`), burada yalnız
 * kaydırma durumu yazılır → JS gelmeden de doğru yerleşim, JS'le renk geçişi.
 */
export function HeroOverlay() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      root.toggleAttribute('data-header-solid', window.scrollY > 32);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.removeAttribute('data-header-solid');
    };
  }, []);
  return null;
}
