import * as THREE from 'three';

const canvas = document.getElementById('gallery-canvas');

// ── Renderer ─────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ── Scene ─────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.Fog(0x0a0a0f, 15, 30);

// ── Camera ────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 6, 10);
camera.lookAt(0, 1, 0);

// ── Resize ────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Render loop ───────────────────────────────────
const clock = new THREE.Clock();
const updateCallbacks = [];

export function addUpdateCallback(fn) {
  updateCallbacks.push(fn);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  for (const fn of updateCallbacks) fn(delta);
  renderer.render(scene, camera);
}

animate();
