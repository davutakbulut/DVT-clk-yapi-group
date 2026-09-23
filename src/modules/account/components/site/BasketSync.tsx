'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { BasketLink, parseBasket, useBasket, type BasketItem } from '@/modules/quote-basket';
import { saveBasketToAccount } from '../../actions';

/** /hesabim/sepet: bu cihazdaki sepet (localStorage) ↔ hesaba kaydedilen sepet (profiles.saved_basket). */
export function BasketSync({ saved }: { readonly saved: readonly BasketItem[] }) {
  const t = useTranslations('Account.basket');
  const { items, ready, replace } = useBasket();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saved' | 'restored' | 'error'>('idle');
  const save = () => start(async () => {
    const r = await saveBasketToAccount(items);
    setStatus(r.ok ? 'saved' : 'error');
    if (r.ok) router.refresh();
  });
  const restore = () => { replace(parseBasket(JSON.stringify(saved))); setStatus('restored'); };
  const List = ({ list }: { readonly list: readonly BasketItem[] }) => list.length === 0 ? <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t('empty')}</p> : (
    <ul className="account-list text-[length:var(--fs-sm)]">
      {list.map((i, k) => (
        <li key={`${i.productId}:${i.variantId ?? ''}:${k}`} className="account-row">
          <span className="account-row-main">{i.name}{i.variantLabel ? <span className="text-[var(--color-text-muted)]"> · {i.variantLabel}</span> : null}</span>
          <span className="tabular-nums">{i.quantity} {i.unit}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="grid gap-8">
      <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t('autoSave')}</p>
      <div className="grid gap-8 md:grid-cols-2">
        <section className="grid gap-3" aria-labelledby="b-device">
          <h2 id="b-device" className="text-[length:var(--fs-h4)]">{t('device')} <span className="text-[length:var(--fs-sm)] font-normal text-[var(--color-text-muted)]">{ready ? t('items', { count: items.length }) : ''}</span></h2>
          {ready ? <List list={items} /> : null}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={save} disabled={!ready || items.length === 0 || pending} aria-busy={pending}>{t('save')}</button>
            <BasketLink />
          </div>
        </section>
        <section className="grid gap-3" aria-labelledby="b-saved">
          <h2 id="b-saved" className="text-[length:var(--fs-h4)]">{t('saved')} <span className="text-[length:var(--fs-sm)] font-normal text-[var(--color-text-muted)]">{t('items', { count: saved.length })}</span></h2>
          <List list={saved} />
          <div><button type="button" className="btn btn-ghost" onClick={restore} disabled={saved.length === 0}>{t('restore')}</button></div>
        </section>
      </div>
      {status !== 'idle' ? <p role="status" className={`text-[length:var(--fs-sm)] ${status === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>{status === 'saved' ? t('savedOk') : status === 'restored' ? t('restoredOk') : t('error')}</p> : null}
    </div>
  );
}
