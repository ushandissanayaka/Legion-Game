import * as THREE from 'three';

// ============================================================
// Game Map — compact arena with full cover, trees, light poles
// 64×64 unit play area
// ============================================================

export interface MapCollider {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

// 4 spawn positions in the open corner areas, outside buildings
export const SPAWN_POSITIONS = [
  new THREE.Vector3(-28, 0, -28),
  new THREE.Vector3( 28, 0, -28),
  new THREE.Vector3(-28, 0,  28),
  new THREE.Vector3( 28, 0,  28),
];

export class GameMap {
  public colliders: MapCollider[] = [];
  private group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.buildMap();
  }

  // ── Material helpers ──────────────────────────────────────

  private mat(color: number, emissive = 0x000000, emissiveIntensity = 0): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity });
  }

  // ── Geometry helpers ──────────────────────────────────────

  private box(
    w: number, h: number, d: number,
    x: number, y: number, z: number,
    material: THREE.MeshLambertMaterial,
    addCollider = true,
    rotY = 0
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    if (rotY) mesh.rotation.y = rotY;
    this.group.add(mesh);

    if (addCollider) {
      // For rotated boxes, use approximate AABB (good enough for gameplay)
      const half = new THREE.Vector3(w / 2, h / 2, d / 2);
      const center = new THREE.Vector3(x, y, z);
      this.colliders.push({
        min: center.clone().sub(half),
        max: center.clone().add(half),
      });
    }
    return mesh;
  }

  private cylinder(
    rt: number, rb: number, h: number,
    x: number, y: number, z: number,
    material: THREE.MeshLambertMaterial,
    segments = 8,
    addCollider = false
  ): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(rt, rb, h, segments);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    if (addCollider) {
      const r = Math.max(rt, rb);
      this.colliders.push({
        min: new THREE.Vector3(x - r, y - h / 2, z - r),
        max: new THREE.Vector3(x + r, y + h / 2, z + r),
      });
    }
    return mesh;
  }

  // ── Tree helper ───────────────────────────────────────────

  private tree(x: number, z: number): void {
    const trunkMat  = this.mat(0x5c3317);
    const leafMat   = this.mat(0x2d6a2d);
    const leafMat2  = this.mat(0x3a8c3a);
    // Trunk
    this.cylinder(0.15, 0.2, 2.5, x, 1.25, z, trunkMat, 6, true);
    // Leaf layers (stacked cones via spheres)
    const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.0, 7), leafMat);
    leaf1.position.set(x, 3.5, z); this.group.add(leaf1);
    const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 7), leafMat2);
    leaf2.position.set(x, 4.8, z); this.group.add(leaf2);
    const leaf3 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 7), leafMat);
    leaf3.position.set(x, 6.0, z); this.group.add(leaf3);
    // Collider for trunk
    this.colliders.push({
      min: new THREE.Vector3(x - 0.2, 0, z - 0.2),
      max: new THREE.Vector3(x + 0.2, 2.5, z + 0.2),
    });
  }

  // ── Light pole helper ─────────────────────────────────────

  private lightPole(x: number, z: number): void {
    const poleMat = this.mat(0x888888);
    const headMat = this.mat(0x555555);
    const glowMat = this.mat(0xffffcc, 0xffffcc, 0.8);
    // Pole
    this.cylinder(0.05, 0.07, 7.0, x, 3.5, z, poleMat, 6);
    // Horizontal arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2), poleMat);
    arm.position.set(x, 7.1, z + 0.6); this.group.add(arm);
    // Light head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.5), headMat);
    head.position.set(x, 7.0, z + 1.2); this.group.add(head);
    // Glow panel
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.48), glowMat);
    glow.position.set(x, 6.93, z + 1.2); this.group.add(glow);
    // Collider for pole base
    this.colliders.push({
      min: new THREE.Vector3(x - 0.1, 0, z - 0.1),
      max: new THREE.Vector3(x + 0.1, 7.0, z + 0.1),
    });
  }

  // ── Barrel helper ─────────────────────────────────────────

  private barrel(x: number, z: number, color: number, tilt = 0): void {
    const mat = this.mat(color);
    const stripMat = this.mat(0x333333);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.4, 10), mat);
    b.position.set(x, 0.7, z);
    b.rotation.z = tilt;
    this.group.add(b);
    // Metal band
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 0.08, 10), stripMat);
    band.position.set(x, 1.0, z);
    this.group.add(band);
    this.colliders.push({
      min: new THREE.Vector3(x - 0.4, 0, z - 0.4),
      max: new THREE.Vector3(x + 0.4, 1.4, z + 0.4),
    });
  }

  // ── Concrete block helper ─────────────────────────────────

  private concreteBlock(x: number, z: number, rotY = 0): void {
    const mat = this.mat(0x909090);
    this.box(2.5, 1.0, 1.2, x, 0.5, z, mat, true, rotY);
  }

  // ── Sandbag wall helper ───────────────────────────────────

  private sandbags(x: number, z: number, length: number, rotY = 0): void {
    const mat = this.mat(0xb5a07a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(length, 0.8, 0.6), mat);
    b.position.set(x, 0.4, z);
    b.rotation.y = rotY;
    this.group.add(b);
    const half = new THREE.Vector3(length / 2, 0.4, 0.3);
    const center = new THREE.Vector3(x, 0.4, z);
    this.colliders.push({ min: center.clone().sub(half), max: center.clone().add(half) });
  }

  // ── Main map build ────────────────────────────────────────

  private buildMap(): void {
    // ── Materials ──────────────────────────────────────────
    const groundMat   = this.mat(0x6b6245);  // dirt/asphalt
    const roadMat     = this.mat(0x4a4a4a);  // dark road
    const wallMat     = this.mat(0x7a7a6a);  // concrete walls
    const buildingA   = this.mat(0x5a748c);  // blue-grey
    const buildingB   = this.mat(0x7c6b4e);  // sandstone
    const buildingC   = this.mat(0x3d5a3d);  // dark green
    const crateMat    = this.mat(0x9b6f2a);  // wooden crates
    const accentMat   = this.mat(0xff5500, 0xff5500, 0.5);  // orange neon
    const accentBlue  = this.mat(0x00aaff, 0x00aaff, 0.4);
    const windowMat   = this.mat(0x88ccff, 0x88ccff, 0.3);
    const barrierMat  = this.mat(0x8a8a8a);  // jersey barrier grey
    const stairMat    = this.mat(0x6a7a6a);

    // ── Ground ─────────────────────────────────────────────
    this.box(70, 0.3, 70, 0, -0.15, 0, groundMat, false);

    // Road cross pattern
    this.box(70, 0.05, 8, 0, 0.0, 0, roadMat, false);
    this.box(8, 0.05, 70, 0, 0.0, 0, roadMat, false);

    // Road markings (dashes)
    for (let i = -30; i <= 30; i += 6) {
      this.box(0.2, 0.02, 3, 0, 0.02, i, this.mat(0xdddd00), false);
      this.box(3, 0.02, 0.2, i, 0.02, 0, this.mat(0xdddd00), false);
    }

    // ── Outer Walls ────────────────────────────────────────
    this.box(70, 8, 1.0, 0, 4, -35, wallMat);    // North
    this.box(70, 8, 1.0, 0, 4,  35, wallMat);    // South
    this.box(1.0, 8, 70, -35, 4, 0,  wallMat);   // West
    this.box(1.0, 8, 70,  35, 4, 0,  wallMat);   // East

    // Accent strips on outer walls
    this.box(70, 0.15, 0.15, 0, 8.1, -35, accentMat, false);
    this.box(70, 0.15, 0.15, 0, 8.1,  35, accentMat, false);

    // ── Corner pillars ────────────────────────────────────
    for (const [cx, cz] of [[-33, -33], [33, -33], [-33, 33], [33, 33]]) {
      this.box(3, 10, 3, cx, 5, cz, buildingA);
      this.box(3, 0.2, 3, cx, 10.1, cz, accentMat, false);
    }

    // ── Building A — Northwest, tall office block ─────────
    this.box(10, 8, 8, -18, 4, -20, buildingA);
    this.box(6, 8, 5, -12, 4, -17, buildingA);
    // Windows
    for (let wh = 2; wh <= 6; wh += 2) {
      this.box(1.2, 1.2, 0.1, -18, wh, -16.1, windowMat, false);
      this.box(1.2, 1.2, 0.1, -15, wh, -16.1, windowMat, false);
    }
    // Accent
    this.box(10, 0.2, 0.2, -18, 8.1, -16.1, accentBlue, false);
    this.box(6, 0.2, 0.2,  -12, 8.1, -14.7, accentBlue, false);
    // Staircase outside
    this.box(3, 0.4, 1.5, -22, 0.2, -16, stairMat);
    this.box(3, 0.8, 1.0, -22, 0.4, -14.5, stairMat);

    // ── Building B — Southeast, warehousey ───────────────
    this.box(11, 6, 9, 18, 3, 20, buildingB);
    this.box(7, 6, 5, 12, 3, 17, buildingB);
    this.box(11, 0.2, 0.2, 18, 6.1, 15.6, accentMat, false);
    // Cargo door (dark rect)
    this.box(3, 3.5, 0.15, 18, 1.75, 15.58, this.mat(0x222222), false);

    // ── Building C — Northeast, control tower ────────────
    this.box(8, 10, 8, 19, 5, -18, buildingC);
    this.box(10, 0.4, 10, 19, 10.2, -18, buildingC);  // roof overhang
    this.box(8, 0.2, 0.2, 19, 10.2, -14.1, accentBlue, false);
    // Tower windows
    for (let wh = 3; wh <= 9; wh += 3) {
      this.box(1.0, 1.5, 0.1, 17, wh, -14.1, windowMat, false);
      this.box(1.0, 1.5, 0.1, 21, wh, -14.1, windowMat, false);
    }
    // External ladder
    this.box(0.1, 10, 0.1, 23.1, 5, -18, this.mat(0x555555));
    for (let rh = 1; rh < 10; rh += 1) {
      this.box(0.6, 0.06, 0.1, 23.1, rh, -18, this.mat(0x666666), false);
    }

    // ── Building D — Southwest, garage ───────────────────
    this.box(9, 5, 9, -18, 2.5, 18, buildingB);
    this.box(9, 0.2, 0.2, -18, 5.1, 13.6, accentMat, false);
    // Garage door
    this.box(4, 3, 0.15, -18, 1.5, 13.58, this.mat(0x333333), false);

    // ── Central Platform & Tower ──────────────────────────
    this.box(10, 0.5, 10, 0, 0.25, 0, barrierMat);
    this.box(2.5, 9, 2.5, 0, 4.5, 0, buildingA);
    this.box(4, 0.3, 4, 0, 9.15, 0, this.mat(0x3a3a5c));
    this.box(4, 0.15, 0.15, 0, 9.3, 0, accentMat, false);
    // Balcony railings
    for (const [rx, rz] of [[0, 5.1], [0, -5.1], [5.1, 0], [-5.1, 0]]) {
      this.box(10, 0.8, 0.15, rx, 0.65, rz, barrierMat);
    }

    // ── Crates cluster 1 — NE of center ──────────────────
    this.box(2, 2, 2,  6, 1, -6, crateMat);
    this.box(2, 2, 2,  8.5, 1, -5, crateMat);
    this.box(2, 4, 2,  7, 2, -8.5, crateMat);
    this.box(2, 2, 2,  9.5, 1, -7.5, crateMat);

    // ── Crates cluster 2 — SW of center ──────────────────
    this.box(2, 2, 2, -6, 1, 6, crateMat);
    this.box(2, 4, 2, -8, 2, 7.5, crateMat);
    this.box(2, 2, 2, -9.5, 1, 5.5, crateMat);

    // ── Crates cluster 3 — NW near spawn ─────────────────
    this.box(2, 2, 2, -15, 1, -10, crateMat);
    this.box(2, 2, 2, -12, 1, -10, crateMat);
    this.box(2, 4, 2, -13.5, 2, -12.5, crateMat);

    // ── Crates cluster 4 — SE near spawn ─────────────────
    this.box(2, 2, 2, 15, 1, 10, crateMat);
    this.box(2, 2, 2, 12, 1, 10, crateMat);
    this.box(2, 4, 2, 13.5, 2, 12.5, crateMat);

    // ── Jersey barriers / L-shaped cover ─────────────────
    this.box(6, 1.5, 1.0,  0, 0.75, -12, barrierMat);
    this.box(1.0, 1.5, 3,  3, 0.75, -13.5, barrierMat);
    this.box(6, 1.5, 1.0,  0, 0.75,  12, barrierMat);
    this.box(1.0, 1.5, 3, -3, 0.75,  13.5, barrierMat);
    this.box(1.0, 1.5, 6,  12, 0.75, 0, barrierMat);
    this.box(1.0, 1.5, 6, -12, 0.75, 0, barrierMat);

    // ── Concrete blocks (scattered cover) ────────────────
    this.concreteBlock(-8, -14);
    this.concreteBlock(8, 14, 0.5);
    this.concreteBlock(14, -8, -0.4);
    this.concreteBlock(-14, 8, 0.3);
    this.concreteBlock(5, -20);
    this.concreteBlock(-5, 20, 0.2);

    // ── Sandbag walls ─────────────────────────────────────
    this.sandbags(-20, 0, 6);
    this.sandbags(20, 0, 6);
    this.sandbags(0, -26, 8, Math.PI / 2);
    this.sandbags(0,  26, 8, Math.PI / 2);
    this.sandbags(-26, -10, 5);
    this.sandbags(26, 10, 5);

    // ── Barrels ───────────────────────────────────────────
    // Red hazard barrels
    this.barrel(-4, -4, 0xcc2222);
    this.barrel(-4, -4, 0xcc2222);
    this.barrel(4, -4, 0xcc2222, 0.15);
    // Yellow barrels
    this.barrel(-6, 14, 0xddaa00);
    this.barrel(-5, 15, 0xddaa00, -0.2);
    // Rusty barrels
    this.barrel(16, -4, 0x8b5e3c);
    this.barrel(16, -5.5, 0x8b5e3c, 0.1);
    this.barrel(17, -3.5, 0x8b5e3c);
    // Blue industrial barrels
    this.barrel(-16, 4, 0x22559a);
    this.barrel(-17, 5.5, 0x22559a, -0.15);

    // ── Trees ────────────────────────────────────────────
    this.tree(-25, -10);
    this.tree(-25, 10);
    this.tree(25, -10);
    this.tree(25, 10);
    this.tree(-10, -28);
    this.tree(10, -28);
    this.tree(-10, 28);
    this.tree(10, 28);
    this.tree(28, 0);
    this.tree(-28, 0);
    this.tree(0, 28);
    this.tree(0, -28);

    // ── Light poles ───────────────────────────────────────
    this.lightPole(-20, -20);
    this.lightPole(20, -20);
    this.lightPole(-20, 20);
    this.lightPole(20, 20);
    this.lightPole(0, 15);
    this.lightPole(0, -15);
    this.lightPole(15, 0);
    this.lightPole(-15, 0);

    // ── Spawn markers (visual only) ───────────────────────
    for (const sp of SPAWN_POSITIONS) {
      const marker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.06, 8),
        accentMat
      );
      marker.position.set(sp.x, 0.04, sp.z);
      this.group.add(marker);

      // Spawn ring glow
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1.1, 12),
        this.mat(0xff7700, 0xff7700, 0.4)
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(sp.x, 0.05, sp.z);
      this.group.add(ring);
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
