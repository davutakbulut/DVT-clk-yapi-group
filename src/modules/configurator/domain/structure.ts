import type { Params } from './params';

/**
 * Parametrik çelik yapı — SAF geometri (prototip v4'ün `build()` mantığı; Three.js yok). Çıktı hem 3D sahne hem metraj motorunun
 * tek kaynağıdır: her eleman (grup, profil, uç noktaları, uzunluk), plakalar/cıvatalar (adet), paneller (alan).
 * Koordinat: x = en ekseni (merkez 0), y = yükseklik, z = boy ekseni (merkez 0). Birim metre.
 */
export type Vec3 = readonly [number, number, number];
export type MemberGroup = 'column' | 'rafter' | 'truss_chord' | 'truss_web' | 'secondary' | 'wind_column' | 'brace_wall' | 'brace_roof' | 'purlin' | 'girt' | 'door_frame';
export type ProfileKey = 'column' | 'rafter' | 'secondary' | 'wind_column' | 'purlin_small_bay' | 'purlin_large_bay' | 'brace' | 'truss_chord' | 'door_frame';

export interface Member {
  readonly group: MemberGroup;
  readonly profile: ProfileKey;
  readonly p1: Vec3;
  readonly p2: Vec3;
  readonly length: number;
  /** Aşık/kuşak: yerel eksen hizası (yüzey normali) — sahne için. */
  readonly align?: { readonly x: number; readonly y: number; readonly axis: 'x' | 'y' };
}
export interface Panel {
  readonly kind: 'wall' | 'roof' | 'gable';
  readonly pts: readonly [Vec3, Vec3, Vec3, Vec3];
  readonly area: number;
}
export interface Plate {
  readonly kind: 'base' | 'gusset' | 'node' | 'clip';
  readonly at: Vec3;
  readonly size: number;
}
export interface DoorSpec {
  readonly x1: number;
  readonly x2: number;
  readonly h: number;
  readonly segmentIndex: number;
}
export interface Structure {
  readonly params: Params;
  readonly system: 'portal' | 'truss';
  readonly bays: number;
  readonly baySpacing: number;
  readonly axes: readonly number[];
  readonly members: readonly Member[];
  readonly panels: readonly Panel[];
  readonly plates: readonly Plate[];
  readonly boltCount: number;
  readonly door: DoorSpec | null;
  readonly windColumnsPerGable: number;
  readonly footprint: number;
}

export interface StructureOptions {
  readonly trussThresholdM?: number;
  readonly purlinSpacingM?: number;
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
function quadArea(p: readonly [Vec3, Vec3, Vec3, Vec3]): number {
  const cross = (u: Vec3, v: Vec3): Vec3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => {
    const x = cross(sub(b, a), sub(c, a));
    return Math.hypot(x[0], x[1], x[2]) / 2;
  };
  return r3(tri(p[0], p[1], p[2]) + tri(p[0], p[2], p[3]));
}
export function slopePoint(side: -1 | 1, t: number, z: number, width: number, eave: number, ridge: number): Vec3 {
  return [side * (width / 2) * (1 - t), eave + (ridge - eave) * t, z];
}
export function heightAtX(x: number, halfWidth: number, eave: number, ridge: number): number {
  return eave + (ridge - eave) * (1 - Math.abs(x) / halfWidth);
}
export function computeSegments(width: number): { numSeg: number; segW: number; xs: number[] } {
  const numSeg = Math.max(1, Math.ceil(width / 5));
  const segW = width / numSeg;
  const xs: number[] = [];
  for (let i = 0; i <= numSeg; i += 1) xs.push(-width / 2 + i * segW);
  return { numSeg, segW, xs };
}

export function buildStructure(params: Params, opts: StructureOptions = {}): Structure {
  const trussThreshold = opts.trussThresholdM ?? 30;
  const purlinSpacing = opts.purlinSpacingM ?? 1;
  const { width, length, eave, ridge, bay } = params;
  const halfWidth = width / 2;
  const numBays = Math.max(1, Math.round(length / bay));
  const spacing = length / numBays;
  const axes: number[] = [];
  for (let i = 0; i <= numBays; i += 1) axes.push(r3(-length / 2 + i * spacing));
  const zFront = axes[0]!;
  const zBack = axes[axes.length - 1]!;
  const useTruss = width > trussThreshold;
  const members: Member[] = [];
  const panels: Panel[] = [];
  const plates: Plate[] = [];
  let bolts = 0;
  const add = (group: MemberGroup, profile: ProfileKey, p1: Vec3, p2: Vec3, align?: Member['align']) => {
    members.push({ group, profile, p1, p2, length: r3(dist(p1, p2)), ...(align ? { align } : {}) });
  };

  // Ana çerçeveler
  for (const z of axes) {
    const lTop: Vec3 = [-halfWidth, eave, z];
    const rTop: Vec3 = [halfWidth, eave, z];
    add('column', 'column', [-halfWidth, 0, z], lTop);
    add('column', 'column', [halfWidth, 0, z], rTop);
    plates.push({ kind: 'base', at: [-halfWidth, 0, z], size: 0.52 }, { kind: 'base', at: [halfWidth, 0, z], size: 0.52 });
    if (!useTruss) {
      const ridgeTop: Vec3 = [0, ridge, z];
      add('rafter', 'rafter', lTop, ridgeTop);
      add('rafter', 'rafter', ridgeTop, rTop);
      plates.push({ kind: 'gusset', at: [-halfWidth, eave, z], size: 1.05 }, { kind: 'gusset', at: [halfWidth, eave, z], size: 1.05 }, { kind: 'gusset', at: [0, ridge, z], size: 1.3 }, { kind: 'node', at: ridgeTop, size: 0.22 });
      bolts += 3 * 2 * 2 + 2 * 4;
    } else {
      const numPanels = Math.max(6, Math.round(width / 2.5));
      const top: Vec3[] = [];
      const bot: Vec3[] = [];
      for (let i = 0; i <= numPanels; i += 1) {
        const x = -halfWidth + (i * width) / numPanels;
        top.push([x, heightAtX(x, halfWidth, eave, ridge), z]);
        bot.push([x, eave, z]);
      }
      for (let i = 0; i < numPanels; i += 1) {
        add('truss_chord', 'truss_chord', top[i]!, top[i + 1]!);
        add('truss_chord', 'truss_chord', bot[i]!, bot[i + 1]!);
      }
      for (let i = 0; i < numPanels; i += 1) {
        if (i % 2 === 0) add('truss_web', 'truss_chord', bot[i]!, top[i + 1]!);
        else add('truss_web', 'truss_chord', top[i]!, bot[i + 1]!);
      }
      plates.push({ kind: 'gusset', at: [-halfWidth, eave, z], size: 0.68 }, { kind: 'gusset', at: [halfWidth, eave, z], size: 0.68 }, { kind: 'node', at: [0, ridge, z], size: 0.24 });
    }
  }

  // Boyuna ikincil kirişler (mafsallı IPE300) + mahya kirişi (portal)
  for (let i = 0; i < axes.length - 1; i += 1) {
    const z1 = axes[i]!;
    const z2 = axes[i + 1]!;
    add('secondary', 'secondary', [-halfWidth, eave, z1], [-halfWidth, eave, z2]);
    add('secondary', 'secondary', [halfWidth, eave, z1], [halfWidth, eave, z2]);
    plates.push({ kind: 'clip', at: [-halfWidth, eave, z1], size: 0.1 }, { kind: 'clip', at: [-halfWidth, eave, z2], size: 0.1 }, { kind: 'clip', at: [halfWidth, eave, z1], size: 0.1 }, { kind: 'clip', at: [halfWidth, eave, z2], size: 0.1 });
    if (!useTruss) add('secondary', 'secondary', [0, ridge, z1], [0, ridge, z2]);
  }

  // Yan duvar çaprazları (boru, atlamalı akslar)
  for (const x of [-halfWidth, halfWidth]) {
    for (let i = 0; i < numBays; i += 2) {
      const z1 = axes[i]!;
      const z2 = axes[i + 1]!;
      add('brace_wall', 'brace', [x, 0, z1], [x, eave, z2]);
      add('brace_wall', 'brace', [x, eave, z1], [x, 0, z2]);
      plates.push({ kind: 'node', at: [x, eave / 2, (z1 + z2) / 2], size: 0.15 });
    }
  }

  // Çatı çaprazları: eğim uzunluğu 5 m'lik dilimlerde, atlamalı akslar
  const nSegSide = Math.max(1, Math.round(halfWidth / 5));
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < numBays; i += 2) {
      const z1 = axes[i]!;
      const z2 = axes[i + 1]!;
      for (let s = 0; s < nSegSide; s += 1) {
        const t0 = s / nSegSide;
        const t1 = (s + 1) / nSegSide;
        const A = slopePoint(side, t0, z1, width, eave, ridge);
        const B = slopePoint(side, t1, z1, width, eave, ridge);
        const C = slopePoint(side, t0, z2, width, eave, ridge);
        const D = slopePoint(side, t1, z2, width, eave, ridge);
        add('brace_roof', 'brace', A, D);
        add('brace_roof', 'brace', B, C);
        plates.push({ kind: 'node', at: [(A[0] + D[0]) / 2, (A[1] + D[1]) / 2, (A[2] + D[2]) / 2], size: 0.14 });
      }
    }
  }

  // Alın rüzgar kolonları (eşit aralık, ≤ 5 m) + kapı
  const seg = computeSegments(width);
  let door: DoorSpec | null = null;
  if (params.door) {
    const idx = Math.floor(seg.numSeg / 2);
    const x1 = seg.xs[idx]!;
    const x2 = seg.xs[idx + 1]!;
    const doorW = Math.max(0.5, x2 - x1 - 1);
    const maxH = eave >= 6 ? 5 : Math.max(0.5, eave - 1);
    const doorH = Math.min(maxH, eave - 0.3);
    const cx = (x1 + x2) / 2;
    door = { x1: r3(cx - doorW / 2), x2: r3(cx + doorW / 2), h: r3(doorH), segmentIndex: idx };
  }
  for (const zEnd of [zFront, zBack]) {
    for (let k = 1; k < seg.numSeg; k += 1) {
      const x = seg.xs[k]!;
      const topY = heightAtX(x, halfWidth, eave, ridge);
      add('wind_column', 'wind_column', [x, 0, zEnd], [x, topY, zEnd]);
      plates.push({ kind: 'base', at: [x, 0, zEnd], size: 0.34 }, { kind: 'clip', at: [x, topY, zEnd], size: 0.1 });
    }
  }

  // Aşık (çatı, eğime oturan) & kuşak (duvar, dışa taşkın)
  if (params.purlins) {
    const profile: ProfileKey = bay <= 5 ? 'purlin_small_bay' : 'purlin_large_bay';
    const slopeLen = Math.hypot(halfWidth, ridge - eave);
    const nRows = Math.max(1, Math.floor(slopeLen / purlinSpacing));
    const roofClear = 0.27;
    for (let row = 1; row <= nRows; row += 1) {
      const t = (row * purlinSpacing) / slopeLen;
      if (t >= 0.98) continue;
      for (const side of [-1, 1] as const) {
        const p = slopePoint(side, t, 0, width, eave, ridge);
        const dir = side === -1 ? [-(ridge - eave), halfWidth] : [ridge - eave, halfWidth];
        const dl = Math.hypot(dir[0]!, dir[1]!);
        const nx = dir[0]! / dl;
        const ny = dir[1]! / dl;
        add('purlin', profile, [p[0] + nx * roofClear, p[1] + ny * roofClear, zFront], [p[0] + nx * roofClear, p[1] + ny * roofClear, zBack], { x: nx, y: ny, axis: 'y' });
      }
    }
    const girtOutset = 0.32;
    for (let y = purlinSpacing; y < eave - 0.3; y += purlinSpacing) {
      add('girt', profile, [-halfWidth - girtOutset, y, zFront], [-halfWidth - girtOutset, y, zBack], { x: -1, y: 0, axis: 'x' });
      add('girt', profile, [halfWidth + girtOutset, y, zFront], [halfWidth + girtOutset, y, zBack], { x: 1, y: 0, axis: 'x' });
    }
  }

  if (door) {
    const zf = zFront + 0.03;
    add('door_frame', 'door_frame', [door.x1, 0, zf], [door.x1, door.h, zf]);
    add('door_frame', 'door_frame', [door.x2, 0, zf], [door.x2, door.h, zf]);
    add('door_frame', 'door_frame', [door.x1, door.h, zf], [door.x2, door.h, zf]);
  }

  // Paneller: duvar + çatı + alınlar (kapı boşluğu düşülür) — metraj için her zaman hesaplanır, görünürlük parametre
  const addPanel = (kind: Panel['kind'], pts: readonly [Vec3, Vec3, Vec3, Vec3]) => panels.push({ kind, pts, area: quadArea(pts) });
  for (let i = 0; i < numBays; i += 1) {
    const z1 = axes[i]!;
    const z2 = axes[i + 1]!;
    addPanel('wall', [[-halfWidth, 0, z1], [-halfWidth, eave, z1], [-halfWidth, eave, z2], [-halfWidth, 0, z2]]);
    addPanel('wall', [[halfWidth, 0, z2], [halfWidth, eave, z2], [halfWidth, eave, z1], [halfWidth, 0, z1]]);
    for (let s = 0; s < nSegSide; s += 1) {
      const t0 = s / nSegSide;
      const t1 = (s + 1) / nSegSide;
      for (const side of [-1, 1] as const) {
        addPanel('roof', [slopePoint(side, t0, z1, width, eave, ridge), slopePoint(side, t1, z1, width, eave, ridge), slopePoint(side, t1, z2, width, eave, ridge), slopePoint(side, t0, z2, width, eave, ridge)]);
      }
    }
  }
  for (const [gi, zEnd] of [zFront, zBack].entries()) {
    for (let k = 0; k < seg.numSeg; k += 1) {
      const x1 = seg.xs[k]!;
      const x2 = seg.xs[k + 1]!;
      const h1 = heightAtX(x1, halfWidth, eave, ridge);
      const h2 = heightAtX(x2, halfWidth, eave, ridge);
      if (gi === 0 && door && k === door.segmentIndex) {
        addPanel('gable', [[x1, door.h, zEnd], [x1, h1, zEnd], [x2, h2, zEnd], [x2, door.h, zEnd]]);
        continue;
      }
      addPanel('gable', [[x1, 0, zEnd], [x1, h1, zEnd], [x2, h2, zEnd], [x2, 0, zEnd]]);
    }
  }

  return { params, system: useTruss ? 'truss' : 'portal', bays: numBays, baySpacing: r3(spacing), axes, members, panels, plates, boltCount: bolts, door, windColumnsPerGable: seg.numSeg - 1, footprint: r3(width * length) };
}
