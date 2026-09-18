'use client';

import dynamic from 'next/dynamic';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { buildMultiStorey, clampMultiStorey, multiStoreyTakeoff, serializeMultiStorey, type MultiStoreyParams, type MultiStoreyRules } from '../../domain/multiStorey';

const Scene = dynamic(() => import('./MultiStoreyScene'), { ssr: false, loading: () => <div className="configurator-canvas-loading" aria-hidden="true" /> });

const DRAFT_KEY = 'clk_configurator_multi_storey_draft';
const QUERY_KEYS = ['w', 'l', 'h', 'n'];

interface Props {
  readonly initial: MultiStoreyParams;
  readonly rules: MultiStoreyRules;
  readonly disclaimer: string;
  /** kg/m tablosu (steel_profiles); boş → ağırlıksız metraj. */
  readonly weights?: Readonly<Record<string, number>>;
}

/**
 * Çok katlı çelik yapı konfigüratörü: 4 parametre (en · boy · kat yüksekliği · kat adedi); durum sorgu dizesinde (paylaşılabilir),
 * taslak localStorage'da. Aks aralığı, kolon adedi ve radye kalınlığı kurallardan (panel) hesaplanır. 3D sahne dinamik import (K-24).
 */
export function MultiStoreyConfigurator({ initial, rules, disclaimer, weights = {} }: Props) {
  const t = useTranslations('Configurator.multiStorey');
  const tc = useTranslations('Configurator');
  const format = useFormatter();
  const [params, setParams] = useState<MultiStoreyParams>(initial);
  const [copied, setCopied] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setSceneReady(true), { timeout: 1500 });
    else window.setTimeout(() => setSceneReady(true), 300);
  }, []);
  const structure = useMemo(() => buildMultiStorey(params, rules), [params, rules]);
  const takeoff = useMemo(() => multiStoreyTakeoff(structure, rules.profiles, weights), [structure, rules.profiles, weights]);

  // İlk yükleme: sorgu dizesi > taslak > varsayılan
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if ([...search.keys()].some((k) => QUERY_KEYS.includes(k))) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setParams(clampMultiStorey(JSON.parse(raw) as Partial<MultiStoreyParams>, rules.limits));
    } catch {
      // taslak yok
    }
  }, [rules.limits]);
  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}?${serializeMultiStorey(params)}`);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(params));
    } catch {
      // kota
    }
  }, [params]);

  const update = (patch: Partial<MultiStoreyParams>) => setParams((p) => clampMultiStorey({ ...p, ...patch }, rules.limits));
  const slider = (key: keyof MultiStoreyParams, range: { min: number; max: number; step: number }, unit: string) => (
    <label className="configurator-field">
      <span className="flex items-baseline justify-between">
        <span>{t(`params.${key}`)}</span>
        <output className="font-mono tabular-nums" htmlFor={`ms-${key}`}>
          {format.number(params[key], { maximumFractionDigits: 2 })} {unit}
        </output>
      </span>
      <input id={`ms-${key}`} type="range" min={range.min} max={range.max} step={range.step} value={params[key]} onChange={(e) => update({ [key]: Number(e.target.value) } as Partial<MultiStoreyParams>)} aria-label={t(`params.${key}`)} />
    </label>
  );
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // pano yok
    }
  };
  const n = (v: number, d = 0) => format.number(v, { maximumFractionDigits: d });
  const stats: readonly (readonly [string, string, string?])[] = [
    [t('stats.footprint'), `${n(structure.footprintM2)} m²`, 'ms-footprint'],
    [t('stats.totalArea'), `${n(structure.totalFloorAreaM2)} m²`],
    [t('stats.height'), `${n(structure.heightM, 1)} m`],
    [t('stats.spacing'), `${n(structure.spacingX, 2)} × ${n(structure.spacingZ, 2)} m`],
    [t('stats.columns'), String(structure.columnCount), 'ms-columns'],
    [t('stats.raft'), `${n(structure.raft.thicknessM * 100)} cm · ${n(structure.raft.volumeM3)} m³`, 'ms-raft'],
  ];

  return (
    <div className="configurator">
      <aside className="configurator-panel" aria-label={tc('panelLabel')}>
        <h2 className="text-[length:var(--fs-h4)]">{tc('params.title')}</h2>
        {slider('width', rules.limits.width, 'm')}
        {slider('length', rules.limits.length, 'm')}
        {slider('floorHeight', rules.limits.floor_height, 'm')}
        {slider('floors', rules.limits.floors, '')}
        <p className="text-[length:var(--fs-xs)] text-[var(--color-text-muted)]" aria-live="polite">
          {params.floors > rules.raftFreeFloors ? t('raftNoteExtra', { floors: params.floors, base: n(rules.raftBaseM * 100), extra: n((structure.raft.thicknessM - rules.raftBaseM) * 100), total: n(structure.raft.thicknessM * 100) }) : t('raftNoteBase', { floors: params.floors, base: n(rules.raftBaseM * 100) })}
        </p>
        <dl className="configurator-stats" aria-live="polite">
          {stats.map(([k, v, id]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-[var(--color-text-muted)]">{k}</dt>
              <dd className="font-mono tabular-nums" data-testid={id}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <section className="grid gap-2" aria-labelledby="ms-takeoff">
          <h3 id="ms-takeoff" className="text-[length:var(--fs-sm)] font-semibold">
            {t('takeoff.title')}
          </h3>
          <div className="table-scroll overflow-x-auto">
            <table className="configurator-table">
              <thead>
                <tr>
                  <th scope="col">{t('takeoff.member')}</th>
                  <th scope="col">{t('takeoff.profile')}</th>
                  <th scope="col">{t('takeoff.count')}</th>
                  <th scope="col">{t('takeoff.length')}</th>
                  <th scope="col">{t('takeoff.weight')}</th>
                </tr>
              </thead>
              <tbody>
                {takeoff.lines.map((l) => (
                  <tr key={l.group}>
                    <th scope="row" className="font-normal">
                      <i className="configurator-swatch" data-group={l.group} aria-hidden="true" />
                      {t(`groups.${l.group}`)}
                    </th>
                    <td className="font-mono">{l.profile}</td>
                    <td className="font-mono tabular-nums">{n(l.count)}</td>
                    <td className="font-mono tabular-nums">{n(l.totalLengthM)} m</td>
                    <td className="font-mono tabular-nums">{l.weightKg === null ? '—' : `${n(l.weightKg / 1000, 1)} t`}</td>
                  </tr>
                ))}
              </tbody>
              {takeoff.totalWeightKg !== null ? (
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={4}>
                      {t('takeoff.total')}
                    </th>
                    <td className="font-mono tabular-nums" data-testid="ms-total-weight">
                      {n(takeoff.totalWeightKg / 1000, 1)} t
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
          {takeoff.totalWeightKg === null ? <p className="text-[length:var(--fs-xs)] text-[var(--color-text-muted)]">{t('takeoff.noWeight')}</p> : null}
        </section>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={share}>
            {copied ? tc('copied') : tc('share')}
          </button>
          <Link href="/get-quote" className="btn btn-primary">
            {t('quote')}
          </Link>
        </div>
        <p className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]" role="note">
          {t('prototypeNote', { spacing: n(rules.maxColumnSpacingM, 1) })} {disclaimer}
        </p>
      </aside>
      <div className="configurator-canvas" role="img" aria-label={t('canvasLabel', { width: params.width, length: params.length, floors: params.floors })}>
        {sceneReady ? <Scene structure={structure} profiles={rules.profiles} /> : <div className="configurator-canvas-loading" aria-hidden="true" />}
      </div>
    </div>
  );
}
