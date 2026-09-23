'use client';

import dynamic from 'next/dynamic';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useBasket } from '@/modules/quote-basket';
import { ConfiguratorFrame } from './ConfiguratorFrame';
import { SimpleDrawing } from './SimpleDrawing';

const Scene = dynamic(() => import('./SimpleScene'), { ssr: false, loading: () => <div className="configurator-canvas-loading" aria-hidden="true" /> });
import { SIMPLE, type AnyParams, type AnyRules, type SimpleKind } from '../../domain/simple/registry';
import type { FieldSpec, ResultLine } from '../../domain/simple/shared';

/** Şema üst yazısı için değerler (mesaj: Configurator.simple.<kind>.caption) */
function captionValues(kind: SimpleKind, params: AnyParams, stats: readonly { key: string; value: number }[]): Record<string, string | number> {
  const p = params as unknown as Record<string, number | string | boolean>;
  const stat = (k: string) => stats.find((s) => s.key === k)?.value ?? 0;
  const f = (v: unknown) => String(Math.round(Number(v) * 10) / 10).replace('.', ',');
  switch (kind) {
    case 'cladding': return { length: f(p['length']), area: f(stat('roofArea')) };
    case 'mezzanine': return { columns: stat('columns'), height: f(p['height']) };
    case 'fence': return { length: f(p['length']), rails: Number(p['rails']) };
    default: return { length: f(p['length']), layers: Number(p['layers']), sides: p['doubleSided'] ? 2 : 1 };
  }
}

interface Props {
  readonly kind: SimpleKind;
  readonly initial: AnyParams;
  readonly rules: AnyRules;
  readonly disclaimer: string;
  /** Sonuç satırlarını sepete bağlamak için ürün kimlikleri (slug → id/ad); yoksa satır yalnız listelenir. */
  readonly products: Readonly<Record<string, { readonly id: string; readonly name: string }>>;
  readonly unitLabel: string;
}

/**
 * Basit konfigüratörler için ortak arayüz (K-100): alanlar (kaydırıcı/seçim/anahtar) → anlık hesap; 2B şema; istatistik; metraj tablosu;
 * satır satır ya da toplu "Teklif sepetine ekle"; URL paylaşımı; taslak localStorage. Tüm metin next-intl, kurallar DB.
 */
export function SimpleConfigurator({ kind, initial, rules, disclaimer, products, unitLabel }: Props) {
  const def = SIMPLE[kind];
  // Anahtarlar veriye göre üretildiğinden (params.<alan>, lines.<kalem>) çevirmen gevşek tipli kullanılır; anahtarlar mesaj dosyasında tam listedir
  const tKind = useTranslations(`Configurator.simple.${kind}`);
  const t = tKind as unknown as (key: string, values?: Record<string, string | number>) => string;
  const ts = useTranslations('Configurator.simple');
  const tc = useTranslations('Configurator');
  const format = useFormatter();
  const basket = useBasket();
  const [params, setParams] = useState<AnyParams>(initial);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [view3d, setView3d] = useState(true); // diğer konfigüratörler gibi 3B varsayılan; 2B şema geçişle
  const [sceneReady, setSceneReady] = useState(false);
  const DRAFT_KEY = `clk_configurator_${kind}_draft`;

  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setSceneReady(true), { timeout: 1500 });
    else window.setTimeout(() => setSceneReady(true), 300);
  }, []);
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if ([...search.keys()].some((k) => def.queryKeys.includes(k))) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setParams(def.clamp(JSON.parse(raw), rules));
    } catch {
      // taslak yok
    }
  }, [DRAFT_KEY, def, rules]);
  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}?${def.serialize(params)}`);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(params));
    } catch {
      // kota
    }
  }, [params, def, DRAFT_KEY]);

  const fields = useMemo(() => def.fields(rules), [def, rules]);
  const result = useMemo(() => def.compute(params, rules), [def, params, rules]);
  const update = (patch: Record<string, unknown>) => setParams((p) => def.clamp({ ...(p as unknown as Record<string, unknown>), ...patch }, rules));
  const n = (v: number, d = 0) => format.number(v, { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const unitText = (u: ResultLine['unit']) => (u === 'adet' ? unitLabel : u === 'm2' ? 'm²' : u === 'm3' ? 'm³' : u);
  const value = (key: string) => (params as unknown as Record<string, unknown>)[key];

  const field = (f: FieldSpec) => {
    const id = `sc-${kind}-${f.key}`;
    if (f.type === 'range') {
      const v = Number(value(f.key));
      return (
        <label key={f.key} className="configurator-field">
          <span className="flex items-baseline justify-between">
            <span>{t(`params.${f.key}`)}</span>
            <output className="font-mono tabular-nums" htmlFor={id}>
              {format.number(v, { maximumFractionDigits: f.decimals ?? 0 })} {f.unit}
            </output>
          </span>
          <input id={id} type="range" min={f.range.min} max={f.range.max} step={f.range.step} value={v} onChange={(e) => update({ [f.key]: Number(e.target.value) })} aria-label={t(`params.${f.key}`)} />
        </label>
      );
    }
    if (f.type === 'select') {
      return (
        <div key={f.key} className="configurator-field">
          <label htmlFor={id}>{t(`params.${f.key}`)}</label>
          <select id={id} className="field" value={String(value(f.key))} onChange={(e) => update({ [f.key]: e.target.value })}>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {t(`options.${f.key}.${o.replace(/[.]/g, '_')}`)}
              </option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <label key={f.key} className="flex items-center gap-2 text-[length:var(--fs-sm)]">
        <input id={id} type="checkbox" checked={Boolean(value(f.key))} onChange={(e) => update({ [f.key]: e.target.checked })} /> {t(`params.${f.key}`)}
      </label>
    );
  };

  const addLine = (l: ResultLine) => {
    if (!l.productSlug) return false;
    const p = products[l.productSlug];
    if (!p) return false;
    basket.add({ productId: p.id, variantId: null, slug: l.productSlug, name: p.name, variantLabel: `${t(`lines.${l.key}`)}${l.spec ? ` · ${l.spec}` : ''}`, stockCode: null, quantity: l.qty, unit: unitText(l.unit), note: '', attributes: { configurator: kind, ...(l.spec ? { spec: l.spec } : {}) }, weightKg: l.weightKg ?? null });
    return true;
  };
  const addAll = () => {
    const count = result.lines.filter(addLine).length;
    setToast(count > 0 ? ts('addedAll', { count }) : ts('noProducts'));
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // pano yok
    }
  };
  const summary = result.stats.slice(0, 2).map((s) => `${n(s.value, s.decimals ?? 0)} ${s.unit}`).join(' · ');

  return (
    <ConfiguratorFrame
      canvasLabel={t('canvasLabel')}
      summary={summary}
      canvas={
        <div className={view3d ? 'configurator-canvas simple-canvas-3d' : 'simple-canvas'}>
          {view3d ? (sceneReady ? <Scene kind={kind} params={params} /> : <div className="configurator-canvas-loading" aria-hidden="true" />) : <SimpleDrawing kind={kind} params={params} label={t('canvasLabel')} caption={t('caption', captionValues(kind, params, result.stats))} />}
          <div className="pcfg-vt simple-vt" role="group" aria-label={ts('viewLabel')}>
            <button type="button" aria-pressed={!view3d} onClick={() => setView3d(false)}>{ts('view2d')}</button>
            <button type="button" aria-pressed={view3d} onClick={() => setView3d(true)}>{ts('view3d')}</button>
          </div>
        </div>
      }
      panel={
        <>
          <h2 className="text-[length:var(--fs-h4)]">{tc('params.title')}</h2>
          {fields.map(field)}
          <dl className="configurator-stats" aria-live="polite">
            {result.stats.map((s) => (
              <div key={s.key} className="flex justify-between gap-3">
                <dt className="text-[var(--color-text-muted)]">{t(`stats.${s.key}`)}</dt>
                <dd className="font-mono tabular-nums" data-testid={`sc-${s.key}`}>
                  {n(s.value, s.decimals ?? 0)} {s.unit}
                </dd>
              </div>
            ))}
          </dl>
          <section className="grid gap-2" aria-labelledby={`sc-${kind}-takeoff`}>
            <h3 id={`sc-${kind}-takeoff`} className="text-[length:var(--fs-sm)] font-semibold">
              {ts('takeoff')}
            </h3>
            <div className="table-scroll overflow-x-auto">
              <table className="configurator-table">
                <thead>
                  <tr>
                    <th scope="col">{ts('item')}</th>
                    <th scope="col">{ts('spec')}</th>
                    <th scope="col">{ts('qty')}</th>
                    <th scope="col">{ts('weight')}</th>
                    <th scope="col"><span className="sr-only">{ts('add')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((l) => (
                    <tr key={l.key}>
                      <th scope="row" className="font-normal">{t(`lines.${l.key}`)}</th>
                      <td className="font-mono">{l.spec ?? '—'}</td>
                      <td className="font-mono tabular-nums">{n(l.qty, l.unit === 'adet' ? 0 : 1)} {unitText(l.unit)}</td>
                      <td className="font-mono tabular-nums">{l.weightKg === null || l.weightKg === undefined ? '—' : `${n(l.weightKg)} kg`}</td>
                      <td>
                        {l.productSlug && products[l.productSlug] ? (
                          <button type="button" className="pcfg-pick" onClick={() => setToast(addLine(l) ? ts('added') : ts('noProducts'))} aria-label={`${ts('add')}: ${t(`lines.${l.key}`)}`}>
                            +
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={3}>{ts('total')}</th>
                    <td className="font-mono tabular-nums" data-testid="sc-total-weight">{n(result.totalWeightKg)} kg</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={addAll}>{ts('addAll')}</button>
            <button type="button" className="btn btn-ghost" onClick={share}>{copied ? tc('copied') : tc('share')}</button>
            <Link href="/get-quote" className="btn btn-ghost">{ts('quote')}</Link>
          </div>
          <p className="pcfg-toast" role="status" aria-live="polite">{toast}</p>
          <p className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]" role="note">
            {t('note')} {disclaimer}
          </p>
        </>
      }
    />
  );
}
