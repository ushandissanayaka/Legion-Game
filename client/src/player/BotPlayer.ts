import * as THREE from 'three';
import { loadPlayerModel } from './ModelLoader';

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
  private weapon: THREE.Group;
  private fireCooldown = 1.5;

  get position(): THREE.Vector3 {
    return this.pos;
  }

  constructor(index: number, scene: THREE.Scene) {
    this.id = `bot_${index}`;
    this.name = BOT_NAMES[index % BOT_NAMES.length];
    this.speed = 2.0 + Math.random() * 2.0;
    this.yaw = Math.random() * Math.PI * 2;

    // Spread bots around map corners/sides
    const angle = (index / 10) * Math.PI * 2 + Math.random() * 0.6;
    const r = 6 + (index % 5) * 4 + Math.random() * 2;
    this.pos = new THREE.Vector3(
      Math.cos(angle) * r, 0, Math.sin(angle) * r,
    );
    this.waypoint = this.pickWaypoint();
    this.mesh = new THREE.Group();
    this.weapon = this.buildWeapon(BOT_COLORS[index % BOT_COLORS.length]);
    this.mesh.add(this.weapon);
    this.buildMesh(index);
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  private buildWeapon(color: number): THREE.Group {
    const weapon = new THREE.Group();
    const gunMaterial = new THREE.MeshLambertMaterial({ color: 0x202530 });
    const handMaterial = new THREE.MeshLambertMaterial({ color: 0xc8956c });
    const accentMaterial = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35 });

    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.75), gunMaterial);
    gun.position.set(0.32, 1.25, 0.38);
    weapon.add(gun);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8), gunMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.32, 1.25, 0.9);
    weapon.add(barrel);

    const handFront = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), handMaterial);
    handFront.position.set(0.32, 1.12, 0.52);
    weapon.add(handFront);
    const handRear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), handMaterial);
    handRear.position.set(0.32, 1.14, 0.18);
    weapon.add(handRear);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), accentMaterial);
    sight.position.set(0.32, 1.35, 0.38);
    weapon.add(sight);
    return weapon;
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

    loadPlayerModel((model) => {
      this.model = model;
      
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

    // Nametag sprite
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(160, 0, 0, 0.85)';
    ctx.roundRect(4, 4, 248, 56, 8);
    ctx.fill();
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BOT · ' + this.name, 128, 32);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthTest: false,
      }),
    );
    sprite.scale.set(2.8, 0.7, 1);
    sprite.position.y = 2.75;
    this.mesh.add(sprite);
  }

  update(dt: number): void {
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
      this.pos.addScaledVector(dir, this.speed * dt);
      this.yaw = Math.atan2(dir.x, dir.z);
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
      this.model.position.y = Math.sin(Date.now() * 0.009) * 0.04;
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
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
