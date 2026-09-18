'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/ui/Button';
import { useBasket } from './BasketProvider';

interface VariantOption {
  readonly id: string;
  readonly label: string;
  readonly stockCode: string | null;
}

/** Ürün sayfası: varyant + adet → sepete ekle (K-27). JS gerekir; JS'siz kullanıcı için "Teklif iste" bağlantısı sayfada zaten var. */
export function AddToBasket({ productId, slug, name, variants, unit }: { readonly productId: string; readonly slug: string; readonly name: string; readonly variants: readonly VariantOption[]; readonly unit: string }) {
  const t = useTranslations('Basket');
  const basket = useBasket();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState('1');
  const [added, setAdded] = useState(false);
  const variant = variants.find((v) => v.id === variantId) ?? null;
  return (
    <form
      className="grid gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        basket.add({ productId, variantId: variant?.id ?? null, slug, name, variantLabel: variant?.label ?? null, stockCode: variant?.stockCode ?? null, quantity: Number(quantity.replace(',', '.')) || 1, unit, note: '' });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 2500);
      }}
    >
      <p className="font-[family-name:var(--font-heading)] font-bold">{t('addTitle')}</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
        {variants.length > 0 ? (
          <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
            {t('variant')}
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className="field">
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                  {v.stockCode ? ` · ${v.stockCode}` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span />
        )}
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
          {t('quantity')} ({unit})
          <input type="number" min={0.001} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="field" />
        </label>
        <Button type="submit">{t('add')}</Button>
      </div>
      <p role="status" aria-live="polite" className="text-[length:var(--fs-sm)] text-[var(--color-success)]">
        {added ? t('added') : ''}
      </p>
    </form>
  );
}

/** Header: sepet bağlantısı + adet rozeti; boşken de görünür (keşfedilebilirlik), 0 rozeti yok. */
export function BasketLink() {
  const t = useTranslations('Basket');
  const { items, ready } = useBasket();
  const count = items.length;
  return (
    <Link href="/quote-basket" className="site-nav-link relative" aria-label={count > 0 ? t('linkWithCount', { count }) : t('link')}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 5h2l2.2 10.5a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L20 8H7" />
        <circle cx="10" cy="20" r="1.2" />
        <circle cx="17" cy="20" r="1.2" />
      </svg>
      {ready && count > 0 ? <span className="basket-badge">{count}</span> : null}
    </Link>
  );
}
