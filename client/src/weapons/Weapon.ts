import * as THREE from 'three';
import { Camera } from '../game/Camera';
import { RemotePlayer } from '../player/RemotePlayer';
import type { BotPlayer } from '../player/BotPlayer';
import { Lighting } from '../game/Lighting';
import { AudioManager } from '../audio/AudioManager';

// ============================================================
// Weapon System — 3 weapon types with distinct geometry,
// stats, and behaviour
// ============================================================

export type WeaponType = 'assault' | 'shotgun' | 'sniper';

export interface WeaponConfig {
  name: string;
  damage: number;
  fireRate: number;   // seconds between shots
  range: number;
  magazineSize: number;
  pellets: number;    // shotgun spread
  reloadTime: number; // seconds
  spread: number;     // random direction offset for pellets
  recoilAmount: number;
}

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  assault: {
    name: 'Assault Rifle',
    damage: 25,
    fireRate: 0.12,
    range: 150,
    magazineSize: 30,
    pellets: 1,
    reloadTime: 2.0,
    spread: 0.01,
    recoilAmount: 0.8,
  },
  shotgun: {
    name: 'Shotgun',
    damage: 18,
    fireRate: 0.9,
    range: 25,
    magazineSize: 6,
    pellets: 8,
    reloadTime: 2.5,
    spread: 0.08,
    recoilAmount: 2.5,
  },
  sniper: {
    name: 'Sniper Rifle',
    damage: 100,
    fireRate: 1.4,
    range: 250,
    magazineSize: 5,
    pellets: 1,
    reloadTime: 3.0,
    spread: 0.0,
    recoilAmount: 3.5,
  },
};

// Server damage uses per-weapon values — exported for SocketHandlers
export const WEAPON_DAMAGE = WEAPON_CONFIGS.assault.damage; // default fallback

export interface ShotResult {
  hit: boolean;
  targetId: string | null;
  hitBotIndex: number; // -1 means no bot was hit
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  weaponType: WeaponType;
  damage: number;
}

// ============================================================
// Weapon Mesh Builders
// ============================================================

function buildAssaultRifle(): THREE.Group {
  const g = new THREE.Group();
  const dark   = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });
  const metal  = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
  const skin   = new THREE.MeshLambertMaterial({ color: 0xc8956c });
  const accent = new THREE.MeshLambertMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.6 });
  const wood   = new THREE.MeshLambertMaterial({ color: 0x6b3a1f });

  // Forearm + hand
  const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.38), skin); forearm.position.set(0.06, -0.06, 0.08); g.add(forearm);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.10, 0.10), skin); hand.position.set(0.06, -0.05, -0.11); g.add(hand);
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.40), dark); body.position.set(0, 0, 0); g.add(body);
  // Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.32, 8), metal); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, -0.34); g.add(barrel);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, 0.07), wood); grip.position.set(0, -0.10, 0.08); grip.rotation.x = 0.15; g.add(grip);
  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.14), wood); stock.position.set(0, -0.01, 0.22); g.add(stock);
  // Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.055), metal); mag.position.set(0, -0.09, 0.0); g.add(mag);
  // Iron sight
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.028, 0.07), metal); sight.position.set(0, 0.068, -0.05); g.add(sight);
  // Accent glow strip
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.28), accent); glow.position.set(0.037, 0.0, -0.09); g.add(glow);
  return g;
}

function buildShotgun(): THREE.Group {
  const g = new THREE.Group();
  const wood  = new THREE.MeshLambertMaterial({ color: 0x7b4218 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const dark  = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const skin  = new THREE.MeshLambertMaterial({ color: 0xc8956c });

  // Forearm + hand
  const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.38), skin); forearm.position.set(0.07, -0.07, 0.08); g.add(forearm);

  // Receiver (body)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.10, 0.48), wood); body.position.set(0, 0, 0); g.add(body);
  // Double barrels side by side
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.40, 8), metal); b1.rotation.x = Math.PI / 2; b1.position.set(0.025, 0.04, -0.38); g.add(b1);
  const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.40, 8), metal); b2.rotation.x = Math.PI / 2; b2.position.set(-0.025, 0.04, -0.38); g.add(b2);
  // Pump grip
  const pump = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.05, 0.14), dark); pump.position.set(0, -0.02, -0.14); g.add(pump);
  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.085, 0.20), wood); stock.position.set(0, -0.01, 0.30); g.add(stock);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.08), wood); grip.position.set(0, -0.11, 0.10); grip.rotation.x = 0.1; g.add(grip);
  // Guard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.04), metal); guard.position.set(0, -0.07, 0.10); g.add(guard);
  return g;
}

function buildSniperRifle(): THREE.Group {
  const g = new THREE.Group();
  const dark   = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
  const metal  = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
  const scope  = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const lens   = new THREE.MeshLambertMaterial({ color: 0x003366, transparent: true, opacity: 0.8 });
  const skin   = new THREE.MeshLambertMaterial({ color: 0xc8956c });
  const tan    = new THREE.MeshLambertMaterial({ color: 0x8b6914 });

  // Forearm + hand
  const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.38), skin); forearm.position.set(0.06, -0.06, 0.08); g.add(forearm);

  // Receiver
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.075, 0.44), dark); body.position.set(0, 0, 0); g.add(body);
  // Long barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.60, 8), metal); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, -0.56); g.add(barrel);
  // Suppressor
  const supp = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.10, 8), dark); supp.rotation.x = Math.PI / 2; supp.position.set(0, 0.01, -0.90); g.add(supp);
  // Scope tube
  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.36, 8), scope); scopeTube.rotation.x = Math.PI / 2; scopeTube.position.set(0, 0.075, -0.04); g.add(scopeTube);
  // Scope front lens
  const lensMesh = new THREE.Mesh(new THREE.CircleGeometry(0.023, 12), lens); lensMesh.rotation.y = Math.PI; lensMesh.position.set(0, 0.075, -0.22); g.add(lensMesh);
  // Scope mount
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.06), metal); mount.position.set(0, 0.055, -0.04); g.add(mount);
  // Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 0.05), dark); mag.position.set(0, -0.09, -0.0); g.add(mag);
  // Bipod legs
  const bL = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.12, 0.007), metal); bL.position.set(0.04, -0.09, -0.30); bL.rotation.z = 0.2; g.add(bL);
  const bR = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.12, 0.007), metal); bR.position.set(-0.04, -0.09, -0.30); bR.rotation.z = -0.2; g.add(bR);
  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.065, 0.22), tan); stock.position.set(0, 0, 0.30); g.add(stock);
  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.07), tan); grip.position.set(0, -0.10, 0.09); grip.rotation.x = 0.15; g.add(grip);
  return g;
}

// ============================================================
// Weapon class
// ============================================================

export class Weapon {
  private weaponGroup: THREE.Group;
  private scene: THREE.Scene;
  private camera: Camera;
  private lighting: Lighting;
  private audio: AudioManager;

  private fireCooldown = 0;
  private isReloading = false;
  private reloadTimer = 0;

  public currentType: WeaponType;
  public ammo: number;
  public maxAmmo: number;
  public config: WeaponConfig;

  // Recoil
  private recoilOffset = 0;
  private recoilTarget = 0;

  constructor(
    scene: THREE.Scene,
    camera: Camera,
    lighting: Lighting,
    audio: AudioManager,
    initialWeapon: WeaponType = 'assault'
  ) {
    this.scene = scene;
    this.camera = camera;
    this.lighting = lighting;
    this.audio = audio;
    this.currentType = initialWeapon;
    this.config = WEAPON_CONFIGS[initialWeapon];
    this.ammo = this.config.magazineSize;
    this.maxAmmo = this.config.magazineSize;

    this.weaponGroup = this.buildMesh(initialWeapon);
    scene.add(this.weaponGroup);
  }

  private buildMesh(type: WeaponType): THREE.Group {
    const g = type === 'shotgun' ? buildShotgun()
            : type === 'sniper'  ? buildSniperRifle()
            : buildAssaultRifle();
    return g;
  }

  switchTo(type: WeaponType): void {
    if (type === this.currentType) return;
    // Remove old mesh
    this.scene.remove(this.weaponGroup);
    this.weaponGroup.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    // Build new mesh
    this.currentType = type;
    this.config = WEAPON_CONFIGS[type];
    this.ammo = this.config.magazineSize;
    this.maxAmmo = this.config.magazineSize;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.recoilOffset = 0;
    this.recoilTarget = 0;
    this.weaponGroup = this.buildMesh(type);
    this.scene.add(this.weaponGroup);
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // Reload countdown
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.ammo = this.config.magazineSize;
      }
    }

    // Recoil spring
    this.recoilOffset += (this.recoilTarget - this.recoilOffset) * Math.min(1, dt * 20);
    this.recoilTarget  += (0 - this.recoilTarget) * Math.min(1, dt * 8);

    // Position weapon in view space relative to camera
    const cam = this.camera.camera;
    const camPos = cam.position.clone();

    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    const right = new THREE.Vector3();
    right.crossVectors(forward, cam.up).normalize();
    const up = cam.up.clone().normalize();

    this.weaponGroup.position
      .copy(camPos)
      .addScaledVector(forward, 0.42 - this.recoilOffset * 0.04)
      .addScaledVector(right,   0.20)
      .addScaledVector(up,     -0.18 - this.recoilOffset * 0.02);

    this.weaponGroup.quaternion.copy(cam.quaternion);
  }

  tryFire(remotePlayers: Map<string, RemotePlayer>, bots: BotPlayer[] = []): ShotResult | null {
    if (this.fireCooldown > 0 || this.ammo <= 0 || this.isReloading) return null;

    this.fireCooldown = this.config.fireRate;
    this.ammo = Math.max(0, this.ammo - 1);
    this.recoilTarget = this.config.recoilAmount;
    this.audio.playShoot();

    // Muzzle flash at barrel tip
    const barrelTip = this.camera.camera.position.clone().add(
      this.camera.getLookDirection().multiplyScalar(0.5)
    );
    this.lighting.createMuzzleFlash(barrelTip, this.scene);

    const origin = this.camera.camera.position.clone();
    let hitPlayerId: string | null = null;
    let hitBotIndex = -1;
    let closestDist = Infinity;

    // Fire pellets (1 for AR/sniper, 8 for shotgun)
    for (let p = 0; p < this.config.pellets; p++) {
      const spread = this.config.spread;
      const dir = new THREE.Vector3(
        this.camera.getLookDirection().x + (Math.random() - 0.5) * spread,
        this.camera.getLookDirection().y + (Math.random() - 0.5) * spread,
        this.camera.getLookDirection().z + (Math.random() - 0.5) * spread
      ).normalize();

      const raycaster = new THREE.Raycaster(origin, dir, 0.1, this.config.range);

      // Check remote players
      for (const [id, rp] of remotePlayers) {
        if (!rp.alive) continue;
        const meshes: THREE.Object3D[] = [];
        rp.mesh.traverse(obj => { if (obj instanceof THREE.Mesh) meshes.push(obj); });
        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length > 0 && hits[0].distance < closestDist) {
          closestDist = hits[0].distance;
          hitPlayerId = id;
          hitBotIndex = -1;
        }
      }

      // Check bots
      for (let i = 0; i < bots.length; i++) {
        if (!bots[i].alive) continue;
        const meshes: THREE.Object3D[] = [];
        bots[i].mesh.traverse(obj => { if (obj instanceof THREE.Mesh) meshes.push(obj); });
        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length > 0 && hits[0].distance < closestDist) {
          closestDist = hits[0].distance;
          hitBotIndex = i;
          hitPlayerId = null;
        }
      }
    }

    const direction = this.camera.getLookDirection().normalize();
    return {
      hit: hitPlayerId !== null || hitBotIndex >= 0,
      targetId: hitPlayerId,
      hitBotIndex,
      origin,
      direction,
      weaponType: this.currentType,
      damage: this.config.damage,
    };
  }

  reload(): void {
    if (this.isReloading || this.ammo === this.config.magazineSize) return;
    this.isReloading = true;
    this.reloadTimer = this.config.reloadTime;
    this.audio.playReload();
  }

  get isCurrentlyReloading(): boolean {
    return this.isReloading;
  }

  dispose(): void {
    this.scene.remove(this.weaponGroup);
    this.weaponGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
