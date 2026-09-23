'use client';

import { claddingGeometry, type CladdingParams } from '../../domain/simple/cladding';
import type { DrywallParams } from '../../domain/simple/drywall';
import type { FenceParams } from '../../domain/simple/fence';
import { mezzanineGrid, type MezzanineParams } from '../../domain/simple/mezzanine';
import type { AnyParams, SimpleKind } from '../../domain/simple/registry';

/** Basit konfigüratörlerin 2B şemaları (K-100): SVG, ölçü etiketli; Three.js YOK (K-24). Renkler seçici paletiyle aynı. */
const W = 640;
const H = 420;
const INK = '#DCE4EF';
const MK = 'var(--mark)';
const STC = '#B9C6D8';

function Dim({ x0, x1, y, label }: { x0: number; x1: number; y: number; label: string }) {
  return (
    <g stroke={MK} fill={MK}>
      <line x1={x0} y1={y} x2={x1} y2={y} strokeWidth="1.2" />
      <line x1={x0} y1={y - 5} x2={x0} y2={y + 5} />
      <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} />
      <text x={(x0 + x1) / 2} y={y + 18} textAnchor="middle" stroke="none" className="pcfg-svg-dim" fontSize="13">{label}</text>
    </g>
  );
}
function DimV({ y0, y1, x, label }: { y0: number; y1: number; x: number; label: string }) {
  return (
    <g stroke={MK} fill={MK}>
      <line x1={x} y1={y0} x2={x} y2={y1} strokeWidth="1.2" />
      <line x1={x - 5} y1={y0} x2={x + 5} y2={y0} />
      <line x1={x - 5} y1={y1} x2={x + 5} y2={y1} />
      <text x={x - 10} y={(y0 + y1) / 2} textAnchor="middle" stroke="none" className="pcfg-svg-dim" fontSize="13" transform={`rotate(-90 ${x - 10} ${(y0 + y1) / 2})`}>{label}</text>
    </g>
  );
}
const f1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

function Cladding({ p, caption }: { p: CladdingParams; caption: string }) {
  // Kesit: beşik çatı + duvarlar; ölçek genişlik + duvar yüksekliğine göre
  const g = claddingGeometry(p);
  const totalH = p.wallHeight + g.ridgeHeightM;
  const s = Math.min(420 / (p.width + 2 * p.overhang + 2), 240 / Math.max(totalH, 2));
  const cx = W / 2;
  const base = 330;
  const wallTop = base - p.wallHeight * s;
  const ridgeY = wallTop - g.ridgeHeightM * s;
  const xl = cx - (p.width / 2) * s;
  const xr = cx + (p.width / 2) * s;
  const ol = xl - p.overhang * s;
  const orr = xr + p.overhang * s;
  const eaveDrop = p.overhang * (p.slopePct / 100) * s;
  return (
    <>
      {p.wallType !== 'none' && p.wallHeight > 0 ? <path d={`M${xl},${base}V${wallTop}M${xr},${base}V${wallTop}`} stroke={INK} strokeWidth="3" fill="none" /> : null}
      <path d={`M${ol},${wallTop + eaveDrop}L${cx},${ridgeY}L${orr},${wallTop + eaveDrop}`} stroke={INK} strokeWidth="4" fill="none" strokeLinejoin="round" />
      <line x1={ol - 20} y1={base} x2={orr + 20} y2={base} stroke={STC} strokeOpacity=".6" />
      <Dim x0={xl} x1={xr} y={base + 24} label={`${f1(p.width)} m`} />
      {p.wallHeight > 0 ? <DimV y0={wallTop} y1={base} x={xl - 30} label={`${f1(p.wallHeight)} m`} /> : null}
      <DimV y0={ridgeY} y1={wallTop} x={orr + 34} label={`${f1(g.ridgeHeightM)} m`} />
      <text x={cx + 12} y={(ridgeY + wallTop) / 2 - 6} fill={MK} className="pcfg-svg-dim" fontSize="12">%{p.slopePct}</text>
      <text x={cx} y={38} textAnchor="middle" fill={STC} className="pcfg-svg-axis" fontSize="12">{caption}</text>
    </>
  );
}
function Mezzanine({ p, caption }: { p: MezzanineParams; caption: string }) {
  // Plan: kolon ızgarası + ana/tali kirişler
  const g = mezzanineGrid(p);
  const s = Math.min(520 / p.length, 300 / p.width);
  const x0 = (W - p.length * s) / 2;
  const y0 = (H - p.width * s) / 2 + 10;
  const cols: React.ReactNode[] = [];
  for (let i = 0; i < g.nx; i++) for (let j = 0; j < g.nz; j++) cols.push(<rect key={`${i}-${j}`} x={x0 + j * g.spanZ * s - 4} y={y0 + i * g.spanX * s - 4} width="8" height="8" fill={MK} />);
  const mains: React.ReactNode[] = [];
  for (let j = 0; j < g.nz; j++) mains.push(<line key={`m${j}`} x1={x0 + j * g.spanZ * s} y1={y0} x2={x0 + j * g.spanZ * s} y2={y0 + p.width * s} stroke={INK} strokeWidth="3" />);
  const secs: React.ReactNode[] = [];
  const secPerBay = Math.max(1, Math.round(g.spanX / 1.5) - 1);
  for (let i = 0; i < g.nx - 1; i++) for (let k = 1; k <= secPerBay; k++) { const y = y0 + (i + k / (secPerBay + 1)) * g.spanX * s; secs.push(<line key={`s${i}-${k}`} x1={x0} y1={y} x2={x0 + p.length * s} y2={y} stroke={STC} strokeOpacity=".7" strokeWidth="1" />); }
  return (
    <>
      <rect x={x0} y={y0} width={p.length * s} height={p.width * s} fill={INK} fillOpacity=".08" stroke={INK} strokeWidth="2" />
      {secs}{mains}{cols}
      <Dim x0={x0} x1={x0 + p.length * s} y={y0 + p.width * s + 26} label={`${f1(p.length)} m`} />
      <DimV y0={y0} y1={y0 + p.width * s} x={x0 - 28} label={`${f1(p.width)} m`} />
      <text x={W / 2} y={30} textAnchor="middle" fill={STC} className="pcfg-svg-axis" fontSize="12">{caption}</text>
    </>
  );
}
function Fence({ p, caption }: { p: FenceParams; caption: string }) {
  // Görünüş: 3 aks aralığı örnek dilim
  const bays = 3;
  const s = Math.min(520 / (bays * p.postSpacing), 260 / (p.height + 0.6));
  const x0 = (W - bays * p.postSpacing * s) / 2;
  const base = 330;
  const top = base - p.height * s;
  const posts: React.ReactNode[] = [];
  for (let i = 0; i <= bays; i++) posts.push(<rect key={i} x={x0 + i * p.postSpacing * s - 4} y={top} width="8" height={p.height * s + 0.5 * s} fill={INK} />);
  const rails: React.ReactNode[] = [];
  for (let r = 0; r < p.rails; r++) { const y = top + 8 + (r * (p.height * s - 16)) / Math.max(p.rails - 1, 1); rails.push(<line key={r} x1={x0} y1={y} x2={x0 + bays * p.postSpacing * s} y2={y} stroke={INK} strokeWidth="3" />); }
  const infill: React.ReactNode[] = [];
  if (p.infill === 'bars') for (let x = x0 + p.barSpacing * s; x < x0 + bays * p.postSpacing * s; x += p.barSpacing * s) infill.push(<line key={x} x1={x} y1={top + 4} x2={x} y2={base} stroke={STC} strokeWidth="1.2" />);
  if (p.infill === 'lama') for (let y = top + 12; y < base; y += 0.15 * s) infill.push(<line key={y} x1={x0} y1={y} x2={x0 + bays * p.postSpacing * s} y2={y} stroke={STC} strokeWidth="1" />);
  if (p.infill === 'panel') infill.push(<rect key="p" x={x0} y={top + 6} width={bays * p.postSpacing * s} height={p.height * s - 10} fill={STC} fillOpacity=".25" />);
  return (
    <>
      <line x1={x0 - 30} y1={base} x2={x0 + bays * p.postSpacing * s + 30} y2={base} stroke={STC} strokeOpacity=".7" />
      {infill}{rails}{posts}
      <Dim x0={x0} x1={x0 + p.postSpacing * s} y={base + 0.5 * s + 22} label={`${f1(p.postSpacing)} m`} />
      <DimV y0={top} y1={base} x={x0 - 28} label={`${f1(p.height)} m`} />
      <text x={W / 2} y={30} textAnchor="middle" fill={STC} className="pcfg-svg-axis" fontSize="12">{caption}</text>
    </>
  );
}
function Drywall({ p, caption }: { p: DrywallParams; caption: string }) {
  const shownLen = Math.min(p.length, 6);
  const s = Math.min(520 / shownLen, 280 / p.height);
  const x0 = (W - shownLen * s) / 2;
  const base = 340;
  const top = base - p.height * s;
  const studs: React.ReactNode[] = [];
  for (let x = 0; x <= shownLen + 1e-9; x += p.studSpacing) studs.push(<rect key={x} x={x0 + x * s - 2} y={top} width="4" height={p.height * s} fill={INK} />);
  const [bw, bh] = p.boardSize.split('x').map((v) => Number(v) / 1000);
  const boards: React.ReactNode[] = [];
  for (let x = 0; x < shownLen; x += bw ?? 1.2) for (let y = 0; y < p.height; y += bh ?? 2.5) boards.push(<rect key={`${x}-${y}`} x={x0 + x * s} y={base - Math.min(p.height, y + (bh ?? 2.5)) * s} width={Math.min(bw ?? 1.2, shownLen - x) * s} height={Math.min(bh ?? 2.5, p.height - y) * s} fill={STC} fillOpacity=".12" stroke={STC} strokeOpacity=".5" />);
  return (
    <>
      <rect x={x0} y={top - 4} width={shownLen * s} height="4" fill={INK} />
      <rect x={x0} y={base} width={shownLen * s} height="4" fill={INK} />
      {boards}{studs}
      <Dim x0={x0} x1={x0 + p.studSpacing * s} y={base + 26} label={`${Math.round(p.studSpacing * 100)} cm`} />
      <DimV y0={top} y1={base} x={x0 - 28} label={`${f1(p.height)} m`} />
      <text x={W / 2} y={30} textAnchor="middle" fill={STC} className="pcfg-svg-axis" fontSize="12">{caption}</text>
    </>
  );
}

/** `caption`: şemanın üst yazısı — çevrilmiş metin çağırandan gelir (kodda Türkçe yok). */
export function SimpleDrawing({ kind, params, label, caption }: { readonly kind: SimpleKind; readonly params: AnyParams; readonly label: string; readonly caption: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pcfg-svg simple-drawing" role="img" aria-label={label}>
      {kind === 'cladding' ? <Cladding p={params as CladdingParams} caption={caption} /> : null}
      {kind === 'mezzanine' ? <Mezzanine p={params as MezzanineParams} caption={caption} /> : null}
      {kind === 'fence' ? <Fence p={params as FenceParams} caption={caption} /> : null}
      {kind === 'drywall' ? <Drywall p={params as DrywallParams} caption={caption} /> : null}
    </svg>
  );
}
