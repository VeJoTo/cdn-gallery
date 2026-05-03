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

  // ── Floating neon "COMING SOON" label above the cabinet ──
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width  = 512;
  labelCanvas.height = 128;
  const lctx    = labelCanvas.getContext('2d');
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;

  function drawArcadeLabel() {
    const NEON = '#5ee0ff';
    const cx = 256, cy = 72;
    lctx.clearRect(0, 0, 512, 128);
    lctx.font = "64px 'Octosquares', sans-serif";
    lctx.textAlign    = 'center';
    lctx.textBaseline = 'middle';
    lctx.shadowColor  = NEON;
    lctx.shadowBlur = 48; lctx.fillStyle = 'rgba(94, 224, 255, 0.18)'; lctx.fillText('COMING SOON', cx, cy);
    lctx.shadowBlur = 28; lctx.fillStyle = 'rgba(94, 224, 255, 0.45)'; lctx.fillText('COMING SOON', cx, cy);
    lctx.shadowBlur = 10; lctx.fillStyle = 'rgba(94, 224, 255, 0.85)'; lctx.fillText('COMING SOON', cx, cy);
    lctx.shadowBlur =  4; lctx.fillStyle = '#eef9ff';                  lctx.fillText('COMING SOON', cx, cy);
    labelTex.needsUpdate = true;
  }
  drawArcadeLabel();
  if (typeof document !== 'undefined' && document.fonts?.load) {
    document.fonts.load("64px 'Octosquares'").then(() => drawArcadeLabel());
  }

  const labelSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );
  labelSprite.scale.set(0.6, 0.15, 1);
  labelSprite.position.set(0, 2.1, 0);
  labelSprite.renderOrder = 999;
  labelSprite.raycast = () => {};
  group.add(labelSprite);

  return group;
}
