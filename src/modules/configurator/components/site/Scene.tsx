'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { DEFAULT_PROFILE_MAP, sectionFor, type Section } from '../../domain/profiles';
import type { Member, Panel, Plate, ProfileKey, Structure, Vec3 } from '../../domain/structure';

interface Props {
  readonly structure: Structure;
  readonly profileMap?: Readonly<Record<ProfileKey, string>>;
}

// Renkler prototip v4 (kategoriye göre): kolon mor, makas yeşil, ikincil/aşık turkuaz, çapraz mavi, plaka gri, kapı altın
const COLORS: Record<Member['group'], string> = {
  column: '#6B4FA0',
  rafter: '#3F8F5F',
  truss_chord: '#2F7A4F',
  truss_web: '#2F7A4F',
  secondary: '#2F9E93',
  wind_column: '#2F9E93',
  brace_wall: '#3E6FA8',
  brace_roof: '#3E6FA8',
  purlin: '#2F9E93',
  girt: '#2F9E93',
  door_frame: '#C99A3B',
};

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
function unpShape(s: { h: number; b: number; tf: number; tw: number }): THREE.Shape {
  const hh = s.h / 2;
  const hb = s.b / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-hb, -hh); sh.lineTo(hb, -hh); sh.lineTo(hb, -hh + s.tf); sh.lineTo(-hb + s.tw, -hh + s.tf);
  sh.lineTo(-hb + s.tw, hh - s.tf); sh.lineTo(hb, hh - s.tf); sh.lineTo(hb, hh); sh.lineTo(-hb, hh);
  sh.closePath();
  return sh;
}
function pipeShape(s: { od: number; wall: number }): THREE.Shape {
  const sh = new THREE.Shape();
  sh.absarc(0, 0, s.od / 2, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, s.od / 2 - s.wall, 0, Math.PI * 2, true);
  sh.holes.push(hole);
  return sh;
}
function angleShape(leg: number, t: number): THREE.Shape {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(leg, 0); sh.lineTo(leg, t); sh.lineTo(t, t); sh.lineTo(t, leg); sh.lineTo(0, leg);
  sh.closePath();
  return sh;
}
function extrudeCentered(shape: THREE.Shape, length: number): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(length, 0.01), bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -length / 2);
  return geo;
}

/** Yerel z eksenini p1→p2 yönüne hizalar; x ekseni yapı boyuna (z) referanslı (prototip frameQuaternion). */
function frameQuaternion(dir: THREE.Vector3): THREE.Quaternion {
  const zAxis = dir.clone().normalize();
  const ref = new THREE.Vector3(0, 0, 1);
  let xAxis = ref.clone().sub(zAxis.clone().multiplyScalar(ref.dot(zAxis)));
  if (xAxis.lengthSq() < 1e-6) xAxis = new THREE.Vector3(1, 0, 0);
  xAxis.normalize();
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
}
/** Boy ekseni boyunca uzanan aşık/kuşak: seçilen yerel eksen yüzey normaline hizalanır (prototip placeSpanningZ). */
function spanningQuaternion(z1: number, z2: number, ref2d: { x: number; y: number }, axis: 'x' | 'y'): THREE.Quaternion {
  const zAxis = new THREE.Vector3(0, 0, z2 >= z1 ? 1 : -1);
  const ref = new THREE.Vector3(ref2d.x, ref2d.y, 0).normalize();
  let xAxis: THREE.Vector3;
  let yAxis: THREE.Vector3;
  if (axis === 'y') {
    yAxis = ref;
    xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  } else {
    xAxis = ref;
    yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  }
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
}

function useGeometryCache() {
  return useMemo(() => {
    const cache = new Map<string, THREE.BufferGeometry>();
    return (code: string, length: number): THREE.BufferGeometry => {
      const key = `${code}:${Math.round(length * 100)}`;
      const hit = cache.get(key);
      if (hit) return hit;
      const s: Section = sectionFor(code);
      let geo: THREE.BufferGeometry;
      if (s.kind === 'pipe') geo = extrudeCentered(pipeShape(s), length);
      else if (s.kind === 'unp') geo = extrudeCentered(unpShape(s), length);
      else if (s.kind === 'l2') {
        const a = extrudeCentered(angleShape(s.leg, s.t), length);
        a.translate(-s.gap / 2, 0, 0);
        const b = extrudeCentered(angleShape(s.leg, s.t), length);
        b.rotateZ(Math.PI);
        b.translate(s.gap / 2, 0, 0);
        geo = mergeGeometries([a, b]);
      } else geo = extrudeCentered(iShape(s), length);
      cache.set(key, geo);
      return geo;
    };
  }, []);
}

function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const g of geos) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const idx = g.getIndex();
    const count = idx ? idx.count : p.count;
    for (let i = 0; i < count; i += 1) {
      const vi = idx ? idx.getX(i) : i;
      positions.push(p.getX(vi), p.getY(vi), p.getZ(vi));
      normals.push(n.getX(vi), n.getY(vi), n.getZ(vi));
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return out;
}

function MemberMesh({ m, code, geometryFor }: { readonly m: Member; readonly code: string; readonly geometryFor: (code: string, length: number) => THREE.BufferGeometry }) {
  const geo = geometryFor(code, m.length);
  const { position, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(...m.p1);
    const b = new THREE.Vector3(...m.p2);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = m.align ? spanningQuaternion(m.p1[2], m.p2[2], { x: m.align.x, y: m.align.y }, m.align.axis) : frameQuaternion(b.clone().sub(a));
    return { position: mid, quaternion: q };
  }, [m]);
  return (
    <mesh geometry={geo} position={position} quaternion={quaternion} castShadow receiveShadow>
      <meshStandardMaterial color={COLORS[m.group]} roughness={0.5} metalness={0.35} />
    </mesh>
  );
}

function PlateMesh({ p }: { readonly p: Plate }) {
  const size: [number, number, number] = p.kind === 'base' ? [p.size, 0.02, p.size] : p.kind === 'gusset' ? [p.size * 0.6, p.size * 0.5, 0.016] : p.kind === 'clip' ? [p.size, p.size, 0.01] : [p.size, p.size, p.size];
  const y = p.kind === 'base' ? 0.01 : p.at[1];
  return (
    <mesh position={[p.at[0], y, p.at[2]]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#B9BEC2" roughness={0.45} metalness={0.4} />
    </mesh>
  );
}

function PanelMesh({ panel }: { readonly panel: Panel }) {
  const geo = useMemo(() => {
    const [a, b, c, d] = panel.pts;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
    g.computeVertexNormals();
    return g;
  }, [panel]);
  const roof = panel.kind === 'roof';
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color={roof ? '#4A5761' : '#EDEAE3'} roughness={roof ? 0.55 : 0.75} metalness={roof ? 0.35 : 0.05} side={THREE.DoubleSide} transparent opacity={roof ? 0.94 : 0.92} />
    </mesh>
  );
}

function StructureGroup({ structure, profileMap }: { readonly structure: Structure; readonly profileMap: Readonly<Record<ProfileKey, string>> }) {
  const geometryFor = useGeometryCache();
  return (
    <group>
      {structure.members.map((m, i) => (
        <MemberMesh key={`${m.group}-${i}`} m={m} code={profileMap[m.profile] ?? DEFAULT_PROFILE_MAP[m.profile]} geometryFor={geometryFor} />
      ))}
      {structure.plates.map((p, i) => (
        <PlateMesh key={`${p.kind}-${i}`} p={p} />
      ))}
      {structure.params.panels ? structure.panels.map((p, i) => <PanelMesh key={`${p.kind}-${i}`} panel={p} />) : null}
    </group>
  );
}

const V = (v: Vec3) => v;
void V;

/** R3F sahnesi (K-24: yalnız burada, dinamik import). Kamera/ışık/zemin/gölge prototip v4 ile aynı. */
export default function Scene({ structure, profileMap = DEFAULT_PROFILE_MAP }: Props) {
  const target: [number, number, number] = [0, structure.params.eave / 2, 0];
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [40, 26, 40], fov: 45, near: 0.1, far: 600 }} gl={{ antialias: true }} style={{ background: '#1C2126' }}>
      <fog attach="fog" args={['#1C2126', 55, 220]} />
      <hemisphereLight args={['#F7F6F4', '#1C2126', 0.85]} />
      <directionalLight position={[32, 48, 20]} intensity={1.15} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={1} shadow-camera-far={150} shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} shadow-bias={-0.0015} />
      <directionalLight position={[-25, 15, -20]} intensity={0.3} color="#88a0b0" />
      <gridHelper args={[160, 80, '#3A4750', '#2B3138']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#14171A" roughness={1} />
      </mesh>
      <StructureGroup structure={structure} profileMap={profileMap} />
      <OrbitControls target={target} enableDamping makeDefault />
    </Canvas>
  );
}
