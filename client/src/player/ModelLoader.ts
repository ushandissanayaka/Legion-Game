import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let cachedPlayerModel: THREE.Group | null = null;
const loader = new GLTFLoader();

export function loadPlayerModel(callback: (model: THREE.Group) => void) {
  if (cachedPlayerModel) {
    callback(cachedPlayerModel.clone(true));
    return;
  }
  
  loader.load('/models/player.glb', (gltf) => {
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
  }, undefined, (err) => {
    console.error('Failed to load player.glb. Make sure the file exists at public/models/player.glb', err);
  });
}
