'use client';

// Lightweight low-poly infrastructure scene for the login visual panel.
// Loaded only via next/dynamic (ssr: false) from LoginVisual — never imported by dashboards.

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const NAVY = '#1f2a40';
const NAVY_LIGHT = '#36425c';
const ORANGE = '#fd6925';

// Box with crisp orange edge lines — the "blueprint" low-poly look.
function Block({ size, position, color = NAVY, edge = ORANGE, edgeOpacity = 0.9, rotation }) {
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo}>
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.1} flatShading />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={edge} transparent opacity={edgeOpacity} />
      </lineSegments>
    </group>
  );
}

// A thin strut between two points (used for truss members and crane jib).
function Strut({ from, to, thickness = 0.06, color = ORANGE }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { position: a.add(b).multiplyScalar(0.5).toArray(), quaternion: q, length: len };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <boxGeometry args={[thickness, length, thickness]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} emissive={color} emissiveIntensity={0.18} />
    </mesh>
  );
}

function TrussBridge() {
  const span = 6;
  const panels = 6;
  const h = 0.9;
  const z = 0.45;
  const members = useMemo(() => {
    const list = [];
    const step = span / panels;
    for (const zz of [-z, z]) {
      for (let i = 0; i < panels; i += 1) {
        const x0 = -span / 2 + i * step;
        const x1 = x0 + step;
        list.push([[x0, 0, zz], [x1, 0, zz]]); // bottom chord
        if (i > 0 && i < panels - 1) list.push([[x0, h, zz], [x1, h, zz]]); // top chord
        if (i > 0) list.push([[x0, 0, zz], [x0, h, zz]]); // vertical
        // diagonals form a Warren/Pratt hybrid
        if (i === 0) list.push([[x0, 0, zz], [x1, h, zz]]);
        else if (i === panels - 1) list.push([[x0, h, zz], [x1, 0, zz]]);
        else list.push(i < panels / 2 ? [[x0, 0, zz], [x1, h, zz]] : [[x0, h, zz], [x1, 0, zz]]);
      }
    }
    // lateral bracing across the top
    for (let i = 1; i < panels; i += 1) {
      const x = -span / 2 + i * step;
      list.push([[x, h, -z], [x, h, z]]);
    }
    return list;
  }, []);

  return (
    <group position={[0, 0.35, 0]}>
      <Block size={[span + 0.4, 0.12, 1.2]} position={[0, -0.06, 0]} color={NAVY_LIGHT} edgeOpacity={0.6} />
      {members.map(([a, b], i) => (
        <Strut key={i} from={a} to={b} thickness={0.05} />
      ))}
      {/* piers */}
      <Block size={[0.5, 1.1, 1.3]} position={[-span / 2 + 0.1, -0.65, 0]} />
      <Block size={[0.5, 1.1, 1.3]} position={[span / 2 - 0.1, -0.65, 0]} />
    </group>
  );
}

function Crane() {
  const hookRef = useRef();
  useFrame(({ clock }) => {
    if (hookRef.current) hookRef.current.position.y = 2.2 + Math.sin(clock.elapsedTime * 0.9) * 0.18;
  });
  return (
    <group position={[2.2, -0.6, -1.8]}>
      <Block size={[0.22, 3.6, 0.22]} position={[0, 1.8, 0]} color={NAVY_LIGHT} edgeOpacity={0.7} />
      <Strut from={[-0.8, 3.6, 0]} to={[2.2, 3.6, 0]} thickness={0.08} />
      <Strut from={[0, 4.1, 0]} to={[2.2, 3.6, 0]} thickness={0.03} />
      <Strut from={[0, 4.1, 0]} to={[-0.8, 3.6, 0]} thickness={0.03} />
      <Block size={[0.4, 0.3, 0.35]} position={[-0.65, 3.4, 0]} color={NAVY} />
      <group ref={hookRef} position={[1.6, 2.2, 0]}>
        <Strut from={[0, 0.15, 0]} to={[0, 1.4, 0]} thickness={0.015} color="#aab5ca" />
        <Block size={[0.32, 0.3, 0.32]} position={[0, 0, 0]} color={ORANGE} edge="#ffffff" edgeOpacity={0.5} />
      </group>
    </group>
  );
}

function Skyline() {
  const towers = [
    { s: [0.8, 2.4, 0.8], p: [-2.4, 0.6, -2.2] },
    { s: [0.6, 1.6, 0.6], p: [-1.4, 0.2, -2.6] },
    { s: [0.9, 3.1, 0.9], p: [-0.2, 0.95, -2.9] },
    { s: [0.6, 1.2, 0.6], p: [0.9, 0, -2.4] },
    { s: [0.7, 1.9, 0.7], p: [-3.3, 0.35, -1.2] },
  ];
  return (
    <group>
      {towers.map((t, i) => (
        <Block key={i} size={t.s} position={t.p} color={i % 2 ? NAVY : NAVY_LIGHT} edgeOpacity={0.55} />
      ))}
    </group>
  );
}

function Ground() {
  return (
    <group position={[0, -1.2, 0]}>
      <gridHelper args={[16, 32, ORANGE, '#36425c']} position={[0, 0.001, 0]}>
        {/* keep grid subtle */}
      </gridHelper>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[8, 6]} />
        <meshStandardMaterial color="#131c2e" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

function Rig({ animate }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (animate && ref.current) ref.current.rotation.y += delta * 0.12;
  });
  return (
    <group ref={ref} rotation={[0, -0.5, 0]}>
      <Ground />
      <Skyline />
      <TrussBridge />
      <Crane />
    </group>
  );
}

export default function InfraScene({ reducedMotion = false, onReady }) {
  return (
    <Canvas
      // reduced motion: render once on demand and never loop
      frameloop={reducedMotion ? 'demand' : 'always'}
      dpr={[1, 1.5]}
      camera={{ position: [6.5, 4.2, 7.5], fov: 38, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0.6, 0);
        onReady?.();
      }}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#0b1324', 9, 22]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#ffd9c4', '#0b1324', 0.6]} />
      <directionalLight position={[5, 8, 4]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-3, 2, 3]} intensity={6} distance={10} color={ORANGE} />
      <group scale={0.82} position={[0, -0.2, 0]}>
        <Rig animate={!reducedMotion} />
      </group>
    </Canvas>
  );
}
