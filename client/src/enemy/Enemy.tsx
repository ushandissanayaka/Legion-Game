import React, { useEffect, useRef, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface EnemyProps {
  position: [number, number, number];
  onDie?: () => void;
  onDamagePlayer?: (damage: number) => void;
}



export function Enemy({ position, onDie, onDamagePlayer }: EnemyProps) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // AI state: 0 = Idle, 1 = Move toward, 2 = Shoot
  const stateRef = useRef(0);
  const [animState, setAnimState] = useState(0);
  const hpRef = useRef(100);
  const [dead, setDead] = useState(false);
  const lastShootTime = useRef(0);
  const [muzzleFlash, setMuzzleFlash] = useState(false);

  // Clone scene so each enemy is independent
  const { scene: _scene } = useGLTF('/models/player.glb');
  const enemyScene = React.useMemo(() => _scene.clone(), [_scene]);

  const { animations } = useGLTF('/models/animations/UAL1_Standard.glb');
  const { actions, names } = useAnimations(animations, group);

  // Register hit detection userData on the group
  useEffect(() => {
    if (!group.current) return;
    group.current.traverse(child => {
      child.userData.isEnemy = true;
      child.userData.takeDamage = (amount: number) => {
        hpRef.current = Math.max(0, hpRef.current - amount);
        if (hpRef.current <= 0 && !dead) {
          setDead(true);
          onDie?.();
        }
      };
    });
    group.current.userData.isEnemy = true;
    group.current.userData.takeDamage = (amount: number) => {
      hpRef.current = Math.max(0, hpRef.current - amount);
      if (hpRef.current <= 0 && !dead) {
        setDead(true);
        onDie?.();
      }
    };
  }, [dead, onDie]);

  // AI + movement loop
  useFrame((frameState, delta) => {
    if (!group.current || dead) return;

    const pos = group.current.position;
    const dist = pos.distanceTo(camera.position);

    // Always face the player (Y-axis only)
    const target = new THREE.Vector3(camera.position.x, pos.y, camera.position.z);
    group.current.lookAt(target);
    group.current.rotation.y += Math.PI;

    let newState = stateRef.current;

    if (dist > 20) {
      // Too far: idle
      newState = 0;
    } else if (dist > 6) {
      // Approach
      newState = 1;
      const dir = new THREE.Vector3().subVectors(camera.position, pos);
      dir.y = 0;
      dir.normalize().multiplyScalar(2.5 * delta);
      group.current.position.add(dir);
    } else {
      // Attack range
      newState = 2;
      const now = frameState.clock.getElapsedTime();
      if (now - lastShootTime.current > 1.2) {
        lastShootTime.current = now;
        onDamagePlayer?.(8);
        // Brief muzzle flash on enemy weapon
        setMuzzleFlash(true);
        setTimeout(() => setMuzzleFlash(false), 80);
      }
    }

    if (newState !== stateRef.current) {
      stateRef.current = newState;
      setAnimState(newState);
    }
  });

  // Drive animation from state
  useEffect(() => {
    if (dead) return;
    const idleAnim = names.find(n => n.toLowerCase().includes('idle')) ?? names[0];
    const walkAnim = names.find(n => n.toLowerCase().includes('walk') || n.toLowerCase().includes('run')) ?? idleAnim;
    const shootAnim = names.find(n => n.toLowerCase().includes('aim') || n.toLowerCase().includes('shoot')) ?? idleAnim;

    const target = animState === 1 ? walkAnim : animState === 2 ? shootAnim : idleAnim;
    if (target && actions[target]) {
      actions[target]?.reset().fadeIn(0.25).play();
      return () => { actions[target]?.fadeOut(0.25); };
    }
  }, [animState, dead, actions, names]);

  if (dead) return null;

  return (
    <group ref={group} position={position} dispose={null}>
      <primitive object={enemyScene} />

      {/* Enemy gun (assembled geometry, dark metal) */}
      <group position={[0.3, 1.05, 0.45]}>
        {/* Receiver */}
        <mesh>
          <boxGeometry args={[0.05, 0.06, 0.38]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Barrel */}
        <mesh position={[0, 0.01, -0.25]}>
          <boxGeometry args={[0.025, 0.025, 0.3]} />
          <meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Magazine */}
        <mesh position={[0, -0.08, 0.03]}>
          <boxGeometry args={[0.035, 0.12, 0.055]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        {/* Muzzle flash */}
        {muzzleFlash && (
          <group position={[0, 0.01, -0.42]}>
            <mesh>
              <sphereGeometry args={[0.04, 6, 6]} />
              <meshBasicMaterial color="#ffaa00" transparent opacity={0.9} />
            </mesh>
            <pointLight color="#ffaa00" intensity={2} distance={3} decay={2} />
          </group>
        )}
      </group>
    </group>
  );
}

useGLTF.preload('/models/player.glb');
useGLTF.preload('/models/animations/UAL1_Standard.glb');
