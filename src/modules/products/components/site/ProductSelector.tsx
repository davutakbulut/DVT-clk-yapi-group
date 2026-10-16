'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { pickLocale } from '@/lib/localized';
import { useBasket } from '@/modules/quote-basket';
import { Button } from '@/ui/Button';
import {
  areaCalc, cornerRadii, dimText, DRAWS_3D, extraOptions, familiesOf, familyLabel, familyOf, findVariant, fmt, formatsFor, galvanizeExtraKg, gradesFor, groupInfo, groupLabel, groupsOf, isPlateDraw,
  normSearch, plateWeightOf, propDecimals, PROP_UNITS, SECTION_PROP_KEYS, sizeKey, sizesOf, SURFACE_SWATCH, surfacesFor, thicknessesOf, variantVisible, weightOf,
  type DrawKind, type ProductOptions, type PropKey, type SelectableVariant, type SurfaceKey,
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
  /** K-114: çizim panelinde gösterilecek ürün görseli (options.drawingPhoto). */
  readonly photo?: { readonly src: string; readonly srcSet: string; readonly alt: string } | null;
}

type Col = { readonly key: string; readonly label: string; readonly hidden?: boolean; readonly value: (v: SelectableVariant) => number | string | null; readonly decimals?: number | ((x: number) => number); readonly left?: boolean };

/**
 * Ürün seçici (K-88 → K-90, örnek sayfaların motoru): kesit çizimi (2B, tıklayınca 3B) + seçim paneli
 * (grup → ölçü → kalınlık → yüzey → kalite → boy/plaka ebadı → adet), ağırlık hesabı, kesit değerleri, teklif sepeti;
 * altında kesit türüne göre sütunlanan, filtrelenip sıralanan ölçü tablosu (satır → seçim). Tüm metin next-intl, tüm veri DB.
 */
export function ProductSelector({ productId, slug, name, locale, variants, options, unit, photo = null }: Props) {
  const t = useTranslations('Products');
  const format = useFormatter();
  const basket = useBasket();
  const id = useId();
  const cfgRef = useRef<HTMLDivElement>(null);
  const draw: DrawKind = options.draw ?? (variants.some((v) => v.heightMm === null && v.widthMm !== null && v.dims['D'] !== undefined) ? 'pipe' : 'box');
  const plate = isPlateDraw(draw);
  const L = (text: Parameters<typeof pickLocale>[0], fallback: string) => pickLocale(text, locale) || fallback;

  // K-114: aile (çelik hasır Q/R/TR, inşaat demiri nervürlü/kangal) → grup → ölçü → varyant
  const families = useMemo(() => familiesOf(variants, options), [variants, options]);
  const [family, setFamily] = useState<string | null>(() => (options.defaultFamily && families.includes(options.defaultFamily) ? options.defaultFamily : (families[0] ?? null)));
  const famVariants = useMemo(() => (family === null ? variants : variants.filter((v) => familyOf(v) === family)), [variants, family]);
  const groups = useMemo(() => groupsOf(famVariants, options), [famVariants, options]);
  const firstGroup = (list: readonly string[], fam: string | null) => {
    const pref = (fam !== null && options.defaultGroupByFamily[fam]) || options.defaultGroup;
    return pref && list.includes(pref) ? pref : (list[0] ?? null);
  };
  const [group, setGroup] = useState<string | null>(() => firstGroup(groups, family));
  const sizes = useMemo(() => sizesOf(variants, group, family), [variants, group, family]);
  const firstSize = (list: readonly string[]) => (options.defaultSize && list.includes(options.defaultSize) ? options.defaultSize : (list[Math.min(list.length - 1, Math.floor(list.length / 3))] ?? ''));
  const [size, setSize] = useState<string>(() => firstSize(sizes));
  const showV = variantVisible(options, family);
  const thicknesses = useMemo(() => (showV ? thicknessesOf(variants, group, size, plate, family) : []), [showV, variants, group, size, plate, family]);
  const [thickness, setThickness] = useState<number | null>(thicknesses[Math.floor(thicknesses.length / 2)] ?? null);
  const surfaces = surfacesFor(options, group);
  const [surface, setSurface] = useState<SurfaceKey>(surfaces[0] ?? 'black');
  const grades = useMemo(() => (options.hideGrade ? [] : gradesFor(options, group, family)), [options, group, family]);
  const [grade, setGrade] = useState(grades[0] ?? '');
  const extras = options.extras.filter((e) => !e.family || e.family === family);
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const formats = formatsFor(options, group);
  const gInfo = groupInfo(options, group);
  const areaMode = options.palletMode && Boolean(gInfo?.area);
  const quoteOnly = Boolean(gInfo?.quoteOnly);
  const swatch = (group !== null && options.swatches[group]) || null;
  const has3d = DRAWS_3D.includes(draw) && !swatch;
  const [showPhoto, setShowPhoto] = useState(Boolean(photo && options.drawingPhoto));
  const [lengthChoice, setLengthChoice] = useState<string>(() => (plate ? (formats[0] ? `${formats[0].w}x${formats[0].l}` : 'custom') : options.lengthsM[0] !== undefined ? String(options.lengthsM[0]) : options.customLength ? 'custom' : ''));
  const [customLength, setCustomLength] = useState('3');
  const [customW, setCustomW] = useState('1000');
  const [customL, setCustomL] = useState('2000');
  const qtyDefault = (area: boolean) => String(area ? (options.areaDefault ?? 10) : (options.qtyDefault ?? (plate ? 2 : 10)));
  const [qty, setQty] = useState(() => qtyDefault(areaMode));
  const [view3d, setView3d] = useState(false);
  const [toast, setToast] = useState('');
  const [showProps, setShowProps] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false); // mobil: ikon → giriş açılır (K-93)
  const [tableGroup, setTableGroup] = useState<string | null>(null);
  const [tableT, setTableT] = useState<number | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  // Aile/grup/ölçü değişince alt seçimler geçerli kalsın
  useEffect(() => {
    if (group === null ? groups.length > 0 : !groups.includes(group)) setGroup(firstGroup(groups, family));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- firstGroup yalnız options'a bağlı
  }, [groups, group, family]);
  useEffect(() => {
    if (!plate && !sizes.includes(size)) setSize(firstSize(sizes));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- firstSize yalnız options'a bağlı
  }, [sizes, size, plate]);
  useEffect(() => {
    setQty(qtyDefault(areaMode));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız alan modu değişince varsayılan miktar
  }, [areaMode]);
  useEffect(() => {
    setExtraValues((prev) => {
      const next: Record<string, string> = {};
      for (const e of extras) { const list = extraOptions(e, group); next[e.id] = prev[e.id] && list.includes(prev[e.id]!) ? prev[e.id]! : (list[0] ?? ''); }
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extras options'tan türer
  }, [group, family, options.extras]);
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

  // Tablodan seçilen satır, aynı grup/ölçü/varyanttaki ikizine (ör. Q589 iki göz ölçüsü) kaymasın
  const [pickedId, setPickedId] = useState<string | null>(null);
  const found = findVariant(variants, group, size, showV ? thickness : null, plate, family);
  const picked = pickedId ? (variants.find((v) => v.id === pickedId) ?? null) : null;
  const current = picked && found && picked.group === found.group && familyOf(picked) === familyOf(found) && (plate || sizeKey(picked) === sizeKey(found)) && picked.thicknessMm === found.thicknessMm ? picked : found;
  const n = (v: number, d = 2) => format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d });
  const areaM2 = Math.max(0, Number(qty.replace(',', '.')) || 0);
  const quantity = Math.max(1, Math.floor(Number(qty) || 1));
  // Boy (m) ya da plaka ebadı (mm)
  const fixedLengthM = current?.lengthMm ? current.lengthMm / 1000 : null;
  const lengthM = fixedLengthM ?? (lengthChoice === 'custom' ? Math.max(0, Number(customLength.replace(',', '.')) || 0) : Number(lengthChoice) || 0);
  const fmtSel = useMemo(() => (plate ? (lengthChoice === 'custom' ? { w: Math.max(0, Number(customW) || 0), l: Math.max(0, Number(customL) || 0) } : (formats.find((f) => `${f.w}x${f.l}` === lengthChoice) ?? null)) : null), [plate, lengthChoice, customW, customL, formats]);
  const bar = plate ? null : weightOf(current?.kgPerM ?? null, lengthM, quantity);
  const sheet = plate ? plateWeightOf(current?.kgPerM2 ?? null, fmtSel?.w ?? 0, fmtSel?.l ?? 0, quantity) : null;
  const unitWeight = plate ? (current?.kgPerM2 ?? null) : (current?.kgPerM ?? null);
  const perOne = plate ? (sheet?.perSheet ?? null) : (bar?.perBar ?? null);
  const area = areaMode ? areaCalc({ areaM2, faceM2: fmtSel && fmtSel.w > 0 && fmtSel.l > 0 ? (fmtSel.w * fmtSel.l) / 1e6 : 0, perPallet: typeof current?.dims['palet'] === 'number' ? (current.dims['palet'] as number) : null, kgPerM2: current?.kgPerM2 ?? null }) : null;
  const total = area ? area.weight : plate ? (sheet?.total ?? null) : (bar?.total ?? null);
  const per = plate ? (sheet?.areaM2 ?? 0) : lengthM;
  const hasLengthChoice = !plate && fixedLengthM === null && (options.lengthsM.length > 0 || options.customLength);
  const totalText = total === null ? '—' : total >= 1000 ? `${n(total / 1000)} t` : `${n(total, 0)} kg`;
  const galvKg = surface === 'galv' && surfaces.length && !(plate && group === 'GLV') && per > 0 ? galvanizeExtraKg({ draw, paintAreaM2PerM: current?.props.u ?? null, per, qty: quantity }) : 0;
  const coverM2 = current?.props.we && per > 0 ? (current.props.we / 1000) * per * quantity : null;
  const gLabel = (code: string | null) => groupLabel(options, code, locale);
  const label = current ? current.sizeLabel : '';
  const pattern: 'tear' | 'dia' | null = options.pattern === 'tear' ? 'tear' : group === 'BKL' ? 'dia' : null;
  const formatText = fmtSel ? `${fmtSel.w}×${fmtSel.l} mm` : '';
  const extraText = extras.map((e) => extraValues[e.id]).filter(Boolean).join(' · ');
  const faceColor = (grade && options.ralColors[grade]) || swatch;
  const ribs = /^\s*3/.test(extraValues['hadve'] ?? '') ? 3 : 5;

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
    if (area && current?.kgPerM2) { a['area_m2'] = 1; /* alan modunda miktar = duvar m²; ağırlık = kg/m² (yüzey) × m² */ }
    const spec = [extraText, area ? t('cfg.areaSpec', { area: format.number(areaM2, { maximumFractionDigits: 1 }), pieces: area.pieces, pallets: area.pallets ?? '—' }) : ''].filter(Boolean).join(' · ');
    if (spec) a['spec'] = spec.slice(0, 200);
    if (total !== null) a['total_kg'] = Math.round(total * 10) / 10;
    return a;
  }, [grade, surfaces.length, surface, plate, fmtSel, current, lengthM, total, t, extraText, area, areaM2, format]);

  const add = () => {
    if (!current || quoteOnly) return;
    if (plate ? !(fmtSel && fmtSel.w > 0 && fmtSel.l > 0) : hasLengthChoice && lengthChoice === 'custom' && !(lengthM > 0)) {
      setToast(t(plate ? 'cfg.customFormatInvalid' : 'cfg.customInvalid'));
      return;
    }
    if (areaMode) {
      if (!(areaM2 > 0)) { setToast(t('cfg.areaInvalid')); return; }
      const q = Math.round(areaM2 * 10) / 10;
      basket.add({ productId, variantId: current.id, slug, name, variantLabel: current.sizeLabel, stockCode: current.stockCode, quantity: q, unit: 'm²', note: '', attributes: attrs, weightKg: total });
      setToast(t('cfg.added', { label: current.sizeLabel, qty: n(q, 1), unit: 'm²' }));
      return;
    }
    basket.add({ productId, variantId: current.id, slug, name, variantLabel: current.sizeLabel, stockCode: current.stockCode, quantity, unit, note: '', attributes: attrs, weightKg: total });
    setToast(t('cfg.added', { label: current.sizeLabel, qty: quantity, unit }));
  };
  const changeFamily = (f: string) => {
    setFamily(f);
    setTableGroup(null);
    setTableT(null);
  };
  const pick = (v: SelectableVariant) => {
    const f = familyOf(v);
    if (f !== null) setFamily(f);
    setPickedId(v.id);
    setGroup(v.group);
    setSize(sizeKey(v));
    setThickness(v.thicknessMm);
    setToast('');
    cfgRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  // ── Tablo: kesit türüne göre sütunlar
  const allT = useMemo(() => (showV ? [...new Set(famVariants.map((v) => v.thicknessMm).filter((x): x is number => x !== null))].sort((a, b) => a - b) : []), [famVariants, showV]);
  const suffix = options.variantSuffix ?? ' mm';
  const propKeys = useMemo(() => SECTION_PROP_KEYS.filter((k) => variants.some((v) => v.props[k] !== undefined)), [variants]);
  const anyBar = variants.some((v) => v.kgPerM !== null);
  const anyM2 = variants.some((v) => v.kgPerM2 !== null);
  const anyU = variants.some((v) => v.props.u !== undefined);
  const L0 = options.lengthsM[0] ?? 6;
  const plateCols = useMemo(() => (plate ? formatsFor(options, groups[0] ?? null).slice(0, 3) : []), [plate, options, groups]);
  const cols = useMemo<Col[]>(() => {
    // K-114: örnek sayfanın açık sütun tanımı varsa o (yapı malzemeleri); yoksa kesit türüne göre türetilir (K-90)
    if (options.cols.length) {
      const strKeys = ['k', 's', 'lbl', 'dim', '_g', '_i'];
      return options.cols.map((oc): Col => {
        const key = oc.key;
        const value = (v: SelectableVariant): number | string | null => {
          switch (key) {
            case 'k': return v.stockCode ?? '';
            case 'v': return v.thicknessMm;
            case 's': return sizeKey(v);
            case 'lbl': return v.sizeLabel;
            case 'kg': return v.kgPerM;
            case 'kgm2': return v.kgPerM2;
            case '_g': return gLabel(v.group);
            case '_i': return dimText(v, draw);
            case '_bar': return v.kgPerM === null ? null : v.kgPerM * L0;
            default: {
              const dk = key.startsWith('d.') ? key.slice(2) : key;
              const x = v.dims[dk] ?? (v.props as Record<string, number | undefined>)[dk];
              return x === undefined ? null : x;
            }
          }
        };
        const label = key === '_bar' ? t('table.barN', { n: fmt(L0) }) : L(oc.label, key);
        return { key, label, value, decimals: oc.decimals ?? undefined, hidden: oc.hidden, left: strKeys.includes(key) || oc.decimals === null };
      });
    }
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
    let list = famVariants.filter((v) => (tableGroup === null || v.group === tableGroup) && (tableT === null || v.thicknessMm === tableT));
    const q = normSearch(query.trim());
    if (q) list = list.filter((v) => [v.sizeLabel, v.stockCode ?? '', dimText(v, draw), sizeKey(v), `${v.heightMm ?? ''}x${v.widthMm ?? ''}x${v.thicknessMm ?? ''}`, String(v.dims['gozdim'] ?? '')].some((x) => normSearch(x).includes(q)));
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
  }, [famVariants, tableGroup, tableT, query, sort, cols, draw]);
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
      case 'plate':
      case 'sandwich': return t('cfg.drawMeta.plate', { group: gLabel(current.group), format: formatText });
      case 'block': return typeof D['note'] === 'string' ? D['note'] : '';
      case 'rebar': return t('cfg.drawMeta.rebar', { D: dn('D') });
      case 'mesh': {
        const p2 = typeof D['p2'] === 'number' ? (D['p2'] as number) : (D['p'] as number);
        const phi2 = typeof D['phi2'] === 'number' ? (D['phi2'] as number) : (D['phi'] as number);
        return phi2 !== D['phi'] ? t('cfg.drawMeta.meshDiff', { phi: dn('phi'), p: dn('p'), phi2: fmt(phi2), p2: fmt(p2) }) : t('cfg.drawMeta.mesh', { p: dn('p'), p2: fmt(p2), phi: dn('phi') });
      }
    }
  };
  const drawRight = current ? (draw === 'plate' || draw === 'sandwich' || draw === 'trap' ? (current.kgPerM2 !== null ? `${n(current.kgPerM2)} kg/m²` : '') : dimText(current, draw)) : '';

  return (
    <div className="grid gap-12">
      <div ref={cfgRef} className="pcfg" aria-label={t('cfg.title')}>
        <div className="pcfg-draw">
          <div className="pcfg-code" aria-live="polite">
            <span>{t('cfg.selected')}</span>
            <b data-testid="pcfg-code">{current?.stockCode ?? label}</b>
          </div>
          {photo && options.drawingPhoto ? (
            <div className="pcfg-vt" role="group" aria-label={t('cfg.viewLabel')}>
              <button type="button" aria-pressed={showPhoto} onClick={() => setShowPhoto(true)}>{t('cfg.photo')}</button>
              <button type="button" aria-pressed={!showPhoto} onClick={() => setShowPhoto(false)}>{t('cfg.sectionView')}</button>
            </div>
          ) : has3d ? (
            <div className="pcfg-vt" role="group" aria-label={t('viewer3d.label')}>
              <button type="button" aria-pressed={!view3d} onClick={() => setView3d(false)}>{t('viewer3d.v2d')}</button>
              <button type="button" aria-pressed={view3d} onClick={() => setView3d(true)}>{t('viewer3d.v3d')}</button>
            </div>
          ) : null}
          {photo && options.drawingPhoto && showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
            <img className="pcfg-photo" src={photo.src} srcSet={photo.srcSet} sizes="(min-width: 1024px) 50vw, 100vw" alt={photo.alt} decoding="async" />
          ) : current ? (
            view3d && has3d ? (
              <ProductViewer3D v={current} draw={draw} surface={surface} pattern={pattern} format={fmtSel && fmtSel.w > 0 && fmtSel.l > 0 ? fmtSel : null} grade={grade} />
            ) : (
              <SectionDrawing v={current} draw={draw} label={t('cfg.drawing', { label })} format={fmtSel && fmtSel.w > 0 && fmtSel.l > 0 ? fmtSel : null} pattern={pattern} groupCode={group} dimLabels={{ we: t('cfg.dimLabels.we'), p: t('cfg.dimLabels.p'), w: t('cfg.dimLabels.w'), meshP: t('cfg.dimLabels.meshP'), meshP2: t('cfg.dimLabels.meshP2'), meshPhi: t('cfg.dimLabels.meshPhi') }} look={{ face: faceColor, core: (group !== null && options.coreColors[group]) || null, corrugated: options.corrugated, ribs }} />
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
          {families.length > 1 ? (
            <div className="pcfg-field">
              <span className="pcfg-lbl">{L(options.familyLabel, t('cfg.family'))}</span>
              <div className="pcfg-seg" role="group" aria-label={L(options.familyLabel, t('cfg.family'))}>
                {families.map((f) => (
                  <button key={f} type="button" aria-pressed={family === f} onClick={() => changeFamily(f)}>
                    {familyLabel(options, f, locale)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {groups.length > 1 || (groups.length === 1 && options.palletMode) ? (
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
                  <button key={s} type="button" aria-pressed={surface === s} onClick={() => { setSurface(s); setView3d(true); /* K-95: yüzey seçimi 3B'de görülsün (ürün sahibi) */ }}>
                    <i style={{ background: SURFACE_SWATCH[s] }} aria-hidden="true" />
                    {t(`cfg.surf.${s}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {extras.map((e) => {
            const list = extraOptions(e, group);
            const note = L(e.note, '');
            return (
              <div key={e.id} className="pcfg-field">
                <label htmlFor={`${id}-x-${e.id}`}>{L(e.label, e.id)}</label>
                <select id={`${id}-x-${e.id}`} value={extraValues[e.id] ?? list[0] ?? ''} onChange={(ev) => setExtraValues((p) => ({ ...p, [e.id]: ev.target.value }))} className="field">
                  {list.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                {note ? <p className="pcfg-note">{note}</p> : null}
              </div>
            );
          })}
          {grades.length > 0 && L(options.gradeNote, '') ? <p className="pcfg-note">{L(options.gradeNote, '')}</p> : null}
          {grades.length > 0 && Object.keys(options.ralColors).length > 0 ? (
            <div className="pcfg-field">
              <label htmlFor={`${id}-grade`}>{L(options.gradeLabel, t('cfg.grade2'))}</label>
              <div className="pcfg-grade-row">
                <select id={`${id}-grade`} value={grade} onChange={(e) => setGrade(e.target.value)} className="field">
                  {grades.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
                <span className="pcfg-swatch" style={{ background: faceColor ?? 'transparent' }} aria-hidden="true" />
              </div>
            </div>
          ) : null}
          <div className="pcfg-row3">
            {grades.length > 0 && Object.keys(options.ralColors).length === 0 ? (
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
            {!quoteOnly ? (
              <div className="pcfg-field">
                <label htmlFor={`${id}-qty`}>{areaMode ? t('cfg.areaQty') : `${t('cfg.quantity')} (${unit})`}</label>
                <input id={`${id}-qty`} type="number" min={areaMode ? 0.1 : 1} step={areaMode ? 0.1 : 1} inputMode={areaMode ? 'decimal' : 'numeric'} value={qty} onChange={(e) => setQty(e.target.value)} className="field" />
              </div>
            ) : null}
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
          {quoteOnly ? (
            <div className="pcfg-quotebox">
              <p>{L(options.quoteNote, t('cfg.quoteDefault'))}</p>
              <Button href={{ pathname: '/get-quote', query: { product: slug } } as never}>{t('cfg.quoteButton')}</Button>
            </div>
          ) : area ? (
            <>
              <dl className="pcfg-result" aria-live="polite">
                <div>
                  <dt>{t('cfg.perM2')}</dt>
                  <dd><b>{n(area.perM2, 1)}</b>{t('cfg.pcs')}</dd>
                </div>
                <div>
                  <dt>{t('cfg.piecesNeeded')}</dt>
                  <dd><b>{area.pieces}</b>{t('cfg.pcs')}</dd>
                </div>
                <div className="pcfg-total">
                  <dt>{t('cfg.palletsNeeded')}</dt>
                  <dd><b data-testid="pcfg-total">{area.pallets ?? '—'}</b>{area.pallets !== null ? t('cfg.pallet') : t('cfg.askQuote')}</dd>
                </div>
              </dl>
              {area.weight !== null ? <p className="pcfg-hint">{t('cfg.areaWeight', { kg: n(area.weight, 0) })}{typeof current?.dims['palet'] === 'number' ? t('cfg.perPallet', { n: current.dims['palet'] as number }) : ''}</p> : null}
            </>
          ) : (
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
          )}
          {current && unitWeight === null && !quoteOnly && !area ? <p className="pcfg-hint">{t('cfg.noWeight')}</p> : null}
          {galvKg > 0 ? <p className="pcfg-hint">{t('cfg.galvNote', { kg: n(galvKg, galvKg < 10 ? 1 : 0) })}</p> : null}
          {coverM2 !== null ? <p className="pcfg-hint">{t('cfg.coverArea', { m2: n(coverM2, 1) })}</p> : null}
          {current && (Object.keys(current.props).length > 0 || options.valueProps.some((p) => typeof current.dims[p.key] === 'number')) ? (
            <details className="pcfg-props">
              <summary>{options.valueProps.length ? t('cfg.values') : t('cfg.props')}</summary>
              <div className="pcfg-pgrid">
                {(Object.keys(PROP_UNITS) as PropKey[]).filter((k) => current.props[k] !== undefined).map((k) => (
                  <div key={k}>
                    {t(`cfg.propNames.${k}`)} ({PROP_UNITS[k]})<b>{n(current.props[k]!, propDecimals(k, current.props[k]!))}</b>
                  </div>
                ))}
                {options.valueProps.filter((p) => typeof current.dims[p.key] === 'number').map((p) => (
                  <div key={p.key}>
                    {L(p.label, p.key)} ({p.unit})<b>{n(current.dims[p.key] as number, p.decimals)}</b>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          {!quoteOnly ? (
            <div className="pcfg-add">
              <Button type="button" onClick={add}>
                {t('cfg.add')}
              </Button>
            </div>
          ) : null}
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
        <div className="pcfg-tools" data-search-open={searchOpen || query ? '' : undefined}>
          <button type="button" className="pcfg-search-toggle" aria-expanded={searchOpen || Boolean(query)} aria-controls={`${id}-search`} aria-label={t('table.searchToggle')} onClick={() => setSearchOpen((o) => !o)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
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
          <input id={`${id}-search`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('table.search')} aria-label={t('table.search')} className="field pcfg-search" />
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
                {fmt(tv)}
                {suffix}
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
