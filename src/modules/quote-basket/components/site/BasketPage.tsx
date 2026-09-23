'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { LeadForm, type QuoteFormOptions } from '@/modules/leads';
import { Button } from '@/ui/Button';
import { toSubmission, totalWeightKg } from '../../domain/basket';
import { itemKey, useBasket } from './BasketProvider';

/** /teklif-sepeti: kalemler (adet/birim/not düzenle, kaldır) + teklif formu; gönderimde kalemler `items` alanıyla gider, başarıda sepet boşalır. */
export function BasketPage({ options }: { readonly options: QuoteFormOptions }) {
  const t = useTranslations('Basket');
  const tf = useTranslations('LeadForm');
  const format = useFormatter();
  const basket = useBasket();
  // Gönderim başarılıysa sepet boşalır; başarı kutusu form yerine burada kalır (form, boş sepetle birlikte kaldırılır).
  const [doneRef, setDoneRef] = useState<string | null>(null);
  if (!basket.ready) return <p className="text-[var(--color-text-muted)]">…</p>;
  if (doneRef !== null) {
    return (
      <div role="status" className="grid gap-2 border-l-4 border-[var(--color-accent)] bg-[var(--color-surface)] p-6">
        <p className="font-[family-name:var(--font-heading)] text-xl font-bold">{tf('successTitle')}</p>
        <p className="text-[var(--color-text-muted)]">{tf('successBody', { ref: doneRef })}</p>
      </div>
    );
  }
  if (basket.items.length === 0) {
    return (
      <div className="grid justify-items-start gap-4">
        <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
        <Button href="/products" variant="ghost">
          {t('browse')}
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-10">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{t('product')}</th>
              <th scope="col">{t('variant')}</th>
              <th scope="col">{t('quantity')}</th>
              <th scope="col">{t('note')}</th>
              <th scope="col">
                <span className="sr-only">{t('remove')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {basket.items.map((item) => {
              const key = itemKey(item);
              return (
                <tr key={key}>
                  <th scope="row">
                    <Link href={{ pathname: '/products/[slug]', params: { slug: item.slug } }} className="underline-offset-4 hover:underline">
                      {item.name}
                    </Link>
                  </th>
                  <td>
                    {item.variantLabel ?? '—'}
                    {item.stockCode ? <span className="block font-mono text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]">{item.stockCode}</span> : null}
                    {item.attributes ? (
                      <span className="block text-[length:var(--fs-xs)] text-[var(--color-text-muted)]">
                        {[item.attributes['spec'], item.attributes['grade'], item.attributes['surface'], item.attributes['length_m'] !== undefined ? `${format.number(Number(item.attributes['length_m']))} m` : null, item.attributes['format']].filter(Boolean).join(' · ')}
                        {typeof item.weightKg === 'number' ? ` · ${format.number(item.weightKg, { maximumFractionDigits: 1 })} kg` : ''}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <label className="flex items-center gap-2">
                      <span className="sr-only">{t('quantity')}</span>
                      <input type="number" min={0.001} step="any" value={item.quantity} onChange={(e) => basket.update(key, { quantity: Number(e.target.value) })} className="field w-24" />
                      <span className="text-[length:var(--fs-sm)] text-[var(--color-text-subtle)]">{item.unit}</span>
                    </label>
                  </td>
                  <td>
                    <label>
                      <span className="sr-only">{t('note')}</span>
                      <input type="text" maxLength={500} value={item.note} onChange={(e) => basket.update(key, { note: e.target.value })} className="field w-full min-w-40" placeholder={t('notePlaceholder')} />
                    </label>
                  </td>
                  <td>
                    <button type="button" onClick={() => basket.remove(key)} className="text-[length:var(--fs-sm)] text-[var(--color-danger)] underline-offset-4 hover:underline">
                      {t('remove')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {totalWeightKg(basket.items) !== null ? (
            <tfoot>
              <tr>
                <th scope="row" colSpan={2}>{t('totalWeight')}</th>
                <td colSpan={3} className="font-mono">{format.number(totalWeightKg(basket.items)!, { maximumFractionDigits: 1 })} kg</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <section className="grid gap-6 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:p-10" aria-labelledby="basket-form-title">
        <h2 id="basket-form-title" className="text-[length:var(--fs-h3)]">
          {t('formTitle')}
        </h2>
        <LeadForm variant="quote_basket" services={[]} options={options} hiddenFields={{ items: JSON.stringify(toSubmission(basket.items)) }} onSuccess={(data) => {
            setDoneRef(data['ref'] ?? '');
            basket.clear();
          }} />
      </section>
    </div>
  );
}
