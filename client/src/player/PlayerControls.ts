import * as THREE from 'three';
import type { MapCollider } from '../game/Map';

// ============================================================
// Keyboard + Mouse Input Tracker
// ============================================================

export class PlayerControls {
  public keys: Record<string, boolean> = {};
  public mouseDeltaX = 0;
  public mouseDeltaY = 0;
  public shooting = false;
  public aiming = false;
  public isPointerLocked = false;
  public tabPressed = false;

  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onMouseDown: (e: MouseEvent) => void;
  private onMouseUp: (e: MouseEvent) => void;
  private onPointerLockChange: () => void;
  private onWindowBlur: () => void;

  constructor() {
    this.onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.code] = true;
      this.tabPressed = e.code === 'Tab' || e.key === 'Tab';
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
      if (e.code === 'Tab' || e.key === 'Tab') this.tabPressed = false;
    };
    this.onMouseMove = (e: MouseEvent) => {
      if (this.isPointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    };
    this.onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && this.isPointerLocked) {
        this.shooting = true;
      }
      if (e.button === 2 && this.isPointerLocked) {
        this.aiming = true;
      }
    };
    this.onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this.shooting = false;
      if (e.button === 2) this.aiming = false;
    };
    this.onPointerLockChange = () => {
      this.isPointerLocked = document.pointerLockElement !== null;
      if (!this.isPointerLocked) {
        this.shooting = false;
        this.aiming = false;
      }
    };
    this.onWindowBlur = () => {
      this.keys = {};
      this.shooting = false;
      this.aiming = false;
    };

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('contextmenu', this.preventContextMenu);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('blur', this.onWindowBlur);
  }

  private preventContextMenu = (e: MouseEvent) => {
    if (this.isPointerLocked) e.preventDefault();
  };

  requestPointerLock(element: HTMLElement): void {
    element.requestPointerLock();
  }

  exitPointerLock(): void {
    document.exitPointerLock();
  }

  /** Consume accumulated mouse delta (call once per frame) */
  consumeMouseDelta(): { dx: number; dy: number } {
    const result = { dx: this.mouseDeltaX, dy: this.mouseDeltaY };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return result;
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('contextmenu', this.preventContextMenu);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('blur', this.onWindowBlur);
  }
}

// ============================================================
// Local Player — position, movement, AABB collision
// ============================================================

const PLAYER_SPEED = 6.5;
const PLAYER_SPRINT = 14;
const PLAYER_HALF_W = 0.4;
const PLAYER_HALF_D = 0.4;
const PLAYER_HEIGHT = 1.8;
const MAP_BOUNDARY = 30;

export class LocalPlayer {
  public position: THREE.Vector3;
  public health = 100;
  public alive = true;
  public kills = 0;
  public deaths = 0;

  constructor(spawnPosition: THREE.Vector3) {
    this.position = spawnPosition.clone();
  }

  move(
    forward: THREE.Vector3,
    right: THREE.Vector3,
    keys: Record<string, boolean>,
    dt: number,
    colliders: MapCollider[]
  ): void {
    if (!this.alive) return;

    const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'] || keys['shift'];
    const speed = isSprinting ? PLAYER_SPRINT : PLAYER_SPEED;

    const moveDir = new THREE.Vector3();

    if (keys['KeyW'] || keys['ArrowUp'] || keys['w']) moveDir.add(forward);
    if (keys['KeyS'] || keys['ArrowDown'] || keys['s']) moveDir.sub(forward);
    if (keys['KeyA'] || keys['ArrowLeft'] || keys['a']) moveDir.sub(right);
    if (keys['KeyD'] || keys['ArrowRight'] || keys['d']) moveDir.add(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(speed * dt);

      // Separate X and Z collision for sliding movement
      const newPosX = this.position.clone().add(new THREE.Vector3(moveDir.x, 0, 0));
      if (!this.collidesWithMap(newPosX, colliders)) {
        this.position.x = newPosX.x;
      }

      const newPosZ = this.position.clone().add(new THREE.Vector3(0, 0, moveDir.z));
      if (!this.collidesWithMap(newPosZ, colliders)) {
        this.position.z = newPosZ.z;
      }
    }

    // Clamp to map boundaries
    this.position.x = Math.max(-MAP_BOUNDARY, Math.min(MAP_BOUNDARY, this.position.x));
    this.position.z = Math.max(-MAP_BOUNDARY, Math.min(MAP_BOUNDARY, this.position.z));
    this.position.y = 0; // Stay on ground
  }

  private collidesWithMap(pos: THREE.Vector3, colliders: MapCollider[]): boolean {
    const pMin = new THREE.Vector3(
      pos.x - PLAYER_HALF_W,
      pos.y,
      pos.z - PLAYER_HALF_D
    );
    const pMax = new THREE.Vector3(
      pos.x + PLAYER_HALF_W,
      pos.y + PLAYER_HEIGHT,
      pos.z + PLAYER_HALF_D
    );

    for (const col of colliders) {
      if (
        pMax.x > col.min.x && pMin.x < col.max.x &&
        pMax.y > col.min.y && pMin.y < col.max.y &&
        pMax.z > col.min.z && pMin.z < col.max.z
      ) {
        return true;
      }
    }
    return false;
  }

  respawn(position: THREE.Vector3): void {
    this.position.copy(position);
    this.health = 100;
    this.alive = true;
  }

  takeDamage(amount: number): boolean {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.alive = false;
      this.deaths += 1;
      return true; // died
    }
    return false;
  }
}
