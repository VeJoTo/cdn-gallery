import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { createRoom } from './scene/room.js';
import { createObjects } from './scene/objects.js';
import { createNavigationState, createNavigationSystem, setupClickHandler } from './navigation.js';
import { createUI } from './ui.js';

const canvas = document.getElementById('gallery-canvas');

// ── Renderer ─────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ── CSS3D renderer (for the TV's YouTube iframe) ──
export const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.id = 'css3d-layer';
document.body.appendChild(cssRenderer.domElement);

export const cssScene = new THREE.Scene();

// ── Scene ─────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050d14);
scene.fog = new THREE.Fog(0x050d14, 15, 30);

// ── Camera ────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 4.5, 7);
camera.lookAt(0, 1, 0);

// ── Resize ────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ── OrbitControls (free rotation/zoom in addition to hotspot navigation) ──
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;       // panning would let users wander off into the void
controls.minDistance = 1.5;
controls.maxDistance = 15;
controls.minPolarAngle = 0.2;     // don't go straight down through the floor
controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go below the floor
controls.target.set(0, 1, 0);

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
  controls.update();
  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
}

createRoom(scene);
const { arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate, extras, tv, globe } = createObjects(scene);
addUpdateCallback(sceneUpdate);

// ── TV YouTube iframe as a real 3D object via CSS3DRenderer ──
const tvVideoIframe = document.createElement('iframe');
tvVideoIframe.src = 'https://www.youtube.com/embed/BdGOuNQ_0B8?autoplay=1&mute=1&loop=1&playlist=BdGOuNQ_0B8&controls=0&rel=0&modestbranding=1&playsinline=1';
tvVideoIframe.allow = 'autoplay; encrypted-media; picture-in-picture';

const tvCSS3D = new CSS3DObject(tvVideoIframe);
// Screen mesh in buildTV is at local (0, 0, 0.071) inside the TV group.
// TV group is at (3.49, 2.85, 0) with rotation.y = -Math.PI/2.
// Local +Z maps to world -X after that rotation, so world position is:
//   (3.49 - 0.071, 2.85, 0) = (3.419, 2.85, 0)
tvCSS3D.position.set(3.419, 2.85, 0);
// Face world -X: starting orientation (+Z facing) rotated by +π/2 about Y.
tvCSS3D.rotation.y = -Math.PI / 2;
// Iframe CSS size is 1280 × 720 px; target world size is 1.92 × 1.08 units.
// Uniform scale = 1.92 / 1280 = 0.0015
const tvScale = 1.92 / 1280;
tvCSS3D.scale.set(tvScale, tvScale, tvScale);
cssScene.add(tvCSS3D);

const clickableObjects = [
  ...arcadeLeft.children, ...arcadeRight.children,
  desk, ...posters,
  pedestal,
  ...extras
];

const ui       = createUI(camera, renderer);
const navState = createNavigationState();
const nav      = createNavigationSystem(camera, navState, ui, controls);

// Hide arcades when zoomed into a wall (they'd otherwise block the view)
const baseGoTo = nav.goTo;
nav.goTo = (id) => {
  baseGoTo(id);
  const hideArcades = id === 'wall-left';
  arcadeLeft.visible  = !hideArcades;
  arcadeRight.visible = !hideArcades;
};

setupClickHandler(renderer, camera, clickableObjects, nav, ui);

// Pointer cursor on hover over clickable objects
const hoverRaycaster = new THREE.Raycaster();
const hoverMouse     = new THREE.Vector2();

renderer.domElement.addEventListener('mousemove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  hoverMouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
  hoverMouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

  hoverRaycaster.setFromCamera(hoverMouse, camera);
  const hits = hoverRaycaster.intersectObjects(clickableObjects, true);
  renderer.domElement.style.cursor = hits.length ? 'pointer' : 'default';
});

document.getElementById('back-btn').addEventListener('click', () => nav.goTo('overview'));
document.getElementById('guide-btn').addEventListener('click', () => ui.openGatekeeperChat());
document.getElementById('inventory-btn').addEventListener('click', () => ui.openInventory());

addUpdateCallback(() => ui.updateHints());

animate();
