// src/scene/arcade.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ARCADE_URL = '/cdn-gallery/models/SketchFab/pacman_arcade__animation.glb';

/**
 * Loads the Pac-Man arcade cabinet GLB and places it near the entry (front) wall
 * on the user's left side (+X) when entering the room.
 * The animation bundled with the model is played automatically.
 */
export function createArcade(scene) {
  const group = new THREE.Group();
  // Near entry wall (z ≈ +11), user's left = +X side
  group.position.set(5.5, 0, 9.5);
  // Screen faces into the room (-Z direction); adjust if model's front isn't +Z
  group.rotation.y = Math.PI;
  group.userData.clickable = true;
  group.userData.hotspot   = 'arcade';
  scene.add(group);

  const loader = new GLTFLoader();
  loader.load(
    ARCADE_URL,
    (gltf) => {
      const model = gltf.scene;

      // Scale so the cabinet is ~1.8 units tall
      const box0 = new THREE.Box3().setFromObject(model);
      const size0 = box0.getSize(new THREE.Vector3());
      model.scale.setScalar(1.8 / size0.y);
      model.updateMatrixWorld(true);

      // Sit on the floor: centre XZ, raise so bottom is at y = 0
      const box1   = new THREE.Box3().setFromObject(model);
      const center = box1.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -box1.min.y, -center.z);

      model.traverse(child => {
        if (!child.isMesh) return;
        child.castShadow    = true;
        child.receiveShadow = true;
      });

      group.add(model);

      // Play the bundled animation (screen marquee / attract loop)
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
        group.userData.mixer = mixer;
      }
    },
    undefined,
    (err) => console.error('[arcade] GLB load failed:', err),
  );

  return group;
}
