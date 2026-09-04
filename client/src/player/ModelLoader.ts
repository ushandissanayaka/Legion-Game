import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

let cachedPlayerModel: THREE.Group | null = null;
let cachedEnemyModel: THREE.Group | null = null;
const loader = new GLTFLoader();

const ENEMY_MODEL_URL = '/low%20poly%20soldier%203d%20model.glb';

export function loadPlayerModel(callback: (model: THREE.Group) => void) {
  if (cachedPlayerModel) {
    callback(cachedPlayerModel.clone(true));
    return;
  }
  
  loader.load('/models/player.glb', (gltf: GLTF) => {
    const model = gltf.scene;
    // Scale and position adjustment for RobotExpressive model
    model.scale.set(0.4, 0.4, 0.4);
    model.position.y = 0;
    // Make it face the right way (usually -Z is forward in three.js)
    model.rotation.y = Math.PI;
    
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    cachedPlayerModel = model;
    callback(model.clone(true));
  }, undefined, (err: unknown) => {
    console.error('Failed to load player.glb. Make sure the file exists at public/models/player.glb', err);
  });
}

export function loadEnemyModel(callback: (model: THREE.Group) => void) {
  if (cachedEnemyModel) {
    callback(cachedEnemyModel.clone(true));
    return;
  }

  loader.load(ENEMY_MODEL_URL, (gltf: GLTF) => {
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const height = bounds.max.y - bounds.min.y;
    if (height > 0) {
      model.scale.setScalar(1.8 / height);
    }
    model.position.y = -bounds.min.y * model.scale.y;
    model.rotation.y = Math.PI;

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    cachedEnemyModel = model;
    callback(model.clone(true));
  }, undefined, (err: unknown) => {
    console.error(`Failed to load enemy model at ${ENEMY_MODEL_URL}`, err);
  });
}
