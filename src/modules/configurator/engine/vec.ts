/**
 * Saf 3B vektör / taban (basis) matematiği (K-110): motor Three.js'e bağlı değildir; sahne yalnız çizer (K-65).
 * Üçlü dizi `V3` kayıt biçimidir; `Vec3` hesap için küçük, değişebilir sınıf (three.Vector3'ün kullanılan alt kümesi).
 */
export type V3 = readonly [number, number, number];
export type V2 = readonly [number, number];

export class Vec3 {
  constructor(public x = 0, public y = 0, public z = 0) {}
  static from(p: V3 | Vec3): Vec3 { return p instanceof Vec3 ? p.clone() : new Vec3(p[0], p[1], p[2]); }
  clone(): Vec3 { return new Vec3(this.x, this.y, this.z); }
  set(x: number, y: number, z: number): this { this.x = x; this.y = y; this.z = z; return this; }
  setZ(z: number): this { this.z = z; return this; }
  copy(v: Vec3): this { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  add(v: Vec3): this { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v: Vec3): this { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  addScaledVector(v: Vec3, s: number): this { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  multiplyScalar(s: number): this { this.x *= s; this.y *= s; this.z *= s; return this; }
  negate(): this { return this.multiplyScalar(-1); }
  dot(v: Vec3): number { return this.x * v.x + this.y * v.y + this.z * v.z; }
  lengthSq(): number { return this.dot(this); }
  length(): number { return Math.sqrt(this.lengthSq()); }
  normalize(): this { const l = this.length(); return l > 0 ? this.multiplyScalar(1 / l) : this; }
  distanceTo(v: Vec3): number { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  crossVectors(a: Vec3, b: Vec3): this { return this.set(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
  lerpVectors(a: Vec3, b: Vec3, t: number): this { return this.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); }
  toArray(): V3 { return [this.x, this.y, this.z]; }
}

export const v3 = (p: V3 | Vec3): Vec3 => Vec3.from(p);
export const X: V3 = [1, 0, 0];
export const Y: V3 = [0, 1, 0];
export const Z: V3 = [0, 0, 1];
export const UP = new Vec3(0, 1, 0);

/** Dik üçlü eksen (sütunlar): three `Matrix4.makeBasis(x, y, z)` ile aynı anlam. */
export interface Basis {
  readonly x: V3;
  readonly y: V3;
  readonly z: V3;
}
export const IDENTITY: Basis = { x: X, y: Y, z: Z };

/** Konum + taban + ölçek: sahnede `compose(position, rotation, scale)`. */
export interface Transform {
  readonly position: V3;
  readonly basis: Basis;
  readonly scale: V3;
}
export const ONE: V3 = [1, 1, 1];
export const transform = (position: V3 | Vec3, basis: Basis = IDENTITY, scale: V3 = ONE): Transform => ({ position: position instanceof Vec3 ? position.toArray() : position, basis, scale });

/** Tabana göre yerel vektörü dünyaya çevirir. */
export function applyBasis(b: Basis, v: V3): V3 {
  return [b.x[0] * v[0] + b.y[0] * v[1] + b.z[0] * v[2], b.x[1] * v[0] + b.y[1] * v[1] + b.z[1] * v[2], b.x[2] * v[0] + b.y[2] * v[1] + b.z[2] * v[2]];
}

/** Eksen etrafında döndürme (Rodrigues). */
function rotateAbout(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const k = axis.clone().normalize();
  const cross = new Vec3().crossVectors(k, v);
  return v.clone().multiplyScalar(c).add(cross.multiplyScalar(s)).addScaledVector(k, k.dot(v) * (1 - c));
}

/** `Quaternion.setFromUnitVectors(from, to)` karşılığı: from'u to'ya götüren en kısa dönmenin tabanı. */
export function basisFromUnitVectors(from: V3 | Vec3, to: V3 | Vec3): Basis {
  const a = v3(from).normalize(), b = v3(to).normalize();
  const d = a.dot(b);
  if (d > 1 - 1e-9) return IDENTITY;
  let axis: Vec3;
  if (d < -1 + 1e-9) {
    axis = new Vec3().crossVectors(new Vec3(1, 0, 0), a);
    if (axis.lengthSq() < 1e-9) axis = new Vec3().crossVectors(new Vec3(0, 1, 0), a);
    axis.normalize();
    return rotationBasis(axis, Math.PI);
  }
  axis = new Vec3().crossVectors(a, b).normalize();
  return rotationBasis(axis, Math.acos(Math.max(-1, Math.min(1, d))));
}

/** Eksen–açı dönmesinin tabanı. */
export function rotationBasis(axis: Vec3, angle: number): Basis {
  return { x: rotateAbout(new Vec3(1, 0, 0), axis, angle).toArray(), y: rotateAbout(new Vec3(0, 1, 0), axis, angle).toArray(), z: rotateAbout(new Vec3(0, 0, 1), axis, angle).toArray() };
}

/** Yerel z ekseni = a→b doğrultusu; yerel x `ref`e olabildiğince paralel; isteğe bağlı yerel z etrafında `roll`. (Kit.orient) */
export function orientBasis(a: Vec3, b: Vec3, ref: V3 | Vec3 = Z, roll = 0): Basis {
  const zAxis = b.clone().sub(a).normalize();
  const r = v3(ref);
  let xAxis = r.clone().sub(zAxis.clone().multiplyScalar(r.dot(zAxis)));
  if (xAxis.lengthSq() < 1e-6) xAxis = new Vec3(1, 0, 0).sub(zAxis.clone().multiplyScalar(zAxis.x));
  if (xAxis.lengthSq() < 1e-6) xAxis = new Vec3(0, 1, 0).sub(zAxis.clone().multiplyScalar(zAxis.y));
  xAxis.normalize();
  const yAxis = new Vec3().crossVectors(zAxis, xAxis).normalize();
  if (roll) {
    const rx = rotateAbout(xAxis, zAxis, roll), ry = rotateAbout(yAxis, zAxis, roll);
    return { x: rx.toArray(), y: ry.toArray(), z: zAxis.toArray() };
  }
  return { x: xAxis.toArray(), y: yAxis.toArray(), z: zAxis.toArray() };
}

/** Üç eksenden taban (`Matrix4.makeBasis`). */
export const makeBasis = (x: V3 | Vec3, y: V3 | Vec3, z: V3 | Vec3): Basis => ({ x: v3(x).toArray(), y: v3(y).toArray(), z: v3(z).toArray() });

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const degToRad = (d: number): number => (d * Math.PI) / 180;

/** Çokgen alanı (ayakkabı bağı). */
export function polygonArea(pts: readonly V2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i]!, q = pts[(i + 1) % pts.length]!; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}

/** Dışbükey zarf (Andrew). */
export function convexHull(points: readonly V2[]): V2[] {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: V2[] = [], upper: V2[] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]!; while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop(); upper.push(q); }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}
