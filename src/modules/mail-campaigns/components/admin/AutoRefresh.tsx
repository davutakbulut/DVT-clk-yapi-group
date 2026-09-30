'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Gönderim sürerken sayaçları tazeler: sekme görünürken `seconds` saniyede bir sunucu bileşenini yeniden ister. */
export function AutoRefresh({ seconds = 20 }: { readonly seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, seconds * 1000);
    return () => window.clearInterval(timer);
  }, [router, seconds]);
  return null;
}
