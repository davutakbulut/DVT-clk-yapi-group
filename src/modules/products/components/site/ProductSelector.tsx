'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useBasket } from '@/modules/quote-basket';
import { Button } from '@/ui/Button';
import { cornerRadii, findVariant, fmt, groupsOf, normSearch, PROP_KEYS, PROP_UNITS, sizeKey, sizesOf, thicknessesOf, weightOf, type ProductOptions, type PropKey, type SelectableVariant } from '../../domain/productConfig';

interface Props {
  readonly productId: string;
  readonly slug: string;
  readonly name: string;
  readonly variants: readonly SelectableVariant[];
  readonly options: ProductOptions;
  readonly unit: string;
}

type SortKey = 'code' | 'size' | 't' | 'kg' | 'bar6' | 'u' | PropKey;

/**
 * Ürün seçici (K-88, prototip kutu-profil.html): kesit çizimi + seçim paneli (grup → ölçü → et → kalite → boy → adet),
 * ağırlık hesabı, kesit değerleri, teklif sepetine ekleme; altında filtrelenip sıralanan ölçü tablosu (satır tıklanınca
 * seçime aktarılır). Yerel <select>/<button>'lar; ağır kütüphane yok. Tüm metin next-intl'den, veri DB'den.
 */
export function ProductSelector({ productId, slug, name, variants, options, unit }: Props) {
  const t = useTranslations('Products');
  const format = useFormatter();
  const basket = useBasket();
  const id = useId();
  const cfgRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupsOf(variants), [variants]);
  const [group, setGroup] = useState<string | null>(groups[0] ?? null);
  const sizes = useMemo(() => sizesOf(variants, group), [variants, group]);
  const [size, setSize] = useState<string>(sizes[0] ?? '');
  const thicknesses = useMemo(() => thicknessesOf(variants, group, size), [variants, group, size]);
  const [thickness, setThickness] = useState<number | null>(thicknesses[0] ?? null);
  const [grade, setGrade] = useState(options.grades[0] ?? '');
  const [lengthChoice, setLengthChoice] = useState<string>(options.lengthsM[0] !== undefined ? String(options.lengthsM[0]) : options.customLength ? 'custom' : '');
  const [customLength, setCustomLength] = useState('3');
  const [qty, setQty] = useState('10');
  const [toast, setToast] = useState('');
  const [showProps, setShowProps] = useState(false);
  const [query, setQuery] = useState('');
  const [tableGroup, setTableGroup] = useState<string | null>(null);
  const [tableT, setTableT] = useState<number | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  // Grup/ölçü değişince alt seçimler geçerli kalsın
  useEffect(() => {
    if (!sizes.includes(size)) setSize(sizes[0] ?? '');
  }, [sizes, size]);
  useEffect(() => {
    if (thickness === null ? thicknesses.length > 0 : !thicknesses.includes(thickness)) setThickness(thicknesses.includes(3) ? 3 : (thicknesses[Math.floor(thicknesses.length / 2)] ?? null));
  }, [thicknesses, thickness]);

  const current = findVariant(variants, group, size, thickness);
  const fixedLengthM = current?.lengthMm ? current.lengthMm / 1000 : null;
  const lengthM = fixedLengthM ?? (lengthChoice === 'custom' ? Math.max(0, Number(customLength.replace(',', '.')) || 0) : Number(lengthChoice) || 0);
  const quantity = Math.max(1, Math.floor(Number(qty) || 1));
  const w = weightOf(current?.kgPerM ?? null, lengthM, quantity);
  const hasLengthChoice = fixedLengthM === null && (options.lengthsM.length > 0 || options.customLength);
  const n = (v: number, d = 2) => format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d });
  const totalText = w.total === null ? '—' : w.total >= 1000 ? `${n(w.total / 1000)} t` : `${n(w.total, 0)} kg`;
  const label = current ? current.sizeLabel : '';
  const attrs = useMemo(() => {
    const a: Record<string, string | number> = {};
    if (grade) a['grade'] = grade;
    if (lengthM > 0) a['length_m'] = Math.round(lengthM * 100) / 100;
    if (current?.kgPerM) a['kg_per_m'] = current.kgPerM;
    if (w.total !== null) a['total_kg'] = Math.round(w.total * 10) / 10;
    return a;
  }, [grade, lengthM, current, w.total]);

  const add = () => {
    if (!current) return;
    if (hasLengthChoice && lengthChoice === 'custom' && !(lengthM > 0)) {
      setToast(t('cfg.customInvalid'));
      return;
    }
    basket.add({ productId, variantId: current.id, slug, name, variantLabel: current.sizeLabel, stockCode: current.stockCode, quantity, unit, note: '', attributes: attrs, weightKg: w.total });
    setToast(t('cfg.added', { label: current.sizeLabel, qty: quantity, unit }));
  };
  const pick = (v: SelectableVariant) => {
    setGroup(v.group);
    setSize(sizeKey(v));
    setThickness(v.thicknessMm);
    setToast('');
    cfgRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  // Tablo
  const allT = useMemo(() => [...new Set(variants.map((v) => v.thicknessMm).filter((x): x is number => x !== null))].sort((a, b) => a - b), [variants]);
  const anyProps = variants.some((v) => Object.keys(v.props).length > 0);
  const anyBar = variants.some((v) => v.kgPerM !== null);
  const rows = useMemo(() => {
    let list = variants.filter((v) => (tableGroup === null || v.group === tableGroup) && (tableT === null || v.thicknessMm === tableT));
    const q = normSearch(query.trim());
    if (q) list = list.filter((v) => normSearch(`${v.heightMm ?? ''}x${v.widthMm ?? ''}x${v.thicknessMm ?? ''}`).includes(q) || normSearch(v.sizeLabel).includes(q) || (v.stockCode ?? '').toLocaleLowerCase('en-US').includes(q));
    if (sort) {
      const val = (v: SelectableVariant): number | string => {
        switch (sort.key) {
          case 'code':
            return v.stockCode ?? '';
          case 'size':
            return (v.heightMm ?? 0) * 1e6 + (v.widthMm ?? 0) * 1e3 + (v.thicknessMm ?? 0);
          case 't':
            return v.thicknessMm ?? 0;
          case 'kg':
          case 'bar6':
            return v.kgPerM ?? 0;
          default:
            return v.props[sort.key] ?? 0;
        }
      };
      list = [...list].sort((a, b) => {
        const x = val(a);
        const y = val(b);
        return sort.dir * (typeof x === 'string' || typeof y === 'string' ? String(x).localeCompare(String(y), 'tr') : x - y);
      });
    }
    return list;
  }, [variants, tableGroup, tableT, query, sort]);
  const toggleSort = (key: SortKey) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const ariaSort = (key: SortKey) => (sort?.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined);
  const propCols: PropKey[] = ['A', 'Ix', 'Iy', 'Wx', 'Wy', 'ix', 'iy'];

  return (
    <div className="grid gap-12">
      <div ref={cfgRef} className="pcfg" aria-label={t('cfg.title')}>
        <div className="pcfg-draw">
          <div className="pcfg-code" aria-live="polite">
            <span>{t('cfg.selected')}</span>
            <b data-testid="pcfg-code">{current?.stockCode ?? label}</b>
          </div>
          {current ? <SectionDrawing v={current} label={t('cfg.drawing', { label })} /> : null}
          <div className="pcfg-draw-meta">
            {current?.thicknessMm && current.widthMm && current.heightMm ? <span>{t('cfg.radii', { ro: fmt(cornerRadii(current.thicknessMm).outer), ri: fmt(cornerRadii(current.thicknessMm).inner) })}</span> : <span />}
            <span className="pcfg-draw-scale">{t('cfg.section', { label })}</span>
          </div>
        </div>
        <div className="pcfg-panel">
          {groups.length > 1 ? (
            <div className="pcfg-field">
              <span className="pcfg-lbl">{t('cfg.group')}</span>
              <div className="pcfg-seg" role="group" aria-label={t('cfg.group')}>
                {groups.map((g) => (
                  <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="pcfg-field">
            <label htmlFor={`${id}-size`}>{t('cfg.size')}</label>
            <select id={`${id}-size`} value={size} onChange={(e) => setSize(e.target.value)} className="field" aria-describedby={`${id}-size-hint`}>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span id={`${id}-size-hint`} className="pcfg-hint">
              {t('cfg.sizeHint')}
            </span>
          </div>
          {thicknesses.length > 0 ? (
            <div className="pcfg-field">
              <span className="pcfg-lbl" id={`${id}-t`}>
                {t('cfg.thickness')}
              </span>
              <div className="pcfg-chips" role="group" aria-labelledby={`${id}-t`}>
                {thicknesses.map((tv) => (
                  <button key={tv} type="button" aria-pressed={thickness === tv} onClick={() => setThickness(tv)}>
                    {fmt(tv)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="pcfg-row3">
            {options.grades.length > 0 ? (
              <div className="pcfg-field">
                <label htmlFor={`${id}-grade`}>{t('cfg.grade')}</label>
                <select id={`${id}-grade`} value={grade} onChange={(e) => setGrade(e.target.value)} className="field">
                  {options.grades.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
            ) : null}
            {hasLengthChoice ? (
              <div className="pcfg-field">
                <label htmlFor={`${id}-len`}>{t('cfg.length')}</label>
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
          {hasLengthChoice && lengthChoice === 'custom' ? (
            <div className="pcfg-field">
              <label htmlFor={`${id}-clen`}>{t('cfg.customLength')}</label>
              <input id={`${id}-clen`} type="number" min={0.1} step={0.1} inputMode="decimal" value={customLength} onChange={(e) => setCustomLength(e.target.value)} className="field" />
            </div>
          ) : null}
          <dl className="pcfg-result" aria-live="polite">
            <div>
              <dt>{t('cfg.unitWeight')}</dt>
              <dd>
                <b>{current?.kgPerM ? n(current.kgPerM) : '—'}</b>kg/m
              </dd>
            </div>
            <div>
              <dt>{t('cfg.perBar')}</dt>
              <dd>
                <b>{w.perBar === null ? '—' : n(w.perBar)}</b>kg
              </dd>
            </div>
            <div className="pcfg-total">
              <dt>{t('cfg.total')}</dt>
              <dd>
                <b data-testid="pcfg-total">{totalText}</b>
              </dd>
            </div>
          </dl>
          {current && !current.kgPerM ? <p className="pcfg-hint">{t('cfg.noWeight')}</p> : null}
          {current && Object.keys(current.props).length > 0 ? (
            <details className="pcfg-props">
              <summary>{t('cfg.props')}</summary>
              <div className="pcfg-pgrid">
                {PROP_KEYS.filter((k) => current.props[k] !== undefined).map((k) => (
                  <div key={k}>
                    {k === 'u' ? t('cfg.paintArea') : k} ({PROP_UNITS[k]})<b>{n(current.props[k]!, k === 'u' ? 3 : 2)}</b>
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
                  {g}
                </button>
              ))}
            </div>
          ) : null}
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('table.search')} aria-label={t('table.search')} className="field max-w-60" />
          {anyProps ? (
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
                <th scope="col" aria-sort={ariaSort('code')}>
                  <button type="button" onClick={() => toggleSort('code')}>{t('table.code')}</button>
                </th>
                <th scope="col" aria-sort={ariaSort('size')}>
                  <button type="button" onClick={() => toggleSort('size')}>{t('table.size')}</button>
                </th>
                {allT.length > 0 ? (
                  <th scope="col" aria-sort={ariaSort('t')}>
                    <button type="button" onClick={() => toggleSort('t')}>{t('table.t')}</button>
                  </th>
                ) : null}
                {anyBar ? (
                  <>
                    <th scope="col" aria-sort={ariaSort('kg')}>
                      <button type="button" onClick={() => toggleSort('kg')}>{t('table.kgPerM')}</button>
                    </th>
                    <th scope="col" aria-sort={ariaSort('bar6')}>
                      <button type="button" onClick={() => toggleSort('bar6')}>{t('table.bar6')}</button>
                    </th>
                  </>
                ) : null}
                {anyProps
                  ? propCols.map((k) => (
                      <th key={k} scope="col" className="pcfg-kc" aria-sort={ariaSort(k)}>
                        <button type="button" onClick={() => toggleSort(k)}>
                          {k} ({PROP_UNITS[k]})
                        </button>
                      </th>
                    ))
                  : null}
                {anyProps ? (
                  <th scope="col" aria-sort={ariaSort('u')}>
                    <button type="button" onClick={() => toggleSort('u')}>{t('table.paint')}</button>
                  </th>
                ) : null}
                <th scope="col" aria-label={t('table.pick')} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={20} className="pcfg-empty">
                    {t('table.empty')}
                  </td>
                </tr>
              ) : (
                rows.map((v) => (
                  <tr key={v.id} className={current?.id === v.id ? 'pcfg-sel' : undefined} onClick={() => pick(v)}>
                    <td className="pcfg-td-code">{v.stockCode ?? '—'}</td>
                    <td>{v.heightMm !== null && v.widthMm !== null ? `${fmt(v.heightMm)} × ${fmt(v.widthMm)}` : v.sizeLabel}</td>
                    {allT.length > 0 ? <td>{v.thicknessMm === null ? '—' : fmt(v.thicknessMm)}</td> : null}
                    {anyBar ? (
                      <>
                        <td>{v.kgPerM === null ? '—' : n(v.kgPerM)}</td>
                        <td>{v.kgPerM === null ? '—' : n(v.kgPerM * 6)}</td>
                      </>
                    ) : null}
                    {anyProps ? propCols.map((k) => <td key={k} className="pcfg-kc">{v.props[k] === undefined ? '—' : n(v.props[k]!)}</td>) : null}
                    {anyProps ? <td>{v.props.u === undefined ? '—' : n(v.props.u, 3)}</td> : null}
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
        {anyBar ? <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t('table.note')}</p> : null}
      </section>
    </div>
  );
}

function rrect(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
}

/** Kesit çizimi: dikdörtgen/kare kutu (H×B×t, TS EN 10219 köşeleri) ya da boru (yalnız B×t); ölçü okları ve eksenler. */
function SectionDrawing({ v, label }: { readonly v: SelectableVariant; readonly label: string }) {
  const W = 520;
  const Hh = 420;
  const cx = W / 2;
  const cy = Hh / 2 + 6;
  const box = 250;
  const B = v.widthMm ?? 0;
  const H = v.heightMm ?? B;
  const tt = v.thicknessMm ?? 0;
  if (!B) return <div className="pcfg-svg pcfg-svg-empty" aria-hidden="true" />;
  const s = box / Math.max(H, B);
  const w = B * s;
  const h = H * s;
  const th = Math.max(tt * s, 1.2);
  const x = cx - w / 2;
  const y = cy - h / 2;
  const dimY = y + h + 34;
  const dimX = x - 34;
  const circle = v.heightMm === null;
  const { outer, inner } = cornerRadii(tt || 1);
  const R = circle ? w / 2 : outer * s;
  const Ri = circle ? Math.max(w / 2 - th, 0) : Math.max(inner * s, 0);
  const ty = y + Math.min(h * 0.3, h / 2 - R - 4) + R;
  const tx = x + w;
  const mk = 'var(--pcfg-mark)';
  const st = 'var(--pcfg-steel)';
  const tick = (xx: number, yy: number) => <path d={`M${xx - 5},${yy + 5}L${xx + 5},${yy - 5}`} stroke={mk} strokeWidth="1.5" />;
  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} className="pcfg-svg" role="img" aria-label={label}>
      <line x1={cx} y1={y - 30} x2={cx} y2={y + h + 14} stroke={st} strokeOpacity=".5" strokeDasharray="14 4 2 4" />
      <line x1={x - 14} y1={cy} x2={x + w + 30} y2={cy} stroke={st} strokeOpacity=".5" strokeDasharray="14 4 2 4" />
      <text x={x + w + 34} y={cy + 4} fill={st} className="pcfg-svg-axis">x</text>
      <text x={cx + 6} y={y - 32} fill={st} className="pcfg-svg-axis">y</text>
      <path d={`${rrect(x, y, w, h, R)} ${rrect(x + th, y + th, w - 2 * th, h - 2 * th, Ri)}`} fillRule="evenodd" fill="#DCE4EF" fillOpacity=".92" stroke="#fff" strokeWidth="1" />
      <line x1={x} y1={y + h + 6} x2={x} y2={dimY + 8} stroke={mk} strokeOpacity=".6" />
      <line x1={x + w} y1={y + h + 6} x2={x + w} y2={dimY + 8} stroke={mk} strokeOpacity=".6" />
      <line x1={x} y1={dimY} x2={x + w} y2={dimY} stroke={mk} strokeWidth="1.2" />
      {tick(x, dimY)}
      {tick(x + w, dimY)}
      <text x={cx} y={dimY + 22} textAnchor="middle" fill={mk} className="pcfg-svg-dim">{circle ? `D = ${fmt(B)}` : `B = ${fmt(B)}`}</text>
      {!circle ? (
        <>
          <line x1={x - 6} y1={y} x2={dimX - 8} y2={y} stroke={mk} strokeOpacity=".6" />
          <line x1={x - 6} y1={y + h} x2={dimX - 8} y2={y + h} stroke={mk} strokeOpacity=".6" />
          <line x1={dimX} y1={y} x2={dimX} y2={y + h} stroke={mk} strokeWidth="1.2" />
          {tick(dimX, y)}
          {tick(dimX, y + h)}
          <text x={dimX - 12} y={cy} textAnchor="middle" fill={mk} className="pcfg-svg-dim" transform={`rotate(-90 ${dimX - 12} ${cy})`}>{`H = ${fmt(H)}`}</text>
        </>
      ) : null}
      {tt ? (
        <>
          <line x1={tx + 46} y1={ty} x2={tx - th} y2={ty} stroke={mk} strokeWidth="1" />
          <circle cx={tx - th / 2} cy={ty} r="2.2" fill={mk} />
          <text x={tx + 50} y={ty + 4} fill={mk} className="pcfg-svg-dim">{`t = ${fmt(tt)}`}</text>
        </>
      ) : null}
    </svg>
  );
}
