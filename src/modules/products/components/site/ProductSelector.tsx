'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { pickLocale } from '@/lib/localized';
import { useBasket } from '@/modules/quote-basket';
import { Button } from '@/ui/Button';
import {
  cornerRadii, dimText, findVariant, fmt, formatsFor, galvanizeExtraKg, gradesFor, groupLabel, groupsOf, normSearch, plateWeightOf, propDecimals, PROP_UNITS, SECTION_PROP_KEYS,
  sizeKey, sizesOf, SURFACE_SWATCH, surfacesFor, thicknessesOf, weightOf, type DrawKind, type ProductOptions, type PropKey, type SelectableVariant, type SurfaceKey,
} from '../../domain/productConfig';
import { ProductViewer3D } from './ProductViewer3D';
import { SectionDrawing } from './SectionDrawing';

interface Props {
  readonly productId: string;
  readonly slug: string;
  readonly name: string;
  readonly locale: string;
  readonly variants: readonly SelectableVariant[];
  readonly options: ProductOptions;
  readonly unit: string;
}

type Col = { readonly key: string; readonly label: string; readonly hidden?: boolean; readonly value: (v: SelectableVariant) => number | string | null; readonly decimals?: number | ((x: number) => number); readonly left?: boolean };

/**
 * Ürün seçici (K-88 → K-90, örnek sayfaların motoru): kesit çizimi (2B, tıklayınca 3B) + seçim paneli
 * (grup → ölçü → kalınlık → yüzey → kalite → boy/plaka ebadı → adet), ağırlık hesabı, kesit değerleri, teklif sepeti;
 * altında kesit türüne göre sütunlanan, filtrelenip sıralanan ölçü tablosu (satır → seçim). Tüm metin next-intl, tüm veri DB.
 */
export function ProductSelector({ productId, slug, name, locale, variants, options, unit }: Props) {
  const t = useTranslations('Products');
  const format = useFormatter();
  const basket = useBasket();
  const id = useId();
  const cfgRef = useRef<HTMLDivElement>(null);
  const draw: DrawKind = options.draw ?? (variants.some((v) => v.heightMm === null && v.widthMm !== null && v.dims['D'] !== undefined) ? 'pipe' : 'box');
  const plate = draw === 'plate';
  const L = (text: Parameters<typeof pickLocale>[0], fallback: string) => pickLocale(text, locale) || fallback;

  const groups = useMemo(() => groupsOf(variants, options), [variants, options]);
  const [group, setGroup] = useState<string | null>(groups[0] ?? null);
  const sizes = useMemo(() => sizesOf(variants, group), [variants, group]);
  const [size, setSize] = useState<string>(sizes[Math.min(sizes.length - 1, Math.floor(sizes.length / 3))] ?? '');
  const thicknesses = useMemo(() => thicknessesOf(variants, group, size, plate), [variants, group, size, plate]);
  const [thickness, setThickness] = useState<number | null>(thicknesses[Math.floor(thicknesses.length / 2)] ?? null);
  const surfaces = surfacesFor(options, group);
  const [surface, setSurface] = useState<SurfaceKey>(surfaces[0] ?? 'black');
  const grades = gradesFor(options, group);
  const [grade, setGrade] = useState(grades[0] ?? '');
  const formats = formatsFor(options, group);
  const [lengthChoice, setLengthChoice] = useState<string>(() => (plate ? (formats[0] ? `${formats[0].w}x${formats[0].l}` : 'custom') : options.lengthsM[0] !== undefined ? String(options.lengthsM[0]) : options.customLength ? 'custom' : ''));
  const [customLength, setCustomLength] = useState('3');
  const [customW, setCustomW] = useState('1000');
  const [customL, setCustomL] = useState('2000');
  const [qty, setQty] = useState(String(options.qtyDefault ?? (plate ? 2 : 10)));
  const [view3d, setView3d] = useState(false);
  const [toast, setToast] = useState('');
  const [showProps, setShowProps] = useState(false);
  const [query, setQuery] = useState('');
  const [tableGroup, setTableGroup] = useState<string | null>(null);
  const [tableT, setTableT] = useState<number | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  // Grup/ölçü değişince alt seçimler geçerli kalsın
  useEffect(() => {
    if (!plate && !sizes.includes(size)) setSize(sizes[Math.min(sizes.length - 1, Math.floor(sizes.length / 3))] ?? '');
  }, [sizes, size, plate]);
  useEffect(() => {
    if (thickness === null ? thicknesses.length > 0 : !thicknesses.includes(thickness)) setThickness(thicknesses[Math.floor(thicknesses.length / 2)] ?? null);
  }, [thicknesses, thickness]);
  useEffect(() => {
    if (surfaces.length && !surfaces.includes(surface)) setSurface(surfaces[0]!);
  }, [surfaces, surface]);
  useEffect(() => {
    if (grades.length && !grades.includes(grade)) setGrade(grades[0]!);
  }, [grades, grade]);
  useEffect(() => {
    if (plate && lengthChoice !== 'custom' && !formats.some((f) => `${f.w}x${f.l}` === lengthChoice)) setLengthChoice(formats[0] ? `${formats[0].w}x${formats[0].l}` : 'custom');
  }, [plate, formats, lengthChoice]);

  const current = findVariant(variants, group, size, thickness, plate);
  const n = (v: number, d = 2) => format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d });
  const quantity = Math.max(1, Math.floor(Number(qty) || 1));
  // Boy (m) ya da plaka ebadı (mm)
  const fixedLengthM = current?.lengthMm ? current.lengthMm / 1000 : null;
  const lengthM = fixedLengthM ?? (lengthChoice === 'custom' ? Math.max(0, Number(customLength.replace(',', '.')) || 0) : Number(lengthChoice) || 0);
  const fmtSel = useMemo(() => (plate ? (lengthChoice === 'custom' ? { w: Math.max(0, Number(customW) || 0), l: Math.max(0, Number(customL) || 0) } : (formats.find((f) => `${f.w}x${f.l}` === lengthChoice) ?? null)) : null), [plate, lengthChoice, customW, customL, formats]);
  const bar = plate ? null : weightOf(current?.kgPerM ?? null, lengthM, quantity);
  const sheet = plate ? plateWeightOf(current?.kgPerM2 ?? null, fmtSel?.w ?? 0, fmtSel?.l ?? 0, quantity) : null;
  const unitWeight = plate ? (current?.kgPerM2 ?? null) : (current?.kgPerM ?? null);
  const perOne = plate ? (sheet?.perSheet ?? null) : (bar?.perBar ?? null);
  const total = plate ? (sheet?.total ?? null) : (bar?.total ?? null);
  const per = plate ? (sheet?.areaM2 ?? 0) : lengthM;
  const hasLengthChoice = !plate && fixedLengthM === null && (options.lengthsM.length > 0 || options.customLength);
  const totalText = total === null ? '—' : total >= 1000 ? `${n(total / 1000)} t` : `${n(total, 0)} kg`;
  const galvKg = surface === 'galv' && surfaces.length && !(plate && group === 'GLV') && per > 0 ? galvanizeExtraKg({ draw, paintAreaM2PerM: current?.props.u ?? null, per, qty: quantity }) : 0;
  const coverM2 = current?.props.we && per > 0 ? (current.props.we / 1000) * per * quantity : null;
  const gLabel = (code: string | null) => groupLabel(options, code, locale);
  const label = current ? current.sizeLabel : '';
  const pattern: 'tear' | 'dia' | null = options.pattern === 'tear' ? 'tear' : group === 'BKL' ? 'dia' : null;
  const formatText = fmtSel ? `${fmtSel.w}×${fmtSel.l} mm` : '';

  const attrs = useMemo(() => {
    const a: Record<string, string | number> = {};
    if (grade) a['grade'] = grade;
    if (surfaces.length) a['surface'] = t(`cfg.surf.${surface}`);
    if (plate) {
      if (fmtSel && fmtSel.w > 0 && fmtSel.l > 0) { a['format'] = `${fmtSel.w}×${fmtSel.l} mm`; a['area_m2'] = Math.round(((fmtSel.w * fmtSel.l) / 1e6) * 1000) / 1000; }
      if (current?.kgPerM2) a['kg_per_m2'] = current.kgPerM2;
    } else {
      if (lengthM > 0) a['length_m'] = Math.round(lengthM * 100) / 100;
      if (current?.kgPerM) a['kg_per_m'] = current.kgPerM;
    }
    if (total !== null) a['total_kg'] = Math.round(total * 10) / 10;
    return a;
  }, [grade, surfaces.length, surface, plate, fmtSel, current, lengthM, total, t]);

  const add = () => {
    if (!current) return;
    if (plate ? !(fmtSel && fmtSel.w > 0 && fmtSel.l > 0) : hasLengthChoice && lengthChoice === 'custom' && !(lengthM > 0)) {
      setToast(t(plate ? 'cfg.customFormatInvalid' : 'cfg.customInvalid'));
      return;
    }
    basket.add({ productId, variantId: current.id, slug, name, variantLabel: current.sizeLabel, stockCode: current.stockCode, quantity, unit, note: '', attributes: attrs, weightKg: total });
    setToast(t('cfg.added', { label: current.sizeLabel, qty: quantity, unit }));
  };
  const pick = (v: SelectableVariant) => {
    setGroup(v.group);
    setSize(sizeKey(v));
    setThickness(v.thicknessMm);
    setToast('');
    cfgRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  // ── Tablo: kesit türüne göre sütunlar
  const allT = useMemo(() => [...new Set(variants.map((v) => v.thicknessMm).filter((x): x is number => x !== null))].sort((a, b) => a - b), [variants]);
  const propKeys = useMemo(() => SECTION_PROP_KEYS.filter((k) => variants.some((v) => v.props[k] !== undefined)), [variants]);
  const anyBar = variants.some((v) => v.kgPerM !== null);
  const anyM2 = variants.some((v) => v.kgPerM2 !== null);
  const anyU = variants.some((v) => v.props.u !== undefined);
  const L0 = options.lengthsM[0] ?? 6;
  const plateCols = useMemo(() => (plate ? formatsFor(options, groups[0] ?? null).slice(0, 3) : []), [plate, options, groups]);
  const cols = useMemo<Col[]>(() => {
    const c: Col[] = [{ key: 'code', label: t('table.code'), value: (v) => v.stockCode ?? '', left: true }];
    if (groups.length > 1 && (plate || draw === 'trap')) c.push({ key: 'group', label: t('table.group'), value: (v) => gLabel(v.group), left: true });
    if (draw === 'trap') c.push({ key: 'sizeKey', label: L(options.sizeLabel, t('table.size')), value: (v) => sizeKey(v), left: true });
    c.push({ key: 'size', label: plate ? t('table.thickness') : draw === 'trap' ? t('table.t') : t('table.size'), value: (v) => (plate ? v.thicknessMm : dimText(v, draw)), decimals: plate ? 1 : undefined, left: !plate });
    if (draw === 'I' || draw === 'Itaper' || draw === 'U') {
      c.push({ key: 'tw', label: t('table.tw'), value: (v) => (typeof v.dims['tw'] === 'number' ? (v.dims['tw'] as number) : null), decimals: 1 });
      c.push({ key: 'tf', label: t('table.tf'), value: (v) => (typeof v.dims['tf'] === 'number' ? (v.dims['tf'] as number) : null), decimals: 1 });
    }
    if (allT.length > 0 && !plate && draw !== 'trap' && draw !== 'flat' && draw !== 'T') c.push({ key: 't', label: t('table.t'), value: (v) => v.thicknessMm, decimals: (x) => (Number.isInteger(x) ? 0 : 1) });
    if (draw === 'trap' && allT.length > 0) c.push({ key: 't', label: t('table.t'), value: (v) => v.thicknessMm, decimals: 2 });
    if (anyM2 && !plate) c.push({ key: 'kgm2', label: t('table.kgm2'), value: (v) => v.kgPerM2, decimals: 2 });
    if (anyBar) {
      c.push({ key: 'kg', label: draw === 'trap' ? t('table.kgSheet') : t('table.kgPerM'), value: (v) => v.kgPerM, decimals: (x) => (x < 10 ? 2 : 1) });
      c.push({ key: 'bar', label: draw === 'trap' ? t('table.sheetN', { n: fmt(L0) }) : t('table.barN', { n: fmt(L0) }), value: (v) => (v.kgPerM === null ? null : v.kgPerM * L0), decimals: (x) => (x < 10 ? 2 : 1) });
    }
    if (plate) {
      c.push({ key: 'kgm2', label: t('table.kgm2'), value: (v) => v.kgPerM2, decimals: 2 });
      for (const f of plateCols) c.push({ key: `f${f.w}x${f.l}`, label: t('table.formatKg', { w: f.w, l: f.l }), value: (v) => (v.kgPerM2 === null ? null : (v.kgPerM2 * f.w * f.l) / 1e6), decimals: 1 });
    }
    if (draw === 'trap') {
      c.push({ key: 'we', label: t('table.we'), value: (v) => v.props.we ?? null, decimals: 0 });
      c.push({ key: 'h', label: t('table.h'), value: (v) => v.props.h ?? null, decimals: 0, hidden: true });
      c.push({ key: 'p', label: t('table.p'), value: (v) => v.props.p ?? null, decimals: 1, hidden: true });
      c.push({ key: 'coil', label: t('table.coil'), value: (v) => v.props.coil ?? null, decimals: 0, hidden: true });
    }
    for (const k of propKeys) c.push({ key: k, label: `${t(`cfg.propNames.${k}`)} (${PROP_UNITS[k]})`, value: (v) => v.props[k] ?? null, decimals: (x) => propDecimals(k, x), hidden: true });
    if (anyU) c.push({ key: 'u', label: t('table.paint'), value: (v) => v.props.u ?? null, decimals: 3 });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gLabel/L türevleri options+locale'e bağlı
  }, [t, groups.length, plate, draw, options, allT.length, anyM2, anyBar, L0, plateCols, propKeys, anyU, locale]);
  const anyHidden = cols.some((c) => c.hidden);
  const rows = useMemo(() => {
    let list = variants.filter((v) => (tableGroup === null || v.group === tableGroup) && (tableT === null || v.thicknessMm === tableT));
    const q = normSearch(query.trim());
    if (q) list = list.filter((v) => [v.sizeLabel, v.stockCode ?? '', dimText(v, draw), sizeKey(v), `${v.heightMm ?? ''}x${v.widthMm ?? ''}x${v.thicknessMm ?? ''}`].some((x) => normSearch(x).includes(q)));
    if (sort) {
      const col = cols.find((c) => c.key === sort.key);
      if (col) {
        list = [...list].sort((a, b) => {
          const x = col.value(a) ?? '';
          const y = col.value(b) ?? '';
          return sort.dir * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'tr', { numeric: true }));
        });
      }
    }
    return list;
  }, [variants, tableGroup, tableT, query, sort, cols, draw]);
  const toggleSort = (key: string) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const ariaSort = (key: string) => (sort?.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined);
  const cell = (c: Col, v: SelectableVariant) => {
    const x = c.value(v);
    if (x === null || x === '') return '—';
    if (typeof x === 'string') return x;
    return n(x, typeof c.decimals === 'function' ? c.decimals(x) : (c.decimals ?? 2));
  };
  const D = current?.dims ?? {};
  const dn = (k: string, fb: number | null = null) => (typeof D[k] === 'number' ? fmt(D[k] as number) : fb !== null ? fmt(fb) : '—');
  const drawMeta = (): string => {
    if (!current) return '';
    switch (draw) {
      case 'box': { const tt = current.thicknessMm ?? 0; const r = cornerRadii(tt || 1); return t('cfg.drawMeta.box', { ro: dn('ro', r.outer), ri: dn('ri', r.inner) }); }
      case 'pipe': return t('cfg.drawMeta.pipe', { D: dn('D', current.widthMm ?? 0), t: dn('t', current.thicknessMm ?? 0) });
      case 'I': return t('cfg.drawMeta.I', { tw: dn('tw'), tf: dn('tf'), r: dn('r') });
      case 'Itaper': return t('cfg.drawMeta.Itaper', { tw: dn('tw'), tf: dn('tf') });
      case 'U': return D['sl'] ? t('cfg.drawMeta.Usl', { tw: dn('tw'), tf: dn('tf'), e: fmt(current.props.e ?? 0) }) : t('cfg.drawMeta.U', { tw: dn('tw'), tf: dn('tf'), r: dn('r'), e: fmt(current.props.e ?? 0) });
      case 'L': return t('cfg.drawMeta.L', { r: dn('r'), ex: fmt(current.props.ex ?? 0), ey: fmt(current.props.ey ?? 0) });
      case 'T': return t('cfg.drawMeta.T', { t: dn('t', current.thicknessMm ?? 0), e: fmt(current.props.e ?? 0) });
      case 'trap': { const we = typeof D['we'] === 'number' ? (D['we'] as number) : 1000; const h = typeof D['h'] === 'number' ? (D['h'] as number) : 20; const scaled = Math.min(Math.max(400 / we, 70 / h), 150 / h) > (400 / we) * 1.2; return t('cfg.drawMeta.trap', { group: gLabel(current.group), t: dn('t', current.thicknessMm ?? 0) }) + (scaled ? t('cfg.drawMeta.trapScaled') : ''); }
      case 'flat': return t('cfg.drawMeta.flat', { w: dn('w', current.widthMm ?? 0), t: dn('t', current.thicknessMm ?? 0) });
      case 'plate': return t('cfg.drawMeta.plate', { group: gLabel(current.group), format: formatText });
    }
  };
  const drawRight = current ? (plate || draw === 'trap' ? (current.kgPerM2 !== null ? `${n(current.kgPerM2)} kg/m²` : '') : dimText(current, draw)) : '';

  return (
    <div className="grid gap-12">
      <div ref={cfgRef} className="pcfg" aria-label={t('cfg.title')}>
        <div className="pcfg-draw">
          <div className="pcfg-code" aria-live="polite">
            <span>{t('cfg.selected')}</span>
            <b data-testid="pcfg-code">{current?.stockCode ?? label}</b>
          </div>
          <div className="pcfg-vt" role="group" aria-label={t('viewer3d.label')}>
            <button type="button" aria-pressed={!view3d} onClick={() => setView3d(false)}>{t('viewer3d.v2d')}</button>
            <button type="button" aria-pressed={view3d} onClick={() => setView3d(true)}>{t('viewer3d.v3d')}</button>
          </div>
          {current ? (
            view3d ? (
              <ProductViewer3D v={current} draw={draw} surface={surface} pattern={pattern} format={fmtSel && fmtSel.w > 0 && fmtSel.l > 0 ? fmtSel : null} grade={grade} />
            ) : (
              <SectionDrawing v={current} draw={draw} label={t('cfg.drawing', { label })} format={fmtSel && fmtSel.w > 0 && fmtSel.l > 0 ? fmtSel : null} pattern={pattern} groupCode={group} dimLabels={{ we: t('cfg.dimLabels.we'), p: t('cfg.dimLabels.p'), w: t('cfg.dimLabels.w') }} />
            )
          ) : (
            <div className="pcfg-svg pcfg-svg-empty" aria-hidden="true" />
          )}
          <div className="pcfg-draw-meta">
            <span>{drawMeta()}</span>
            <span className="pcfg-draw-scale">{drawRight}</span>
          </div>
        </div>
        <div className="pcfg-panel">
          {groups.length > 1 ? (
            <div className="pcfg-field">
              <span className="pcfg-lbl">{L(options.groupLabel, t('cfg.group'))}</span>
              <div className="pcfg-seg" role="group" aria-label={L(options.groupLabel, t('cfg.group'))}>
                {groups.map((g) => (
                  <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)}>
                    {gLabel(g)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {!plate ? (
            options.sizeUi === 'chips' ? (
              <div className="pcfg-field">
                <span className="pcfg-lbl" id={`${id}-sz`}>{L(options.sizeLabel, t('cfg.size'))}</span>
                <div className="pcfg-chips pcfg-chips-sz" role="group" aria-labelledby={`${id}-sz`}>
                  {sizes.map((s) => (
                    <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pcfg-field">
                <label htmlFor={`${id}-size`}>{L(options.sizeLabel, t('cfg.size'))}</label>
                <select id={`${id}-size`} value={size} onChange={(e) => setSize(e.target.value)} className="field">
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )
          ) : null}
          {thicknesses.length > 0 ? (
            <div className="pcfg-field">
              <span className="pcfg-lbl" id={`${id}-t`}>{L(options.variantLabel, t('cfg.thickness'))}</span>
              <div className="pcfg-chips" role="group" aria-labelledby={`${id}-t`}>
                {thicknesses.map((tv) => (
                  <button key={tv} type="button" aria-pressed={thickness === tv} onClick={() => setThickness(tv)}>
                    {fmt(tv)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {surfaces.length > 0 ? (
            <div className="pcfg-field">
              <span className="pcfg-lbl" id={`${id}-sf`}>{t('cfg.surface')}</span>
              <div className="pcfg-surf" role="group" aria-labelledby={`${id}-sf`}>
                {surfaces.map((s) => (
                  <button key={s} type="button" aria-pressed={surface === s} onClick={() => setSurface(s)}>
                    <i style={{ background: SURFACE_SWATCH[s] }} aria-hidden="true" />
                    {t(`cfg.surf.${s}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="pcfg-row3">
            {grades.length > 0 ? (
              <div className="pcfg-field">
                <label htmlFor={`${id}-grade`}>{L(options.gradeLabel, plate ? t('cfg.grade2') : t('cfg.grade'))}</label>
                <select id={`${id}-grade`} value={grade} onChange={(e) => setGrade(e.target.value)} className="field">
                  {grades.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
            ) : null}
            {plate ? (
              <div className="pcfg-field">
                <label htmlFor={`${id}-len`}>{t('cfg.format')}</label>
                <select id={`${id}-len`} value={lengthChoice} onChange={(e) => setLengthChoice(e.target.value)} className="field">
                  {formats.map((f) => (
                    <option key={`${f.w}x${f.l}`} value={`${f.w}x${f.l}`}>
                      {f.w} × {f.l} mm
                    </option>
                  ))}
                  <option value="custom">{t('cfg.customFormat')}</option>
                </select>
              </div>
            ) : hasLengthChoice ? (
              <div className="pcfg-field">
                <label htmlFor={`${id}-len`}>{L(options.lengthLabel, t('cfg.length'))}</label>
                <select id={`${id}-len`} value={lengthChoice} onChange={(e) => setLengthChoice(e.target.value)} className="field">
                  {options.lengthsM.map((l) => (
                    <option key={l} value={String(l)}>
                      {fmt(l)} m
                    </option>
                  ))}
                  {options.customLength ? <option value="custom">{t('cfg.custom')}</option> : null}
                </select>
              </div>
            ) : null}
            <div className="pcfg-field">
              <label htmlFor={`${id}-qty`}>
                {t('cfg.quantity')} ({unit})
              </label>
              <input id={`${id}-qty`} type="number" min={1} step={1} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="field" />
            </div>
          </div>
          {plate && lengthChoice === 'custom' ? (
            <div className="pcfg-row2">
              <div className="pcfg-field">
                <label htmlFor={`${id}-cw`}>{t('cfg.widthMm')}</label>
                <input id={`${id}-cw`} type="number" min={1} step={1} inputMode="numeric" value={customW} onChange={(e) => setCustomW(e.target.value)} className="field" />
              </div>
              <div className="pcfg-field">
                <label htmlFor={`${id}-cl`}>{t('cfg.lengthMm')}</label>
                <input id={`${id}-cl`} type="number" min={1} step={1} inputMode="numeric" value={customL} onChange={(e) => setCustomL(e.target.value)} className="field" />
              </div>
            </div>
          ) : null}
          {!plate && hasLengthChoice && lengthChoice === 'custom' ? (
            <div className="pcfg-field">
              <label htmlFor={`${id}-clen`}>{t('cfg.customLength')}</label>
              <input id={`${id}-clen`} type="number" min={0.1} step={0.1} inputMode="decimal" value={customLength} onChange={(e) => setCustomLength(e.target.value)} className="field" />
            </div>
          ) : null}
          <dl className="pcfg-result" aria-live="polite">
            <div>
              <dt>{t('cfg.unitWeight')}</dt>
              <dd>
                <b>{unitWeight === null ? '—' : n(unitWeight, unitWeight < 1 ? 3 : 2)}</b>
                {plate ? t('cfg.unitWeightM2') : 'kg/m'}
              </dd>
            </div>
            <div>
              <dt>{L(options.oneLabel, plate ? t('cfg.perSheet') : t('cfg.perBar'))}</dt>
              <dd>
                <b>{perOne === null ? '—' : n(perOne, perOne < 10 ? 2 : 1)}</b>kg
              </dd>
            </div>
            <div className="pcfg-total">
              <dt>{t('cfg.total')}</dt>
              <dd>
                <b data-testid="pcfg-total">{totalText}</b>
              </dd>
            </div>
          </dl>
          {current && unitWeight === null ? <p className="pcfg-hint">{t('cfg.noWeight')}</p> : null}
          {galvKg > 0 ? <p className="pcfg-hint">{t('cfg.galvNote', { kg: n(galvKg, galvKg < 10 ? 1 : 0) })}</p> : null}
          {coverM2 !== null ? <p className="pcfg-hint">{t('cfg.coverArea', { m2: n(coverM2, 1) })}</p> : null}
          {current && Object.keys(current.props).length > 0 ? (
            <details className="pcfg-props">
              <summary>{t('cfg.props')}</summary>
              <div className="pcfg-pgrid">
                {(Object.keys(PROP_UNITS) as PropKey[]).filter((k) => current.props[k] !== undefined).map((k) => (
                  <div key={k}>
                    {t(`cfg.propNames.${k}`)} ({PROP_UNITS[k]})<b>{n(current.props[k]!, propDecimals(k, current.props[k]!))}</b>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          <div className="pcfg-add">
            <Button type="button" onClick={add}>
              {t('cfg.add')}
            </Button>
          </div>
          <p className="pcfg-toast" role="status" aria-live="polite">
            {toast}
          </p>
        </div>
      </div>

      <section className="grid gap-4" aria-labelledby={`${id}-table-title`}>
        <div className="grid gap-2">
          <h2 id={`${id}-table-title`} className="text-[length:var(--fs-h3)]">
            {t('table.title')}
          </h2>
          <p className="max-w-[70ch] text-[var(--color-text-muted)]">{t('table.lead')}</p>
        </div>
        <div className="pcfg-tools">
          {groups.length > 1 ? (
            <div className="pcfg-seg" role="group" aria-label={t('table.filter')}>
              <button type="button" aria-pressed={tableGroup === null} onClick={() => setTableGroup(null)}>
                {t('table.all')}
              </button>
              {groups.map((g) => (
                <button key={g} type="button" aria-pressed={tableGroup === g} onClick={() => setTableGroup(g)}>
                  {gLabel(g)}
                </button>
              ))}
            </div>
          ) : null}
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('table.search')} aria-label={t('table.search')} className="field max-w-60" />
          {anyHidden ? (
            <label className="flex items-center gap-2 text-[length:var(--fs-sm)]">
              <input type="checkbox" checked={showProps} onChange={(e) => setShowProps(e.target.checked)} /> {t('table.showProps')}
            </label>
          ) : null}
          <span className="pcfg-count label-mono">{t('table.count', { count: rows.length })}</span>
        </div>
        {allT.length > 1 ? (
          <div className="pcfg-tchips" role="group" aria-label={t('table.thicknessFilter')}>
            <button type="button" aria-pressed={tableT === null} onClick={() => setTableT(null)}>
              {t('table.allThickness')}
            </button>
            {allT.map((tv) => (
              <button key={tv} type="button" aria-pressed={tableT === tv} onClick={() => setTableT(tv)}>
                {fmt(tv)} mm
              </button>
            ))}
          </div>
        ) : null}
        <div className="pcfg-tscroll table-scroll">
          <table className="pcfg-table" data-props={showProps ? '' : undefined}>
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key} scope="col" className={`${c.hidden ? 'pcfg-kc' : ''} ${c.left ? 'pcfg-left' : ''}`.trim() || undefined} aria-sort={ariaSort(c.key)}>
                    <button type="button" onClick={() => toggleSort(c.key)}>{c.label}</button>
                  </th>
                ))}
                <th scope="col" aria-label={t('table.pick')} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} className="pcfg-empty">
                    {t('table.empty')}
                  </td>
                </tr>
              ) : (
                rows.map((v) => (
                  <tr key={v.id} className={current?.id === v.id ? 'pcfg-sel' : undefined} onClick={() => pick(v)}>
                    {cols.map((c) => (
                      <td key={c.key} className={`${c.hidden ? 'pcfg-kc' : ''} ${c.left ? 'pcfg-left' : ''} ${c.key === 'code' ? 'pcfg-td-code' : ''}`.trim() || undefined}>
                        {cell(c, v)}
                      </td>
                    ))}
                    <td>
                      <button type="button" className="pcfg-pick" onClick={(e) => { e.stopPropagation(); pick(v); }} aria-label={`${t('table.pick')}: ${v.sizeLabel}`}>
                        {t('table.pick')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{L(options.tableNote, draw === 'box' ? t('table.note') : t('table.noteGeneric'))}</p>
      </section>
    </div>
  );
}
