'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface Props {
  /** Ölçüler · istatistik · metraj · kayıt — masaüstünde sol sütun, mobilde sağdan açılan panel. */
  readonly panel: ReactNode;
  readonly canvas: ReactNode;
  readonly canvasLabel: string;
  /** Mobilde tuvalin üstünde kısa özet ("18 × 53 m · 954 m²"): panel kapalıyken de ne çizildiği okunur. */
  readonly summary: string;
}

const MOBILE = '(max-width: 1023px)';

/**
 * Konfigüratör yerleşimi (iki konfigüratör de kullanır). ≥1024px: 360px panel + tuval yan yana.
 * <1024px: tuval tüm ekranı kaplar; ayrıntılar sağdan açılan panelde (arka plan karartması, Esc ve dışarı dokunma kapatır,
 * kapalıyken `inert` + görünmez → klavye ve ekran okuyucu içine düşmez).
 */
export function ConfiguratorFrame({ panel, canvas, canvasLabel, summary }: Props) {
  const t = useTranslations('Configurator');
  const id = useId();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!mobile || !open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobile, open]);

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };
  const hidden = mobile && !open;
  return (
    <div className="configurator" data-panel-open={open ? '' : undefined}>
      {mobile && open ? <button type="button" className="configurator-backdrop" aria-label={t('panel.close')} onClick={close} tabIndex={-1} /> : null}
      <aside id={`${id}-panel`} className="configurator-panel" aria-label={t('panelLabel')} inert={hidden} aria-hidden={hidden || undefined}>
        <button ref={closeRef} type="button" className="configurator-panel-close" onClick={close} aria-label={t('panel.close')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {panel}
      </aside>
      <div className="configurator-canvas" role="img" aria-label={canvasLabel}>
        {canvas}
      </div>
      <div className="configurator-overlay">
        <p className="configurator-summary" aria-hidden="true">
          {summary}
        </p>
        <button ref={toggleRef} type="button" className="configurator-panel-toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
          {t('panel.open')}
        </button>
      </div>
    </div>
  );
}
