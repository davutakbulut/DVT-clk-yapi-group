export type GlyphKey = 'hall' | 'multiStorey' | 'cladding' | 'mezzanine' | 'fence' | 'drywall';

/** Konfigüratör tür simgesi: çizgisel kesit şeması (görsel dosyası yok, Three.js yok). Seçim sayfası, rehber sayfaları ve band ortak kullanır (K-107). */
export function ConfiguratorGlyph({ type, className = 'configurator-type-glyph' }: { readonly type: GlyphKey; readonly className?: string }) {
  return (
    <svg viewBox="0 0 120 72" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {type === 'hall' ? (
        <><path d="M10 66V34L60 12l50 22v32" /><path d="M10 34h100M35 66V23M60 66V12M85 66V23" opacity="0.55" /><path d="M4 66h112" /></>
      ) : type === 'multiStorey' ? (
        <><path d="M26 66V8h68v58" /><path d="M26 22h68M26 36h68M26 50h68M48 8v58M72 8v58" opacity="0.55" /><path d="M14 66h92v4H14z" /></>
      ) : type === 'cladding' ? (
        <><path d="M8 40L60 14l52 26" /><path d="M20 34v30M100 34v30M8 64h104" /><path d="M30 29l-6 12M44 22l-8 16M58 15l-9 20M72 16l6 14M86 23l6 12M100 30l6 10" opacity="0.55" /></>
      ) : type === 'mezzanine' ? (
        <><path d="M10 30h100" /><path d="M18 30v36M50 30v36M82 30v36M110 30v36" /><path d="M10 42h100M10 54h100" opacity="0.55" /><path d="M4 66h112" /></>
      ) : type === 'fence' ? (
        <><path d="M14 66V22M46 66V22M78 66V22M110 66V22" /><path d="M8 32h108M8 56h108" /><path d="M22 32v24M30 32v24M38 32v24M54 32v24M62 32v24M70 32v24M86 32v24M94 32v24M102 32v24" opacity="0.55" /><path d="M4 66h116" /></>
      ) : (
        <><path d="M14 10h92v56H14z" /><path d="M14 38h92M46 10v56M78 10v56" opacity="0.55" /><path d="M30 10v56M62 10v56M94 10v56" opacity="0.3" /></>
      )}
    </svg>
  );
}
