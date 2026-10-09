'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import type { PriceTable } from '../../domain/pricing';
import { computeEnginePrice } from '../../engine/pricing';
import type { RunOutput } from '../../engine/runtime';

interface Props {
  readonly out: RunOutput;
  /** null → ziyaretçi (üyelik kapısı, K-29): bulanık kutu + kayıt CTA'sı. */
  readonly priceTable: PriceTable | null;
  readonly nextPath: string;
}

/** Fiyat kutusu (K-110): üyeye canlı tahmin (çelik + işçilik + çatı/cephe); ziyaretçiye karartılmış önizleme. Rakam uydurulmaz (K-66). */
export function EnginePricePanel({ out, priceTable, nextPath }: Props) {
  const t = useTranslations('Configurator.price');
  const format = useFormatter();
  const estimate = useMemo(() => (priceTable ? computeEnginePrice(out, priceTable) : null), [out, priceTable]);
  const money = (n: number, currency: string) => format.number(n, { style: 'currency', currency, maximumFractionDigits: 0 });
  if (!priceTable) {
    return (
      <section className="configurator-gate" aria-labelledby="price-title" data-testid="price-gate">
        <h2 id="price-title" className="text-[length:var(--fs-h4)]">{t('title')}</h2>
        <p className="configurator-gate-blur" aria-hidden="true">{t('blurSample')}</p>
        <p className="text-[length:var(--fs-sm)]">{t('gated')}</p>
        <Link href={{ pathname: '/register', query: { next: nextPath } }} className="btn btn-primary">{t('register')}</Link>
      </section>
    );
  }
  return (
    <section className="grid gap-2" aria-labelledby="price-title" data-testid="price-panel">
      <h2 id="price-title" className="text-[length:var(--fs-h4)]">{t('title')}</h2>
      {estimate ? (
        <>
          <dl className="configurator-stats">
            {estimate.lines.map((l) => (
              <div key={l.key} className="flex justify-between gap-3"><dt className="text-[var(--color-text-muted)]">{t(`lines.${l.key}`)}</dt><dd className="tabular-nums">{money(l.amount, estimate.currency)}</dd></div>
            ))}
            <div className="flex justify-between gap-3 font-semibold"><dt>{t('total')}</dt><dd className="tabular-nums" data-testid="price-total">{money(estimate.total, estimate.currency)}</dd></div>
          </dl>
          {estimate.unpriced.length > 0 ? <p className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]" role="status">{t('partial', { items: estimate.unpriced.map((k) => t(`lines.${k}`)).join(', ') })}</p> : null}
        </>
      ) : (
        <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]" role="status">{t('unavailable', { reason: t('reasonPrices') })}</p>
      )}
    </section>
  );
}
