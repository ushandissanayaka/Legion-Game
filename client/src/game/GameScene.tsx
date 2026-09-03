import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, PointerLockControls, Environment } from '@react-three/drei';
import { Player } from '../player/Player';
import { Enemy } from '../enemy/Enemy';
import type { GunType } from '../weapons/ViewModelGun';

interface GameSceneProps {
  botCount?: number;
  gunType?: GunType;
  onHealthChange?: React.Dispatch<React.SetStateAction<number>>;
  onAmmoChange?: (current: number, max: number) => void;
  onGameOver?: () => void;
}

export function GameScene({
  botCount = 0,
  gunType = 'assault',
  onHealthChange,
  onAmmoChange,
  onGameOver,
}: GameSceneProps) {
  // Generate spawn positions arranged in a circle
  const enemySpawns = React.useMemo<[number, number, number][]>(() => {
    if (botCount === 0) return [];
    return Array.from({ length: botCount }).map((_, i) => {
      const angle  = (i / botCount) * Math.PI * 2;
      const radius = 12 + (i % 3) * 5;
      return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
    });
  }, [botCount]);

  const [enemiesRemaining, setEnemiesRemaining] = React.useState(botCount);

  return (
    <>
      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 75 }}
        style={{ width: '100vw', height: '100vh', display: 'block' }}
      >
        {/* ── Sky & Lighting ──────────────────────────────────── */}
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[20, 30, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={80}
        />
        <hemisphereLight args={['#87ceeb', '#303030', 0.3]} />

        {/* ── Ground ──────────────────────────────────────────── */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color="#3d3d2d" roughness={0.9} />
        </mesh>

        {/* ── Cover / Environment Objects ─────────────────────── */}
        {/* Crates */}
        {[
          [5,  1,  -6], [-6,  1, -8], [8,  1, -14],
          [-10, 1, -5], [0,   1, -18], [12, 1, -3],
        ].map(([x, y, z], i) => (
          <mesh key={`crate-${i}`} position={[x, y, z]} castShadow receiveShadow>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#8B6914" roughness={0.8} />
          </mesh>
        ))}
        {/* Long walls */}
        {[
          [0, 2, -20], [-15, 2, -10], [15, 2, -10],
        ].map(([x, y, z], i) => (
          <mesh key={`wall-${i}`} position={[x, y, z]} castShadow receiveShadow>
            <boxGeometry args={[12, 4, 1]} />
            <meshStandardMaterial color="#555" roughness={0.9} />
          </mesh>
        ))}
        {/* Barrels */}
        {[[-4, 0.8, -4], [4, 0.8, -4], [9, 0.8, -9]].map(([x, y, z], i) => (
          <mesh key={`barrel-${i}`} position={[x, y, z]} castShadow receiveShadow>
            <cylinderGeometry args={[0.4, 0.4, 1.6, 12]} />
            <meshStandardMaterial color="#c0392b" roughness={0.7} metalness={0.3} />
          </mesh>
        ))}
        {/* Perimeter border walls */}
        <mesh position={[0, 3, -40]} castShadow receiveShadow>
          <boxGeometry args={[80, 6, 1]} />
          <meshStandardMaterial color="#444" />
        </mesh>
        <mesh position={[0, 3, 10]} castShadow receiveShadow>
          <boxGeometry args={[80, 6, 1]} />
          <meshStandardMaterial color="#444" />
        </mesh>
        <mesh position={[-40, 3, -15]} castShadow receiveShadow>
          <boxGeometry args={[1, 6, 60]} />
          <meshStandardMaterial color="#444" />
        </mesh>
        <mesh position={[40, 3, -15]} castShadow receiveShadow>
          <boxGeometry args={[1, 6, 60]} />
          <meshStandardMaterial color="#444" />
        </mesh>

        {/* ── Enemies ─────────────────────────────────────────── */}
        {enemySpawns.map((pos, i) => (
          <Enemy
            key={i}
            position={pos}
            onDie={() => setEnemiesRemaining(p => Math.max(0, p - 1))}
            onDamagePlayer={(dmg) => {
              if (onHealthChange) {
                onHealthChange(prev => {
                  const next = Math.max(0, prev - dmg);
                  if (next === 0 && onGameOver) onGameOver();
                  return next;
                });
              }
            }}
          />
        ))}

        {/* ── Player ──────────────────────────────────────────── */}
        <Player
          gunType={gunType}
          onHealthChange={onHealthChange}
          onAmmoChange={onAmmoChange}
          onGameOver={onGameOver}
        />

        {/* ── Post-processing helpers ──────────────────────────── */}
        <Environment preset="dawn" />
        <PointerLockControls />
      </Canvas>

      {/* ── Crosshair ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <line x1="12" y1="2"  x2="12" y2="8"  stroke="white" strokeWidth="1.5" opacity="0.85" />
          <line x1="12" y1="16" x2="12" y2="22" stroke="white" strokeWidth="1.5" opacity="0.85" />
          <line x1="2"  y1="12" x2="8"  y2="12" stroke="white" strokeWidth="1.5" opacity="0.85" />
          <line x1="16" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.5" opacity="0.85" />
          <circle cx="12" cy="12" r="1.5" fill="white" opacity="0.9" />
        </svg>
      </div>

      {/* ── Enemy counter ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 24,
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 14,
        background: 'rgba(0,0,0,0.5)',
        padding: '6px 14px',
        borderRadius: 6,
        pointerEvents: 'none',
      }}>
        Enemies: {enemiesRemaining} / {botCount}
      </div>

      {/* ── Click-to-play hint ───────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#ccc',
        fontFamily: 'monospace',
        fontSize: 13,
        background: 'rgba(0,0,0,0.55)',
        padding: '8px 16px',
        borderRadius: 8,
        pointerEvents: 'none',
      }}>
        Click to capture mouse · WASD = Move · Mouse = Aim · LMB = Shoot · R = Reload
      </div>
    </>
  );
}
