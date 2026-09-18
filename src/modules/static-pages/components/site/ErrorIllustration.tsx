export type ErrorVariant = 'not-found' | 'server-error';

/**
 * SVG çizgi animasyonu (01-PUBLIC-PAGES › Hata Sayfaları). pathLength=1 → dasharray/dashoffset 1 ile "kendini çizer".
 * 404: çelik iskelet, bir kolon eksik (kesikli). 500: kiriş ikiye ayrılıp birleşir. Dekoratif: aria-hidden.
 */
export function ErrorIllustration({ variant }: { readonly variant: ErrorVariant }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'square' as const, pathLength: 1 };

  if (variant === 'server-error') {
    return (
      <svg viewBox="0 0 320 160" width="320" height="160" aria-hidden="true" focusable="false" className="mx-auto max-w-full text-[var(--color-accent-text)]">
        <path {...stroke} d="M30 130 V50 M290 130 V50" className="draw-line" />
        <g className="beam-split" data-dir="left">
          <path {...stroke} d="M30 60 H160" className="draw-line" data-delay="1" />
          <path {...stroke} d="M30 74 H160" className="draw-line" data-delay="1" />
          <path {...stroke} d="M60 60 L90 74 M120 60 L150 74" className="draw-line" data-delay="2" />
        </g>
        <g className="beam-split" data-dir="right">
          <path {...stroke} d="M160 60 H290" className="draw-line" data-delay="1" />
          <path {...stroke} d="M160 74 H290" className="draw-line" data-delay="1" />
          <path {...stroke} d="M170 74 L200 60 M230 74 L260 60" className="draw-line" data-delay="2" />
        </g>
        <path {...stroke} strokeDasharray="4 6" d="M160 52 V82" className="text-[var(--color-danger)]" />
        <path {...stroke} d="M10 130 H310" className="draw-line" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 200" width="320" height="200" aria-hidden="true" focusable="false" className="mx-auto max-w-full text-[var(--color-accent-text)]">
      {/* zemin ve kolonlar */}
      <path {...stroke} d="M10 180 H310" className="draw-line" />
      <path {...stroke} d="M50 180 V40 M160 180 V40" className="draw-line" data-delay="1" />
      {/* eksik kolon: yalnız kesikli iz */}
      <path {...stroke} strokeDasharray="6 8" d="M270 180 V40" className="draw-line text-[var(--color-text-subtle)]" data-delay="3" />
      {/* katlar */}
      <path {...stroke} d="M50 40 H160 M50 110 H160" className="draw-line" data-delay="2" />
      <path {...stroke} d="M160 40 H230 M160 110 H230" className="draw-line" data-delay="2" />
      <path {...stroke} strokeDasharray="6 8" d="M230 40 H270 M230 110 H270" className="draw-line text-[var(--color-text-subtle)]" data-delay="3" />
      {/* çaprazlar */}
      <path {...stroke} d="M50 110 L160 40 M50 180 L160 110" className="draw-line" data-delay="3" />
    </svg>
  );
}
