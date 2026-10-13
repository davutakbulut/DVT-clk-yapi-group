'use client';

import { useState } from 'react';
import { Button } from '@/ui/Button';

interface Props {
  /** Google Haritalar gömme adresi (site-settings › mapEmbedSrc). */
  readonly src: string;
  readonly address: string;
  readonly directionsHref: string | null;
  readonly labels: { readonly show: string; readonly directions: string; readonly note: string; readonly frameTitle: string };
}

/**
 * Konum haritası (K-112): üçüncü taraf çerçevesi YALNIZ tıklanınca yüklenir (K-76 ağır medya kuralı + gizlilik: tıklamadan
 * Google'a istek gitmez). Tıklamadan önce adres, "Haritayı göster" ve "Yol tarifi al" (yeni sekme) görünür.
 */
export function LocationMap({ src, address, directionsHref, labels }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="location-map">
      {open ? (
        <iframe src={src} title={labels.frameTitle} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <div className="location-map-cover tech-art">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          <p className="location-map-address">{address}</p>
          <div className="location-map-acts">
            <Button onClick={() => setOpen(true)}>{labels.show}</Button>
            {directionsHref ? (
              <a href={directionsHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline-light">
                {labels.directions}
              </a>
            ) : null}
          </div>
          <p className="location-map-note">{labels.note}</p>
        </div>
      )}
    </div>
  );
}
