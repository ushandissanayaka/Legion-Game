import * as THREE from 'three';

// ============================================================
// Game Map — compact arena with buildings, crates, and cover
// 60x60 unit area, optimized for performance
// ============================================================

export interface MapCollider {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

// Spawn positions (x, z) — y=1 (eye height applied in player)
export const SPAWN_POSITIONS = [
  new THREE.Vector3(-22, 0.9, -22),
  new THREE.Vector3( 22, 0.9, -22),
  new THREE.Vector3(-22, 0.9,  22),
  new THREE.Vector3( 22, 0.9,  22),
];

export class GameMap {
  public colliders: MapCollider[] = [];
  private group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.buildMap();
  }

  private mat(color: number, emissive = 0x000000, emissiveIntensity = 0): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity });
  }

  private box(
    w: number, h: number, d: number,
    x: number, y: number, z: number,
    material: THREE.MeshLambertMaterial,
    addCollider = true
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    this.group.add(mesh);

    if (addCollider) {
      const half = new THREE.Vector3(w / 2, h / 2, d / 2);
      const center = new THREE.Vector3(x, y, z);
      this.colliders.push({
        min: center.clone().sub(half),
        max: center.clone().add(half),
      });
    }
    return mesh;
  }

  private buildMap(): void {
    const floorMat    = this.mat(0xc2a96e);  // sandy/dirt ground
    const wallMat     = this.mat(0x8b8b7a);  // concrete walls
    const buildingMat = this.mat(0x6b8cba);  // blue-grey buildings
    const crateMat    = this.mat(0xb5651d);  // wooden crates
    const barrierMat  = this.mat(0x9e9e8a);  // concrete barriers
    const pipeMat     = this.mat(0x6e7f6e);  // metal pipes
    const accentMat   = this.mat(0xff6b35);  // orange accent stripe

    // ── Floor ──────────────────────────────────────────────
    this.box(62, 0.2, 62, 0, -0.1, 0, floorMat, false);

    // Floor grid lines (decorative, no collider)
    for (let i = -25; i <= 25; i += 10) {
      this.box(62, 0.01, 0.08, 0, 0.01, i, this.mat(0xaa9060), false);
      this.box(0.08, 0.01, 62, i, 0.01, 0, this.mat(0xaa9060), false);
    }

    // ── Outer Walls ────────────────────────────────────────
    // North wall
    this.box(62, 6, 1, 0, 3, -31, wallMat);
    // South wall
    this.box(62, 6, 1, 0, 3,  31, wallMat);
    // West wall
    this.box(1, 6, 62, -31, 3, 0, wallMat);
    // East wall
    this.box(1, 6, 62,  31, 3, 0, wallMat);

    // ── Building A (northwest) ─────────────────────────────
    this.box(10, 5, 7, -18, 2.5, -20, buildingMat);
    this.box(7, 5, 4, -12, 2.5, -17, buildingMat);
    // Glow strips on buildings
    this.box(10, 0.15, 0.15, -18, 5.1, -16.5, accentMat, false);
    this.box(7, 0.15, 0.15, -12, 5.1, -15, accentMat, false);

    // ── Building B (southeast) ─────────────────────────
    this.box(10, 5, 7, 18, 2.5, 20, buildingMat);
    this.box(7, 5, 4, 12, 2.5, 17, buildingMat);
    this.box(10, 0.15, 0.15, 18, 5.1, 16.5, accentMat, false);

    // ── Building C (northeast) ─────────────────────────
    this.box(8, 4, 8, 18, 2, -18, buildingMat);
    this.box(8, 0.15, 0.15, 18, 4.1, -14.1, accentMat, false);

    // ── Building D (southwest) ─────────────────────────
    this.box(8, 4, 8, -18, 2, 18, buildingMat);

    // ── Central Platform ───────────────────────────────
    this.box(8, 0.4, 8, 0, 0.2, 0, barrierMat);
    // Center tower
    this.box(2, 6, 2, 0, 3, 0, buildingMat);
    this.box(2, 0.15, 2, 0, 6.1, 0, accentMat, false);

    // ── Crates Cluster 1 (NE of center) ───────────────────
    this.box(2, 2, 2,   6, 1,  -6, crateMat);
    this.box(2, 2, 2,   8.5, 1, -5, crateMat);
    this.box(2, 4, 2,   7, 2,  -8, crateMat);

    // ── Crates Cluster 2 (SW of center) ───────────────────
    this.box(2, 2, 2,  -6, 1,  6, crateMat);
    this.box(2, 2, 2,  -8.5, 1, 5, crateMat);

    // ── Crates Cluster 3 (NW near spawn) ──────────────────
    this.box(2, 2, 2, -15, 1, -10, crateMat);
    this.box(2, 2, 2, -12, 1, -10, crateMat);

    // ── Crates Cluster 4 (SE near spawn) ──────────────────
    this.box(2, 2, 2, 15, 1, 10, crateMat);
    this.box(2, 2, 2, 12, 1, 10, crateMat);

    // ── Barriers / L-shaped cover ─────────────────────────
    // North side
    this.box(6, 1.5, 1, 0, 0.75, -12, barrierMat);
    this.box(1, 1.5, 3, 3, 0.75, -13.5, barrierMat);
    // South side
    this.box(6, 1.5, 1, 0, 0.75,  12, barrierMat);
    this.box(1, 1.5, 3, -3, 0.75, 13.5, barrierMat);
    // East side
    this.box(1, 1.5, 6,  12, 0.75, 0, barrierMat);
    // West side
    this.box(1, 1.5, 6, -12, 0.75, 0, barrierMat);

    // ── Pipes / tubes (decorative cover) ──────────────────
    this.box(1, 2.5, 8, -7, 1.25, -15, pipeMat);
    this.box(8, 2.5, 1, 14, 1.25, -5, pipeMat);
    this.box(8, 2.5, 1, -14, 1.25, 5, pipeMat);

    // ── Corner pillars ─────────────────────────────────────
    for (const [cx, cz] of [[-27, -27], [27, -27], [-27, 27], [27, 27]]) {
      this.box(2, 8, 2, cx, 4, cz, buildingMat);
    }

    // ── Spawn markers (visual, no collider) ───────────────────
    for (const sp of SPAWN_POSITIONS) {
      const marker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 0.05, 8),
        this.mat(0xff6b35)
      );
      marker.position.set(sp.x, 0.02, sp.z);
      this.group.add(marker);
    }
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.group.parent?.remove(this.group);
  }
}
