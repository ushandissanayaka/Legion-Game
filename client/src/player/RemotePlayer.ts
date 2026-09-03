import * as THREE from 'three';
import type { PlayerState } from '../types/game';

// ============================================================
// Remote Player — simple capsule mesh with interpolation
// ============================================================

// Player slot colors — bold bright for daytime visibility
const PLAYER_COLORS   = [0xff2d55, 0x00e5ff, 0xffbe00, 0x39ff6e];
const PLAYER_EMISSIVE = [0x880015, 0x003344, 0x554400, 0x003311];

export class RemotePlayer {
  public id: string;
  public mesh: THREE.Group;
  private bodyMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private namePlate: THREE.Sprite | null = null;

  // Interpolation
  private prevPosition = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  private prevYaw = 0;
  private targetYaw = 0;
  private interpT = 0;
  private interpDuration = 0.05; // seconds

  public alive = true;
  private colorIndex: number;

  constructor(state: PlayerState, scene: THREE.Scene, colorIndex: number) {
    this.id = state.id;
    this.colorIndex = colorIndex;
    this.mesh = new THREE.Group();

    const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    const emissive = PLAYER_EMISSIVE[colorIndex % PLAYER_EMISSIVE.length];

    const mat = new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: 0.5 });

    // Legs
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x2d3a50 }) // dark blue trousers
    );
    legs.position.y = 0.35;
    this.mesh.add(legs);

    // Body (torso)
    this.bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.75, 0.40),
      mat
    );
    this.bodyMesh.position.y = 1.1;
    this.mesh.add(this.bodyMesh);

    // Left arm
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.60, 0.22), mat);
    armL.position.set(-0.37, 1.05, 0);
    this.mesh.add(armL);

    // Right arm
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.60, 0.22), mat);
    armR.position.set( 0.37, 1.05, 0);
    this.mesh.add(armR);

    // Head (box — blocky look)
    this.headMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.50, 0.50, 0.45),
      new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: 0.7 })
    );
    this.headMesh.position.y = 1.75;
    this.mesh.add(this.headMesh);

    // Helmet strip
    const helmet = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.10, 0.47),
      new THREE.MeshLambertMaterial({ color: 0x1a1a2a })
    );
    helmet.position.y = 1.95;
    this.mesh.add(helmet);

    // Nametag using sprite
    this.createNameTag(state.name);

    // Set initial position
    const pos = state.position;
    // Ensure y is on the ground (server may send y=0)
    const groundY = Math.max(pos.y, 0);
    this.mesh.position.set(pos.x, groundY, pos.z);
    this.targetPosition.set(pos.x, groundY, pos.z);
    this.prevPosition.copy(this.targetPosition);
    this.targetYaw = state.rotation.yaw;
    this.prevYaw = this.targetYaw;

    scene.add(this.mesh);
  }

  private createNameTag(name: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.roundRect(4, 4, 248, 56, 8);
    ctx.fill();
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.substring(0, 16), 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    this.namePlate = new THREE.Sprite(spriteMat);
    this.namePlate.scale.set(2.8, 0.7, 1);
    this.namePlate.position.y = 2.6;
    this.mesh.add(this.namePlate);
  }

  setTargetState(
    position: { x: number; y: number; z: number },
    rotation: { yaw: number; pitch: number }
  ): void {
    this.prevPosition.copy(this.mesh.position);
    const groundY = Math.max(position.y, 0);
    this.targetPosition.set(position.x, groundY, position.z);
    this.prevYaw = this.mesh.rotation.y;
    this.targetYaw = rotation.yaw;
    this.interpT = 0;
  }

  /** Call every frame to smooth movement */
  update(dt: number): void {
    this.interpT = Math.min(1, this.interpT + dt / this.interpDuration);
    const t = this.interpT;

    this.mesh.position.lerpVectors(this.prevPosition, this.targetPosition, t);
    this.mesh.rotation.y = lerpAngle(this.prevYaw, this.targetYaw, t);

    // Bob when alive, slump when dead
    if (this.alive) {
      this.mesh.rotation.z = 0;
    } else {
      this.mesh.rotation.z = Math.PI / 2;
      this.mesh.position.y = 0.3;
    }
  }

  setAlive(alive: boolean, position?: { x: number; y: number; z: number }): void {
    this.alive = alive;
    this.mesh.visible = true;
    if (!alive) {
      // Death visual
      this.mesh.rotation.z = Math.PI / 2;
    } else if (position) {
      this.mesh.position.set(position.x, position.y, position.z);
      this.targetPosition.set(position.x, position.y, position.z);
      this.prevPosition.copy(this.targetPosition);
      this.mesh.rotation.z = 0;
    }
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
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

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
