'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { claddingGeometry, type CladdingParams } from '../../domain/simple/cladding';
import type { DrywallParams } from '../../domain/simple/drywall';
import type { FenceParams } from '../../domain/simple/fence';
import { mezzanineGrid, type MezzanineParams } from '../../domain/simple/mezzanine';
import type { AnyParams, SimpleKind } from '../../domain/simple/registry';

/**
 * Basit konfigüratörlerin 3B sahnesi (K-100; K-24: yalnız konfigüratör grubunda, dinamik import).
 * Her eleman eksenlere hizalı kutu; aynı renkteki kutular tek InstancedMesh → telefonlarda akıcı.
 */
interface Box {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  readonly d: number;
  readonly color: string;
  /** y ekseni etrafında dönüş (radyan) — eğik çatı levhaları için x ekseni */
  readonly rx?: number;
  readonly rz?: number;
}
const C = { steel: '#5C7FA3', dark: '#31486A', light: '#B7CBDD', sheet: '#9FB3C8', panel: '#D9DEE3', concrete: '#8A9199', board: '#E4E2DC', gold: '#C99A3B', wood: '#6B5A45' };

function cladding(p: CladdingParams): { boxes: Box[]; reach: number; center: [number, number, number] } {
  const g = claddingGeometry(p);
  const boxes: Box[] = [];
  const t = 0.06;
  const L = p.length + 2 * p.overhang;
  const half = p.width / 2 + p.overhang;
  const rise = g.ridgeHeightM + p.overhang * (p.slopePct / 100);
  const ang = Math.atan2(g.ridgeHeightM, p.width / 2);
  const slope = Math.sqrt(half * half + rise * rise);
  const yEave = p.wallHeight - p.overhang * (p.slopePct / 100);
  // iki çatı yüzü: merkezleri yarı yükseklikte, x ekseni etrafında ± eğim
  boxes.push({ x: -half / 2, y: yEave + rise / 2, z: 0, w: slope, h: t, d: L, color: p.roofType === 'sandwich' ? C.panel : C.sheet, rz: ang });
  boxes.push({ x: half / 2, y: yEave + rise / 2, z: 0, w: slope, h: t, d: L, color: p.roofType === 'sandwich' ? C.panel : C.sheet, rz: -ang });
  // levha derzleri: çatı boyunca ince çizgiler
  for (let z = -p.length / 2; z <= p.length / 2 + 1e-6; z += 1) boxes.push({ x: 0, y: yEave + rise / 2 + t, z, w: 2 * half * 0.99, h: 0.02, d: 0.02, color: C.dark });
  boxes.push({ x: 0, y: p.wallHeight + g.ridgeHeightM + 0.05, z: 0, w: 0.35, h: 0.06, d: L, color: C.dark }); // mahya
  if (p.wallType !== 'none' && p.wallHeight > 0) {
    const col = p.wallType === 'sandwich' ? C.panel : C.sheet;
    boxes.push({ x: -p.width / 2, y: p.wallHeight / 2, z: 0, w: t, h: p.wallHeight, d: p.length, color: col });
    boxes.push({ x: p.width / 2, y: p.wallHeight / 2, z: 0, w: t, h: p.wallHeight, d: p.length, color: col });
    boxes.push({ x: 0, y: p.wallHeight / 2, z: -p.length / 2, w: p.width, h: p.wallHeight, d: t, color: col });
    boxes.push({ x: 0, y: p.wallHeight / 2, z: p.length / 2, w: p.width, h: p.wallHeight, d: t, color: col });
    // köşe kolonları (görsel referans)
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) boxes.push({ x: (x * p.width) / 2, y: p.wallHeight / 2, z: (z * p.length) / 2, w: 0.2, h: p.wallHeight, d: 0.2, color: C.dark });
  }
  return { boxes, reach: Math.max(p.width, p.length, p.wallHeight + rise), center: [0, (p.wallHeight + rise) / 2, 0] };
}
function mezzanine(p: MezzanineParams): { boxes: Box[]; reach: number; center: [number, number, number] } {
  const g = mezzanineGrid(p);
  const boxes: Box[] = [];
  const x0 = -p.width / 2;
  const z0 = -p.length / 2;
  for (let i = 0; i < g.nx; i++) for (let j = 0; j < g.nz; j++) boxes.push({ x: x0 + i * g.spanX, y: p.height / 2, z: z0 + j * g.spanZ, w: 0.16, h: p.height, d: 0.16, color: C.dark });
  const beamH = 0.3;
  for (let j = 0; j < g.nz; j++) boxes.push({ x: 0, y: p.height - beamH / 2, z: z0 + j * g.spanZ, w: p.width, h: beamH, d: 0.15, color: C.steel });
  const secPerBay = Math.max(1, Math.round(g.spanX / 1.5) - 1);
  for (let i = 0; i < g.nx - 1; i++) for (let k = 1; k <= secPerBay; k++) boxes.push({ x: x0 + (i + k / (secPerBay + 1)) * g.spanX, y: p.height - 0.1, z: 0, w: 0.08, h: 0.2, d: p.length, color: C.light });
  const deckT = p.deck === 'composite' ? 0.16 : 0.05;
  boxes.push({ x: 0, y: p.height + deckT / 2, z: 0, w: p.width, h: deckT, d: p.length, color: p.deck === 'composite' ? C.concrete : C.sheet });
  // korkuluk
  for (const [x, z, w, d] of [[0, z0, p.width, 0.04], [0, -z0, p.width, 0.04], [x0, 0, 0.04, p.length], [-x0, 0, 0.04, p.length]] as const) boxes.push({ x, y: p.height + deckT + 1.05, z, w, h: 0.05, d, color: C.gold });
  // merdiven (basit rampa)
  boxes.push({ x: -x0 + 1.2, y: p.height / 2, z: z0 + 1.5, w: 1.2, h: 0.12, d: Math.max(2, p.height * 1.6), color: C.steel, rx: -Math.atan2(p.height, Math.max(2, p.height * 1.6)) });
  return { boxes, reach: Math.max(p.width, p.length, p.height * 2), center: [0, p.height / 2, 0] };
}
function fence(p: FenceParams): { boxes: Box[]; reach: number; center: [number, number, number] } {
  const boxes: Box[] = [];
  const shown = Math.min(p.length, 24); // en çok 24 m gösterilir (performans); metraj tam uzunlukla hesaplanır
  const bays = Math.max(1, Math.round(shown / p.postSpacing));
  const len = bays * p.postSpacing;
  const x0 = -len / 2;
  for (let i = 0; i <= bays; i++) boxes.push({ x: x0 + i * p.postSpacing, y: (p.height - 0.5) / 2, z: 0, w: 0.06, h: p.height + 0.5, d: 0.06, color: C.dark });
  for (let r = 0; r < p.rails; r++) boxes.push({ x: 0, y: 0.08 + (r * (p.height - 0.16)) / Math.max(p.rails - 1, 1), z: 0, w: len, h: 0.02, d: 0.04, color: C.steel });
  if (p.infill === 'bars') for (let x = x0 + p.barSpacing; x < x0 + len; x += p.barSpacing) boxes.push({ x, y: p.height / 2, z: 0, w: 0.02, h: p.height, d: 0.02, color: C.light });
  if (p.infill === 'lama') for (let y = 0.15; y < p.height; y += 0.15) boxes.push({ x: 0, y, z: 0, w: len, h: 0.03, d: 0.005, color: C.light });
  if (p.infill === 'panel') boxes.push({ x: 0, y: p.height / 2, z: 0, w: len, h: p.height - 0.1, d: 0.01, color: C.panel });
  if (p.gates > 0) boxes.push({ x: x0 + len + 0.7, y: p.height / 2, z: 0, w: 1.2, h: p.height, d: 0.04, color: C.gold });
  return { boxes, reach: Math.max(len, p.height * 3), center: [0, p.height / 2, 0] };
}
function drywall(p: DrywallParams): { boxes: Box[]; reach: number; center: [number, number, number] } {
  const boxes: Box[] = [];
  const len = Math.min(p.length, 12);
  const x0 = -len / 2;
  const thick = 0.06 + p.layers * 0.0125 * (p.doubleSided ? 2 : 1);
  for (let x = 0; x <= len + 1e-6; x += p.studSpacing) boxes.push({ x: x0 + x, y: p.height / 2, z: 0, w: 0.05, h: p.height, d: 0.06, color: C.steel });
  boxes.push({ x: 0, y: 0.02, z: 0, w: len, h: 0.04, d: 0.06, color: C.dark });
  boxes.push({ x: 0, y: p.height - 0.02, z: 0, w: len, h: 0.04, d: 0.06, color: C.dark });
  const boardCol = p.boardType === 'green' ? '#B9D6B3' : p.boardType === 'red' ? '#E3B3AE' : C.board;
  // ön yüz levhaları: dikmeler görünsün diye üst yarı açık
  boxes.push({ x: 0, y: p.height / 4, z: thick / 2, w: len, h: p.height / 2, d: 0.0125 * p.layers, color: boardCol });
  boxes.push({ x: -len / 4, y: (3 * p.height) / 4, z: thick / 2, w: len / 2, h: p.height / 2, d: 0.0125 * p.layers, color: boardCol });
  if (p.doubleSided) boxes.push({ x: 0, y: p.height / 2, z: -thick / 2, w: len, h: p.height, d: 0.0125 * p.layers, color: boardCol });
  if (p.insulated) boxes.push({ x: len / 4, y: (3 * p.height) / 4, z: 0, w: len / 2 - 0.1, h: p.height / 2 - 0.1, d: 0.05, color: '#C8B77A' });
  if (p.doors > 0) boxes.push({ x: len / 4, y: 1.05, z: thick / 2 + 0.01, w: 0.9, h: 2.1, d: 0.03, color: C.wood });
  return { boxes, reach: Math.max(len, p.height * 2.5), center: [0, p.height / 2, 0] };
}

function Boxes({ boxes }: { readonly boxes: readonly Box[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m4 = new THREE.Matrix4();
    const color = new THREE.Color();
    boxes.forEach((b, i) => {
      m4.compose(new THREE.Vector3(b.x, b.y, b.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(b.rx ?? 0, 0, b.rz ?? 0)), new THREE.Vector3(b.w, b.h, b.d));
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, color.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <instancedMesh key={boxes.length} ref={ref} args={[geometry, undefined, boxes.length]} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.55} metalness={0.3} />
    </instancedMesh>
  );
}

export default function SimpleScene({ kind, params }: { readonly kind: SimpleKind; readonly params: AnyParams }) {
  const model = useMemo(() => {
    switch (kind) {
      case 'cladding': return cladding(params as CladdingParams);
      case 'mezzanine': return mezzanine(params as MezzanineParams);
      case 'fence': return fence(params as FenceParams);
      default: return drywall(params as DrywallParams);
    }
  }, [kind, params]);
  const reach = Math.max(model.reach, 4);
  const shadow = Math.max(30, reach);
  return (
    <Canvas flat shadows frameloop="demand" dpr={[1, 1.5]} camera={{ position: [reach * 1.1, reach * 0.7, reach * 1.1], fov: 42, near: 0.05, far: 600 }} gl={{ antialias: true, powerPreference: 'high-performance' }} style={{ background: '#101820' }}>
      <fog attach="fog" args={['#101820', reach * 2.5, reach * 8]} />
      <hemisphereLight args={['#DCE6EC', '#2A3A48', 1.6]} />
      <directionalLight position={[reach, reach * 1.5, reach * 0.8]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={0.5} shadow-camera-far={reach * 6} shadow-camera-left={-shadow} shadow-camera-right={shadow} shadow-camera-top={shadow} shadow-camera-bottom={-shadow} shadow-bias={-0.0015} />
      <directionalLight position={[-reach, reach * 0.6, -reach]} intensity={0.3} color="#7C93A8" />
      <gridHelper args={[Math.max(60, reach * 3), Math.max(30, Math.round(reach * 1.5)), '#2A3A48', '#1E2934']} position={[0, -0.01, 0]} />
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <boxGeometry args={[Math.max(60, reach * 3), 0.04, Math.max(60, reach * 3)]} />
        <meshStandardMaterial color="#1B232C" roughness={0.95} />
      </mesh>
      <Boxes boxes={model.boxes} />
      <OrbitControls target={model.center} enableDamping makeDefault />
    </Canvas>
  );
}
