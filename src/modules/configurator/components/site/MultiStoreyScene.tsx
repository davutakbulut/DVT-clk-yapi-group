'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MultiStoreyGroup, MultiStoreyMember, MultiStoreyStructure } from '../../domain/multiStorey';
import { sectionFor } from '../../domain/profiles';

interface Props {
  readonly structure: MultiStoreyStructure;
  readonly profiles: Readonly<Record<MultiStoreyGroup, string>>;
}

// Prototip renkleri: kolon antrasit-lacivert, ana kiriş çelik mavisi, tali kiriş açık mavi, temel gri
const COLORS: Record<MultiStoreyGroup, string> = { column: '#31486A', main_beam: '#5C7FA3', secondary_beam: '#B7CBDD' };

function iShape(s: { h: number; b: number; tf: number; tw: number }): THREE.Shape {
  const hh = s.h / 2;
  const hb = s.b / 2;
  const ht = s.tw / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-hb, hh); sh.lineTo(hb, hh); sh.lineTo(hb, hh - s.tf); sh.lineTo(ht, hh - s.tf);
  sh.lineTo(ht, -(hh - s.tf)); sh.lineTo(hb, -(hh - s.tf)); sh.lineTo(hb, -hh); sh.lineTo(-hb, -hh);
  sh.lineTo(-hb, -(hh - s.tf)); sh.lineTo(-ht, -(hh - s.tf)); sh.lineTo(-ht, hh - s.tf); sh.lineTo(-hb, hh - s.tf);
  sh.closePath();
  return sh;
}

/** Yerel z eksenini p1→p2 yönüne hizalar (hol sahnesindeki frameQuaternion ile aynı kural). */
function frameQuaternion(dir: THREE.Vector3): THREE.Quaternion {
  const zAxis = dir.clone().normalize();
  const ref = new THREE.Vector3(0, 0, 1);
  let xAxis = ref.clone().sub(zAxis.clone().multiplyScalar(ref.dot(zAxis)));
  if (xAxis.lengthSq() < 1e-6) xAxis = new THREE.Vector3(1, 0, 0);
  xAxis.normalize();
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
}

/**
 * Aynı profil + aynı boydaki elemanlar TEK InstancedMesh: 20 katlı 60×80 yapıda ~9 bin eleman, 5–6 çizim çağrısına iner
 * (eleman başına ayrı mesh telefonları kilitliyordu).
 */
function Batch({ members, code, color }: { readonly members: readonly MultiStoreyMember[]; readonly code: string; readonly color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const length = members[0]!.length;
  const geometry = useMemo(() => {
    const s = sectionFor(code);
    const shape = s.kind === 'i' ? iShape(s) : iShape({ h: 0.3, b: 0.3, tf: 0.02, tw: 0.012 });
    const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(length, 0.01), bevelEnabled: false, curveSegments: 1 });
    geo.translate(0, 0, -length / 2);
    return geo;
  }, [code, length]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m4 = new THREE.Matrix4();
    const one = new THREE.Vector3(1, 1, 1);
    members.forEach((m, i) => {
      const a = new THREE.Vector3(...m.p1);
      const b = new THREE.Vector3(...m.p2);
      m4.compose(a.clone().add(b).multiplyScalar(0.5), frameQuaternion(b.clone().sub(a)), one);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [members]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, members.length]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.35} />
    </instancedMesh>
  );
}

/** R3F sahnesi (K-24: yalnız konfigüratör grubunda, dinamik import). */
export default function MultiStoreyScene({ structure, profiles }: Props) {
  const batches = useMemo(() => {
    const map = new Map<string, { group: MultiStoreyGroup; members: MultiStoreyMember[] }>();
    for (const m of structure.members) {
      const key = `${m.group}:${Math.round(m.length * 1000)}:${m.p1[0] === m.p2[0] ? 'z' : 'x'}`;
      const hit = map.get(key);
      if (hit) hit.members.push(m);
      else map.set(key, { group: m.group, members: [m] });
    }
    return [...map.entries()];
  }, [structure]);
  const { raft, heightM, params } = structure;
  const reach = Math.max(params.width, params.length, heightM);
  const shadow = Math.max(60, reach);
  return (
    <Canvas flat shadows frameloop="demand" dpr={[1, 1.5]} camera={{ position: [reach * 1.5, heightM * 0.9 + 18, reach * 1.5], fov: 45, near: 0.1, far: 900 }} gl={{ antialias: true, powerPreference: 'high-performance' }} style={{ background: '#101820' }}>
      <fog attach="fog" args={['#101820', reach * 2, reach * 7]} />
      <hemisphereLight args={['#DCE6EC', '#2A3A48', 1.6]} />
      <directionalLight position={[36, heightM + 40, 22]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={1} shadow-camera-far={heightM + 160} shadow-camera-left={-shadow} shadow-camera-right={shadow} shadow-camera-top={shadow} shadow-camera-bottom={-shadow} shadow-bias={-0.0015} />
      <directionalLight position={[-30, 18, -24]} intensity={0.3} color="#7C93A8" />
      <gridHelper args={[200, 100, '#2A3A48', '#1E2934']} position={[0, -raft.thicknessM - 0.01, 0]} />
      <mesh position={[0, -raft.thicknessM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[raft.widthM, raft.thicknessM, raft.lengthM]} />
        <meshStandardMaterial color="#8A9199" roughness={0.85} metalness={0.05} />
      </mesh>
      {batches.map(([key, b]) => (
        <Batch key={`${key}:${b.members.length}`} members={b.members} code={profiles[b.group]} color={COLORS[b.group]} />
      ))}
      <OrbitControls target={[0, heightM / 3, 0]} enableDamping makeDefault />
    </Canvas>
  );
}
