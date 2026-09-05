import * as THREE from 'three';
import { loadEnemyModel } from './ModelLoader';
import type { MapCollider } from '../game/Map';

// ============================================================
// BotPlayer — AI opponent for solo practice mode
// ============================================================

export const BOT_NAMES = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo',
  'Foxtrot', 'Ghost', 'Hunter', 'Ivan', 'Joker',
];

const BOT_COLORS = [
  0xcc2222, 0xcc7700, 0x8833cc, 0xcc3388,
  0x2299cc, 0x22cc55, 0xcc5522, 0x9922cc, 0x88cc11, 0xcc1155,
];

const BOT_SPAWN_POSITIONS: [number, number][] = [
  [-26, -8], [26, -8], [-26, 8], [26, 8], [0, -28],
];

// Fixed patrol points spread around the arena
const PATROL_POINTS: [number, number][] = [
  [-20, -20], [20, -20], [-20, 20], [20, 20],
  [0, -15], [15, 0], [0, 15], [-15, 0],
  [-10, -10], [10, 10], [10, -10], [-10, 10],
  [0, 0], [8, -5], [-8, 5],
];

export interface BotTarget {
  position: THREE.Vector3;
  mesh?: THREE.Object3D;
  alive: boolean;
  takeDamage: (damage: number) => boolean;
}

export class BotPlayer {
  public id: string;
  public name: string;
  public mesh: THREE.Group;
  public alive = true;
  public health = 100;

  private pos: THREE.Vector3;
  private waypoint: THREE.Vector3;
  private speed: number;
  private respawnTimer = 0;
  private waypointTimer = 0;
  private yaw: number;
  private model: THREE.Group | null = null;
  private modelBaseY = 0;
  private fireCooldown = 1.5;

  get position(): THREE.Vector3 {
    return this.pos;
  }

  constructor(index: number, scene: THREE.Scene) {
    this.id = `bot_${index}`;
    this.name = BOT_NAMES[index % BOT_NAMES.length];
    this.speed = 2.0 + Math.random() * 2.0;
    this.yaw = Math.random() * Math.PI * 2;

    const [spawnX, spawnZ] = BOT_SPAWN_POSITIONS[index % BOT_SPAWN_POSITIONS.length];
    this.pos = new THREE.Vector3(spawnX, 0, spawnZ);
    this.waypoint = this.pickWaypoint();
    this.mesh = new THREE.Group();
    this.buildMesh(index);
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  private pickWaypoint(): THREE.Vector3 {
    const [px, pz] = PATROL_POINTS[Math.floor(Math.random() * PATROL_POINTS.length)];
    return new THREE.Vector3(
      px + (Math.random() - 0.5) * 5,
      0,
      pz + (Math.random() - 0.5) * 5,
    );
  }

  private buildMesh(index: number): void {
    const color = BOT_COLORS[index % BOT_COLORS.length];

    loadEnemyModel((model) => {
      this.model = model;
      this.modelBaseY = model.position.y;
      
      // Tint the model's materials to match bot color
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (m.material) {
            m.material = (m.material as THREE.Material).clone();
            if ('color' in m.material) {
              (m.material as any).color.setHex(color);
            }
          }
        }
      });
      
      this.mesh.add(model);
    });

  }

  update(dt: number, colliders: MapCollider[] = []): void {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.doRespawn();
      return;
    }

    // Pick new waypoint when close or timer expires
    this.waypointTimer -= dt;
    if (this.waypointTimer <= 0 || this.pos.distanceTo(this.waypoint) < 1.5) {
      this.waypoint.copy(this.pickWaypoint());
      this.waypointTimer = 2.5 + Math.random() * 5.0;
    }

    // Walk toward waypoint
    const dir = this.waypoint.clone().sub(this.pos).setY(0);
    if (dir.lengthSq() > 0.01) {
      dir.normalize();
      const nextPosition = this.pos.clone().addScaledVector(dir, this.speed * dt);
      if (!this.collidesWithMap(nextPosition, colliders)) {
        this.pos.copy(nextPosition);
        this.yaw = Math.atan2(dir.x, dir.z);
      } else {
        this.waypoint.copy(this.pickWaypoint());
        this.waypointTimer = 0;
      }
    }

    // Clamp within arena walls
    this.pos.x = Math.max(-28, Math.min(28, this.pos.x));
    this.pos.z = Math.max(-28, Math.min(28, this.pos.z));
    this.pos.y = 0;

    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
    this.mesh.rotation.z = 0;

    // Walk bob on the whole model instead of just body
    if (this.model) {
      this.model.position.y = this.modelBaseY + Math.sin(Date.now() * 0.009) * 0.04;
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
  }

  private collidesWithMap(position: THREE.Vector3, colliders: MapCollider[]): boolean {
    const radius = 0.4;
    const height = 1.8;
    return colliders.some(collider =>
      position.x + radius > collider.min.x &&
      position.x - radius < collider.max.x &&
      position.y + height > collider.min.y &&
      position.y < collider.max.y &&
      position.z + radius > collider.min.z &&
      position.z - radius < collider.max.z
    );
  }

  tryShoot(targets: BotTarget[]): BotTarget | null {
    if (!this.alive || this.fireCooldown > 0) return null;

    const candidates = targets
      .filter(target => target.alive)
      .map(target => ({ target, distance: this.pos.distanceTo(target.position) }))
      .filter(candidate => candidate.distance <= 28)
      .sort((a, b) => a.distance - b.distance);
    const candidate = candidates[0];
    if (!candidate) return null;

    const direction = candidate.target.position.clone().sub(this.pos).setY(0).normalize();
    this.yaw = Math.atan2(direction.x, direction.z);

    this.fireCooldown = 1.0 + Math.random() * 1.2;
    return candidate.target;
  }

  /** Deal damage. Returns true if the bot was killed. */
  takeDamage(damage: number): boolean {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - damage);
    if (this.health <= 0) {
      this.alive = false;
      this.respawnTimer = 3.0;
      this.mesh.rotation.z = Math.PI / 2;
      this.mesh.position.y = 0.4;
      return true;
    }
    return false;
  }

  private doRespawn(): void {
    this.alive = true;
    this.health = 100;
    this.mesh.rotation.z = 0;
    this.pos.copy(this.pickWaypoint());
    this.mesh.position.copy(this.pos);
    this.waypoint.copy(this.pickWaypoint());
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
  }
}
