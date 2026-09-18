'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addItem, BASKET_EVENT, BASKET_KEY, itemKey, parseBasket, removeItem, updateItem, type BasketItem } from '../../domain/basket';

interface BasketStore {
  readonly items: readonly BasketItem[];
  readonly ready: boolean;
  readonly add: (item: BasketItem) => void;
  readonly update: (key: string, patch: Partial<Pick<BasketItem, 'quantity' | 'note' | 'unit'>>) => void;
  readonly remove: (key: string) => void;
  readonly clear: () => void;
}

const BasketContext = createContext<BasketStore | null>(null);

function read(): BasketItem[] {
  try {
    return parseBasket(localStorage.getItem(BASKET_KEY));
  } catch {
    return [];
  }
}

function write(items: readonly BasketItem[]) {
  try {
    localStorage.setItem(BASKET_KEY, JSON.stringify(items));
  } catch {
    // özel pencere / kota: sepet yalnız bellekte kalır
  }
  window.dispatchEvent(new CustomEvent(BASKET_EVENT));
}

/** Layout'ta bir kez: sekmeler arası senkron (storage olayı), hidrasyon sonrası okunur (SSR'da boş). */
export function BasketProvider({ children }: { readonly children: ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setItems(read());
    setReady(true);
    const sync = () => setItems(read());
    window.addEventListener('storage', sync);
    window.addEventListener(BASKET_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(BASKET_EVENT, sync);
    };
  }, []);
  const commit = useCallback((next: BasketItem[]) => {
    setItems(next);
    write(next);
  }, []);
  const store = useMemo<BasketStore>(
    () => ({
      items,
      ready,
      add: (item) => commit(addItem(read(), item)),
      update: (key, patch) => commit(updateItem(read(), key, patch)),
      remove: (key) => commit(removeItem(read(), key)),
      clear: () => commit([]),
    }),
    [items, ready, commit],
  );
  return <BasketContext.Provider value={store}>{children}</BasketContext.Provider>;
}

export function useBasket(): BasketStore {
  const store = useContext(BasketContext);
  if (!store) throw new Error('BasketProvider yok');
  return store;
}

export { itemKey };
