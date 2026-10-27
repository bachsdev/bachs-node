import { ThreeCanvas, useOffthreadVideoTexture } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// A generic modern phone, modelled in three.js: a rounded metal body with a
// bevelled edge, black glass, a punch-hole camera and side buttons. Nothing in it
// copies a particular manufacturer's design. The screen is a texture, so a
// screen recording plays on it while the phone moves; taps are drawn on the
// glass at the point that was touched.

// Screen proportions of a recent phone screen recording (1179 x 2556).
export const SCREEN_ASPECT = 1179 / 2556;
const SH = 2.0; // screen height in scene units
const SW = SH * SCREEN_ASPECT;
const BEZEL = 0.05;
const BW = SW + BEZEL * 2;
const BH = SH + BEZEL * 2;
const DEPTH = 0.085;
const BEVEL = 0.014;
const FRONT = DEPTH / 2 + BEVEL;

const rounded = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
};

// ShapeGeometry UVs are in shape units; map them to 0..1 across the shape so a texture fills it.
const fitUV = (g: THREE.BufferGeometry, w: number, h: number) => {
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w;
    uv[i * 2 + 1] = (pos.getY(i) + h / 2) / h;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
};

const Studio: React.FC = () => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environment = env;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 6]} intensity={1.1} />
      <directionalLight position={[-4, -2, 3]} intensity={0.4} />
    </>
  );
};

export type Tap = { f: number; x: number; y: number }; // x, y in screen pixels of the recording (1179 x 2556)

const TapRing: React.FC<{ tap: Tap }> = ({ tap }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [tap.f - 4, tap.f, tap.f + 14], [0, 1, 2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (t <= 0 || t >= 2) return null;
  const press = t <= 1 ? t : 1;
  const ring = t > 1 ? t - 1 : 0;
  const px = (tap.x / 1179 - 0.5) * SW;
  const py = (0.5 - tap.y / 2556) * SH;
  return (
    <group position={[px, py, FRONT + 0.004]}>
      <mesh>
        <circleGeometry args={[0.06 * (0.8 + 0.2 * press), 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55 * press * (1 - ring)} toneMapped={false} />
      </mesh>
      {ring > 0 && (
        <mesh>
          <ringGeometry args={[0.06 + ring * 0.1, 0.07 + ring * 0.1, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7 * (1 - ring)} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

const VideoScreen: React.FC<{ src: string; geom: THREE.BufferGeometry }> = ({ src, geom }) => {
  const texture = useOffthreadVideoTexture({ src, playbackRate: 1, transparent: false, toneMapped: false } as never);
  if (texture) texture.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh geometry={geom} position={[0, 0, FRONT + 0.002]}>
      {texture ? <meshBasicMaterial map={texture} toneMapped={false} /> : <meshBasicMaterial color="#000" />}
    </mesh>
  );
};

const ImageScreen: React.FC<{ src: string; geom: THREE.BufferGeometry }> = ({ src, geom }) => {
  const [handle] = useState(() => delayRender('screen image'));
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useLayoutEffect(() => {
    new THREE.TextureLoader().load(src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
      continueRender(handle);
    });
  }, [src, handle]);
  return (
    <mesh geometry={geom} position={[0, 0, FRONT + 0.002]}>
      {tex ? <meshBasicMaterial map={tex} toneMapped={false} /> : <meshBasicMaterial color="#000" />}
    </mesh>
  );
};

const PhoneModel: React.FC<{ screen: { video?: string; image?: string; startFrom?: number }; taps: Tap[] }> = ({ screen, taps }) => {
  const g = useMemo(() => {
    const body = new THREE.ExtrudeGeometry(rounded(BW, BH, 0.16), { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 6, curveSegments: 32 });
    body.translate(0, 0, -DEPTH / 2);
    const glass = new THREE.ShapeGeometry(rounded(BW - 0.01, BH - 0.01, 0.155), 32);
    const scr = fitUV(new THREE.ShapeGeometry(rounded(SW, SH, 0.115), 32), SW, SH);
    const cam = new THREE.CircleGeometry(0.03, 32);
    return { body, glass, scr, cam };
  }, []);
  const frameMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#9a9ca3', metalness: 1, roughness: 0.22, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 1.2 }), []);
  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#050507', metalness: 0, roughness: 0.08, clearcoat: 1 }), []);
  const buttons: [number, number, number][] = [
    [-1, 0.52, 0.11],
    [-1, 0.28, 0.2],
    [-1, 0.02, 0.2],
    [1, 0.3, 0.3],
  ];
  return (
    <group>
      <mesh geometry={g.body} material={frameMat} />
      <mesh geometry={g.glass} material={glassMat} position={[0, 0, FRONT + 0.0005]} />
      {screen.video ? (
        <Sequence from={-(screen.startFrom ?? 0)} layout="none">
          <VideoScreen src={screen.video} geom={g.scr} />
        </Sequence>
      ) : (
        <ImageScreen src={screen.image!} geom={g.scr} />
      )}
      <mesh geometry={g.cam} position={[0, SH / 2 - 0.07, FRONT + 0.003]}>
        <meshBasicMaterial color="#08080a" />
      </mesh>
      {buttons.map(([side, y, h], i) => (
        <mesh key={i} position={[side * (BW / 2 + BEVEL + 0.004), y, 0]} material={frameMat}>
          <boxGeometry args={[0.012, h, 0.045]} />
        </mesh>
      ))}
      {taps.map((t, i) => (
        <TapRing key={i} tap={t} />
      ))}
    </group>
  );
};

export type Pose = { x: number; y: number; scale: number; rotX: number; rotY: number; rotZ: number };

export const Phone3D: React.FC<{ width: number; height: number; pose: Pose; screen: { video?: string; image?: string; startFrom?: number }; taps?: Tap[] }> = ({ width, height, pose, screen, taps = [] }) => (
  <ThreeCanvas width={width} height={height} camera={{ fov: 28, position: [0, 0, 6.2] }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} style={{ position: 'absolute', inset: 0 }}>
    <Studio />
    <group position={[pose.x, pose.y, 0]} scale={pose.scale} rotation={[pose.rotX, pose.rotY, pose.rotZ]}>
      <PhoneModel screen={screen} taps={taps} />
    </group>
  </ThreeCanvas>
);

export const testScreen = () => staticFile('inaction/hold-success.png');
