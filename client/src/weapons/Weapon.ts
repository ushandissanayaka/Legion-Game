import * as THREE from 'three';
import { Camera } from '../game/Camera';
import { RemotePlayer } from '../player/RemotePlayer';
import type { BotPlayer } from '../player/BotPlayer';
import { Lighting } from '../game/Lighting';
import { AudioManager } from '../audio/AudioManager';

// ============================================================
// Weapon — geometry-based FPS rifle visible in first-person view
// ============================================================

const FIRE_COOLDOWN = 0.15; // seconds between shots
const MAX_AMMO = 30;
export const WEAPON_DAMAGE = 25;

export interface ShotResult {
  hit: boolean;
  targetId: string | null;
  hitBotIndex: number; // -1 means no bot was hit
  origin: THREE.Vector3;
  direction: THREE.Vector3;
}

export class Weapon {
  private weaponGroup: THREE.Group;
  private scene: THREE.Scene;
  private camera: Camera;
  private lighting: Lighting;
  private audio: AudioManager;

  private fireCooldown = 0;
  public ammo = MAX_AMMO;
  public maxAmmo = MAX_AMMO;

  // Recoil
  private recoilOffset = 0;
  private recoilTarget = 0;

  constructor(
    scene: THREE.Scene,
    camera: Camera,
    lighting: Lighting,
    audio: AudioManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.lighting = lighting;
    this.audio = audio;

    this.weaponGroup = this.buildWeaponMesh();
    scene.add(this.weaponGroup);
  }

  private buildWeaponMesh(): THREE.Group {
    const group = new THREE.Group();

    const darkMat   = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });
    const metalMat  = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
    const skinMat   = new THREE.MeshLambertMaterial({ color: 0xc8956c }); // hand/arm skin
    const accentMat = new THREE.MeshLambertMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.6 });

    // ── Arm (forearm visible bottom-right) ─────────────────────
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.38), skinMat);
    arm.position.set(0.06, -0.06, 0.08);
    group.add(arm);

    // Hand (slightly wider at the front)
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.10, 0.10), skinMat);
    hand.position.set(0.06, -0.05, -0.11);
    group.add(hand);

    // ── Gun body ───────────────────────────────────────────────
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.40), darkMat);
    body.position.set(0, 0, 0);
    group.add(body);

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.28, 8), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.32);
    group.add(barrel);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, 0.07), darkMat);
    grip.position.set(0, -0.10, 0.08);
    grip.rotation.x = 0.15;
    group.add(grip);

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.14), darkMat);
    stock.position.set(0, -0.01, 0.22);
    group.add(stock);

    // Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.055), metalMat);
    mag.position.set(0, -0.09, 0.0);
    group.add(mag);

    // Iron sight
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.028, 0.07), metalMat);
    sight.position.set(0, 0.068, -0.05);
    group.add(sight);

    // Accent glow strip on side
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.28), accentMat);
    glow.position.set(0.037, 0.0, -0.09);
    group.add(glow);

    return group;
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // Recoil spring
    this.recoilOffset += (this.recoilTarget - this.recoilOffset) * Math.min(1, dt * 20);
    this.recoilTarget  += (0 - this.recoilTarget) * Math.min(1, dt * 8);

    // Position weapon in VIEW SPACE relative to camera
    // Use camera position (eye height) — NOT player feet position
    const cam = this.camera.camera;
    const camPos = cam.position.clone(); // this is already eye-height

    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    const right = new THREE.Vector3();
    right.crossVectors(forward, cam.up).normalize();
    const up = cam.up.clone().normalize();

    // Place gun: forward + slightly right + below center
    this.weaponGroup.position
      .copy(camPos)
      .addScaledVector(forward, 0.42 - this.recoilOffset * 0.04)
      .addScaledVector(right,   0.20)
      .addScaledVector(up,     -0.18 - this.recoilOffset * 0.02);

    this.weaponGroup.quaternion.copy(cam.quaternion);
  }


  tryFire(remotePlayers: Map<string, RemotePlayer>, bots: BotPlayer[] = []): ShotResult | null {
    if (this.fireCooldown > 0 || this.ammo <= 0) return null;

    this.fireCooldown = FIRE_COOLDOWN;
    this.ammo = Math.max(0, this.ammo - 1);
    this.recoilTarget = 1;
    this.audio.playShoot();

    // Muzzle flash at barrel tip
    const barrelTip = this.camera.camera.position.clone().add(
      this.camera.getLookDirection().multiplyScalar(0.5)
    );
    this.lighting.createMuzzleFlash(barrelTip, this.scene);

    const origin    = this.camera.camera.position.clone();
    const direction = this.camera.getLookDirection().normalize();
    const raycaster = new THREE.Raycaster(origin, direction, 0.1, 200);

    let closestDist  = Infinity;
    let hitPlayerId: string | null = null;
    let hitBotIndex  = -1;

    // ── Check remote players (mesh-accurate raycasting) ────────
    for (const [id, rp] of remotePlayers) {
      if (!rp.alive) continue;
      const meshes: THREE.Object3D[] = [];
      rp.mesh.traverse(obj => { if (obj instanceof THREE.Mesh) meshes.push(obj); });
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0 && hits[0].distance < closestDist) {
        closestDist  = hits[0].distance;
        hitPlayerId  = id;
        hitBotIndex  = -1;
      }
    }

    // ── Check bots (mesh-accurate raycasting) ──────────────────
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

    return {
      hit: hitPlayerId !== null || hitBotIndex >= 0,
      targetId: hitPlayerId,
      hitBotIndex,
      origin,
      direction,
    };
  }

  reload(): void {
    this.ammo = MAX_AMMO;
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
