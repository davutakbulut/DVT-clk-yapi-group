import { STEEL_DENSITY, type Catalog, type Profile } from './catalog';
import { MAT, type MaterialDesc } from './materials';
import { BOLT_D, PLATE_T } from './constants';
import { basisFromUnitVectors, convexHull, IDENTITY, makeBasis, orientBasis, polygonArea, transform, UP, v3, Vec3, X, Y, Z, type Basis, type Transform, type V2, type V3 } from './vec';

/**
 * Kit (K-110): yapım fonksiyonlarının sahneye "çizdiği" her şeyi KAYDEDER; Three.js nesnesi üretmez (K-65).
 * Aynı çağrıda levha ve cıvata sayımını yapar; sahne `Model`i çizer, metraj aynı kayıttan okunur → görünen = sayılan.
 */
export type GeometryDesc =
  | { readonly kind: 'unitBox' }
  | { readonly kind: 'profile'; readonly code: string; readonly len: number; readonly centroid: boolean };

export interface MemberRec { readonly code: string; readonly mat: MaterialDesc; readonly a: V3; readonly b: V3; readonly basis: Basis; readonly len: number; readonly double?: number; readonly cutX: boolean }
export interface PlateRec { readonly outer: readonly V2[]; readonly t: number; readonly position: V3; readonly basis: Basis; readonly mat: MaterialDesc }
export interface BoxRec { readonly transform: Transform; readonly mat: MaterialDesc }
export interface BoltBatch { readonly d: number; readonly grip: number; readonly transforms: Transform[] }
export interface QuadRec { readonly pts: readonly [V3, V3, V3, V3]; readonly mat: MaterialDesc }
export interface PolygonRec { readonly outer: readonly V2[]; readonly holes: readonly (readonly V2[])[]; readonly position: V3; readonly mat: MaterialDesc; readonly shadow: boolean }
export interface TriRec { readonly positions: readonly number[]; readonly mat: MaterialDesc }
export interface CylinderRec { readonly radiusTop: number; readonly radiusBottom: number; readonly height: number; readonly radial: number; readonly open: boolean; readonly thetaStart: number; readonly thetaLength: number; readonly position: V3; readonly rotation: V3; readonly mat: MaterialDesc }
export interface PlaneRec { readonly w: number; readonly h: number; readonly segW: number; readonly segH: number; readonly position: V3; readonly mat: MaterialDesc }
export interface InstancedRec { readonly geometry: GeometryDesc; readonly mat: MaterialDesc; readonly transforms: readonly Transform[]; readonly shadow: boolean }
export interface PipeCapRec { readonly radius: number; readonly position: V3; readonly basis: Basis }

export interface Model {
  readonly members: readonly MemberRec[];
  readonly plates: readonly PlateRec[];
  /** 20 mm levha kutuları (tek instanced çizim) */
  readonly plateBoxes: readonly Transform[];
  readonly boxes: readonly BoxRec[];
  readonly bolts: readonly BoltBatch[];
  readonly pipeCaps: readonly PipeCapRec[];
  readonly quads: readonly QuadRec[];
  readonly polygons: readonly PolygonRec[];
  readonly tris: readonly TriRec[];
  readonly cylinders: readonly CylinderRec[];
  readonly planes: readonly PlaneRec[];
  readonly instanced: readonly InstancedRec[];
  readonly plateCount: number;
  readonly plateKg: number;
  readonly boltCounts: ReadonlyMap<string, { readonly n: number; readonly kg: number }>;
}

/** Cıvata ağırlığı (altıgen baş + rondela + somun), orijinal geometriyle aynı formül. */
export function boltKg(d: number, grip: number): number {
  const headH = 0.65 * d, nutH = 0.8 * d, washH = 0.12 * d, hexR = 0.95 * d;
  const shankLen = grip + washH + nutH + 0.4 * d;
  const hexA = 2.598 * hexR * hexR;
  return (Math.PI * (d / 2) ** 2 * shankLen + hexA * (headH + nutH) + Math.PI * (hexR * 1.15) ** 2 * washH) * STEEL_DENSITY;
}

export const UNIT_BOX: GeometryDesc = { kind: 'unitBox' };

export class Kit {
  private members: MemberRec[] = [];
  private plates: PlateRec[] = [];
  private plateBoxes: Transform[] = [];
  private boxes: BoxRec[] = [];
  private bolts = new Map<string, BoltBatch>();
  private pipeCaps: PipeCapRec[] = [];
  private quads: QuadRec[] = [];
  private polygons: PolygonRec[] = [];
  private tris: TriRec[] = [];
  private cylinders: CylinderRec[] = [];
  private planes: PlaneRec[] = [];
  private instancedRecs: InstancedRec[] = [];
  plateCount = 0;
  plateKg = 0;
  boltCounts = new Map<string, { n: number; kg: number }>();

  constructor(private readonly catalog: Catalog) {}

  profile(code: string): Profile { return this.catalog.get(code); }
  profileGeometry(code: string, len: number, centroid = false): GeometryDesc { return { kind: 'profile', code, len: Math.max(len, 0.005), centroid }; }

  /** Katalog profilinden eleman. opts: ref (başlık yönü), roll, double (2L arası boşluk, m), cutX (uçları düşey x düzlemlerine şev kes) */
  member(code: string, mat: MaterialDesc, p1: V3 | Vec3, p2: V3 | Vec3, opts: { ref?: V3 | Vec3; roll?: number; double?: number; cutX?: boolean } = {}): void {
    const prof = this.profile(code);
    const a = v3(p1), b = v3(p2);
    const basis = orientBasis(a, b, opts.ref ?? Z, opts.roll ?? 0);
    this.members.push({ code, mat, a: a.toArray(), b: b.toArray(), basis, len: a.distanceTo(b), ...(prof.kind === 'L' && opts.double ? { double: opts.double } : {}), cutX: Boolean(opts.cutX) && !(prof.kind === 'L' && opts.double) });
  }
  countPlate(volume: number): void { this.plateCount++; this.plateKg += volume * STEEL_DENSITY; }
  /** (e1,e2) düzleminde çokgen levha; kalınlık normal boyunca ortalı */
  plate(origin: V3 | Vec3, e1: V3 | Vec3, e2: V3 | Vec3, pts2D: readonly V2[], t = PLATE_T, mat: MaterialDesc = MAT.plate): void {
    const a = v3(e1).normalize(), b = v3(e2).normalize();
    const n = new Vec3().crossVectors(a, b).normalize();
    this.plates.push({ outer: pts2D, t, position: v3(origin).toArray(), basis: makeBasis(a, b, n), mat });
    if (mat === MAT.plate) this.countPlate(Math.abs(polygonArea(pts2D)) * t);
  }
  framePlate(pts2D: readonly V2[], z: number, t = PLATE_T): void { this.plate([0, 0, z], X, Y, pts2D, t); }
  /** Eksenlere paralel kutu; mat verilmezse 20 mm levha olarak sayılır */
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, mat: MaterialDesc | null = null): void {
    const tr = transform([cx, cy, cz], IDENTITY, [sx, sy, sz]);
    if (!mat) { this.plateBoxes.push(tr); this.countPlate(sx * sy * sz); return; }
    this.boxes.push({ transform: tr, mat });
  }
  /** p1→p2 boyunca şerit levha; genişlik yerel x (ref yönü) */
  strip(p1: V3 | Vec3, p2: V3 | Vec3, width: number, t = PLATE_T, ref: V3 | Vec3 = Z): void {
    const a = v3(p1), b = v3(p2), len = a.distanceTo(b);
    const basis = orientBasis(a, b, ref);
    this.plateBoxes.push(transform(a.clone().add(b).multiplyScalar(0.5), basis, [width, t, len]));
    this.countPlate(width * t * len);
  }
  bolt(p: V3 | Vec3, axis: V3 | Vec3, grip: number, d = BOLT_D): void {
    const g = Math.max(0.005, Math.round(grip * 200) / 200);
    const key = `${d.toFixed(3)}|${g.toFixed(3)}`;
    let batch = this.bolts.get(key);
    if (!batch) { batch = { d, grip: g, transforms: [] }; this.bolts.set(key, batch); }
    batch.transforms.push(transform(v3(p), basisFromUnitVectors(UP, v3(axis).normalize())));
    const label = `M${Math.round(d * 1000)}`;
    const c = this.boltCounts.get(label) ?? { n: 0, kg: 0 };
    c.n++; c.kg += boltKg(d, g);
    this.boltCounts.set(label, c);
  }
  /** Düğüm levhası: bağlanan her eleman ekseni boyunca `reach` uzanan dışbükey levha + eleman başına cıvata */
  gusset(node: V3 | Vec3, e1: V3 | Vec3, e2: V3 | Vec3, dirs: readonly (V3 | Vec3)[], o: { reach?: number; half?: number; t?: number; bolts?: readonly number[]; grip?: number; extra?: readonly V2[]; d?: number } = {}): void {
    const { reach = 0.3, half = 0.085, t = PLATE_T, bolts = [0.12, 0.2], grip = 2 * PLATE_T, extra = [], d = BOLT_D } = o;
    const P = v3(node), a = v3(e1).normalize(), b = v3(e2).normalize();
    const n = new Vec3().crossVectors(a, b).normalize();
    const pts: V2[] = [...extra, [half, half], [half, -half], [-half, half], [-half, -half]];
    for (const dv of dirs) {
      const D = v3(dv), u = D.dot(a), v = D.dot(b), l = Math.hypot(u, v) || 1;
      const du = u / l, dw = v / l;
      pts.push([du * reach - dw * half, dw * reach + du * half], [du * reach + dw * half, dw * reach - du * half]);
      for (const s of bolts) this.bolt(P.clone().addScaledVector(a, du * s).addScaledVector(b, dw * s), n, grip, d);
    }
    this.plate(P, a, b, convexHull(pts), t);
  }
  /** Kolon ayağı: 20 mm taban levhası + gövde düzleminde berkitmeler + 4 ankraj (M24). prof h'si X boyunca; swap=true ise Z boyunca */
  basePlate(cx: number, cz: number, code: string, o: { swap?: boolean; y0?: number } = {}): void {
    const { swap = false, y0 = 0 } = o;
    const p = this.profile(code);
    const h = p.m.h, b = p.m.b, t = PLATE_T;
    const ph = h + 0.3, pb = b + 0.15;
    if (!swap) this.box(cx, y0 + t / 2, cz, ph, t, pb); else this.box(cx, y0 + t / 2, cz, pb, t, ph);
    for (const s of [-1, 1]) {
      const u0 = s * (h / 2), u1 = s * (ph / 2 - 0.01);
      const pts: V2[] = [[u0, y0 + t], [u1, y0 + t], [u1, y0 + t + 0.06], [u0, y0 + t + 0.25]];
      if (!swap) this.plate([cx, 0, cz], X, Y, pts); else this.plate([cx, 0, cz], [0, 0, -1], Y, pts);
      for (const r of [-1, 1]) {
        const along = s * (h / 2 + 0.08), across = r * (pb / 2 - 0.06);
        this.bolt(swap ? [cx + across, y0 + t / 2, cz + along] : [cx + along, y0 + t / 2, cz + across], UP, t, 0.024);
      }
    }
  }
  /** Boru çapraz: uçlardan kısaltılır, uçlara kapak levhası; yön vektörünü döndürür */
  pipeBrace(code: string, p1: V3 | Vec3, p2: V3 | Vec3, trim = 0.28, mat: MaterialDesc = MAT.brace): Vec3 {
    const prof = this.profile(code);
    const a = v3(p1), b = v3(p2), d = b.clone().sub(a).normalize();
    const s = a.clone().addScaledVector(d, trim), e = b.clone().addScaledVector(d, -trim);
    this.member(code, mat, s, e);
    const R = prof.dims.h / 2000 + 0.004;
    const basis = basisFromUnitVectors(UP, d);
    for (const p of [s, e]) { this.pipeCaps.push({ radius: R, position: p.toArray(), basis }); this.countPlate(Math.PI * R * R * 0.01); }
    return d;
  }
  quad(pA: V3 | Vec3, pB: V3 | Vec3, pC: V3 | Vec3, pD: V3 | Vec3, mat: MaterialDesc): void {
    this.quads.push({ pts: [v3(pA).toArray(), v3(pB).toArray(), v3(pC).toArray(), v3(pD).toArray()], mat });
  }
  /** Delikli düz çokgen (ShapeGeometry): alın duvarı gibi */
  polygon(outer: readonly V2[], holes: readonly (readonly V2[])[], position: V3 | Vec3, mat: MaterialDesc, shadow = false): void {
    this.polygons.push({ outer, holes, position: v3(position).toArray(), mat, shadow });
  }
  /** Üçgen listesi (x,y,z,…): nervürlü sac gibi serbest yüzeyler */
  tri(positions: readonly number[], mat: MaterialDesc): void { this.tris.push({ positions, mat }); }
  cylinder(o: { radiusTop: number; radiusBottom: number; height: number; radial?: number; open?: boolean; thetaStart?: number; thetaLength?: number }, position: V3 | Vec3, rotation: V3, mat: MaterialDesc): void {
    this.cylinders.push({ radiusTop: o.radiusTop, radiusBottom: o.radiusBottom, height: o.height, radial: o.radial ?? 16, open: o.open ?? false, thetaStart: o.thetaStart ?? 0, thetaLength: o.thetaLength ?? Math.PI * 2, position: v3(position).toArray(), rotation, mat });
  }
  plane(w: number, h: number, segW: number, segH: number, position: V3 | Vec3, mat: MaterialDesc): void {
    this.planes.push({ w, h, segW, segH, position: v3(position).toArray(), mat });
  }
  instanced(geometry: GeometryDesc, mat: MaterialDesc, transforms: readonly Transform[], shadow = true): void {
    if (transforms.length) this.instancedRecs.push({ geometry, mat, transforms, shadow });
  }

  model(): Model {
    return {
      members: this.members, plates: this.plates, plateBoxes: this.plateBoxes, boxes: this.boxes, bolts: [...this.bolts.values()], pipeCaps: this.pipeCaps,
      quads: this.quads, polygons: this.polygons, tris: this.tris, cylinders: this.cylinders, planes: this.planes, instanced: this.instancedRecs,
      plateCount: this.plateCount, plateKg: this.plateKg, boltCounts: this.boltCounts,
    };
  }
}

