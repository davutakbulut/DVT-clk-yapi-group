'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { DrawKind, SelectableVariant, SurfaceKey } from '../../domain/productConfig';
import { trapPoints } from './SectionDrawing';

type Three = typeof import('three');

export interface Viewer3DProps {
  readonly v: SelectableVariant;
  readonly draw: DrawKind;
  readonly surface: SurfaceKey;
  readonly pattern: 'tear' | 'dia' | null;
  readonly format: { readonly w: number; readonly l: number } | null;
  /** Trapez: kaplama/renk seçimi ("RAL 7016" → boyalı) */
  readonly grade: string;
}

type Pt = [number, number];
const arcP = (cx: number, cy: number, r: number, a0: number, a1: number, steps = 10): Pt[] => {
  const o: Pt[] = [];
  for (let k = 0; k <= steps; k++) {
    const a = ((a0 + ((a1 - a0) * k) / steps) * Math.PI) / 180;
    o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return o;
};
const rr = (B: number, H: number, r0: number): Pt[] => {
  const r = Math.max(0, Math.min(r0, B / 2, H / 2));
  if (!r) return [[-B / 2, -H / 2], [B / 2, -H / 2], [B / 2, H / 2], [-B / 2, H / 2]];
  return [...arcP(B / 2 - r, H / 2 - r, r, 0, 90), ...arcP(-B / 2 + r, H / 2 - r, r, 90, 180), ...arcP(-B / 2 + r, -H / 2 + r, r, 180, 270), ...arcP(B / 2 - r, -H / 2 + r, r, 270, 360)];
};
const num = (v: SelectableVariant, k: string, fb = 0): number => (typeof v.dims[k] === 'number' ? (v.dims[k] as number) : fb);

/** Kesit dış hattı (mm) + uzunluk: örnek sayfaların outline() portu; plaka BoxGeometry ile ayrı. */
function outline(v: SelectableVariant, draw: DrawKind): { o: Pt[]; h?: Pt[][]; L: number } | null {
  switch (draw) {
    case 'box': {
      const H = num(v, 'H', v.heightMm ?? 0), B = num(v, 'B', v.widthMm ?? H), t = num(v, 't', v.thicknessMm ?? 2);
      const ro = num(v, 'ro', 2 * t), ri = num(v, 'ri', Math.max(ro - t, 0));
      if (!H || !B) return null;
      return { o: rr(B, H, ro), h: [rr(B - 2 * t, H - 2 * t, ri)], L: Math.max(B, H) * 2.6 };
    }
    case 'pipe': {
      const D = num(v, 'D', v.widthMm ?? 0), t = num(v, 't', v.thicknessMm ?? 2);
      if (!D) return null;
      return { o: arcP(0, 0, D / 2, 0, 360, 64), h: [arcP(0, 0, D / 2 - t, 0, 360, 64)], L: D * 2.6 };
    }
    case 'I': {
      const h = num(v, 'h', v.heightMm ?? 0), b = num(v, 'b', v.widthMm ?? 0), tw = num(v, 'tw', 5), tf = num(v, 'tf', 8), r = num(v, 'r');
      if (!h || !b) return null;
      return { o: [[-b / 2, h / 2], [b / 2, h / 2], [b / 2, h / 2 - tf], ...arcP(tw / 2 + r, h / 2 - tf - r, r, 90, 180), ...arcP(tw / 2 + r, -h / 2 + tf + r, r, 180, 270), [b / 2, -h / 2 + tf], [b / 2, -h / 2], [-b / 2, -h / 2], [-b / 2, -h / 2 + tf], ...arcP(-tw / 2 - r, -h / 2 + tf + r, r, 270, 360), ...arcP(-tw / 2 - r, h / 2 - tf - r, r, 0, 90), [-b / 2, h / 2 - tf]], L: Math.max(h, b) * 2.6 };
    }
    case 'Itaper': {
      const h = num(v, 'h', v.heightMm ?? 0), b = num(v, 'b', v.widthMm ?? 0), tw = num(v, 'tw', 5), tf = num(v, 'tf', 8), sl = num(v, 'sl', 0.14);
      if (!h || !b) return null;
      const k = (sl * (b - tw)) / 4, tt = tf - k, tr = tf + k;
      return { o: [[-b / 2, h / 2], [b / 2, h / 2], [b / 2, h / 2 - tt], [tw / 2, h / 2 - tr], [tw / 2, -h / 2 + tr], [b / 2, -h / 2 + tt], [b / 2, -h / 2], [-b / 2, -h / 2], [-b / 2, -h / 2 + tt], [-tw / 2, -h / 2 + tr], [-tw / 2, h / 2 - tr], [-b / 2, h / 2 - tt]], L: Math.max(h, b) * 2.6 };
    }
    case 'U': {
      const h = num(v, 'h', v.heightMm ?? 0), b = num(v, 'b', v.widthMm ?? 0), tw = num(v, 'tw', 5), tf = num(v, 'tf', 8), sl = num(v, 'sl');
      if (!h || !b) return null;
      if (sl) {
        const k = (sl * (b - tw)) / 2, tt = tf - k, tr = tf + k;
        return { o: [[0, h / 2], [b, h / 2], [b, h / 2 - tt], [tw, h / 2 - tr], [tw, -h / 2 + tr], [b, -h / 2 + tt], [b, -h / 2], [0, -h / 2]], L: h * 2.6 };
      }
      const r = num(v, 'r');
      return { o: [[0, -h / 2], [b, -h / 2], [b, -h / 2 + tf], ...arcP(tw + r, -h / 2 + tf + r, r, 270, 180), ...arcP(tw + r, h / 2 - tf - r, r, 180, 90), [b, h / 2 - tf], [b, h / 2], [0, h / 2]], L: h * 2.6 };
    }
    case 'L': {
      const a = num(v, 'a', v.heightMm ?? 0), b = num(v, 'b', v.widthMm ?? a), t = num(v, 't', v.thicknessMm ?? 3), r = num(v, 'r'), r2 = r / 2;
      if (!a || !b) return null;
      return { o: [[0, 0], [b, 0], ...arcP(b - r2, t - r2, r2, 0, 90, 6), ...arcP(t + r, t + r, r, 270, 180), ...arcP(t - r2, a - r2, r2, 0, 90, 6), [0, a]], L: Math.max(a, b) * 2.8 };
    }
    case 'T': {
      const h = num(v, 'h', v.heightMm ?? 0), b = num(v, 'b', v.widthMm ?? h), t = num(v, 't', v.thicknessMm ?? 3), r = num(v, 'r');
      if (!h || !b) return null;
      return { o: [[-b / 2, h], [b / 2, h], [b / 2, h - t], ...arcP(t / 2 + r, h - t - r, r, 90, 180), [t / 2, 0], [-t / 2, 0], ...arcP(-t / 2 - r, h - t - r, r, 0, 90), [-b / 2, h - t]], L: h * 2.8 };
    }
    case 'flat': {
      const w = num(v, 'w', v.widthMm ?? 0), t = num(v, 't', v.thicknessMm ?? 3);
      if (!w) return null;
      return { o: [[-w / 2, -t / 2], [w / 2, -t / 2], [w / 2, t / 2], [-w / 2, t / 2]], L: w * 1.6 };
    }
    case 'trap': {
      const we = num(v, 'we', v.widthMm ?? 1000), t = num(v, 't', v.thicknessMm ?? 0.5);
      const tt = Math.max(t * 2.2, we / 260);
      const { pts } = trapPoints(v.dims);
      const q = pts.map(([x, y]): Pt => [x, y - tt]).reverse();
      return { o: [...pts, ...q], L: we * 0.85 };
    }
    default:
      return null;
  }
}

const RAL: Record<string, string> = { '9002': '#D7D5CB', '7016': '#383E42', '3009': '#6D342D', '6020': '#37422F', '9006': '#A5A5A5' };
const BASE: Record<SurfaceKey, string> = { black: '#3b3f45', galv: '#c3cad2', red: '#8a2e22', raw: '#a7afb8', alu: '#d9dde2', ss: '#cfd4da' };

/**
 * 3B görünüm (K-90): three.js YALNIZ bu bileşen bağlanınca (kullanıcı "3B"ye basınca) dinamik import ile yüklenir —
 * ürün sayfasının ilk yüküne girmez (K-24 bütçesi). Kesit dış hattı z ekseninde ekstrüde edilir; yüzey/kaplama dokusu canvas'tan.
 */
export function ProductViewer3D({ v, draw, surface, pattern, format, grade }: Viewer3DProps) {
  const t = useTranslations('Products.viewer3d');
  const box = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [spin, setSpin] = useState(() => typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const api = useRef<{ T: Three; renderer: import('three').WebGLRenderer; scene: import('three').Scene; camera: import('three').PerspectiveCamera; grp: import('three').Group; tex: Map<string, import('three').CanvasTexture> } | null>(null);
  const view = useRef({ rx: -0.45, ry: 0.7, zoom: 1, spin: true, drag: null as { x: number; y: number } | null });
  view.current.spin = spin;

  // Kurulum: three.js yükle, sahne/ışık/kamera, olaylar, render döngüsü
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let raf = 0;
    let disposed = false;
    let ro: ResizeObserver | null = null;
    const listeners: [string, EventListener][] = [];
    import('three')
      .then((T) => {
        if (disposed) return;
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = T.SRGBColorSpace;
        el.appendChild(renderer.domElement);
        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(35, 1, 0.01, 100);
        scene.add(new T.HemisphereLight(0xe6eef8, 0x1c2a3d, 2.2));
        scene.add(new T.AmbientLight(0xffffff, 0.8));
        const d1 = new T.DirectionalLight(0xffffff, 3.2);
        d1.position.set(3, 5, 4);
        const d2 = new T.DirectionalLight(0xbcd0ff, 1.4);
        d2.position.set(-4, 1.5, -3);
        const d3 = new T.DirectionalLight(0xffffff, 0.9);
        d3.position.set(0, -3, 2);
        scene.add(d1, d2, d3);
        const grp = new T.Group();
        scene.add(grp);
        api.current = { T, renderer, scene, camera, grp, tex: new Map() };
        const size = () => {
          const w = el.clientWidth || 400;
          const h = el.clientHeight || 380;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        ro = new ResizeObserver(size);
        ro.observe(el);
        size();
        const on = (type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
          el.addEventListener(type, fn, opts);
          listeners.push([type, fn]);
        };
        on('pointerdown', (e) => {
          const pe = e as PointerEvent;
          if ((pe.target as HTMLElement).closest('.pcfg-v3ctl')) return;
          view.current.drag = { x: pe.clientX, y: pe.clientY };
          el.setPointerCapture(pe.pointerId);
          setSpin(false);
        });
        on('pointermove', (e) => {
          const pe = e as PointerEvent;
          const d = view.current.drag;
          if (!d) return;
          view.current.ry += (pe.clientX - d.x) * 0.01;
          view.current.rx = Math.max(-1.5, Math.min(1.5, view.current.rx + (pe.clientY - d.y) * 0.01));
          view.current.drag = { x: pe.clientX, y: pe.clientY };
        });
        on('pointerup', () => { view.current.drag = null; });
        on('pointercancel', () => { view.current.drag = null; });
        on('wheel', (e) => {
          const we = e as WheelEvent;
          if (!we.ctrlKey) return;
          we.preventDefault();
          view.current.zoom = Math.max(0.5, Math.min(2.5, view.current.zoom * (we.deltaY > 0 ? 1.1 : 0.9)));
        }, { passive: false });
        on('keydown', (e) => {
          const ke = e as KeyboardEvent;
          const k: Record<string, [number, number]> = { ArrowLeft: [0, -0.15], ArrowRight: [0, 0.15], ArrowUp: [-0.15, 0], ArrowDown: [0.15, 0] };
          const m = k[ke.key];
          if (!m) return;
          ke.preventDefault();
          view.current.rx += m[0];
          view.current.ry += m[1];
          setSpin(false);
        });
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (document.hidden) return;
          const s = view.current;
          if (s.spin) s.ry += 0.006;
          grp.rotation.set(s.rx, s.ry, 0);
          camera.position.set(0, 0, 3.1 * s.zoom);
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
        };
        loop();
        setStatus('ready');
      })
      .catch(() => setStatus('failed'));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      for (const [type, fn] of listeners) el.removeEventListener(type, fn);
      const a = api.current;
      if (a) {
        clearGroup(a.grp);
        for (const tx of a.tex.values()) tx.dispose();
        a.renderer.dispose();
        a.renderer.domElement.remove();
        api.current = null;
      }
    };
  }, []);

  // Model: seçim/yüzey/ebat değişince yeniden kur
  useEffect(() => {
    if (status !== 'ready' || !api.current) return;
    const a = api.current;
    const { T } = a;
    clearGroup(a.grp);
    const canvasTex = (key: string, paint: (g: CanvasRenderingContext2D) => void, rep?: [number, number]) => {
      let base = a.tex.get(key);
      if (!base) {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        paint(c.getContext('2d')!);
        base = new T.CanvasTexture(c);
        base.wrapS = base.wrapT = T.RepeatWrapping;
        base.colorSpace = T.SRGBColorSpace;
        base.anisotropy = 4;
        a.tex.set(key, base);
      }
      const tx = base.clone();
      tx.needsUpdate = true;
      if (rep) tx.repeat.set(rep[0], rep[1]);
      return tx;
    };
    const material = (rep?: [number, number]) => {
      let k: SurfaceKey | 'az' = surface;
      if (draw === 'trap') {
        const m = /RAL (\d{4})/.exec(grade);
        if (m) return new T.MeshStandardMaterial({ color: RAL[m[1]!] ?? '#999999', metalness: 0.25, roughness: 0.45, side: T.DoubleSide });
        k = /Alüzinc|Aluzinc|AZ/i.test(grade) ? 'az' : 'galv';
      }
      const r = rep ?? [1 / 60, 1 / 60];
      const std = (map: import('three').Texture, metalness: number, roughness: number) => new T.MeshStandardMaterial({ map, metalness, roughness, side: T.DoubleSide });
      switch (k) {
        case 'galv': return std(canvasTex('galv', (g) => spangle(g, '#c3cad2'), r), 0.75, 0.32);
        case 'az': return std(canvasTex('az', (g) => spangle(g, '#b9c0c8'), [r[0] * 3, r[1] * 3]), 0.7, 0.3);
        case 'red': return std(canvasTex('red', (g) => noise(g, '#8a2e22', 18), r), 0.05, 0.82);
        case 'raw': return std(canvasTex('raw', (g) => brushed(g, '#a7afb8'), r), 0.7, 0.28);
        case 'alu': return std(canvasTex('alu', (g) => brushed(g, '#d9dde2'), r), 0.6, 0.3);
        case 'ss': return std(canvasTex('ss', (g) => brushed(g, '#cfd4da'), r), 0.85, 0.22);
        default: return std(canvasTex('black', (g) => noise(g, '#3b3f45', 22), r), 0.55, 0.6);
      }
    };
    let geo: import('three').BufferGeometry;
    let mat: import('three').Material | import('three').Material[];
    let scale: number;
    if (draw === 'plate') {
      const w = format?.w ?? 1500;
      const l = format?.l ?? 3000;
      const th = Math.max(num(v, 't', v.thicknessMm ?? 1), l / 120);
      geo = new T.BoxGeometry(l, th, w);
      scale = 1.9 / Math.max(l, w);
      const side = material([l / 300, 1]);
      let top: import('three').Material = material([l / 400, w / 400]);
      if (pattern) {
        const tx = canvasTex(`pat-${pattern}${BASE[surface]}`, (g) => patternTex(g, pattern, BASE[surface]), [l / 32, w / 32]);
        top = new T.MeshStandardMaterial({ map: tx, metalness: side.metalness, roughness: side.roughness });
      }
      mat = [side, side, top, top, side, side];
    } else {
      const O = outline(v, draw);
      if (!O) return;
      const sh = new T.Shape(O.o.map(([x, y]) => new T.Vector2(x, y)));
      for (const h of O.h ?? []) sh.holes.push(new T.Path(h.map(([x, y]) => new T.Vector2(x, y))));
      geo = new T.ExtrudeGeometry(sh, { depth: O.L, bevelEnabled: false, curveSegments: 12, steps: 1 });
      geo.center();
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      scale = 1.9 / Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
      geo.computeVertexNormals();
      mat = material();
    }
    const mesh = new T.Mesh(geo, mat);
    mesh.scale.setScalar(scale);
    a.grp.add(mesh);
  }, [status, v, draw, surface, pattern, format, grade]);

  const zoomBy = (f: number) => { view.current.zoom = Math.max(0.5, Math.min(2.5, view.current.zoom * f)); };
  return (
    <div ref={box} className="pcfg-v3" tabIndex={0} aria-label={t('label')}>
      {status !== 'ready' ? <p className="pcfg-v3msg">{status === 'failed' ? t('failed') : t('loading')}</p> : null}
      <div className="pcfg-v3ctl">
        <button type="button" aria-pressed={spin} onClick={() => setSpin((s) => !s)}>{t('spin')}</button>
        <button type="button" onClick={() => zoomBy(0.85)} aria-label={t('zoomIn')}>+</button>
        <button type="button" onClick={() => zoomBy(1.18)} aria-label={t('zoomOut')}>−</button>
        <button type="button" onClick={() => { view.current.rx = -0.45; view.current.ry = 0.7; view.current.zoom = 1; }}>{t('reset')}</button>
      </div>
      <p className="pcfg-v3hint" aria-hidden="true">{t('hint')}</p>
    </div>
  );
}

function clearGroup(grp: import('three').Group) {
  while (grp.children.length) {
    const m = grp.children.pop() as import('three').Mesh;
    m.geometry.dispose();
    for (const x of Array.isArray(m.material) ? m.material : [m.material]) {
      const map = (x as import('three').MeshStandardMaterial).map;
      if (map) map.dispose();
      x.dispose();
    }
  }
}
/* Dokular: deterministik sözde rastgele (aynı görünüm her yüklemede) */
const lcg = (s: number) => (s * 9301 + 49297) % 233280;
function spangle(g: CanvasRenderingContext2D, base: string) {
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  let s = 7;
  for (let i = 0; i < 110; i++) {
    s = lcg(s); const x = (s / 233280) * 256;
    s = lcg(s); const y = (s / 233280) * 256;
    s = lcg(s); const r = 10 + (s / 233280) * 26;
    s = lcg(s); const l = 180 + Math.floor((s / 233280) * 60);
    g.fillStyle = `rgba(${l},${l + 4},${l + 10},.35)`;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 6.283 + i;
      g.lineTo(x + Math.cos(a) * r * (0.7 + (0.3 * ((k * 7 + i) % 3)) / 2), y + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  }
}
function noise(g: CanvasRenderingContext2D, base: string, amt: number) {
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  const im = g.getImageData(0, 0, 256, 256);
  let s = 11;
  for (let i = 0; i < im.data.length; i += 4) {
    s = lcg(s);
    const d = (s / 233280 - 0.5) * amt;
    im.data[i] = im.data[i]! + d;
    im.data[i + 1] = im.data[i + 1]! + d;
    im.data[i + 2] = im.data[i + 2]! + d;
  }
  g.putImageData(im, 0, 0);
}
function brushed(g: CanvasRenderingContext2D, base: string) {
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  let s = 5;
  for (let y = 0; y < 256; y++) {
    s = lcg(s);
    g.fillStyle = `rgba(255,255,255,${(s / 233280) * 0.12})`;
    g.fillRect(0, y, 256, 1);
  }
}
function patternTex(g: CanvasRenderingContext2D, kind: 'tear' | 'dia', base: string) {
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  const hi = 'rgba(255,255,255,.55)';
  const lo = 'rgba(0,0,0,.35)';
  if (kind === 'tear') {
    ([[64, 64], [192, 192], [192, 64], [64, 192]] as const).forEach(([x, y], i) => {
      const aa = ((i < 2 ? 45 : -45) * Math.PI) / 180;
      g.save();
      g.translate(x, y);
      g.rotate(aa);
      g.fillStyle = lo; g.beginPath(); g.ellipse(3, 3, 46, 15, 0, 0, 6.283); g.fill();
      g.fillStyle = hi; g.beginPath(); g.ellipse(-2, -2, 44, 13, 0, 0, 6.283); g.fill();
      g.fillStyle = base; g.beginPath(); g.ellipse(0, 0, 40, 10, 0, 0, 6.283); g.fill();
      g.restore();
    });
  } else {
    g.lineWidth = 10; g.strokeStyle = lo;
    g.beginPath(); g.moveTo(128, 4); g.lineTo(252, 128); g.lineTo(128, 252); g.lineTo(4, 128); g.closePath(); g.stroke();
    g.lineWidth = 5; g.strokeStyle = hi; g.stroke();
  }
}
