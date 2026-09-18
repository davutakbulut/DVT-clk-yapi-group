'use client';

import { useTranslations } from 'next-intl';

/** Tarayıcının "PDF olarak kaydet" akışı (K-67): ek kütüphane yok, yazdırma CSS'i sayfada. */
export function PrintButton() {
  const t = useTranslations('Configurator.print');
  return (
    <button type="button" className="btn btn-primary print:hidden" onClick={() => window.print()}>
      {t('button')}
    </button>
  );
}
