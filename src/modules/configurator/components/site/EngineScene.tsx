'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { profileOutline, type Catalog } from '../../engine/catalog';
import type { GeometryDesc, Model } from '../../engine/kit';
import { MAT, type MaterialDesc } from '../../engine/materials';
import type { Basis, Transform, V2, V3 } from '../../engine/vec';

/**
 * 3B sahne (K-110): `Model` kaydını Three.js ile çizer; hesap yapmaz (K-65). Kamera görünüşleri, uçuş, çift tık/çift dokunma odak,
 * gölge, sis, ızgara ve yazdırma anlık görüntüsü orijinal prototipten. `three` yalnız bu bileşende; dinamik import ile yüklenir (K-24).
 */
export interface EngineSceneHandle {
  setView(name: string): void;
  /** Yazdırma için PNG (data URL) */
  snapshot(): string | null;
}
interface Props {
  readonly model: Model | null;
  readonly catalog: Catalog;
  readonly views?: Readonly<Record<string, readonly [number, number, number]>>;
  readonly frontDir?: readonly [number, number, number];
  readonly groundY?: number;
  readonly onView?: (name: string) => void;
  /** Tuvalin erişilebilir adı (role=img); görünüm düğmeleri dışarıda kalır (axe nested-interactive). */
  readonly label: string;
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const DEFAULT_VIEWS: Record<string, readonly [number, number, number]> = { iso: [1, 0.62, 1], front: [0, 0.12, -1], side: [1, 0.12, 0], top: [0, 1, 0.002] };

function matrixOf(tr: Transform): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...tr.basis.x), new THREE.Vector3(...tr.basis.y), new THREE.Vector3(...tr.basis.z));
  m.scale(new THREE.Vector3(...tr.scale));
  m.setPosition(tr.position[0], tr.position[1], tr.position[2]);
  return m;
}
function quatOf(b: Basis): THREE.Quaternion {
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...b.x), new THREE.Vector3(...b.y), new THREE.Vector3(...b.z)));
}
function shapeOf(outer: readonly V2[], holes: readonly (readonly V2[])[] = []): THREE.Shape {
  const sh = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  return sh;
}

class Renderer3D {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly group = new THREE.Group();
  private readonly sun: THREE.DirectionalLight;
  private readonly ground: THREE.Mesh;
  private grid: THREE.GridHelper | null = null;
  private readonly materials = new Map<string, THREE.Material>();
  private readonly shapes = new Map<string, THREE.Shape>();
  private readonly boltGeos = new Map<string, THREE.BufferGeometry>();
  private readonly capGeos = new Map<number, THREE.BufferGeometry>();
  private bounds: { c: THREE.Vector3; r: number; box?: THREE.Box3 } = { c: new THREE.Vector3(), r: 10 };
  private curView = 'iso';
  private flyTo: { fromT: THREE.Vector3; toT: THREE.Vector3; fromC: THREE.Vector3; toC: THREE.Vector3; t0: number; dur: number } | null = null;
  private raf = 0;
  private firstBuild = true;
  private lastGroundY = -0.01;
  private readonly isTouch: boolean;
  private readonly ro: ResizeObserver;
  views: Record<string, readonly [number, number, number]> = DEFAULT_VIEWS;
  onView: ((name: string) => void) | null = null;

  constructor(private readonly stage: HTMLElement, private readonly catalog: Catalog) {
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    this.scene.background = new THREE.Color(0x182433);
    this.camera = new THREE.PerspectiveCamera(45, Math.max(1, stage.clientWidth) / Math.max(1, stage.clientHeight), 0.05, 2000);
    this.camera.position.set(40, 26, 40);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isTouch ? 1.5 : 2));
    this.renderer.setSize(stage.clientWidth, stage.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.prepend(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.12, zoomToCursor: true, zoomSpeed: 1.2, minDistance: 0.3, screenSpacePanning: true });
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
    this.scene.add(new THREE.HemisphereLight(0xf2f2f2, 0x1f2d3e, 0.85));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.15);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.isTouch ? 1024 : 2048, this.isTouch ? 1024 : 2048);
    this.sun.shadow.bias = -0.0015;
    this.scene.add(this.sun, this.sun.target);
    const fill = new THREE.DirectionalLight(0x88a0b0, 0.3);
    fill.position.set(-25, 15, -20);
    this.scene.add(fill);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x15202e, roughness: 1 }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.position.y = -0.02; this.ground.receiveShadow = true;
    this.scene.add(this.ground, this.group);
    this.bindPointer();
    this.ro = new ResizeObserver(() => {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    this.ro.observe(stage);
    const animate = () => {
      this.raf = requestAnimationFrame(animate);
      if (this.flyTo) {
        const k = Math.min(1, (performance.now() - this.flyTo.t0) / this.flyTo.dur), e = 1 - Math.pow(1 - k, 3);
        this.controls.target.lerpVectors(this.flyTo.fromT, this.flyTo.toT, e);
        this.camera.position.lerpVectors(this.flyTo.fromC, this.flyTo.toC, e);
        if (k >= 1) this.flyTo = null;
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  // ---------- Malzeme / şekil önbellekleri ----------
  material(d: MaterialDesc): THREE.Material {
    let m = this.materials.get(d.key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: d.color, roughness: d.roughness ?? 0.5, metalness: d.metalness ?? 0.35, transparent: d.transparent ?? false, opacity: d.opacity ?? 1, side: d.doubleSide ? THREE.DoubleSide : THREE.FrontSide, depthWrite: d.depthWrite ?? true, flatShading: d.flatShading ?? false, wireframe: d.wireframe ?? false });
      this.materials.set(d.key, m);
    }
    return m;
  }
  shape(code: string): THREE.Shape {
    let s = this.shapes.get(code);
    if (!s) { const o = profileOutline(this.catalog.get(code), 5); s = shapeOf(o.outer, o.holes); this.shapes.set(code, s); }
    return s;
  }
  profileGeometry(code: string, len: number, centroid: boolean): THREE.ExtrudeGeometry {
    const p = this.catalog.get(code);
    const geo = new THREE.ExtrudeGeometry(this.shape(code), { depth: Math.max(len, 0.005), bevelEnabled: false, curveSegments: 1 });
    geo.translate(centroid ? -p.props.cx : 0, centroid ? -p.props.cy : 0, -len / 2);
    return geo;
  }
  geometryOf(d: GeometryDesc): { geo: THREE.BufferGeometry; shared: boolean } {
    if (d.kind === 'unitBox') return { geo: UNIT_BOX, shared: true };
    return { geo: this.profileGeometry(d.code, d.len, d.centroid), shared: false };
  }
  boltGeometry(d: number, grip: number): THREE.BufferGeometry {
    const key = `${d.toFixed(3)}|${grip.toFixed(3)}`;
    let geo = this.boltGeos.get(key);
    if (!geo) {
      const headH = 0.65 * d, nutH = 0.8 * d, washH = 0.12 * d, hexR = 0.95 * d;
      const shankLen = grip + washH + nutH + 0.4 * d;
      const shank = new THREE.CylinderGeometry(d / 2, d / 2, shankLen, 10); shank.translate(0, -grip / 2 + shankLen / 2, 0);
      const head = new THREE.CylinderGeometry(hexR, hexR, headH, 6); head.translate(0, -grip / 2 - headH / 2, 0);
      const washer = new THREE.CylinderGeometry(hexR * 1.15, hexR * 1.15, washH, 16); washer.translate(0, grip / 2 + washH / 2, 0);
      const nut = new THREE.CylinderGeometry(hexR, hexR, nutH, 6); nut.translate(0, grip / 2 + washH + nutH / 2, 0);
      geo = mergeGeometries([shank, head, washer, nut]) ?? shank;
      [shank, head, washer, nut].forEach((g) => { if (g !== geo) g.dispose(); });
      this.boltGeos.set(key, geo);
    }
    return geo;
  }

  // ---------- Model çizimi ----------
  private addMesh(o: THREE.Object3D, shadow = true): void {
    if (shadow) o.traverse((c) => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    this.group.add(o);
  }
  private cutEndsX(mesh: THREE.Mesh, a: V3, b: V3, basis: Basis): void {
    const R00 = basis.x[0], R01 = basis.y[0], R02 = basis.z[0];
    if (Math.abs(R02) < 1e-6) return;
    const half = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 2;
    const pos = mesh.geometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const vz = pos.getZ(i);
      if (Math.abs(Math.abs(vz) - half) > 1e-4) continue;
      const X0 = vz < 0 ? a[0] : b[0];
      pos.setZ(i, (X0 - mesh.position.x - R00 * pos.getX(i) - R01 * pos.getY(i)) / R02);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingSphere();
  }
  clear(): void {
    for (const o of this.group.children.slice()) {
      this.group.remove(o);
      o.traverse((c) => { const g = (c as THREE.Mesh).geometry; if (g && g !== UNIT_BOX && !this.isCached(g)) g.dispose(); });
      if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
    }
  }
  private isCached(g: THREE.BufferGeometry): boolean {
    for (const v of this.boltGeos.values()) if (v === g) return true;
    for (const v of this.capGeos.values()) if (v === g) return true;
    return false;
  }
  draw(model: Model, groundY: number): void {
    this.clear();
    const mid = (a: V3, b: V3) => new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    for (const m of model.members) {
      const prof = this.catalog.get(m.code);
      const mat = this.material(m.mat);
      let obj: THREE.Object3D;
      if (prof.kind === 'L' && m.double) {
        obj = new THREE.Group();
        for (const sgn of [1, -1]) {
          const mesh = new THREE.Mesh(this.profileGeometry(m.code, m.len, false), mat);
          mesh.position.set((sgn * m.double) / 2, -prof.m.h / 2, 0);
          if (sgn < 0) mesh.rotation.y = Math.PI;
          obj.add(mesh);
        }
      } else obj = new THREE.Mesh(this.profileGeometry(m.code, m.len, prof.kind === 'L'), mat);
      obj.quaternion.copy(quatOf(m.basis));
      obj.position.copy(mid(m.a, m.b));
      if (m.cutX && (obj as THREE.Mesh).isMesh) this.cutEndsX(obj as THREE.Mesh, m.a, m.b, m.basis);
      this.addMesh(obj);
    }
    for (const p of model.plates) {
      const geo = new THREE.ExtrudeGeometry(shapeOf(p.outer), { depth: p.t, bevelEnabled: false });
      geo.translate(0, 0, -p.t / 2);
      const mesh = new THREE.Mesh(geo, this.material(p.mat));
      mesh.quaternion.copy(quatOf(p.basis));
      mesh.position.set(...p.position);
      this.addMesh(mesh);
    }
    if (model.plateBoxes.length) {
      const im = new THREE.InstancedMesh(UNIT_BOX, this.material(MAT.plate), model.plateBoxes.length);
      model.plateBoxes.forEach((tr, i) => im.setMatrixAt(i, matrixOf(tr)));
      im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      this.group.add(im);
    }
    for (const b of model.boxes) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...b.transform.scale), this.material(b.mat));
      mesh.position.set(...b.transform.position);
      this.addMesh(mesh);
    }
    for (const batch of model.bolts) {
      const im = new THREE.InstancedMesh(this.boltGeometry(batch.d, batch.grip), this.material(MAT.bolt), batch.transforms.length);
      batch.transforms.forEach((tr, i) => im.setMatrixAt(i, matrixOf(tr)));
      im.instanceMatrix.needsUpdate = true; im.frustumCulled = false;
      this.group.add(im);
    }
    for (const cap of model.pipeCaps) {
      let g = this.capGeos.get(cap.radius);
      if (!g) { g = new THREE.CylinderGeometry(cap.radius, cap.radius, 0.01, 20); this.capGeos.set(cap.radius, g); }
      const mesh = new THREE.Mesh(g, this.material(MAT.plate));
      mesh.position.set(...cap.position); mesh.quaternion.copy(quatOf(cap.basis));
      this.addMesh(mesh);
    }
    for (const q of model.quads) {
      const [a, b, c, d] = q.pts;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]), 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, this.material(q.mat));
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    for (const p of model.polygons) {
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(p.outer, p.holes)), this.material(p.mat));
      mesh.position.set(...p.position);
      this.addMesh(mesh, p.shadow);
    }
    for (const tr of model.tris) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([...tr.positions], 3));
      geo.computeVertexNormals();
      this.addMesh(new THREE.Mesh(geo, this.material(tr.mat)));
    }
    for (const c of model.cylinders) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(c.radiusTop, c.radiusBottom, c.height, c.radial, 1, c.open, c.thetaStart, c.thetaLength), this.material(c.mat));
      mesh.rotation.set(...c.rotation); mesh.position.set(...c.position);
      this.addMesh(mesh);
    }
    for (const p of model.planes) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h, p.segW, p.segH), this.material(p.mat));
      mesh.position.set(...p.position);
      this.addMesh(mesh, false);
    }
    for (const inst of model.instanced) {
      const { geo } = this.geometryOf(inst.geometry);
      const im = new THREE.InstancedMesh(geo, this.material(inst.mat), inst.transforms.length);
      inst.transforms.forEach((tr, i) => im.setMatrixAt(i, matrixOf(tr)));
      im.instanceMatrix.needsUpdate = true; im.castShadow = inst.shadow; im.receiveShadow = true;
      this.group.add(im);
    }
    this.lastGroundY = groundY;
    this.updateBounds();
    if (this.firstBuild) { this.setView('iso', true); this.firstBuild = false; }
  }

  // ---------- Sınırlar, ışık, ızgara ----------
  private updateBounds(): void {
    const box = new THREE.Box3().setFromObject(this.group);
    if (box.isEmpty()) return;
    const sph = box.getBoundingSphere(new THREE.Sphere());
    this.bounds = { c: box.getCenter(new THREE.Vector3()), r: Math.max(sph.radius, 1), box };
    const R = this.bounds.r, c = this.bounds.c;
    this.sun.position.copy(c).add(new THREE.Vector3(0.8, 1.6, 0.55).multiplyScalar(R * 1.6));
    this.sun.target.position.copy(c);
    Object.assign(this.sun.shadow.camera, { left: -R * 1.3, right: R * 1.3, top: R * 1.3, bottom: -R * 1.3, near: 0.1, far: R * 6 });
    this.sun.shadow.camera.updateProjectionMatrix();
    const g = Math.max(40, Math.ceil((R * 6) / 10) * 10);
    this.ground.scale.set(g, g, 1); this.ground.position.x = c.x; this.ground.position.z = c.z;
    if (!this.grid || this.grid.userData['size'] !== g) {
      if (this.grid) { this.scene.remove(this.grid); this.grid.geometry.dispose(); }
      const step = g > 200 ? 5 : g > 60 ? 2 : 1;
      this.grid = new THREE.GridHelper(g, Math.round(g / step), 0x33475e, 0x223247);
      this.grid.userData['size'] = g;
      this.scene.add(this.grid);
    }
    this.ground.position.y = this.lastGroundY - 0.01;
    this.grid.position.set(c.x, this.lastGroundY, c.z);
    this.scene.fog = new THREE.Fog(0x182433, R * 4, R * 12);
    this.controls.maxDistance = R * 8;
    this.camera.far = R * 20; this.camera.updateProjectionMatrix();
  }

  // ---------- Görünüşler ----------
  private viewPose(name: string): { t: THREE.Vector3; c: THREE.Vector3 } {
    const v = this.views[name] ?? DEFAULT_VIEWS['iso']!;
    const dir = new THREE.Vector3(v[0], v[1], v[2]).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2), tanH = tanV * this.camera.aspect;
    const f = dir.clone().negate();
    const right = new THREE.Vector3().crossVectors(f, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, f);
    let dist = 1;
    if (this.bounds.box) {
      const { min, max } = this.bounds.box;
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Vector3(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).sub(this.bounds.c);
        const z = p.dot(dir);
        dist = Math.max(dist, z + Math.abs(p.dot(right)) / tanH, z + Math.abs(p.dot(up)) / tanV);
      }
      dist *= 1.08;
    } else dist = this.bounds.r * 2.5;
    return { t: this.bounds.c.clone(), c: this.bounds.c.clone().addScaledVector(dir, dist) };
  }
  setView(name: string, instant = false): void {
    if (name === 'fit') name = this.curView;
    this.curView = name;
    this.onView?.(name);
    const p = this.viewPose(name);
    if (instant) { this.controls.target.copy(p.t); this.camera.position.copy(p.c); this.flyTo = null; }
    else this.flyTo = { fromT: this.controls.target.clone(), toT: p.t, fromC: this.camera.position.clone(), toC: p.c, t0: performance.now(), dur: 500 };
  }

  // ---------- Çift tık / çift dokunma: o noktayı merkez al ----------
  private bindPointer(): void {
    const dom = this.renderer.domElement;
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    const pick = (ev: { clientX: number; clientY: number }) => {
      const r = dom.getBoundingClientRect();
      pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(pointer, this.camera);
      const hit = raycaster.intersectObjects(this.group.children, true).find((h) => h.object.visible);
      return hit ? hit.point : null;
    };
    const focusAt = (ev: { clientX: number; clientY: number }) => {
      const p = pick(ev);
      if (p) this.flyTo = { fromT: this.controls.target.clone(), toT: p, fromC: this.camera.position.clone(), toC: this.camera.position.clone().add(p.clone().sub(this.controls.target)), t0: performance.now(), dur: 500 };
      else this.setView('iso');
    };
    let lastTouch = -1e9, tap: { id: number; x: number; y: number; t: number } | null = null, lastTap: { x: number; y: number; t: number } | null = null;
    dom.addEventListener('dblclick', (ev) => { if (performance.now() - lastTouch > 800) focusAt(ev); });
    dom.addEventListener('pointerdown', (ev) => {
      this.flyTo = null;
      if (ev.pointerType === 'mouse') return;
      lastTouch = performance.now();
      if (!ev.isPrimary) { tap = null; lastTap = null; return; }
      tap = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now() };
    });
    dom.addEventListener('pointerup', (ev) => {
      if (ev.pointerType === 'mouse' || !tap || ev.pointerId !== tap.id) return;
      const now = performance.now(); lastTouch = now;
      const isTap = Math.hypot(ev.clientX - tap.x, ev.clientY - tap.y) < 10 && now - tap.t < 300;
      tap = null;
      if (!isTap) { lastTap = null; return; }
      if (lastTap && now - lastTap.t < 350 && Math.hypot(ev.clientX - lastTap.x, ev.clientY - lastTap.y) < 30) { lastTap = null; focusAt(ev); }
      else lastTap = { x: ev.clientX, y: ev.clientY, t: now };
    });
    dom.addEventListener('wheel', () => { this.flyTo = null; }, { passive: true });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  snapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.clear();
    this.controls.dispose();
    this.materials.forEach((m) => m.dispose());
    this.boltGeos.forEach((g) => g.dispose());
    this.capGeos.forEach((g) => g.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export const EngineScene = forwardRef<EngineSceneHandle, Props>(function EngineScene({ model, catalog, views, frontDir, groundY = -0.01, onView, label }, ref) {
  const stageRef = useRef<HTMLDivElement>(null);
  const r3 = useRef<Renderer3D | null>(null);
  useEffect(() => {
    if (!stageRef.current) return;
    const r = new Renderer3D(stageRef.current, catalog);
    r3.current = r;
    return () => { r.dispose(); r3.current = null; };
  }, [catalog]);
  useEffect(() => {
    const r = r3.current;
    if (!r) return;
    r.views = { ...DEFAULT_VIEWS, ...(frontDir ? { front: frontDir } : {}), ...(views ?? {}) };
    r.onView = onView ?? null;
  }, [views, frontDir, onView]);
  useEffect(() => {
    if (r3.current && model) r3.current.draw(model, groundY);
  }, [model, groundY]);
  useImperativeHandle(ref, () => ({ setView: (name) => r3.current?.setView(name), snapshot: () => r3.current?.snapshot() ?? null }), []);
  return <div ref={stageRef} className="engine-stage" role="img" aria-label={label} />;
});

export default EngineScene;
