'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

export interface ThumbSrc {
  /** Küçük varyant (w480) ya da tam boy — liste hücresi için. */
  readonly small: string;
  readonly full: string;
}

/**
 * Liste küçük resmi (K-87): 44px kare; tıklanınca yerleşik <dialog> ile büyük hâli açılır (Esc / dışarı tıklama / ✕ kapatır).
 * Görsel yoksa çağıran null verir → boş yer tutucu; satır hizası bozulmaz.
 */
export function Thumb({ src, alt }: { readonly src: ThumbSrc | null; readonly alt: string }) {
  const t = useTranslations('Admin.common');
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close();
    };
    d.addEventListener('click', onClick);
    return () => d.removeEventListener('click', onClick);
  }, []);
  if (!src) return <span className="admin-thumb admin-thumb-empty" aria-hidden="true" />;
  return (
    <>
      <button type="button" className="admin-thumb" onClick={() => ref.current?.showModal()} aria-label={`${t('preview')}: ${alt}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Storage adresi, panel */}
        <img src={src.small} alt="" loading="lazy" decoding="async" />
      </button>
      <dialog ref={ref} className="admin-lightbox" aria-label={alt}>
        <form method="dialog" className="admin-lightbox-bar">
          <span className="truncate text-sm">{alt}</span>
          <button type="submit" className="admin-icon-btn" aria-label={t('close')}>
            ✕
          </button>
        </form>
        {/* eslint-disable-next-line @next/next/no-img-element -- Storage adresi, panel */}
        <img src={src.full} alt={alt} />
      </dialog>
    </>
  );
}
