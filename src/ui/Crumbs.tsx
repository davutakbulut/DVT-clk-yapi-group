'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Sayfa yolu (K-93): tek satır, yatay kaydırılır; ilk boyamada SONA (geçerli sayfaya) kaydırılmış gelir.
 * Küçük ekranda yazı biraz küçülür (globals: .crumbs). Sarmalayan sunucu bileşeni bağlantıları çocuk olarak verir.
 */
export function Crumbs({ label, className = '', children }: { readonly label: string; readonly className?: string; readonly children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
  return (
    <nav ref={ref} aria-label={label} className={`crumbs label-mono ${className}`.trim()}>
      {children}
    </nav>
  );
}
