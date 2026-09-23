'use client';

import { useEffect, useRef, useState } from 'react';
import { useBasket } from '@/modules/quote-basket';
import { saveBasketToAccount } from '../../actions';
import { ME_EVENT, type MeSummary } from '../../domain/types';

/**
 * Giriş yapmış üyenin sepeti her değişimde (2 sn gecikme) hesabına da yazılır → cihazlar arası "yarım kalan sepet".
 * Oturum bilgisi header hesap menüsünün yayınladığı olaydan gelir; ikinci bir /api/me isteği atılmaz. Görünmez.
 */
export function BasketAutoSave() {
  const { items, ready } = useBasket();
  const [me, setMe] = useState<MeSummary | null>(() => (typeof window === 'undefined' ? null : ((window as Window & { __clkMe?: MeSummary | null }).__clkMe ?? null)));
  const last = useRef<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setMe((e as CustomEvent<MeSummary | null>).detail ?? null);
    window.addEventListener(ME_EVENT, on);
    return () => window.removeEventListener(ME_EVENT, on);
  }, []);
  useEffect(() => {
    if (!ready || !me) return;
    const json = JSON.stringify(items);
    if (last.current === null) { last.current = json; return; } // ilk okuma (hidrasyon) kaydedilmez
    if (last.current === json) return;
    const timer = window.setTimeout(() => { last.current = json; void saveBasketToAccount(items); }, 2000);
    return () => window.clearTimeout(timer);
  }, [items, ready, me]);
  return null;
}
