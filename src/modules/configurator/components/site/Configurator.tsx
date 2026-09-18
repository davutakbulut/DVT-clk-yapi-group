'use client';

import dynamic from 'next/dynamic';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { clampParams, parseParams, serializeParams, type Limits, type Params } from '../../domain/params';
import type { ProfileKey } from '../../domain/structure';
import { buildStructure } from '../../domain/structure';
import type { PriceTable } from '../../domain/pricing';
import type { PanelWeights, WeightTable } from '../../domain/takeoff';
import { PricePanel } from './PricePanel';
import { SavePanel } from './SavePanel';
import { TakeoffPanel } from './TakeoffPanel';

const Scene = dynamic(() => import('./Scene'), { ssr: false, loading: () => <div className="configurator-canvas-loading" aria-hidden="true" /> });

const DRAFT_KEY = 'clk_configurator_draft';

interface Props {
  readonly initial: Params;
  readonly limits: Limits;
  readonly trussThresholdM: number;
  readonly purlinSpacingM: number;
  readonly profileMap: Readonly<Record<ProfileKey, string>>;
  readonly disclaimer: string;
  /** Faz 27: kg/m tablosu (steel_profiles) ve panel kg/m²; boş → ağırlıksız metraj. */
  readonly weights?: WeightTable;
  readonly panelWeights?: PanelWeights;
  /** Faz 28: üye → birim fiyat tablosu (canlı tahmin); ziyaretçi → null (kapı). */
  readonly priceTable?: PriceTable | null;
  readonly member?: boolean;
  readonly nextPath?: string;
  readonly existing?: { readonly id: string; readonly token: string; readonly refCode: string; readonly name: string; readonly version: number } | null;
}

/**
 * Konfigüratör (04-CONFIGURATOR): 5 parametre + görsel anahtarlar; durum sorgu dizesinde (`history.replaceState`, RSC turu yok);
 * localStorage taslağı; istatistikler anında. 3D sahne dinamik import (SSR yok, K-24). Metraj Faz 27, fiyat/kayıt Faz 28.
 */
export function Configurator({ initial, limits, trussThresholdM, purlinSpacingM, profileMap, disclaimer, weights = {}, panelWeights = {}, priceTable = null, member = false, nextPath = '/configurator', existing = null }: Props) {
  const t = useTranslations('Configurator');
  const format = useFormatter();
  const [params, setParams] = useState<Params>(initial);
  const [copied, setCopied] = useState(false);
  // 3D sahne ilk boyamadan sonra, boş anda yüklenir (Faz 31: three.js ayrıştırması LCP/TBT penceresinin dışına)
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setSceneReady(true), { timeout: 1500 });
    else window.setTimeout(() => setSceneReady(true), 300);
  }, []);
  const structure = useMemo(() => buildStructure(params, { trussThresholdM, purlinSpacingM }), [params, trussThresholdM, purlinSpacingM]);

  // İlk yükleme: sorgu dizesi > taslak > varsayılan
  useEffect(() => {
    if (existing) return;
    const search = new URLSearchParams(window.location.search);
    if ([...search.keys()].some((k) => ['w', 'l', 'e', 'r', 'b'].includes(k))) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setParams(clampParams(JSON.parse(raw) as Partial<Params>, limits));
    } catch {
      // taslak yok
    }
  }, [limits, existing]);

  useEffect(() => {
    if (existing) return; // paylaşım sayfasında URL token'lı kalır; taslak yazılmaz
    const q = serializeParams(params);
    window.history.replaceState(null, '', `${window.location.pathname}?${q}`);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(params));
    } catch {
      // kota
    }
  }, [params, existing]);

  const update = (patch: Partial<Params>) => setParams((p) => clampParams({ ...p, ...patch }, limits));
  const slider = (key: 'width' | 'length' | 'eave' | 'ridge' | 'bay', range: { min: number; max: number; step: number }, unit = 'm') => (
    <label className="configurator-field">
      <span className="flex items-baseline justify-between">
        <span>{t(`params.${key}`)}</span>
        <output className="font-mono tabular-nums" htmlFor={`cfg-${key}`}>
          {format.number(params[key], { maximumFractionDigits: 2 })} {unit}
        </output>
      </span>
      <input id={`cfg-${key}`} type="range" min={range.min} max={range.max} step={range.step} value={params[key]} onChange={(e) => update({ [key]: Number(e.target.value) } as Partial<Params>)} aria-label={t(`params.${key}`)} />
    </label>
  );
  const ridgeRange = { min: params.eave + limits.ridge_extra.min, max: params.eave + limits.ridge_extra.max, step: limits.ridge_extra.step };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // pano yok
    }
  };

  return (
    <div className="configurator">
      <aside className="configurator-panel" aria-label={t('panelLabel')}>
        <h2 className="text-[length:var(--fs-h4)]">{t('params.title')}</h2>
        {slider('width', limits.width)}
        {slider('length', limits.length)}
        {slider('eave', limits.eave)}
        {slider('ridge', ridgeRange)}
        {slider('bay', limits.bay)}
        <fieldset className="grid gap-2 text-[length:var(--fs-sm)]">
          <legend className="font-medium">{t('params.visual')}</legend>
          {(['purlins', 'door', 'panels'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={params[k]} onChange={(e) => update({ [k]: e.target.checked } as Partial<Params>)} /> {t(`params.${k}`)}
            </label>
          ))}
        </fieldset>
        <dl className="configurator-stats" aria-live="polite">
          {[
            [t('stats.footprint'), `${format.number(structure.footprint)} m²`],
            [t('stats.bays'), `${structure.bays} (~${format.number(structure.baySpacing, { maximumFractionDigits: 1 })} m)`],
            [t('stats.columns'), String(structure.axes.length * 2)],
            [t('stats.windColumns'), String(structure.windColumnsPerGable)],
            [t('stats.system'), structure.system === 'truss' ? t('stats.truss', { threshold: trussThresholdM }) : t('stats.portal', { threshold: trussThresholdM })],
            ...(structure.door ? [[t('stats.door'), `${format.number(structure.door.x2 - structure.door.x1, { maximumFractionDigits: 2 })} × ${format.number(structure.door.h, { maximumFractionDigits: 2 })} m`]] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-[var(--color-text-muted)]">{k}</dt>
              <dd className="font-mono tabular-nums" data-testid={k === t('stats.footprint') ? 'footprint' : undefined}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <button type="button" className="btn btn-ghost" onClick={share}>
          {copied ? t('copied') : t('share')}
        </button>
        <TakeoffPanel structure={structure} profileMap={profileMap} weights={weights} panelWeights={panelWeights} />
        <PricePanel structure={structure} profileMap={profileMap} weights={weights} panelWeights={panelWeights} priceTable={priceTable} nextPath={nextPath} />
        <SavePanel params={params} member={member} existing={existing} />
        <p className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]" role="note">
          {disclaimer}
        </p>
      </aside>
      <div className="configurator-canvas" role="img" aria-label={t('canvasLabel', { width: params.width, length: params.length })}>
        {sceneReady ? <Scene structure={structure} profileMap={profileMap} /> : <div className="configurator-canvas-loading" aria-hidden="true" />}
      </div>
    </div>
  );
}

export { parseParams };
