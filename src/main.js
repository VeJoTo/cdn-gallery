import * as THREE from 'three';
import { createRoom } from './scene/room.js';
import { createObjects } from './scene/objects.js';
import { createGatekeeper } from './scene/gatekeeper.js';
import { createPanels } from './scene/panels.js';
import { createNavigationState, createNavigationSystem, setupClickHandler } from './navigation.js';
import { createUI } from './ui.js';

const canvas = document.getElementById('gallery-canvas');

// ── Renderer ─────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

createRoom(scene);
const { arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate } = createObjects(scene);
addUpdateCallback(sceneUpdate);
const gatekeeper = createGatekeeper(scene);
addUpdateCallback(gatekeeper.update);
const panels = createPanels(scene);

const clickableObjects = [
  ...arcadeLeft.children, ...arcadeRight.children,
  gatekeeper.group, ...gatekeeper.group.children,
  ...panels,
  desk, ...posters,
  pedestal
];

const ui       = createUI(camera, renderer);
const navState = createNavigationState();
const nav      = createNavigationSystem(camera, navState, ui);

// Hide arcades when zoomed into a wall (they'd otherwise block the view)
const baseGoTo = nav.goTo;
nav.goTo = (id) => {
  baseGoTo(id);
  const hideArcades = id === 'wall-left' || id === 'wall-right';
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
document.getElementById('inventory-btn').addEventListener('click', () => ui.openInventory());

addUpdateCallback(() => { ui.updateHints(); ui.updateChatAnchor(); });

animate();
