'use client';

import dynamic from 'next/dynamic';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Catalog, type CatalogRow, type FamilyKey } from '../../engine/catalog';
import { ENGINE_APPS, type EngineKind } from '../../engine/registry';
import { bomCsv, coerceState, effectiveDef, runApp, serializeState, visible, type EngineOverrides } from '../../engine/runtime';
import { isGroup, type AppState, type BuildContext, type FieldDef } from '../../engine/types';
import type { PriceTable } from '../../domain/pricing';
import { CatalogDialog } from './CatalogDialog';
import { ConfiguratorFrame } from './ConfiguratorFrame';
import type { EngineSceneHandle } from './EngineScene';
import { EnginePricePanel } from './EnginePricePanel';
import { SavePanel } from './SavePanel';

const EngineScene = dynamic(() => import('./EngineScene'), { ssr: false, loading: () => <div className="configurator-canvas-loading" aria-hidden="true" /> });

export interface EngineConfiguratorProps {
  readonly kind: EngineKind;
  readonly initial: Readonly<Record<string, unknown>>;
  readonly overrides: EngineOverrides;
  readonly catalogRows: readonly CatalogRow[];
  /** Panelden girilen notlar (dil seçilmiş); boşsa tanımdaki not anahtarları */
  readonly notes: readonly string[];
  readonly disclaimer: string;
  readonly priceTable: PriceTable | null;
  readonly member: boolean;
  readonly nextPath: string;
  readonly existing?: { readonly id: string; readonly token: string; readonly refCode: string; readonly name: string; readonly version: number } | null;
}

const VIEWS = ['iso', 'front', 'side', 'top', 'fit'] as const;
const UNIT_KEYS = ['m', 'm2', 'm3', 'pcs', 'kg', 't', 'floors', '%'] as const;

/**
 * Parametrik 3B konfigüratör (K-110): tanım (sections/profiles) → panel; durum → saf yapım + metraj; sahne çizer.
 * Durum sorgu dizesinde (`history.replaceState`, RSC turu yok) ve localStorage taslağında; profil kataloğu penceresi; CSV / yazdır / bağlantı.
 */
export function EngineConfigurator({ kind, initial, overrides, catalogRows, notes, disclaimer, priceTable, member, nextPath, existing = null }: EngineConfiguratorProps) {
  const tE = useTranslations('Engine');
  const tC = useTranslations('Configurator');
  const format = useFormatter();
  const catalog = useMemo(() => new Catalog(catalogRows), [catalogRows]);
  const def = useMemo(() => effectiveDef(ENGINE_APPS[kind], overrides, catalog), [kind, overrides, catalog]);
  // Anahtarlar veriye göre üretildiğinden çevirmen gevşek tipli kullanılır; anahtarlar mesaj dosyasında tam listedir
  const t = tE as unknown as (key: string, values?: Record<string, string | number>) => string;
  const ctx = useMemo<BuildContext>(() => {
    const fmt = (v: number, d = 0) => format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d });
    return { t, fmt, fmtAuto: (v) => (Math.abs(v) >= 1000 ? fmt(v, 0) : Math.abs(v) >= 100 ? fmt(v, 1) : fmt(v, 2)), catalog, profile: (c) => catalog.get(c) };
  }, [t, format, catalog]);
  const [state, setState] = useState<AppState>(() => coerceState(def, catalog, initial));
  const [view, setView] = useState('iso');
  const [copied, setCopied] = useState(false);
  const [catalogFor, setCatalogFor] = useState<string | null | undefined>(undefined); // undefined → kapalı, null → gezinti
  const [sceneReady, setSceneReady] = useState(false);
  const [printImg, setPrintImg] = useState<string | null>(null);
  const sceneRef = useRef<EngineSceneHandle>(null);
  const DRAFT_KEY = `clk_engine_${kind}_draft`;
  const fields = useMemo(() => def.sections.flatMap((s) => s.fields), [def]);

  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setSceneReady(true), { timeout: 1500 });
    else window.setTimeout(() => setSceneReady(true), 300);
  }, []);
  // İlk yükleme: sorgu dizesi > taslak > varsayılan (paylaşım sayfasında kayıt)
  useEffect(() => {
    if (existing) return;
    const search = new URLSearchParams(window.location.search);
    if (fields.some((f) => search.has(f.id))) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setState(coerceState(def, catalog, JSON.parse(raw) as Record<string, unknown>));
    } catch { /* taslak yok */ }
  }, [DRAFT_KEY, def, catalog, existing, fields]);
  useEffect(() => {
    if (existing) return;
    window.history.replaceState(null, '', `${window.location.pathname}?${serializeState(def, state)}`);
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch { /* kota */ }
  }, [state, def, DRAFT_KEY, existing]);

  const out = useMemo(() => runApp(def, state, ctx), [def, state, ctx]);
  const change = useCallback((id: string, value: number | string | boolean) => {
    setState((prev) => {
      const next: AppState = { ...prev, [id]: value };
      def.normalize?.(next, id, ctx);
      return coerceState(def, catalog, next);
    });
  }, [def, ctx, catalog]);

  const unit = (u: string | undefined) => (u && (UNIT_KEYS as readonly string[]).includes(u) ? t(`units.${u}`) : (u ?? ''));
  const n = (v: number, d = 1) => format.number(v, { maximumFractionDigits: d });
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* pano yok */ }
  };
  const csv = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bomCsv(out, ctx, unit)], { type: 'text/csv;charset=utf-8' }));
    a.download = `${kind}-metraj.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const print = () => {
    setPrintImg(sceneRef.current?.snapshot() ?? null);
    window.setTimeout(() => window.print(), 80);
  };
  const changeView = (name: string) => { sceneRef.current?.setView(name); if (name !== 'fit') setView(name); };
  const kpis = [...out.result.kpis];
  if (out.steelKg > 0) kpis.push({ label: t('common.kpi.steelTotal'), value: out.steelKg >= 1000 ? `${n(out.steelKg / 1000, 2)} t` : `${n(out.steelKg, 0)} kg`, highlight: true });
  const nonSteel = out.allKg - out.steelKg;
  const paramsJson = JSON.stringify({ kind, state });
  const catalogTarget = catalogFor ? (() => { const p = def.profiles.find((x) => x.id === catalogFor); return p ? { id: p.id, label: t(p.labelKey), families: p.families, current: String(state[p.id]) } : null; })() : null;

  const rangeField = (f: FieldDef) => {
    const v = Number(state[f.id]);
    return (
      <div className="engine-f" key={f.id}>
        <div className="engine-f-row">
          <label htmlFor={`n-${f.id}`}>{t(f.labelKey)}</label>
          <div className="engine-num">
            <input id={`n-${f.id}`} type="number" inputMode="decimal" min={f.min} max={f.max} step={f.step} value={v} onChange={(e) => { const x = Number(e.target.value); if (Number.isFinite(x)) change(f.id, x); }} />
            <span>{unit(f.unit)}</span>
          </div>
        </div>
        <input type="range" min={f.min} max={f.max} step={f.step} value={v} onChange={(e) => change(f.id, Number(e.target.value))} aria-label={t(f.labelKey)} />
      </div>
    );
  };
  const field = (f: FieldDef) => {
    if (!visible(f, state)) return null;
    if (f.type === 'range') return rangeField(f);
    if (f.type === 'toggle') return (
      <div className="engine-f" key={f.id}>
        <label className="engine-sw"><span>{t(f.labelKey)}</span><input type="checkbox" role="switch" checked={Boolean(state[f.id])} onChange={(e) => change(f.id, e.target.checked)} /></label>
      </div>
    );
    if (f.type === 'seg') return (
      <div className="engine-f" key={f.id} role="group" aria-label={t(f.labelKey)}>
        <div className="engine-f-row"><span>{t(f.labelKey)}</span></div>
        <div className="engine-seg">
          {f.options?.map((o) => (
            <button key={String(o.value)} type="button" aria-pressed={String(state[f.id]) === String(o.value)} className={String(state[f.id]) === String(o.value) ? 'on' : ''} onClick={() => change(f.id, o.value)}>
              {t(o.labelKey).split('\n').map((line, i) => <span key={i} className="block">{line}</span>)}
            </button>
          ))}
        </div>
      </div>
    );
    return (
      <div className="engine-f" key={f.id}>
        <div className="engine-f-row"><label htmlFor={`x-${f.id}`}>{t(f.labelKey)}</label></div>
        <select id={`x-${f.id}`} value={String(state[f.id])} onChange={(e) => { const o = f.options?.find((x) => String(x.value) === e.target.value); if (o) change(f.id, o.value); }}>
          {f.options?.map((o) => <option key={String(o.value)} value={String(o.value)}>{t(o.labelKey)}</option>)}
        </select>
      </div>
    );
  };
  const profileInfo = (code: string) => {
    const q = catalog.get(code).props;
    return (
      <>
        <b>{catalog.label(code)}</b> · G <b>{n(q.G, q.G < 10 ? 2 : 1)}</b> kg/m · A {n(q.A, 2)} cm²<br />
        Iy {ctx.fmtAuto(q.Iy)} cm⁴ · Wpl,y {ctx.fmtAuto(q.Wply)} cm³ · iy {n(q.iy, 2)} cm<br />
        Iz {ctx.fmtAuto(q.Iz)} cm⁴ · Wpl,z {ctx.fmtAuto(q.Wplz)} cm³ · iz {n(q.iz, 2)} cm
      </>
    );
  };
  const familiesOf = (fams: readonly FamilyKey[]) => fams.filter((f) => catalog.ofFamilies([f]).length > 0);

  const panel = (
    <>
      <div className="engine-head">
        {existing ? <h2 className="text-[length:var(--fs-h4)]">{tC(`types.${kind}.title`)}</h2> : <h1 className="text-[length:var(--fs-h4)]">{tC(`types.${kind}.title`)}</h1>}
        <p>{tC(`types.${kind}.body`)}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- yazdırma için tuvalin anlık görüntüsü (data URL), next/image uygun değil */}
      {printImg ? <img id="engine-print-img" src={printImg} alt="" className="engine-print-img" /> : null}
      <div className="engine-kpis" aria-live="polite">
        {kpis.map((k) => (
          <div key={k.label} className={`engine-kpi${k.highlight ? ' hl' : ''}`}><span>{k.label}</span><b data-testid={k.highlight ? 'steel-total' : undefined}>{k.value}</b></div>
        ))}
      </div>
      {out.result.flag ? <p className="engine-flag" role="status">{out.result.flag}</p> : null}
      {def.sections.map((sec) => (
        <section key={sec.titleKey} className="engine-sec">
          <h2>{t(sec.titleKey)}</h2>
          {sec.fields.map(field)}
        </section>
      ))}
      {def.profiles.length ? (
        <section className="engine-sec">
          <h2>{t('common.profiles')} <button type="button" className="engine-ibtn" onClick={() => setCatalogFor(null)}>{t('common.catalog')}</button></h2>
          {def.profiles.filter((p) => visible(p, state)).map((p) => (
            <div key={p.id} className="engine-pf">
              <div className="engine-pf-top"><span className="engine-sq" style={{ background: p.color }} aria-hidden="true" /><label htmlFor={`p-${p.id}`}>{t(p.labelKey)}</label></div>
              <div className="engine-pf-sel">
                <select id={`p-${p.id}`} value={String(state[p.id])} onChange={(e) => change(p.id, e.target.value)}>
                  {familiesOf(p.families).map((fam) => (
                    <optgroup key={fam} label={t(`families.${fam}.label`)}>
                      {catalog.ofFamilies([fam]).map((row) => <option key={row.code} value={row.code}>{row.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                <button type="button" className="engine-ibtn" onClick={() => setCatalogFor(p.id)}>{t('common.catalogShort')}</button>
              </div>
              <p className="engine-pf-info">{profileInfo(String(state[p.id]))}</p>
            </div>
          ))}
        </section>
      ) : null}
      <section className="engine-sec" aria-labelledby="engine-bom-title">
        <h2 id="engine-bom-title">{t('common.bomTitle')}</h2>
        <table className="engine-bom" data-testid="engine-bom">
          <thead><tr><th scope="col">{t('common.bom.item')}</th><th scope="col" className="n">{t('common.bom.qty')}</th><th scope="col" className="n">{t('common.bom.amount')}</th><th scope="col" className="n">{t('common.bom.weight')}</th></tr></thead>
          <tbody>
            {out.bom.map((r, i) => isGroup(r) ? (
              <tr key={`g${i}`} className="grp"><th scope="colgroup" colSpan={4}>{r.group}</th></tr>
            ) : (
              <tr key={`${r.key ?? r.name}${i}`}>
                <th scope="row">{r.name}{r.spec ? <small>{r.spec}</small> : null}</th>
                <td className="n">{r.qty !== undefined ? n(r.qty, 0) : '–'}</td>
                <td className="n">{r.amount !== undefined ? `${n(r.amount, r.amountDec ?? 1)} ${unit(r.unit2 ?? r.unit)}` : '–'}</td>
                <td className="n">{r.kg ? `${n(r.kg, 0)} kg` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {out.steelKg > 0 ? (
          <>
            <div className="engine-tot"><span>{t('common.totals.steel')}</span><b data-testid="tonnage">{n(out.steelKg / 1000, 3)} t</b></div>
            {nonSteel > 1 ? <><div className="engine-tot2"><span>{t('common.totals.other')}</span><b>{n(nonSteel, 0)} kg</b></div><div className="engine-tot2"><span>{t('common.totals.all')}</span><b>{n(out.allKg, 0)} kg</b></div></> : null}
          </>
        ) : <div className="engine-tot"><span>{t('common.totals.all')}</span><b data-testid="tonnage">{n(out.allKg, 0)} kg</b></div>}
      </section>
      <section className="engine-sec">
        <h2>{t('common.legend')}</h2>
        <ul className="engine-legend">{out.result.legend.map((l) => <li key={l.label}><i style={{ background: l.color }} aria-hidden="true" />{l.label}</li>)}</ul>
      </section>
      <div className="engine-actions">
        <button type="button" className="btn btn-ghost" onClick={share}>{copied ? tC('copied') : tC('share')}</button>
        <button type="button" className="btn btn-ghost" onClick={csv}>{t('common.actions.csv')}</button>
        <button type="button" className="btn btn-ghost" onClick={print}>{t('common.actions.print')}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setCatalogFor(null)}>{t('common.catalog')}</button>
        <Link href="/get-quote" className="btn btn-primary engine-quote">{t('common.actions.quote')}</Link>
      </div>
      <EnginePricePanel out={out} priceTable={priceTable} nextPath={nextPath} />
      <SavePanel paramsJson={paramsJson} member={member} existing={existing} />
      <div className="engine-notes">
        {(notes.length ? notes : def.noteKeys.map((k) => t(k))).map((p, i) => <p key={i}>{p}</p>)}
        <p role="note">{disclaimer} {t('common.sectionNote')}</p>
      </div>
    </>
  );
  const canvas = (
    <>
      {sceneReady ? <EngineScene ref={sceneRef} model={out.model} catalog={catalog} views={def.views} frontDir={def.frontDir} groundY={out.result.groundY ?? -0.01} onView={setView} label={tC(`types.${kind}.title`)} /> : <div className="configurator-canvas-loading" aria-hidden="true" />}
      <p className="engine-chip" aria-hidden="true"><b>{out.result.chip.strong}</b> · {out.result.chip.rest}</p>
      <div className="engine-viewbar" role="group" aria-label={t('views.label')}>
        {VIEWS.map((v) => <button key={v} type="button" aria-pressed={v !== 'fit' && view === v} className={v !== 'fit' && view === v ? 'on' : ''} onClick={() => changeView(v)}>{t(`views.${v}`)}</button>)}
      </div>
      <p className="engine-hint"><span className="engine-hint-mouse">{t('hint.mouse')}</span><span className="engine-hint-touch">{t('hint.touch')}</span></p>
    </>
  );
  return (
    <>
      <ConfiguratorFrame summary={`${out.result.chip.strong} · ${out.result.chip.rest}`} canvas={canvas} panel={panel} />
      <CatalogDialog catalog={catalog} target={catalogTarget} open={catalogFor !== undefined} onClose={() => setCatalogFor(undefined)} onPick={(id, code) => change(id, code)} fmt={ctx.fmt} fmtAuto={ctx.fmtAuto} />
    </>
  );
}
