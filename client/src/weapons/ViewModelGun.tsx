import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Gun geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

function GunPart({
  position,
  size,
  color,
  rotation,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} />
    </mesh>
  );
}

// Assault Rifle shape
function AssaultRifle() {
  return (
    <group>
      {/* Receiver (body) */}
      <GunPart position={[0, 0, 0]} size={[0.06, 0.07, 0.5]} color="#2a2a2a" />
      {/* Barrel */}
      <GunPart position={[0, 0.01, -0.35]} size={[0.03, 0.03, 0.4]} color="#1a1a1a" />
      {/* Magazine */}
      <GunPart position={[0, -0.1, 0.05]} size={[0.04, 0.15, 0.07]} color="#333" />
      {/* Stock */}
      <GunPart position={[0, 0, 0.3]} size={[0.05, 0.06, 0.2]} color="#3d2b1a" />
      {/* Grip */}
      <GunPart position={[0, -0.08, 0.12]} size={[0.04, 0.1, 0.06]} color="#3d2b1a" />
      {/* Top rail */}
      <GunPart position={[0, 0.04, -0.05]} size={[0.015, 0.015, 0.35]} color="#111" />
      {/* Muzzle brake */}
      <mesh position={[0, 0.01, -0.56]} castShadow>
        <cylinderGeometry args={[0.025, 0.02, 0.05, 8]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Shotgun shape
function Shotgun() {
  return (
    <group>
      {/* Body */}
      <GunPart position={[0, 0, 0]} size={[0.07, 0.08, 0.55]} color="#3d2b1a" />
      {/* Double barrel */}
      <GunPart position={[0.02, 0.05, -0.35]} size={[0.025, 0.025, 0.45]} color="#1a1a1a" />
      <GunPart position={[-0.02, 0.05, -0.35]} size={[0.025, 0.025, 0.45]} color="#1a1a1a" />
      {/* Pump */}
      <GunPart position={[0, -0.02, -0.15]} size={[0.075, 0.04, 0.12]} color="#2a2a2a" />
      {/* Stock */}
      <GunPart position={[0, -0.01, 0.35]} size={[0.065, 0.075, 0.22]} color="#5c3d1e" />
      {/* Grip */}
      <GunPart position={[0, -0.09, 0.1]} size={[0.05, 0.12, 0.07]} color="#4a2f0f" />
      {/* Guard */}
      <GunPart position={[0, -0.07, 0.08]} size={[0.1, 0.015, 0.03]} color="#3d2b1a" />
    </group>
  );
}

// Sniper Rifle shape
function SniperRifle() {
  return (
    <group>
      {/* Receiver */}
      <GunPart position={[0, 0, 0]} size={[0.055, 0.065, 0.45]} color="#1c1c1c" />
      {/* Long barrel */}
      <GunPart position={[0, 0.01, -0.52]} size={[0.025, 0.025, 0.65]} color="#111" />
      {/* Scope */}
      <mesh position={[0, 0.07, -0.05]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.32, 8]} />
        <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Scope lens front */}
      <mesh position={[0, 0.07, -0.21]}>
        <circleGeometry args={[0.022, 12]} />
        <meshStandardMaterial color="#004488" metalness={0.5} roughness={0.1} transparent opacity={0.8} />
      </mesh>
      {/* Bipod legs */}
      <GunPart position={[0.04, -0.09, -0.35]} size={[0.008, 0.12, 0.008]} color="#333" rotation={[0, 0, 0.2]} />
      <GunPart position={[-0.04, -0.09, -0.35]} size={[0.008, 0.12, 0.008]} color="#333" rotation={[0, 0, -0.2]} />
      {/* Magazine */}
      <GunPart position={[0, -0.1, 0.0]} size={[0.04, 0.14, 0.06]} color="#2a2a2a" />
      {/* Stock */}
      <GunPart position={[0, 0, 0.3]} size={[0.05, 0.06, 0.25]} color="#3d2b1a" />
      {/* Muzzle suppressor */}
      <mesh position={[0, 0.01, -0.87]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.1, 8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gun config types
// ─────────────────────────────────────────────────────────────────────────────

export type GunType = 'assault' | 'shotgun' | 'sniper';

interface GunConfig {
  damage: number;
  fireRate: number;   // seconds between shots
  range: number;
  pellets: number;    // for shotgun
  name: string;
}

export const GUN_CONFIGS: Record<GunType, GunConfig> = {
  assault: { damage: 25, fireRate: 0.12, range: 80, pellets: 1, name: 'Assault Rifle' },
  shotgun: { damage: 15, fireRate: 0.8,  range: 20, pellets: 8, name: 'Shotgun' },
  sniper:  { damage: 100, fireRate: 1.5, range: 200, pellets: 1, name: 'Sniper Rifle' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Muzzle Flash
// ─────────────────────────────────────────────────────────────────────────────

function MuzzleFlash({ visible }: { visible: boolean }) {
  return (
    <group position={[0, 0.01, -0.65]} visible={visible}>
      {/* Core flash */}
      <mesh>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.9} />
      </mesh>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.4} />
      </mesh>
      {/* Point light for flash glow */}
      <pointLight color="#ffaa00" intensity={3} distance={4} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View-model Gun (attached to camera — first-person)
// ─────────────────────────────────────────────────────────────────────────────

export interface ViewModelGunHandle {
  shoot: (onHit: (obj: THREE.Object3D) => void) => void;
  getAmmo: () => { current: number; max: number };
  reload: () => void;
}

interface ViewModelGunProps {
  gunType: GunType;
  scene: THREE.Scene;
  onAmmoChange?: (current: number, max: number) => void;
}

export const ViewModelGun = forwardRef<ViewModelGunHandle, ViewModelGunProps>(
  ({ gunType, scene, onAmmoChange }, ref) => {
    const { camera } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const raycaster = useRef(new THREE.Raycaster());

    const cfg = GUN_CONFIGS[gunType];
    const MAX_AMMO = gunType === 'shotgun' ? 6 : gunType === 'sniper' ? 5 : 30;

    const ammoRef = useRef(MAX_AMMO);
    const lastFireTime = useRef(0);
    const [flash, setFlash] = useState(false);
    const [recoilY, setRecoilY] = useState(0);
    const recoilRef = useRef(0);

    // Expose API to parent
    useImperativeHandle(ref, () => ({
      shoot: (onHit) => {
        const now = performance.now() / 1000;
        if (now - lastFireTime.current < cfg.fireRate) return;
        if (ammoRef.current <= 0) return;

        lastFireTime.current = now;
        ammoRef.current -= 1;
        if (onAmmoChange) onAmmoChange(ammoRef.current, MAX_AMMO);

        // Muzzle flash
        setFlash(true);
        setTimeout(() => setFlash(false), 80);

        // Recoil
        recoilRef.current = gunType === 'sniper' ? 0.15 : gunType === 'shotgun' ? 0.08 : 0.03;

        // Raycast for each pellet
        for (let p = 0; p < cfg.pellets; p++) {
          const spread = gunType === 'shotgun' ? 0.05 : 0;
          const dir = new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            -1
          ).applyQuaternion(camera.quaternion).normalize();

          raycaster.current.set(camera.position, dir);
          raycaster.current.far = cfg.range;

          const hits = raycaster.current.intersectObjects(scene.children, true);
          const enemyHit = hits.find(h => {
            let o: THREE.Object3D | null = h.object;
            while (o) { if (o.userData?.isEnemy) return true; o = o.parent; }
            return false;
          });

          if (enemyHit) {
            let o: THREE.Object3D | null = enemyHit.object;
            while (o) {
              if (o.userData?.isEnemy) { onHit(o); break; }
              o = o.parent;
            }
          }
        }
      },
      getAmmo: () => ({ current: ammoRef.current, max: MAX_AMMO }),
      reload: () => {
        ammoRef.current = MAX_AMMO;
        if (onAmmoChange) onAmmoChange(MAX_AMMO, MAX_AMMO);
      },
    }));

    // Attach group to camera every frame
    useFrame((state, delta) => {
      if (!groupRef.current) return;

      // Decay recoil
      recoilRef.current = Math.max(0, recoilRef.current - delta * 4);

      // Position gun in camera-space: bottom-right corner
      const offset = new THREE.Vector3(0.25, -0.22 - recoilRef.current * 0.3, -0.5);
      offset.applyQuaternion(camera.quaternion);

      groupRef.current.position.copy(camera.position).add(offset);
      groupRef.current.quaternion.copy(camera.quaternion);

      // Add recoil rotation (tilt up)
      groupRef.current.rotateX(recoilRef.current * 0.5);
    });

    const GunMesh =
      gunType === 'shotgun' ? Shotgun :
      gunType === 'sniper'  ? SniperRifle :
      AssaultRifle;

    return (
      <group ref={groupRef}>
        <GunMesh />
        <MuzzleFlash visible={flash} />
      </group>
    );
  }
);

ViewModelGun.displayName = 'ViewModelGun';
