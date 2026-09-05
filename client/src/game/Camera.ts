import * as THREE from 'three';

// ============================================================
// First-Person Camera with pointer lock and vertical clamp
// ============================================================

const EYE_HEIGHT = 1.7;
const VERTICAL_LIMIT = Math.PI / 2 - 0.05; // ~85°
const DEFAULT_FOV = 75;
const AIM_FOV = 45;

export class Camera {
  public camera: THREE.PerspectiveCamera;
  public yaw = 0;   // horizontal rotation (Y axis)
  public pitch = 0; // vertical rotation (X axis)

  constructor(container: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );

    new ResizeObserver(() => {
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
    }).observe(container);
  }

  applyMouseDelta(dx: number, dy: number, sensitivity = 0.0015): void {
    this.yaw   -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    this.pitch  = Math.max(-VERTICAL_LIMIT, Math.min(VERTICAL_LIMIT, this.pitch));
  }

  updateZoom(aiming: boolean, dt: number): void {
    const targetFov = aiming ? AIM_FOV : DEFAULT_FOV;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(dt * 12, 1);
    this.camera.updateProjectionMatrix();
  }

  /** Update camera position from player world position */
  updateFromPosition(playerPos: THREE.Vector3): void {
    this.camera.position.set(
      playerPos.x,
      playerPos.y + EYE_HEIGHT,
      playerPos.z
    );

    // Apply yaw + pitch as quaternion
    const quatY = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw);
    const quatX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    this.camera.quaternion.copy(quatY).multiply(quatX);
  }

  /** Get forward direction vector (horizontal only, for movement) */
  getForwardXZ(): THREE.Vector3 {
    return new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    ).normalize();
  }

  /** Get right direction vector */
  getRightXZ(): THREE.Vector3 {
    const fwd = this.getForwardXZ();
    return new THREE.Vector3(-fwd.z, 0, fwd.x);
  }

  /** Get the full 3D look direction (for raycasting) */
  getLookDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }
}
