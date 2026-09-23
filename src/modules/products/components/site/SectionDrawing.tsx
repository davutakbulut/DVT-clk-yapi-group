'use client';

import { useId, type ReactNode } from 'react';
import { fmt, type Dims, type DrawKind, type SelectableVariant } from '../../domain/productConfig';

/** 2B kesit çizimi (K-90, örnek sayfaların draw() portu): ölçü okları, eksenler, kesit türüne göre dış hat. Koyu zemin, sabit teknik palet. */
const W = 520;
const H = 420;
const CX = 260;
const CY = 214;
const BOX = 250;
const MK = 'var(--pcfg-mark)';
const STC = 'var(--pcfg-steel)';
const FILL = '#DCE4EF';
const mx = (v: number, m: number) => Math.max(v, m);
const n = (d: Dims, k: string, fallback = 0): number => (typeof d[k] === 'number' ? (d[k] as number) : fallback);

export interface DrawingProps {
  readonly v: SelectableVariant;
  readonly draw: DrawKind;
  readonly label: string;
  /** Plaka: seçili ebat (mm). */
  readonly format?: { readonly w: number; readonly l: number } | null;
  readonly pattern?: 'tear' | 'dia' | null;
  readonly groupCode?: string | null;
  readonly dimLabels: { readonly we: string; readonly p: string; readonly w: string };
}

function Tx({ x, y, s, a = 'middle', rot = false, size = 14 }: { x: number; y: number; s: string; a?: 'middle' | 'start' | 'end'; rot?: boolean; size?: number }) {
  return (
    <text x={x} y={y} textAnchor={a} fill={MK} className="pcfg-svg-dim" fontSize={size} transform={rot ? `rotate(-90 ${x} ${y})` : undefined}>
      {s}
    </text>
  );
}
const Tick = ({ x, y }: { x: number; y: number }) => <path d={`M${x - 5},${y + 5}L${x + 5},${y - 5}`} stroke={MK} strokeWidth="1.5" />;
function DimH({ x0, x1, yRef, y, label }: { x0: number; x1: number; yRef: number; y: number; label: string }) {
  const up = y < yRef;
  return (
    <>
      <line x1={x0} y1={yRef + (up ? -5 : 5)} x2={x0} y2={y + (up ? -6 : 6)} stroke={MK} strokeOpacity=".6" />
      <line x1={x1} y1={yRef + (up ? -5 : 5)} x2={x1} y2={y + (up ? -6 : 6)} stroke={MK} strokeOpacity=".6" />
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={MK} strokeWidth="1.2" />
      <Tick x={x0} y={y} />
      <Tick x={x1} y={y} />
      <Tx x={(x0 + x1) / 2} y={up ? y - 10 : y + 22} s={label} />
    </>
  );
}
function DimV({ y0, y1, xRef, x, label }: { y0: number; y1: number; xRef: number; x: number; label: string }) {
  return (
    <>
      <line x1={xRef - 5} y1={y0} x2={x - 6} y2={y0} stroke={MK} strokeOpacity=".6" />
      <line x1={xRef - 5} y1={y1} x2={x - 6} y2={y1} stroke={MK} strokeOpacity=".6" />
      <line x1={x} y1={y0} x2={x} y2={y1} stroke={MK} strokeWidth="1.2" />
      <Tick x={x} y={y0} />
      <Tick x={x} y={y1} />
      <Tx x={x - 12} y={(y0 + y1) / 2} s={label} rot />
    </>
  );
}
function Call({ px, py, x2, label }: { px: number; py: number; x2: number; label: string }) {
  return (
    <>
      <line x1={x2} y1={py} x2={px} y2={py} stroke={MK} />
      <circle cx={px} cy={py} r="2.2" fill={MK} />
      <Tx x={x2 + 4} y={py + 4} s={label} a="start" />
    </>
  );
}
function Axes({ ax, ay, x0, y0, x1, y1 }: { ax: number; ay: number; x0: number; y0: number; x1: number; y1: number }) {
  return (
    <>
      <line x1={ax} y1={y0 - 26} x2={ax} y2={y1 + 14} stroke={STC} strokeOpacity=".5" strokeDasharray="14 4 2 4" />
      <line x1={x0 - 14} y1={ay} x2={x1 + 24} y2={ay} stroke={STC} strokeOpacity=".5" strokeDasharray="14 4 2 4" />
      <text x={x1 + 28} y={ay + 4} fill={STC} className="pcfg-svg-axis">x</text>
      <text x={ax + 6} y={y0 - 28} fill={STC} className="pcfg-svg-axis">y</text>
    </>
  );
}
const Shape = ({ d, evenOdd = false }: { d: string; evenOdd?: boolean }) => <path d={d} fillRule={evenOdd ? 'evenodd' : undefined} fill={FILL} fillOpacity=".92" stroke="#fff" strokeWidth="1" />;
export function rrect(x: number, y: number, w: number, h: number, r0: number): string {
  const r = Math.max(0, Math.min(r0, w / 2, h / 2));
  return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
}

/** Trapez/sinüs/kenet çizgi yolu — 2B ve 3B ortak nokta üretimi. */
export function trapPoints(D: Dims): { readonly kind: string; readonly pts: [number, number][] } {
  const kind = String(D['kind'] ?? 'trap');
  const we = n(D, 'we', 1000);
  const h = n(D, 'h', 20);
  const p = n(D, 'p', 100);
  const pts: [number, number][] = [];
  if (kind === 'sin') {
    for (let x = 0; x <= we; x += 2) pts.push([x, h / 2 + (h / 2) * Math.cos((2 * Math.PI * x) / p)]);
  } else if (kind === 'seam') {
    pts.push([-8, h], [0, h], [0, 0], [we, 0], [we, h], [we + 8, h]);
  } else {
    const rt = n(D, 'rt', 30);
    const rb = n(D, 'rb', 80);
    const cnt = Math.max(1, Math.round(we / p));
    const wx = (p - rt - rb) / 2;
    let x = 0;
    pts.push([0, 0]);
    for (let i = 0; i < cnt; i++) {
      pts.push([x + rb / 2, 0], [x + rb / 2 + wx, h], [x + rb / 2 + wx + rt, h], [x + rb / 2 + 2 * wx + rt, 0], [x + p, 0]);
      x += p;
    }
  }
  return { kind, pts };
}

export function SectionDrawing({ v, draw, label, format = null, pattern = null, groupCode = null, dimLabels }: DrawingProps) {
  const uid = useId().replace(/:/g, '');
  const D = v.dims;
  let g: ReactNode = null;
  switch (draw) {
    case 'box': {
      const Hh = n(D, 'H', v.heightMm ?? 0);
      const B = n(D, 'B', v.widthMm ?? Hh);
      const t = n(D, 't', v.thicknessMm ?? 0);
      if (!B || !Hh) break;
      const s = BOX / Math.max(Hh, B);
      const w = B * s;
      const h = Hh * s;
      const th = mx(t * s, 1.2);
      const x = CX - w / 2;
      const y = CY - h / 2;
      const ro = n(D, 'ro', t <= 6 ? 2 * t : t <= 10 ? 2.5 * t : 3 * t);
      const ri = n(D, 'ri', Math.max(ro - t, 0));
      g = (
        <>
          <Axes ax={CX} ay={CY} x0={x} y0={y} x1={x + w} y1={y + h} />
          <Shape d={`${rrect(x, y, w, h, ro * s)} ${rrect(x + th, y + th, w - 2 * th, h - 2 * th, ri * s)}`} evenOdd />
          <DimH x0={x} x1={x + w} yRef={y + h} y={y + h + 34} label={`B = ${fmt(B)}`} />
          <DimV y0={y} y1={y + h} xRef={x} x={x - 34} label={`H = ${fmt(Hh)}`} />
          {t ? <Call px={x + w - th / 2} py={y + h * 0.3} x2={x + w + 46} label={`t = ${fmt(t)}`} /> : null}
        </>
      );
      break;
    }
    case 'pipe': {
      const Dd = n(D, 'D', v.widthMm ?? 0);
      const t = n(D, 't', v.thicknessMm ?? 0);
      if (!Dd) break;
      const s = BOX / Dd;
      const R = (Dd / 2) * s;
      const th = mx(t * s, 1.2);
      const r = R - th;
      g = (
        <>
          <Axes ax={CX} ay={CY} x0={CX - R} y0={CY - R} x1={CX + R} y1={CY + R} />
          <Shape d={`M${CX - R},${CY}a${R},${R} 0 1,0 ${2 * R},0a${R},${R} 0 1,0 ${-2 * R},0Z M${CX - r},${CY}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`} evenOdd />
          <DimH x0={CX - R} x1={CX + R} yRef={CY + R} y={CY + R + 34} label={`D = ${fmt(Dd)}`} />
          {t ? <Call px={CX + R * 0.707 - th * 0.35} py={CY - R * 0.707 + th * 0.35} x2={CX + R + 30} label={`t = ${fmt(t)}`} /> : null}
        </>
      );
      break;
    }
    case 'I':
    case 'Itaper':
    case 'U': {
      const hh = n(D, 'h', v.heightMm ?? 0);
      const bb = n(D, 'b', v.widthMm ?? 0);
      if (!hh || !bb) break;
      const s = BOX / Math.max(hh, bb);
      const h = hh * s;
      const b = bb * s;
      const tw = mx(n(D, 'tw', 5) * s, 1.5);
      const tf = mx(n(D, 'tf', 8) * s, 1.5);
      const x0 = CX - b / 2;
      const y0 = CY - h / 2;
      const x1 = x0 + b;
      const y1 = y0 + h;
      const e = v.props.e ?? 0;
      let p = '';
      let ax = CX;
      if (draw === 'I') {
        const r = n(D, 'r') * s;
        const a = tw / 2;
        p = `M${x0},${y0}H${x1}V${y0 + tf}H${CX + a + r}A${r},${r} 0 0 0 ${CX + a},${y0 + tf + r}V${y1 - tf - r}A${r},${r} 0 0 0 ${CX + a + r},${y1 - tf}H${x1}V${y1}H${x0}V${y1 - tf}H${CX - a - r}A${r},${r} 0 0 0 ${CX - a},${y1 - tf - r}V${y0 + tf + r}A${r},${r} 0 0 0 ${CX - a - r},${y0 + tf}H${x0}Z`;
      } else if (draw === 'Itaper') {
        const k = ((n(D, 'sl', 0.14) * (bb - n(D, 'tw', 5))) / 4) * s;
        const tt = mx(tf - k, 1);
        const tr = tf + k;
        const a = tw / 2;
        p = `M${x0},${y0}H${x1}V${y0 + tt}L${CX + a},${y0 + tr}V${y1 - tr}L${x1},${y1 - tt}V${y1}H${x0}V${y1 - tt}L${CX - a},${y1 - tr}V${y0 + tr}L${x0},${y0 + tt}Z`;
      } else if (n(D, 'sl')) {
        const k = ((n(D, 'sl') * (bb - n(D, 'tw', 5))) / 2) * s;
        const tt = mx(tf - k, 1);
        const tr = tf + k;
        p = `M${x0},${y0}H${x1}V${y0 + tt}L${x0 + tw},${y0 + tr}V${y1 - tr}L${x1},${y1 - tt}V${y1}H${x0}Z`;
        ax = x0 + e * 10 * s;
      } else {
        const r = n(D, 'r') * s;
        p = `M${x0},${y0}H${x1}V${y0 + tf}H${x0 + tw + r}A${r},${r} 0 0 0 ${x0 + tw},${y0 + tf + r}V${y1 - tf - r}A${r},${r} 0 0 0 ${x0 + tw + r},${y1 - tf}H${x1}V${y1}H${x0}Z`;
        ax = x0 + e * 10 * s;
      }
      const wx = draw === 'U' ? x0 + tw / 2 : CX;
      g = (
        <>
          <Axes ax={ax} ay={CY} x0={x0} y0={y0} x1={x1} y1={y1} />
          <Shape d={p} />
          <DimH x0={x0} x1={x1} yRef={y1} y={y1 + 34} label={`b = ${fmt(bb)}`} />
          <DimV y0={y0} y1={y1} xRef={x0} x={x0 - 34} label={`h = ${fmt(hh)}`} />
          <Call px={x1 - 3} py={y0 + tf / 2} x2={x1 + 30} label={`tf = ${fmt(n(D, 'tf'))}`} />
          <Call px={wx} py={CY + h * 0.22} x2={x1 + 30} label={`tw = ${fmt(n(D, 'tw'))}`} />
        </>
      );
      break;
    }
    case 'L': {
      const aa = n(D, 'a', v.heightMm ?? 0);
      const bb = n(D, 'b', v.widthMm ?? aa);
      const tt = n(D, 't', v.thicknessMm ?? 0);
      if (!aa || !bb) break;
      const s = BOX / Math.max(aa, bb);
      const a = aa * s;
      const b = bb * s;
      const t = mx(tt * s, 1.5);
      const r = n(D, 'r') * s;
      const x0 = CX - b / 2;
      const y1 = CY + a / 2;
      const y0 = y1 - a;
      const x1 = x0 + b;
      const p = `M${x0},${y1}H${x1}V${y1 - t}H${x0 + t + r}A${r},${r} 0 0 1 ${x0 + t},${y1 - t - r}V${y0}H${x0}Z`;
      g = (
        <>
          <Axes ax={x0 + (v.props.ex ?? 0) * 10 * s} ay={y1 - (v.props.ey ?? 0) * 10 * s} x0={x0} y0={y0} x1={x1} y1={y1} />
          <Shape d={p} />
          <DimH x0={x0} x1={x1} yRef={y1} y={y1 + 34} label={`b = ${fmt(bb)}`} />
          <DimV y0={y0} y1={y1} xRef={x0} x={x0 - 34} label={`a = ${fmt(aa)}`} />
          {tt ? <Call px={x0 + t / 2} py={y0 + a * 0.2} x2={x1 + 10} label={`t = ${fmt(tt)}`} /> : null}
        </>
      );
      break;
    }
    case 'T': {
      const hh = n(D, 'h', v.heightMm ?? 0);
      const bb = n(D, 'b', v.widthMm ?? hh);
      const tt = n(D, 't', v.thicknessMm ?? 0);
      if (!hh || !bb) break;
      const s = BOX / Math.max(hh, bb);
      const h = hh * s;
      const b = bb * s;
      const t = mx(tt * s, 1.5);
      const r = n(D, 'r') * s;
      const x0 = CX - b / 2;
      const y0 = CY - h / 2;
      const x1 = x0 + b;
      const y1 = y0 + h;
      const a = t / 2;
      const p = `M${x0},${y0}H${x1}V${y0 + t}H${CX + a + r}A${r},${r} 0 0 0 ${CX + a},${y0 + t + r}V${y1}H${CX - a}V${y0 + t + r}A${r},${r} 0 0 0 ${CX - a - r},${y0 + t}H${x0}Z`;
      g = (
        <>
          <Axes ax={CX} ay={y0 + (v.props.e ?? 0) * 10 * s} x0={x0} y0={y0} x1={x1} y1={y1} />
          <Shape d={p} />
          <DimH x0={x0} x1={x1} yRef={y0} y={y0 - 30} label={`b = ${fmt(bb)}`} />
          <DimV y0={y0} y1={y1} xRef={x0} x={x0 - 34} label={`h = ${fmt(hh)}`} />
          {tt ? <Call px={CX + a} py={y1 - h * 0.25} x2={x1 + 20} label={`t = ${fmt(tt)}`} /> : null}
        </>
      );
      break;
    }
    case 'trap': {
      const we = n(D, 'we', v.widthMm ?? 1000);
      const hh = n(D, 'h', v.heightMm ?? 20);
      const pp = n(D, 'p', 100);
      const { kind, pts } = trapPoints(D);
      const s = 400 / we;
      const sv = Math.min(Math.max(s, 70 / hh), 150 / hh);
      const h = hh * sv;
      const x0 = 275 - (we * s) / 2;
      const x1 = x0 + we * s;
      const yb = CY + h / 2;
      const yt = yb - h;
      // Yatay ölçek s, düşey sv (küçük hadveler görünür kalsın)
      const path = 'M' + pts.map(([x, y]) => `${x0 + x * s},${yb - y * sv}`).join('L');
      const rt = n(D, 'rt', 30) * s;
      const rb = n(D, 'rb', 80) * s;
      const p = pp * s;
      const wx = (p - rt - rb) / 2;
      const a = x0 + rb / 2 + wx + rt / 2;
      g = (
        <>
          <path d={path} fill="none" stroke={FILL} strokeWidth="3" strokeLinejoin="round" />
          <DimH x0={x0} x1={x1} yRef={yb} y={yb + 40} label={`${dimLabels.we} = ${fmt(we)}`} />
          <DimV y0={yt} y1={yb} xRef={x0} x={x0 - 30} label={`h = ${fmt(hh)}`} />
          {kind !== 'seam' && kind !== 'sin' ? <DimH x0={a} x1={a + p} yRef={yt} y={yt - 26} label={`${dimLabels.p} = ${fmt(pp)}`} /> : null}
          {kind === 'sin' ? <DimH x0={x0} x1={x0 + p} yRef={yt} y={yt - 26} label={`${dimLabels.p} = ${fmt(pp)}`} /> : null}
        </>
      );
      break;
    }
    case 'flat': {
      const ww = n(D, 'w', v.widthMm ?? 0);
      const tt = n(D, 't', v.thicknessMm ?? 0);
      if (!ww) break;
      const s = 380 / ww;
      const w = ww * s;
      const t = mx(tt * s, 5);
      const x0 = CX - w / 2;
      const y0 = CY - t / 2;
      g = (
        <>
          <Shape d={`M${x0},${y0}H${x0 + w}V${y0 + t}H${x0}Z`} />
          <DimH x0={x0} x1={x0 + w} yRef={y0 + t} y={y0 + t + 44} label={`${dimLabels.w} = ${fmt(ww)}`} />
          <Tx x={CX} y={y0 - 24} s={`t = ${fmt(tt)} mm`} />
        </>
      );
      break;
    }
    case 'plate': {
      const tt = n(D, 't', v.thicknessMm ?? 1);
      const w = format?.w ?? 1500;
      const l = format?.l ?? 3000;
      const s = Math.min(380 / l, 240 / w);
      const pw = l * s;
      const ph = w * s;
      const x0 = CX - pw / 2;
      const y0 = CY - ph / 2 - 6;
      const th = Math.min(10, 3 + tt * 0.4);
      const col: Record<string, string> = { GLV: '#E8EEF5', HRP: '#AEB9C7', CTD: '#AEB9C7', CTA: '#E4E8EE', CTP: '#C9D1DB' };
      const pid = `pt-${uid}`;
      g = (
        <>
          {pattern === 'tear' ? (
            <defs>
              <pattern id={pid} width="14" height="14" patternUnits="userSpaceOnUse">
                <ellipse cx="4" cy="4" rx="3.2" ry="1.2" transform="rotate(45 4 4)" fill="#8697AE" />
                <ellipse cx="11" cy="11" rx="3.2" ry="1.2" transform="rotate(-45 11 11)" fill="#8697AE" />
              </pattern>
            </defs>
          ) : pattern === 'dia' ? (
            <defs>
              <pattern id={pid} width="16" height="10" patternUnits="userSpaceOnUse">
                <path d="M8,0L16,5L8,10L0,5Z" fill="none" stroke="#8697AE" strokeWidth="1.2" />
              </pattern>
            </defs>
          ) : null}
          <path d={`M${x0 + pw},${y0}l${th},${th}v${ph}h${-pw}l${-th},${-th}Z`} fill="#6E7F96" />
          <rect x={x0} y={y0} width={pw} height={ph} fill={(groupCode && col[groupCode]) || FILL} stroke="#fff" />
          {pattern ? <rect x={x0} y={y0} width={pw} height={ph} fill={`url(#${pid})`} /> : null}
          <DimH x0={x0} x1={x0 + pw} yRef={y0 + ph + th} y={y0 + ph + th + 30} label={`${l} mm`} />
          <DimV y0={y0} y1={y0 + ph} xRef={x0} x={x0 - 30} label={`${w} mm`} />
          <text x={CX} y={CY} textAnchor="middle" fill="#1C2A3D" className="pcfg-svg-dim" fontSize="16" fontWeight="500">{`t = ${fmt(tt)} mm`}</text>
        </>
      );
      break;
    }
  }
  if (!g) return <div className="pcfg-svg pcfg-svg-empty" aria-hidden="true" />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pcfg-svg" role="img" aria-label={label}>
      {g}
    </svg>
  );
}
