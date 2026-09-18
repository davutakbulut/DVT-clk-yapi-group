'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/ui/Button';
import { estimateRange, parseQuantity } from '../../domain/estimate';

interface Row {
  readonly id: string;
  readonly systemType: string;
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
  readonly currency: string | null;
}

interface Props {
  readonly rows: readonly Row[];
  readonly unit: string;
  readonly presets: readonly number[];
  readonly whatsappHref: string | null;
}

/** Hızlı hesaplayıcı — tamamen istemci tarafında: veri sayfada, sunucuya gitmez (01-PUBLIC-PAGES). Metraj analitiği Faz 23. */
export function PriceCalculator({ rows, unit, presets, whatsappHref }: Props) {
  const t = useTranslations('Pricing');
  const format = useFormatter();
  const id = useId();
  const [input, setInput] = useState(presets[0] ? String(presets[0]) : '');
  const quantity = parseQuantity(input);
  const priced = rows.filter((r) => r.minPrice !== null && r.maxPrice !== null);
  const money = (v: number, currency: string) => format.number(v, { style: 'currency', currency, maximumFractionDigits: 0 });

  return (
    <section aria-labelledby={`${id}-title`} className="grid gap-6 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:p-8">
      <div className="grid gap-2">
        <h2 id={`${id}-title`} className="text-[length:var(--fs-h3)]">
          {t('calcTitle')}
        </h2>
        <p className="text-[var(--color-text-muted)]">{t('calcLead')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_auto] sm:items-end">
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
          {t('calcQuantity', { unit })}
          <input type="text" inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} className="field" aria-describedby={`${id}-hint`} />
        </label>
        <div className="chips" role="group" aria-label={t('calcPresets')}>
          {presets.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={quantity === p} onClick={() => setInput(String(p))}>
              {format.number(p)} {unit}
            </button>
          ))}
        </div>
      </div>
      <p id={`${id}-hint`} className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]">
        {t('calcHint')}
      </p>
      {priced.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('calcNoPrices')}</p>
      ) : (
        <ul className="grid gap-px border border-[var(--color-border)] bg-[var(--color-border)]" aria-live="polite">
          {priced.map((r) => {
            const range = quantity === null ? null : estimateRange(r, quantity);
            return (
              <li key={r.id} className="grid gap-1 bg-[var(--color-bg)] p-4 sm:grid-cols-[1fr_auto] sm:items-baseline">
                <span className="font-medium">{r.systemType}</span>
                <span className="font-mono text-[length:var(--fs-body-lg)] tabular-nums">{range ? `${money(range.min, r.currency!)} – ${money(range.max, r.currency!)}` : '—'}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        <Button href="/get-quote">{t('ctaQuote')}</Button>
        {whatsappHref ? (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            {t('ctaWhatsApp')}
          </a>
        ) : null}
      </div>
    </section>
  );
}
