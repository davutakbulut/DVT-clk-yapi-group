import { polygonArea, type V2 } from './vec';

/**
 * Çelik profil kataloğu (K-110). Ölçüler EN 10365 / DIN 1026 / EN 10056 / EN 10219 / EN 10058 / EN 14195 tablolarından (mm).
 * Kesit değerleri (A, I, W, Wpl, i, AL) her profilin gerçek kesitinden (iç köşe yarıçapları dahil) çokgen integraliyle hesaplanır;
 * birim ağırlık G = A · 7850 kg/m³. Bu dosya hem tohum kaynağıdır (0059) hem de veritabanı satırı eksikse yedek.
 * Kod ASCII'dir (`HEB360`, `SHS40x40x3`, `CHS139.7x6`); etiket Türkçe görünümdür ("Kutu 40×40×3") ve panelden değişebilir.
 */
export const STEEL_DENSITY = 7850; // kg/m³

export type ProfileKind = 'I' | 'U' | 'C' | 'L' | 'RHS' | 'CHS' | 'FL';
export const FAMILY_KEYS = ['IPE', 'HEA', 'HEB', 'HEM', 'UPN', 'UPE', 'L', 'LU', 'SHS', 'RHS', 'CHS', 'FL', 'CW', 'UW'] as const;
export type FamilyKey = (typeof FAMILY_KEYS)[number];
export const FAMILY_KIND: Readonly<Record<FamilyKey, ProfileKind>> = { IPE: 'I', HEA: 'I', HEB: 'I', HEM: 'I', UPN: 'U', UPE: 'U', L: 'L', LU: 'L', SHS: 'RHS', RHS: 'RHS', CHS: 'CHS', FL: 'FL', CW: 'C', UW: 'C' };

/** Ölçüler mm. I/U/C: h,b,tw,tf,r · L: h(a),b,t,r · RHS: h,b,t · CHS: h(D),t · FL: b,t */
export interface ProfileDims {
  readonly h: number;
  readonly b: number;
  readonly tw?: number;
  readonly tf?: number;
  readonly r?: number;
  readonly t?: number;
}
export interface ProfileSpec {
  readonly code: string;
  readonly label: string;
  readonly family: FamilyKey;
  readonly kind: ProfileKind;
  readonly dims: ProfileDims;
}

// [ad, h, b, tw, tf, r]
const RAW_I: Record<'IPE' | 'HEA' | 'HEB' | 'HEM', readonly (readonly number[])[]> = {
  IPE: [[80,80,46,3.8,5.2,5],[100,100,55,4.1,5.7,7],[120,120,64,4.4,6.3,7],[140,140,73,4.7,6.9,7],[160,160,82,5,7.4,9],
    [180,180,91,5.3,8,9],[200,200,100,5.6,8.5,12],[220,220,110,5.9,9.2,12],[240,240,120,6.2,9.8,15],[270,270,135,6.6,10.2,15],
    [300,300,150,7.1,10.7,15],[330,330,160,7.5,11.5,18],[360,360,170,8,12.7,18],[400,400,180,8.6,13.5,21],[450,450,190,9.4,14.6,21],
    [500,500,200,10.2,16,21],[550,550,210,11.1,17.2,24],[600,600,220,12,19,24]],
  HEA: [[100,96,100,5,8,12],[120,114,120,5,8,12],[140,133,140,5.5,8.5,12],[160,152,160,6,9,15],[180,171,180,6,9.5,15],
    [200,190,200,6.5,10,18],[220,210,220,7,11,18],[240,230,240,7.5,12,21],[260,250,260,7.5,12.5,24],[280,270,280,8,13,24],
    [300,290,300,8.5,14,27],[320,310,300,9,15.5,27],[340,330,300,9.5,16.5,27],[360,350,300,10,17.5,27],[400,390,300,11,19,27],
    [450,440,300,11.5,21,27],[500,490,300,12,23,27],[550,540,300,12.5,24,27],[600,590,300,13,25,27],[650,640,300,13.5,26,27],
    [700,690,300,14.5,27,27],[800,790,300,15,28,30],[900,890,300,16,30,30],[1000,990,300,16.5,31,30]],
  HEB: [[100,100,100,6,10,12],[120,120,120,6.5,11,12],[140,140,140,7,12,12],[160,160,160,8,13,15],[180,180,180,8.5,14,15],
    [200,200,200,9,15,18],[220,220,220,9.5,16,18],[240,240,240,10,17,21],[260,260,260,10,17.5,24],[280,280,280,10.5,18,24],
    [300,300,300,11,19,27],[320,320,300,11.5,20.5,27],[340,340,300,12,21.5,27],[360,360,300,12.5,22.5,27],[400,400,300,13.5,24,27],
    [450,450,300,14,26,27],[500,500,300,14.5,28,27],[550,550,300,15,29,27],[600,600,300,15.5,30,27],[650,650,300,16,31,27],
    [700,700,300,17,32,27],[800,800,300,17.5,33,30],[900,900,300,18.5,35,30],[1000,1000,300,19,36,30]],
  HEM: [[100,120,106,12,20,12],[120,140,126,12.5,21,12],[140,160,146,13,22,12],[160,180,166,14,23,15],[180,200,186,14.5,24,15],
    [200,220,206,15,25,18],[220,240,226,15.5,26,18],[240,270,248,18,32,21],[260,290,268,18,32.5,24],[280,310,288,18.5,33,24],
    [300,340,310,21,39,27],[320,359,309,21,40,27],[340,377,309,21,40,27],[360,395,308,21,40,27],[400,432,307,21,40,27],
    [450,478,307,21,40,27],[500,524,306,21,40,27],[550,572,306,21,40,27],[600,620,305,21,40,27],[650,668,305,21,40,27],
    [700,716,304,21,40,27],[800,814,303,21,40,30],[900,910,302,21,40,30],[1000,1008,302,21,40,30]],
};
// [ad, h, b, tw, tf, r]
const RAW_U: Record<'UPN' | 'UPE', readonly (readonly number[])[]> = {
  UPN: [[50,50,38,5,7,7],[65,65,42,5.5,7.5,7.5],[80,80,45,6,8,8],[100,100,50,6,8.5,8.5],[120,120,55,7,9,9],[140,140,60,7,10,10],
    [160,160,65,7.5,10.5,10.5],[180,180,70,8,11,11],[200,200,75,8.5,11.5,11.5],[220,220,80,9,12.5,12.5],[240,240,85,9.5,13,13],
    [260,260,90,10,14,14],[280,280,95,10,15,15],[300,300,100,10,16,16],[320,320,100,14,17.5,17.5],[350,350,100,14,16,16],
    [380,380,102,13.5,16,16],[400,400,110,14,18,18]],
  UPE: [[80,80,50,4,7,10],[100,100,55,4.5,7.5,10],[120,120,60,5,8,12],[140,140,65,5,9,12],[160,160,70,5.5,9.5,12],
    [180,180,75,5.5,10.5,12],[200,200,80,6,11,13],[220,220,85,6.5,12,13],[240,240,90,7,12.5,15],[270,270,95,7.5,13.5,15],
    [300,300,100,9.5,15,15],[330,330,105,11,16,18],[360,360,110,12,17,18],[400,400,115,13.5,18,18]],
};
// köşebent [a, b, t, r]
const RAW_L: readonly (readonly number[])[] = [[20,20,3,3.5],[25,25,3,3.5],[25,25,4,3.5],[30,30,3,5],[30,30,4,5],[35,35,4,5],[40,40,4,6],[40,40,5,6],[45,45,5,7],
  [50,50,5,7],[50,50,6,7],[60,60,6,8],[60,60,8,8],[65,65,7,9],[70,70,7,9],[75,75,8,9],[80,80,8,10],[80,80,10,10],[90,90,9,11],
  [100,100,10,12],[100,100,12,12],[120,120,10,13],[120,120,12,13],[150,150,12,16],[150,150,15,16],[160,160,15,17],
  [180,180,18,18],[200,200,16,18],[200,200,20,18]];
const RAW_LU: readonly (readonly number[])[] = [[60,40,5,6],[60,40,6,6],[75,50,6,7],[80,40,6,7],[80,60,7,8],[100,50,6,8],[100,50,8,8],[100,65,7,10],
  [100,75,8,10],[120,80,8,11],[120,80,10,11],[150,90,10,12],[150,100,10,12],[200,100,10,15],[200,100,12,15]];
// kare kutu [a, t]
const RAW_SHS: readonly (readonly number[])[] = [[20,1.5],[20,2],[25,1.5],[25,2],[30,1.5],[30,2],[30,3],[40,1.5],[40,2],[40,3],[40,4],[50,2],[50,3],[50,4],[50,5],
  [60,2],[60,3],[60,4],[60,5],[70,3],[70,4],[80,3],[80,4],[80,5],[80,6],[90,4],[90,5],[100,4],[100,5],[100,6],[100,8],
  [120,5],[120,6],[120,8],[140,6],[140,8],[150,6],[150,8],[160,8],[180,8],[200,8],[200,10],[250,10],[300,10]];
// dikdörtgen kutu [h, b, t]
const RAW_RHS: readonly (readonly number[])[] = [[30,15,1.5],[40,20,1.5],[40,20,2],[50,25,2],[50,30,2],[50,30,3],[60,30,2],[60,30,3],[60,40,3],[60,40,4],
  [80,40,2],[80,40,3],[80,40,4],[100,40,3],[100,50,3],[100,50,4],[100,50,5],[100,60,4],[120,60,4],[120,60,5],[120,80,5],
  [140,80,5],[140,80,6],[150,100,6],[160,80,6],[180,100,6],[200,100,6],[200,100,8],[250,150,8],[300,200,10]];
// boru [D, t]
const RAW_CHS: readonly (readonly number[])[] = [[21.3,2],[26.9,2.3],[33.7,2.6],[42.4,2.6],[48.3,2.9],[60.3,2.9],[60.3,3.2],[76.1,3.2],[88.9,3.2],[88.9,4],
  [101.6,4],[114.3,4],[114.3,5],[139.7,5],[139.7,6],[168.3,6],[168.3,8],[193.7,8],[219.1,8],[219.1,10],[244.5,10],
  [273,10],[323.9,10],[355.6,12]];
// lama [b, t]
const RAW_FL: readonly (readonly number[])[] = [[20,3],[20,4],[25,4],[30,4],[30,5],[40,4],[40,5],[50,5],[50,6],[50,8],[60,6],[60,8],[80,8],[80,10],[100,4],[100,5],[100,10],[120,10],[150,4]];
// alçıpan [ad, h(gövde), b(başlık), t]
const RAW_CW: readonly (readonly number[])[] = [[50,50,50,0.6],[75,75,50,0.6],[100,100,50,0.6]];
const RAW_UW: readonly (readonly number[])[] = [[50,50,40,0.6],[75,75,40,0.6],[100,100,40,0.6]];

const dec = (v: number) => String(v).replace('.', ',');     // etiket: 1,5
const asc = (v: number) => String(v);                         // kod: 1.5

/** Standart katalog: ~280 profil (tohum ve yedek). */
export const STANDARD_PROFILES: readonly ProfileSpec[] = (() => {
  const out: ProfileSpec[] = [];
  (Object.keys(RAW_I) as (keyof typeof RAW_I)[]).forEach((fam) => RAW_I[fam].forEach(([n, h, b, tw, tf, r]) => out.push({ code: `${fam}${n}`, label: `${fam} ${n}`, family: fam, kind: 'I', dims: { h: h!, b: b!, tw: tw!, tf: tf!, r: r! } })));
  (Object.keys(RAW_U) as (keyof typeof RAW_U)[]).forEach((fam) => RAW_U[fam].forEach(([n, h, b, tw, tf, r]) => out.push({ code: `${fam}${n}`, label: `${fam} ${n}`, family: fam, kind: 'U', dims: { h: h!, b: b!, tw: tw!, tf: tf!, r: r! } })));
  RAW_L.forEach(([a, b, t, r]) => out.push({ code: `L${a}x${b}x${asc(t!)}`, label: `L ${a}×${b}×${dec(t!)}`, family: 'L', kind: 'L', dims: { h: a!, b: b!, t: t!, r: r! } }));
  RAW_LU.forEach(([a, b, t, r]) => out.push({ code: `LU${a}x${b}x${asc(t!)}`, label: `L ${a}×${b}×${dec(t!)}`, family: 'LU', kind: 'L', dims: { h: a!, b: b!, t: t!, r: r! } }));
  RAW_SHS.forEach(([a, t]) => out.push({ code: `SHS${a}x${a}x${asc(t!)}`, label: `Kutu ${a}×${a}×${dec(t!)}`, family: 'SHS', kind: 'RHS', dims: { h: a!, b: a!, t: t! } }));
  RAW_RHS.forEach(([h, b, t]) => out.push({ code: `RHS${h}x${b}x${asc(t!)}`, label: `Kutu ${h}×${b}×${dec(t!)}`, family: 'RHS', kind: 'RHS', dims: { h: h!, b: b!, t: t! } }));
  RAW_CHS.forEach(([d, t]) => out.push({ code: `CHS${asc(d!)}x${asc(t!)}`, label: `Boru ${dec(d!)}×${dec(t!)}`, family: 'CHS', kind: 'CHS', dims: { h: d!, b: d!, t: t! } }));
  RAW_FL.forEach(([b, t]) => out.push({ code: `FL${b}x${t}`, label: `Lama ${b}×${t}`, family: 'FL', kind: 'FL', dims: { h: t!, b: b!, t: t! } }));
  RAW_CW.forEach(([n, h, b, t]) => out.push({ code: `CW${n}`, label: `CW ${n}`, family: 'CW', kind: 'C', dims: { h: h!, b: b!, t: t!, tw: t!, tf: t!, r: 0 } }));
  RAW_UW.forEach(([n, h, b, t]) => out.push({ code: `UW${n}`, label: `UW ${n}`, family: 'UW', kind: 'C', dims: { h: h!, b: b!, t: t!, tw: t!, tf: t!, r: 0 } }));
  return out;
})();

// ---------------- Kesit çokgeni (metre; yerel x = başlık genişliği, yerel y = yükseklik) ----------------
export interface Outline {
  readonly outer: V2[];
  readonly holes: V2[][];
}

class PathBuilder {
  readonly pts: V2[] = [];
  constructor(private readonly segments: number) {}
  moveTo(x: number, y: number): void { this.pts.push([x, y]); }
  lineTo(x: number, y: number): void { this.pts.push([x, y]); }
  /** three `absarc` karşılığı: yay örneklenir (başlangıç noktası eklenir, son nokta dahil). */
  absarc(cx: number, cy: number, r: number, a0: number, a1: number, clockwise: boolean): void {
    // three EllipseCurve ile aynı: tam tur (2π) saat yönünde −2π olur (0 değil → boş delik earcut'ı düşürüyordu)
    const TWO_PI = Math.PI * 2;
    let delta = a1 - a0;
    if (!clockwise && delta < 0) delta += TWO_PI;
    if (clockwise && delta > 0) delta = Math.abs(delta - TWO_PI) < 1e-12 ? -TWO_PI : delta - TWO_PI;
    const n = Math.max(2, Math.ceil((Math.abs(delta) / (Math.PI / 2)) * this.segments));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (delta * i) / n;
      const p: V2 = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const last = this.pts[this.pts.length - 1];
      if (i === 0 && last && Math.hypot(last[0] - p[0], last[1] - p[1]) < 1e-9) continue;
      this.pts.push(p);
    }
  }
  /** Kapalı çokgen: ilk ve son nokta aynıysa son atılır. */
  close(): V2[] {
    const a = this.pts;
    if (a.length > 1 && Math.hypot(a[0]![0] - a[a.length - 1]![0], a[0]![1] - a[a.length - 1]![1]) < 1e-9) a.pop();
    return a;
  }
}

function hollowOuterRadius(t: number): number { return t <= 6 ? 2 * t : t <= 10 ? 2.5 * t : 3 * t; }
function roundedRect(path: PathBuilder, w: number, h: number, r: number, hole: boolean): PathBuilder {
  const x = w / 2, y = h / 2;
  if (r <= 0) {
    if (!hole) { path.moveTo(-x, -y); path.lineTo(x, -y); path.lineTo(x, y); path.lineTo(-x, y); path.lineTo(-x, -y); }
    else { path.moveTo(-x, -y); path.lineTo(-x, y); path.lineTo(x, y); path.lineTo(x, -y); path.lineTo(-x, -y); }
    return path;
  }
  path.moveTo(-x + r, -y);
  path.lineTo(x - r, -y); path.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x, y - r); path.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
  path.lineTo(-x + r, y); path.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(-x, -y + r); path.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

/** Kesit dış hattı ve delikleri (metre). `segments`: çeyrek yay başına bölüm (geometri 5, kesit değerleri 16). */
export function profileOutline(p: ProfileSpec, segments = 5): Outline {
  const k = 0.001, d = p.dims;
  const s = new PathBuilder(segments);
  const holes: V2[][] = [];
  if (p.kind === 'I') {
    const h = d.h * k, b = d.b * k, tw = (d.tw ?? 0) * k, tf = (d.tf ?? 0) * k, r = (d.r ?? 0) * k;
    const hh = h / 2, hb = b / 2, ht = tw / 2, yi = hh - tf;
    s.moveTo(-hb, hh); s.lineTo(hb, hh); s.lineTo(hb, yi);
    s.lineTo(ht + r, yi); s.absarc(ht + r, yi - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(ht, -yi + r); s.absarc(ht + r, -yi + r, r, Math.PI, Math.PI * 1.5, false);
    s.lineTo(hb, -yi); s.lineTo(hb, -hh); s.lineTo(-hb, -hh); s.lineTo(-hb, -yi);
    s.lineTo(-ht - r, -yi); s.absarc(-ht - r, -yi + r, r, -Math.PI / 2, 0, false);
    s.lineTo(-ht, yi - r); s.absarc(-ht - r, yi - r, r, 0, Math.PI / 2, false);
    s.lineTo(-hb, yi); s.lineTo(-hb, hh);
  } else if (p.kind === 'U' || p.kind === 'C') {
    const h = d.h * k, b = d.b * k, tw = (d.tw ?? d.t ?? 0) * k, tf = (d.tf ?? d.t ?? 0) * k, r = (d.r ?? 0) * k;
    const hh = h / 2, hb = b / 2, xw = -hb + tw, yi = hh - tf;
    s.moveTo(-hb, hh); s.lineTo(hb, hh); s.lineTo(hb, yi);
    s.lineTo(xw + r, yi);
    if (r > 0) s.absarc(xw + r, yi - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(xw, -yi + r);
    if (r > 0) s.absarc(xw + r, -yi + r, r, Math.PI, Math.PI * 1.5, false);
    s.lineTo(hb, -yi); s.lineTo(hb, -hh); s.lineTo(-hb, -hh); s.lineTo(-hb, hh);
  } else if (p.kind === 'L') {
    // topuk orijinde: düşey kol +y (a), yatay kol +x (b)
    const a = d.h * k, b = d.b * k, t = (d.t ?? 0) * k, r = (d.r ?? 0) * k;
    s.moveTo(0, 0); s.lineTo(b, 0); s.lineTo(b, t); s.lineTo(t + r, t);
    s.absarc(t + r, t + r, r, Math.PI * 1.5, Math.PI, true);
    s.lineTo(t, a); s.lineTo(0, a); s.lineTo(0, 0);
  } else if (p.kind === 'RHS') {
    const t = d.t ?? 0;
    const ro = hollowOuterRadius(t) * k, ri = Math.max(0, ro - t * k);
    roundedRect(s, d.b * k, d.h * k, ro, false);
    holes.push(roundedRect(new PathBuilder(segments), (d.b - 2 * t) * k, (d.h - 2 * t) * k, ri, false).close());
  } else if (p.kind === 'CHS') {
    const ro = (d.h / 2) * k, ri = ro - (d.t ?? 0) * k;
    s.absarc(0, 0, ro, 0, Math.PI * 2, false);
    const hole = new PathBuilder(segments); hole.absarc(0, 0, ri, 0, Math.PI * 2, true);
    holes.push(hole.close());
  } else {
    roundedRect(s, d.b * k, (d.t ?? d.h) * k, 0, false);
  }
  return { outer: s.close(), holes };
}

// ---------------- Kesit özellikleri (çokgen integrali) ----------------
export interface SectionProps {
  readonly A: number;    // cm²
  readonly G: number;    // kg/m
  readonly Iy: number; readonly Iz: number;      // cm⁴
  readonly Wely: number; readonly Welz: number;  // cm³
  readonly Wply: number; readonly Wplz: number;  // cm³
  readonly iy: number; readonly iz: number;      // cm
  readonly It: number;   // cm⁴ (yaklaşık)
  readonly AL: number;   // m²/m (dış yüzey)
  readonly cx: number; readonly cy: number;      // ağırlık merkezi (m, şekil koordinatında)
  readonly Iu?: number; readonly Iv?: number; readonly iv?: number; // köşebent asal eksenler
}
type Ring = V2[];
interface Integrals { A: number; Sx: number; Sy: number; Ixx: number; Iyy: number; Ixy: number }
function ringIntegrals(pts: Ring): Integrals {
  let A = 0, Sx = 0, Sy = 0, Ixx = 0, Iyy = 0, Ixy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]!, [x1, y1] = pts[(i + 1) % pts.length]!;
    const c = x0 * y1 - x1 * y0;
    A += c / 2; Sx += ((y0 + y1) * c) / 6; Sy += ((x0 + x1) * c) / 6;
    Ixx += ((y0 * y0 + y0 * y1 + y1 * y1) * c) / 12; Iyy += ((x0 * x0 + x0 * x1 + x1 * x1) * c) / 12;
    Ixy += ((x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * c) / 24;
  }
  return { A, Sx, Sy, Ixx, Iyy, Ixy };
}
function sumRings(rings: readonly Ring[]): Integrals {
  const t: Integrals = { A: 0, Sx: 0, Sy: 0, Ixx: 0, Iyy: 0, Ixy: 0 };
  for (const r of rings) { const v = ringIntegrals(r); t.A += v.A; t.Sx += v.Sx; t.Sy += v.Sy; t.Ixx += v.Ixx; t.Iyy += v.Iyy; t.Ixy += v.Ixy; }
  return t;
}
function clipRing(pts: Ring, axis: 0 | 1, c: number): Ring {
  const out: Ring = [];
  for (let i = 0; i < pts.length; i++) {
    const P = pts[i]!, Q = pts[(i + 1) % pts.length]!;
    const pin = P[axis] >= c, qin = Q[axis] >= c;
    if (pin) out.push(P);
    if (pin !== qin) { const t = (c - P[axis]) / (Q[axis] - P[axis]); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
  }
  return out.length >= 3 ? out : [];
}
function plasticModulus(rings: readonly Ring[], axis: 0 | 1, total: Integrals): number {
  const S: 'Sx' | 'Sy' = axis === 1 ? 'Sx' : 'Sy';
  const vals = rings.flat().map((p) => p[axis]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  for (let it = 0; it < 50; it++) {
    const mid = (lo + hi) / 2;
    const a = sumRings(rings.map((r) => clipRing(r, axis, mid)).filter((r) => r.length)).A;
    if (a > total.A / 2) lo = mid; else hi = mid;
  }
  const c = (lo + hi) / 2;
  const up = sumRings(rings.map((r) => clipRing(r, axis, c)).filter((r) => r.length));
  const downA = total.A - up.A, downS = total[S] - up[S];
  return (up[S] - c * up.A) - (downS - c * downA);
}

export function computeSectionProps(p: ProfileSpec): SectionProps {
  const d = p.dims;
  const { outer: o, holes: hs } = profileOutline(p, 16);
  const toMm = (pts: readonly V2[]): Ring => pts.map((v) => [v[0] * 1000, v[1] * 1000] as V2);
  let outer = toMm(o);
  if (polygonArea(outer) < 0) outer = outer.reverse();
  const holes = hs.map((h) => { const a = toMm(h); return polygonArea(a) > 0 ? a.reverse() : a; });
  const rings = [outer, ...holes];
  const T = sumRings(rings);
  const A = T.A, cx = T.Sy / A, cy = T.Sx / A;
  const Iy = T.Ixx - A * cy * cy, Iz = T.Iyy - A * cx * cx, Iyz = T.Ixy - A * cx * cy;
  const ys = outer.map((q) => Math.abs(q[1] - cy)), xs = outer.map((q) => Math.abs(q[0] - cx));
  const Wy = Iy / Math.max(...ys), Wz = Iz / Math.max(...xs);
  const Wply = plasticModulus(rings, 1, T), Wplz = plasticModulus(rings, 0, T);
  let It: number;
  const tw = d.tw ?? d.t ?? 0, tf = d.tf ?? d.t ?? 0, t = d.t ?? tf;
  if (p.kind === 'I' || p.kind === 'U' || p.kind === 'C') It = (2 * d.b * tf ** 3 + (d.h - 2 * tf) * tw ** 3) / 3;
  else if (p.kind === 'L') It = ((d.h + d.b - t) * t ** 3) / 3;
  else if (p.kind === 'RHS') { const Am = (d.h - t) * (d.b - t), pm = 2 * (d.h - t + d.b - t); It = (4 * Am * Am * t) / pm; }
  else if (p.kind === 'CHS') { const D = d.h, di = d.h - 2 * t; It = (Math.PI * (D ** 4 - di ** 4)) / 32; }
  else It = (d.b * t ** 3) / 3;
  let perim = 0;
  for (let i = 0; i < outer.length; i++) { const a = outer[i]!, b = outer[(i + 1) % outer.length]!; perim += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  const res: SectionProps = {
    A: A / 100, G: A * 1e-6 * STEEL_DENSITY, Iy: Iy / 1e4, Iz: Iz / 1e4, Wely: Wy / 1e3, Welz: Wz / 1e3, Wply: Wply / 1e3, Wplz: Wplz / 1e3,
    iy: Math.sqrt(Iy / A) / 10, iz: Math.sqrt(Iz / A) / 10, It: It / 1e4, AL: perim / 1000, cx: cx / 1000, cy: cy / 1000,
  };
  if (p.kind === 'CHS') { // boruda kesin formüller
    const D = d.h, di = d.h - 2 * t, Ac = (Math.PI * (D * D - di * di)) / 4, I = (Math.PI * (D ** 4 - di ** 4)) / 64;
    return { ...res, A: Ac / 100, G: Ac * 1e-6 * STEEL_DENSITY, Iy: I / 1e4, Iz: I / 1e4, Wely: I / (D / 2) / 1e3, Welz: I / (D / 2) / 1e3, Wply: (D ** 3 - di ** 3) / 6 / 1e3, Wplz: (D ** 3 - di ** 3) / 6 / 1e3, iy: Math.sqrt(I / Ac) / 10, iz: Math.sqrt(I / Ac) / 10, AL: (Math.PI * D) / 1000 };
  }
  if (p.kind === 'L') {
    const m = (Iy + Iz) / 2, dd = Math.sqrt(((Iy - Iz) / 2) ** 2 + Iyz ** 2);
    return { ...res, Iu: (m + dd) / 1e4, Iv: (m - dd) / 1e4, iv: Math.sqrt((m - dd) / A) / 10 };
  }
  return res;
}

// ---------------- Katalog örneği (veritabanı satırları + hesaplanmış özellikler) ----------------
export interface CatalogRow extends ProfileSpec {
  /** steel_profiles.kg_per_m — metrajın TEK ağırlık kaynağı (K-65); null → geometriden hesaplanır */
  readonly kgPerM: number | null;
  readonly isActive: boolean;
}
export interface Profile extends ProfileSpec {
  readonly props: SectionProps;
  /** mm → m ölçüler: h, b, tf, tw, t (eksikse birbirinin yerine) ve birim ağırlık G */
  readonly m: { readonly h: number; readonly b: number; readonly tf: number; readonly tw: number; readonly t: number };
  readonly G: number;
}

export class Catalog {
  private readonly rows = new Map<string, CatalogRow>();
  private readonly cache = new Map<string, Profile>();
  constructor(rows: readonly CatalogRow[]) {
    for (const r of rows) if (r.isActive) this.rows.set(r.code, r);
  }
  static standard(): Catalog { return new Catalog(STANDARD_PROFILES.map((p) => ({ ...p, kgPerM: null, isActive: true }))); }
  has(code: string): boolean { return this.rows.has(code); }
  codes(): string[] { return [...this.rows.keys()]; }
  /** Bilinmeyen kod → hata: çağıran katman (durum doğrulama) geçersiz kodu varsayılana düşürür. */
  get(code: string): Profile {
    const c = this.cache.get(code);
    if (c) return c;
    const row = this.rows.get(code);
    if (!row) throw new Error(`Katalogda olmayan profil: ${code}`);
    const props = computeSectionProps(row);
    const k = 0.001, d = row.dims;
    const tf = (d.tf ?? d.t ?? 0) * k, tw = (d.tw ?? d.t ?? 0) * k, t = (d.t ?? d.tf ?? 0) * k;
    const p: Profile = { ...row, props, m: { h: d.h * k, b: d.b * k, tf, tw, t }, G: row.kgPerM ?? props.G };
    this.cache.set(code, p);
    return p;
  }
  label(code: string): string { return this.rows.get(code)?.label ?? code; }
  ofFamilies(families: readonly FamilyKey[]): CatalogRow[] {
    return [...this.rows.values()].filter((p) => families.includes(p.family));
  }
  /** Ailedeki ilk profil ya da verilen kod (geçerliyse): geçersiz varsayılanı kurtarmak için. */
  fallback(code: string, families: readonly FamilyKey[]): string {
    if (this.rows.has(code)) return code;
    return this.ofFamilies(families)[0]?.code ?? code;
  }
}
