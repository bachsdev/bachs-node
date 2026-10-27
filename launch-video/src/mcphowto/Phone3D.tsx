import { ThreeCanvas, useOffthreadVideoTexture } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { cancelRender, continueRender, delayRender, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// The phone is Polyman's "Apple iPhone 15 Pro Max Black" (Sketchfab, CC BY 4.0;
// credit in public/audio/licensed/CREDITS.md). The model's screen mesh gets the
// screen recording as its texture, so the recording plays on the glass while
// the phone moves; taps are drawn on the glass at the point that was touched.

const MODEL = 'mcphowto/model/phone.glb';
const SCREEN_MESH = 'xXDHkMplTIDAXLN';
const ISLAND_MESH = 'DjdhycfQYjKMDyn';
const ISLAND_PARTS = ['DjdhycfQYjKMDyn', 'usFLmqcyrnltBUr', 'EbQGKrWAqhBHiMv'];
// Some of the model's parts break through its glass in headless WebGL, so the
// screen, the island and the taps are redrawn just in front and drawn last,
// over the model: nothing on the phone ever covers the glass.
const LIFT = 0.002;
const OVER = { depthTest: false, depthWrite: false } as const;

// Screen recordings from the phone are 1179 x 2556 (often encoded 1178 wide).
export const REC_W = 1179;
export const REC_H = 2556;
const PHONE_H = 2.0; // the model is scaled so the body is this tall in scene units

export type Tap = { f: number; x: number; y: number }; // x, y in recording pixels
export type Pose = { x: number; y: number; scale: number; rotX: number; rotY: number; rotZ: number };
type ScreenRect = { cx: number; cy: number; w: number; h: number; z: number };

const roundedRect = (w: number, h: number, r: number) => {
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

// A flat rounded screen with UVs running 0..1 across it.
const screenGeometry = (w: number, h: number) => {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, w * 0.125), 48);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
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

// One load per render tab, shared by every frame.
let gltfPromise: Promise<GLTF> | null = null;
const loadPhone = () => {
  if (!gltfPromise) {
    const draco = new DRACOLoader().setDecoderPath(staticFile('draco/'));
    gltfPromise = new GLTFLoader().setDRACOLoader(draco).loadAsync(staticFile(MODEL));
  }
  return gltfPromise;
};

// Centre the model, scale it to PHONE_H and measure the screen in model space.
const usePhone = () => {
  const [handle] = useState(() => delayRender('phone model'));
  const [phone, setPhone] = useState<{ root: THREE.Object3D; screen: THREE.Mesh; island: THREE.Mesh; rect: ScreenRect } | null>(null);
  useLayoutEffect(() => {
    loadPhone()
      .then((gltf) => {
        // the model is built with its back towards +z; turn it to face the camera
        const root = gltf.scene.clone(true);
        root.rotation.y = Math.PI;
        const holder = new THREE.Group();
        holder.add(root);
        holder.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(holder);
        const size = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        const k = PHONE_H / size.y;
        root.position.sub(centre);
        holder.scale.setScalar(k);
        holder.updateMatrixWorld(true);
        // the model's screen and island are measured, hidden and redrawn (see LIFT)
        const modelScreen = root.getObjectByName(SCREEN_MESH) as THREE.Mesh;
        const sb = new THREE.Box3().setFromObject(modelScreen);
        const sc = sb.getCenter(new THREE.Vector3());
        const ss = sb.getSize(new THREE.Vector3());
        const ib = new THREE.Box3().setFromObject(root.getObjectByName(ISLAND_MESH)!);
        const ic = ib.getCenter(new THREE.Vector3());
        const is = ib.getSize(new THREE.Vector3());
        modelScreen.visible = false;
        for (const name of ISLAND_PARTS) root.getObjectByName(name)!.visible = false;
        const z = sb.max.z + LIFT;
        const screen = new THREE.Mesh(screenGeometry(ss.x, ss.y), new THREE.MeshBasicMaterial({ color: '#000', ...OVER }));
        screen.position.set(sc.x, sc.y, z);
        screen.renderOrder = 10;
        const island = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(is.x, is.y, is.y / 2), 24), new THREE.MeshBasicMaterial({ color: '#000', ...OVER }));
        island.position.set(ic.x, ic.y, z + LIFT);
        island.renderOrder = 11;
        const lens = new THREE.Mesh(new THREE.CircleGeometry(is.y * 0.24, 32), new THREE.MeshStandardMaterial({ color: '#16181f', metalness: 0.6, roughness: 0.25, ...OVER }));
        lens.renderOrder = 12;
        lens.position.set(ic.x + is.x / 2 - is.y / 2, ic.y, z + LIFT * 2);
        island.add(lens);
        lens.position.sub(island.position);
        setPhone({ root: holder, screen, island, rect: { cx: sc.x, cy: sc.y, w: ss.x, h: ss.y, z } });
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [handle]);
  return phone;
};

const TapRing: React.FC<{ tap: Tap; rect: ScreenRect }> = ({ tap, rect }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [tap.f - 4, tap.f, tap.f + 14], [0, 1, 2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (t <= 0 || t >= 2) return null;
  const press = t <= 1 ? t : 1;
  const ring = t > 1 ? t - 1 : 0;
  const px = rect.cx + (tap.x / REC_W - 0.5) * rect.w;
  const py = rect.cy + (0.5 - tap.y / REC_H) * rect.h;
  return (
    <group position={[px, py, rect.z + LIFT * 4]}>
      <mesh renderOrder={13}>
        <circleGeometry args={[0.06 * (0.8 + 0.2 * press), 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55 * press * (1 - ring)} toneMapped={false} {...OVER} />
      </mesh>
      {ring > 0 && (
        <mesh renderOrder={13}>
          <ringGeometry args={[0.06 + ring * 0.1, 0.07 + ring * 0.1, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7 * (1 - ring)} toneMapped={false} {...OVER} />
        </mesh>
      )}
    </group>
  );
};

// Puts a texture on the screen plane (UVs run bottom-up, so the texture keeps the usual flip).
const useScreenTexture = (screen: THREE.Mesh, texture: THREE.Texture | null) => {
  useLayoutEffect(() => {
    if (!texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;
    texture.needsUpdate = true;
    screen.material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, ...OVER });
  }, [screen, texture]);
};

const VideoScreen: React.FC<{ src: string; screen: THREE.Mesh }> = ({ src, screen }) => {
  const texture = useOffthreadVideoTexture({ src, playbackRate: 1, transparent: false, toneMapped: false } as never) as THREE.Texture | null;
  useScreenTexture(screen, texture);
  return null;
};

const ImageScreen: React.FC<{ src: string; screen: THREE.Mesh }> = ({ src, screen }) => {
  const [handle] = useState(() => delayRender('screen image'));
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useLayoutEffect(() => {
    new THREE.TextureLoader().load(src, (t) => {
      setTex(t);
      continueRender(handle);
    });
  }, [src, handle]);
  useScreenTexture(screen, tex);
  return null;
};

const PhoneModel: React.FC<{ screen: { video?: string; image?: string; startFrom?: number }; taps: Tap[] }> = ({ screen, taps }) => {
  const phone = usePhone();
  const content = useMemo(() => phone?.root, [phone]);
  if (!phone || !content) return null;
  return (
    <group>
      <primitive object={content} />
      <primitive object={phone.screen} />
      <primitive object={phone.island} />
      {screen.video ? (
        <Sequence from={-(screen.startFrom ?? 0)} layout="none">
          <VideoScreen src={screen.video} screen={phone.screen} />
        </Sequence>
      ) : (
        <ImageScreen src={screen.image!} screen={phone.screen} />
      )}
      {taps.map((t, i) => (
        <TapRing key={i} tap={t} rect={phone.rect} />
      ))}
    </group>
  );
};

export const Phone3D: React.FC<{ width: number; height: number; pose: Pose; screen: { video?: string; image?: string; startFrom?: number }; taps?: Tap[] }> = ({ width, height, pose, screen, taps = [] }) => (
  <ThreeCanvas width={width} height={height} camera={{ fov: 28, position: [0, 0, 6.2], near: 2, far: 20 }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} style={{ position: 'absolute', inset: 0 }}>
    <Studio />
    <group position={[pose.x, pose.y, 0]} scale={pose.scale} rotation={[pose.rotX, pose.rotY, pose.rotZ]}>
      <PhoneModel screen={screen} taps={taps} />
    </group>
  </ThreeCanvas>
);
