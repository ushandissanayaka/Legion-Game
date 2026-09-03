import * as THREE from 'three';

// ============================================================
// Lighting — bright daytime outdoor lighting
// ============================================================

export class Lighting {
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private pointLights: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene) {
    // Hemisphere sky/ground — blue sky above, green ground below
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.8);
    scene.add(this.hemiLight);

    // Bright ambient fill so shadows aren't pitch black
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(this.ambientLight);

    // Main sun directional light — warm yellow-white
    this.dirLight = new THREE.DirectionalLight(0xfff5d6, 2.5);
    this.dirLight.position.set(20, 50, 30);
    scene.add(this.dirLight);

    // Soft fill from opposite side
    const fillLight = new THREE.DirectionalLight(0xcce8ff, 0.8);
    fillLight.position.set(-15, 20, -20);
    scene.add(fillLight);

    // Warm accent point lights to colour the ground
    const accentPositions = [
      { pos: [0,   6,  0],   color: 0xffeecc, intensity: 3,   dist: 30 },
      { pos: [-20, 5, -20],  color: 0xffddb3, intensity: 2,   dist: 20 },
      { pos: [ 20, 5,  20],  color: 0xffddb3, intensity: 2,   dist: 20 },
    ];

    for (const { pos, color, intensity, dist } of accentPositions) {
      const light = new THREE.PointLight(color, intensity, dist);
      light.position.set(pos[0], pos[1], pos[2]);
      scene.add(light);
      this.pointLights.push(light);
    }
  }

  /** Temporary muzzle flash — returns a cancel fn */
  createMuzzleFlash(position: THREE.Vector3, scene: THREE.Scene): () => void {
    const flash = new THREE.PointLight(0xffcc44, 10, 10);
    flash.position.copy(position);
    scene.add(flash);
    const id = setTimeout(() => scene.remove(flash), 80);
    return () => { clearTimeout(id); scene.remove(flash); };
  }
}
