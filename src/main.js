import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRoom, ROOM_WIDTH, ROOM_DEPTH } from './scene/room.js';
import { createObjects } from './scene/objects.js';
import { createNatureRoom, NATURE_CENTER_X } from './scene/nature-room.js';
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
scene.background = new THREE.Color(0xf4f6f8);

// ── Camera ────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.6, 10);
camera.lookAt(0, 1.6, 0);

// ── Resize ────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── OrbitControls (free cursor, drag to rotate, A/D to rotate) ──
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 0.5;
controls.maxDistance = 4;
controls.minPolarAngle = Math.PI / 3;
controls.maxPolarAngle = Math.PI / 2;
controls.target.set(0, 1.6, 0);

// Hide the first-person overlay and crosshair (not used anymore)
const fpOverlay = document.getElementById('fp-overlay');
const crosshair = document.getElementById('crosshair');
if (fpOverlay) fpOverlay.classList.add('hidden');
if (crosshair) crosshair.classList.add('hidden');

// A/D keys rotate the camera around the room
const ROTATE_SPEED = 1.5;
const ZOOM_SPEED = 5.0;
const moveState = { left: false, right: false, forward: false, backward: false };

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.code) {
    case 'KeyA': case 'ArrowLeft':  moveState.left = true; break;
    case 'KeyD': case 'ArrowRight': moveState.right = true; break;
    case 'KeyW': case 'ArrowUp':    moveState.forward = true; break;
    case 'KeyS': case 'ArrowDown':  moveState.backward = true; break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyA': case 'ArrowLeft':  moveState.left = false; break;
    case 'KeyD': case 'ArrowRight': moveState.right = false; break;
    case 'KeyW': case 'ArrowUp':    moveState.forward = false; break;
    case 'KeyS': case 'ArrowDown':  moveState.backward = false; break;
  }
});

function updateRotation(delta) {
  // A/D handled below as strafe
  controls.autoRotate = false;

  // W/S walk forward/back — move BOTH camera and orbit target together
  if (moveState.forward || moveState.backward) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0; // keep movement horizontal
    dir.normalize();
    const sign = moveState.forward ? 1 : -1;
    const move = dir.multiplyScalar(sign * ZOOM_SPEED * delta);
    camera.position.add(move);
    controls.target.add(move);

    // Clamp to current room bounds
    const inNature = currentRoom === 'nature';
    const roomCenterX = inNature ? NATURE_CENTER_X : 0;
    const halfW = inNature ? 3.0 : ROOM_WIDTH / 2 - 1.0;
    const halfD = inNature ? 2.5 : ROOM_DEPTH / 2 - 1.0;
    camera.position.x = Math.max(roomCenterX - halfW, Math.min(roomCenterX + halfW, camera.position.x));
    camera.position.z = Math.max(-halfD, Math.min(halfD, camera.position.z));
    controls.target.x = Math.max(roomCenterX - halfW, Math.min(roomCenterX + halfW, controls.target.x));
    controls.target.z = Math.max(-halfD, Math.min(halfD, controls.target.z));
  }

  // A/D also move the camera + target sideways (strafe)
  if (moveState.left || moveState.right) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    const sign = moveState.right ? 1 : -1;
    const move = right.multiplyScalar(sign * ZOOM_SPEED * 0.7 * delta);
    camera.position.add(move);
    controls.target.add(move);

    const inNature = currentRoom === 'nature';
    const roomCenterX = inNature ? NATURE_CENTER_X : 0;
    const halfW = inNature ? 3.0 : ROOM_WIDTH / 2 - 1.0;
    const halfD = inNature ? 2.5 : ROOM_DEPTH / 2 - 1.0;
    camera.position.x = Math.max(roomCenterX - halfW, Math.min(roomCenterX + halfW, camera.position.x));
    camera.position.z = Math.max(-halfD, Math.min(halfD, camera.position.z));
    controls.target.x = Math.max(roomCenterX - halfW, Math.min(roomCenterX + halfW, controls.target.x));
    controls.target.z = Math.max(-halfD, Math.min(halfD, controls.target.z));
  }
}

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
  updateRotation(delta);
  controls.update();
  updateHoverHighlight();
  renderer.render(scene, camera);
}

createRoom(scene);
const { pedestal, sceneUpdate, extras } = createObjects(scene);
addUpdateCallback(sceneUpdate);

const clickableObjects = [pedestal, ...extras];

const ui       = createUI(camera, renderer, controls);
const navState = createNavigationState();
const nav      = createNavigationSystem(camera, navState, ui, controls);

// ── Nature room ──
const natureRoom = createNatureRoom(scene);
clickableObjects.push(...natureRoom.clickables);

// Animate nature room
addUpdateCallback((delta) => {
  const elapsed = performance.now() * 0.001;
  if (natureRoom.returnGlow) natureRoom.returnGlow.rotation.z += delta * 0.3;
  if (natureRoom.returnGlow2) natureRoom.returnGlow2.rotation.z -= delta * 0.5;
  if (natureRoom.returnGlow3) natureRoom.returnGlow3.rotation.z += delta * 0.2;

  // Animate butterflies
  if (natureRoom.butterflies) {
    for (const b of natureRoom.butterflies) {
      const d = b.userData;
      b.position.x = d.baseX + Math.sin(elapsed * d.speed + d.phase) * d.radius;
      b.position.z = d.baseZ + Math.cos(elapsed * d.speed * 0.7 + d.phase) * d.radius * 0.6;
      b.position.y += Math.sin(elapsed * 3 + d.phase) * 0.002;
      b.rotation.y = elapsed * d.speed * 2;
    }
  }

  // Animate fountain drops
  if (natureRoom.drops) {
    for (const drop of natureRoom.drops) {
      drop.position.y -= drop.userData.speed * delta;
      const dx = Math.cos(drop.userData.angle) * 0.15 * delta;
      const dz = Math.sin(drop.userData.angle) * 0.15 * delta;
      drop.position.x += dx;
      drop.position.z += dz;
      // Reset when they fall into the pool
      if (drop.position.y < 0.25) {
        drop.position.y = 0.95 + Math.random() * 0.1;
        drop.position.x = NATURE_CENTER_X + Math.cos(drop.userData.angle) * 0.2;
        drop.position.z = Math.sin(drop.userData.angle) * 0.2;
      }
    }
  }
});

// ── Room transitions ──
const fadeOverlay = document.getElementById('fade-overlay');
let currentRoom = 'ai'; // 'ai' or 'nature'

function transitionToRoom(targetRoom) {
  // Clear saved zoom position without moving the camera
  nav.clearSaved();
  fadeOverlay.classList.add('active');

  setTimeout(() => {
    if (targetRoom === 'nature') {
      camera.position.set(NATURE_CENTER_X, 1.6, -3);
      controls.target.set(NATURE_CENTER_X, 1.6, 0);
      currentRoom = 'nature';
    } else {
      camera.position.set(0, 1.6, 10);
      controls.target.set(0, 1.6, 0);
      currentRoom = 'ai';
    }
    controls.update();

    setTimeout(() => {
      fadeOverlay.classList.remove('active');
    }, 300);
  }, 600);
}

window.__transitionToRoom = transitionToRoom;

setupClickHandler(renderer, camera, clickableObjects, nav, ui, navState);

// Pointer cursor on hover over clickable objects
const hoverRaycaster = new THREE.Raycaster();
const hoverMouse     = new THREE.Vector2();

// Hover highlight: glow objects the crosshair points at
let lastHovered = null;
let lastHoveredIntensity = null;
const hoverLabel = document.getElementById('hover-label');

function updateHoverHighlight() {
  // With free cursor, hover is handled by the mousemove listener below

  hoverRaycaster.setFromCamera(hoverMouse, camera);
  const hits = hoverRaycaster.intersectObjects(clickableObjects, true);

  // Find the clickable parent
  let hitObj = null;
  let hitMesh = null;
  if (hits.length) {
    hitMesh = hits[0].object;
    let obj = hitMesh;
    while (obj && !obj.userData.clickable) obj = obj.parent;
    hitObj = obj;
  }

  // Unhighlight previous group
  if (lastHovered && lastHovered !== hitObj) {
    lastHovered.traverse(child => {
      if (child.isMesh && child.material) {
        if (child.userData._origColor !== undefined) {
          child.material.color.setHex(child.userData._origColor);
          delete child.userData._origColor;
        }
        if (child.userData._origEmissiveI !== undefined) {
          child.material.emissiveIntensity = child.userData._origEmissiveI;
          delete child.userData._origEmissiveI;
        }
      }
    });
    lastHovered = null;
  }

  // Highlight current — glow the entire clickable group
  if (hitObj && lastHovered !== hitObj) {
    lastHovered = hitObj;
    hitObj.traverse(child => {
      if (child.isMesh && child.material) {
        if (child.material.emissive) {
          child.userData._origEmissiveI = child.material.emissiveIntensity;
          child.material.emissiveIntensity = (child.userData._origEmissiveI || 0) + 0.5;
        } else {
          // For non-emissive materials, lighten the color
          child.userData._origColor = child.material.color.getHex();
          const c = child.material.color;
          child.material.color.setRGB(
            Math.min(c.r + 0.12, 1),
            Math.min(c.g + 0.12, 1),
            Math.min(c.b + 0.15, 1)
          );
        }
      }
    });
  }

  // Crosshair only
  if (crosshair) {
    crosshair.style.color = hitObj ? 'rgba(0,212,255,1)' : 'rgba(0,212,255,0.4)';
    crosshair.style.fontSize = hitObj ? '28px' : '24px';
  }
}

// Also handle mouse hover when pointer is NOT locked (for cursor)
renderer.domElement.addEventListener('mousemove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  hoverMouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
  hoverMouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
  if (!controls.isLocked) {
    hoverRaycaster.setFromCamera(hoverMouse, camera);
    const hits = hoverRaycaster.intersectObjects(clickableObjects, true);
    renderer.domElement.style.cursor = hits.length ? 'pointer' : 'default';
  }
});

document.getElementById('reset-btn').addEventListener('click', () => {
  nav.goBack();
  camera.position.set(0, 1.6, 10);
  controls.target.set(0, 1.6, 0);
  controls.update();
  document.getElementById('stepback-btn').classList.add('hidden');
});

// Step back from zoom-in
const stepbackBtn = document.getElementById('stepback-btn');
stepbackBtn.addEventListener('click', () => {
  nav.goBack();
  stepbackBtn.classList.add('hidden');
  // Close any open panel drawer
  const drawer = document.getElementById('panel-drawer');
  drawer.classList.remove('open');
  setTimeout(() => drawer.classList.add('hidden'), 350);
});

// Show step-back button when zooming into a hotspot
const _origGoTo = nav.goTo;
nav.goTo = (id) => {
  _origGoTo(id);
  stepbackBtn.classList.remove('hidden');
};

document.getElementById('guide-btn').addEventListener('click', () => ui.openGatekeeperChat());
document.getElementById('inventory-btn').addEventListener('click', () => ui.openInventory());

addUpdateCallback(() => ui.updateHints());

animate();
