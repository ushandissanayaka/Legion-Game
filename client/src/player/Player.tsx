import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ViewModelGun } from '../weapons/ViewModelGun';
import type { ViewModelGunHandle, GunType } from '../weapons/ViewModelGun';

interface PlayerProps {
  gunType?: GunType;
  onHealthChange?: Dispatch<SetStateAction<number>>;
  onAmmoChange?: (current: number, max: number) => void;
  onGameOver?: () => void;
}

export function Player({ gunType = 'assault', onHealthChange, onAmmoChange, onGameOver }: PlayerProps) {
  void onHealthChange;
  void onGameOver;
  const group = useRef<THREE.Group>(null);
  const { camera, scene } = useThree();
  const gunRef = useRef<ViewModelGunHandle>(null);

  // Load player model & animations
  const { scene: playerScene } = useGLTF('/models/player.glb');
  const { animations } = useGLTF('/models/animations/UAL1_Standard.glb');
  const { actions, names } = useAnimations(animations, group);

  // Input state — use ref for movement to avoid stale closures in event handlers
  const movementRef = useRef({ forward: false, backward: false, left: false, right: false });
  const [movementState, setMovementState] = useState({ forward: false, backward: false, left: false, right: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': movementRef.current.forward  = true; setMovementState(m => ({ ...m, forward: true })); break;
        case 'KeyS': movementRef.current.backward = true; setMovementState(m => ({ ...m, backward: true })); break;
        case 'KeyA': movementRef.current.left     = true; setMovementState(m => ({ ...m, left: true })); break;
        case 'KeyD': movementRef.current.right    = true; setMovementState(m => ({ ...m, right: true })); break;
        case 'KeyR': gunRef.current?.reload(); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': movementRef.current.forward  = false; setMovementState(m => ({ ...m, forward: false })); break;
        case 'KeyS': movementRef.current.backward = false; setMovementState(m => ({ ...m, backward: false })); break;
        case 'KeyA': movementRef.current.left     = false; setMovementState(m => ({ ...m, left: false })); break;
        case 'KeyD': movementRef.current.right    = false; setMovementState(m => ({ ...m, right: false })); break;
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || !document.pointerLockElement) return;
      gunRef.current?.shoot((hitObj) => {
        // Walk up to find the enemy root
        let o: THREE.Object3D | null = hitObj;
        while (o) {
          if (o.userData?.isEnemy && o.userData.takeDamage) {
            o.userData.takeDamage(o.userData.gunDamage ?? 25);
            break;
          }
          o = o.parent;
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Animations
  useEffect(() => {
    const isMoving = movementState.forward || movementState.backward || movementState.left || movementState.right;
    const walkAnim = names.find(n => n.toLowerCase().includes('walk') || n.toLowerCase().includes('run')) ?? names[0];
    const idleAnim = names.find(n => n.toLowerCase().includes('idle')) ?? names[0];
    const anim = isMoving ? walkAnim : idleAnim;
    if (anim && actions[anim]) {
      actions[anim]?.reset().fadeIn(0.2).play();
      return () => { actions[anim]?.fadeOut(0.2); };
    }
  }, [movementState, actions, names]);

  // Game loop — movement
  useFrame((_, delta) => {
    if (!group.current) return;
    const m = movementRef.current;
    const speed = 6 * delta;
    const front = new THREE.Vector3(0, 0, (m.backward ? 1 : 0) - (m.forward ? 1 : 0));
    const side  = new THREE.Vector3((m.left ? 1 : 0) - (m.right ? 1 : 0), 0, 0);
    const dir = new THREE.Vector3().subVectors(front, side);
    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(speed);
      dir.applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
      camera.position.add(dir);
    }
    camera.position.y = 2; // Lock eye height

    // Sync visible body (behind camera)
    group.current.position.set(camera.position.x, 0, camera.position.z);
    group.current.rotation.y = camera.rotation.y + Math.PI;
  });

  return (
    <>
      {/* Player body (visible to other players, not in first-person view) */}
      <group ref={group} dispose={null}>
        <primitive object={playerScene} />
      </group>

      {/* View-model gun — attached to camera every frame inside component */}
      <ViewModelGun
        ref={gunRef}
        gunType={gunType}
        scene={scene}
        onAmmoChange={onAmmoChange}
      />
    </>
  );
}

useGLTF.preload('/models/player.glb');
useGLTF.preload('/models/animations/UAL1_Standard.glb');
