import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createRoom, ROOM_WIDTH, ROOM_DEPTH } from './scene/room.js';
import { createObjects } from './scene/objects.js';
import { createNatureRoom, NATURE_CENTER_X } from './scene/nature-room.js';
import { createExteriorRoom } from './scene/exterior-room.js';
import { createNavigationState, createNavigationSystem } from './navigation.js';
import { createUI } from './ui.js';
import { EffectComposer, RenderPass } from 'postprocessing';
import { GodraysPass } from 'three-good-godrays';

const canvas = document.getElementById('gallery-canvas');

// ── Renderer ─────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ── Scene ─────────────────────────────────────────
export const scene = new THREE.Scene();
// Start with exterior sky (overridden per room in transitions)
scene.background = new THREE.Color(0x88bbf0);
scene.fog = null;

// ── Camera ────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(-20, 1.6, 8);
camera.lookAt(-20, 1.6, 2);

// ── Resize ────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (window.__godraysComposer) window.__godraysComposer.setSize(window.innerWidth, window.innerHeight);
});

// ── PointerLockControls (Minecraft-style: click to capture, mouse to look) ──
export const controls = new PointerLockControls(camera, renderer.domElement);
controls.pointerSpeed = 1.0;
// Pitch clamp — near but not at the poles, so the camera can't flip.
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI - 0.05;

const fpOverlay = document.getElementById('fp-overlay');
const crosshair = document.getElementById('crosshair');
fpOverlay.classList.remove('hidden');
crosshair.classList.add('hidden');

fpOverlay.addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
  fpOverlay.classList.add('hidden');
  crosshair.classList.remove('hidden');
});
controls.addEventListener('unlock', () => {
  fpOverlay.classList.remove('hidden');
  crosshair.classList.add('hidden');
});

// ── Movement (WASD relative to look direction) ──
const MOVE_SPEED = 5.0;
const EYE_HEIGHT = 1.6;
const moveState = { forward: false, backward: false, left: false, right: false };

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    moveState.forward = true; break;
    case 'KeyS': case 'ArrowDown':  moveState.backward = true; break;
    case 'KeyA': case 'ArrowLeft':  moveState.left = true; break;
    case 'KeyD': case 'ArrowRight': moveState.right = true; break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    moveState.forward = false; break;
    case 'KeyS': case 'ArrowDown':  moveState.backward = false; break;
    case 'KeyA': case 'ArrowLeft':  moveState.left = false; break;
    case 'KeyD': case 'ArrowRight': moveState.right = false; break;
  }
});

// Room-walkable regions — axis-aligned box around each spawn.
const ROOM_BOUNDS = {
  exterior: { cx: -20,                cz: 4.75, halfW: 5,                  halfD: 5.25 },
  ai:       { cx: 0,                  cz: 0,    halfW: ROOM_WIDTH / 2 - 1, halfD: ROOM_DEPTH / 2 - 1 },
  nature:   { cx: NATURE_CENTER_X,    cz: 0,    halfW: 3,                  halfD: 2.5 }
};

function updateMovement(delta) {
  if (!controls.isLocked) return;

  let fwd = 0, strafe = 0;
  if (moveState.forward)  fwd    += 1;
  if (moveState.backward) fwd    -= 1;
  if (moveState.right)    strafe += 1;
  if (moveState.left)     strafe -= 1;
  if (fwd === 0 && strafe === 0) return;

  // Diagonal movement should not be faster than axis-aligned.
  const len = Math.hypot(fwd, strafe);
  const step = MOVE_SPEED * delta / len;
  if (fwd    !== 0) controls.moveForward(fwd    * step);
  if (strafe !== 0) controls.moveRight  (strafe * step);

  // Clamp to current room bounds + pin eye height.
  const b = ROOM_BOUNDS[currentRoom];
  camera.position.x = Math.max(b.cx - b.halfW, Math.min(b.cx + b.halfW, camera.position.x));
  camera.position.z = Math.max(b.cz - b.halfD, Math.min(b.cz + b.halfD, camera.position.z));
  camera.position.y = EYE_HEIGHT;
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
  updateMovement(delta);
  updateHoverHighlight();
  if (currentRoom === 'exterior') {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

// Rooms live in the same scene at different x-offsets; geometry from one
// (sky dome, forest ring, …) can reach into another's footprint, so we
// toggle visibility per room instead of relying on bounds.
function trackChildren(builder) {
  const before = scene.children.length;
  const result = builder();
  const added = scene.children.slice(before);
  return { result, added };
}

// ── AI room ──
const { result: aiObjects, added: aiRoomChildren } = trackChildren(() => {
  createRoom(scene);
  return createObjects(scene);
});
const { pedestal, sceneUpdate, extras } = aiObjects;
addUpdateCallback(sceneUpdate);

const clickableObjects = [pedestal, ...extras];

const ui       = createUI(camera, renderer, controls);
const navState = createNavigationState();
const nav      = createNavigationSystem(camera, navState, ui, controls);

// ── Nature room ──
const { result: natureRoom, added: natureRoomChildren } = trackChildren(
  () => createNatureRoom(scene)
);
clickableObjects.push(...natureRoom.clickables);

// ── Exterior room ──
const { result: exteriorRoom, added: exteriorRoomChildren } = trackChildren(
  () => createExteriorRoom(scene)
);
clickableObjects.push(...exteriorRoom.clickables);

const roomChildren = {
  ai:       aiRoomChildren,
  nature:   natureRoomChildren,
  exterior: exteriorRoomChildren
};

function setRoomVisibility(activeRoom) {
  for (const [name, children] of Object.entries(roomChildren)) {
    const visible = name === activeRoom;
    for (const c of children) c.visible = visible;
  }
}

// Start visible only in the spawn room.
setRoomVisibility('exterior');

// ── Godrays composer for exterior sunlight ──
const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
const renderPass = new RenderPass(scene, camera);
renderPass.renderToScreen = false;
composer.addPass(renderPass);

const godraysPass = new GodraysPass(exteriorRoom.sunLight, camera, {
  density: 0.04,
  maxDensity: 0.1,
  edgeStrength: 2,
  edgeRadius: 2,
  distanceAttenuation: 2,
  color: new THREE.Color(0xfff5dd),
  raymarchSteps: 60,
  blur: true,
  gammaCorrection: true,
});
godraysPass.renderToScreen = true;
composer.addPass(godraysPass);
window.__godraysComposer = composer;

// Exterior enter label (gentle bob + pulse)
addUpdateCallback(() => {
  if (currentRoom !== 'exterior') return;
  const t = performance.now() * 0.001;
  if (exteriorRoom.enterLabel) {
    exteriorRoom.enterLabel.position.y = 2.6 + Math.sin(t * 1.5) * 0.06;
    exteriorRoom.enterLabel.material.opacity = 0.7 + Math.sin(t * 2) * 0.3;
  }
  if (exteriorRoom.arrowMesh) {
    exteriorRoom.arrowMesh.position.y = 2.38 + Math.sin(t * 1.5) * 0.06;
    exteriorRoom.arrowMesh.material.opacity = 0.7 + Math.sin(t * 2) * 0.3;
  }
});

// Nature room animations
addUpdateCallback((delta) => {
  const elapsed = performance.now() * 0.001;
  if (natureRoom.returnGlow)  natureRoom.returnGlow.rotation.z  += delta * 0.3;
  if (natureRoom.returnGlow2) natureRoom.returnGlow2.rotation.z -= delta * 0.5;
  if (natureRoom.returnGlow3) natureRoom.returnGlow3.rotation.z += delta * 0.2;

  if (natureRoom.butterflies) {
    for (const b of natureRoom.butterflies) {
      const d = b.userData;
      b.position.x = d.baseX + Math.sin(elapsed * d.speed + d.phase) * d.radius;
      b.position.z = d.baseZ + Math.cos(elapsed * d.speed * 0.7 + d.phase) * d.radius * 0.6;
      b.position.y += Math.sin(elapsed * 3 + d.phase) * 0.002;
      b.rotation.y = elapsed * d.speed * 2;
    }
  }

  if (natureRoom.drops) {
    for (const drop of natureRoom.drops) {
      drop.position.y -= drop.userData.speed * delta;
      const dx = Math.cos(drop.userData.angle) * 0.15 * delta;
      const dz = Math.sin(drop.userData.angle) * 0.15 * delta;
      drop.position.x += dx;
      drop.position.z += dz;
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
let currentRoom = 'exterior'; // 'exterior', 'ai', or 'nature'

function transitionToRoom(targetRoom) {
  nav.clearSaved();
  fadeOverlay.classList.add('active');

  setTimeout(() => {
    if (targetRoom === 'nature') {
      camera.position.set(NATURE_CENTER_X, EYE_HEIGHT, -3);
      camera.lookAt(NATURE_CENTER_X, EYE_HEIGHT, 0);
      currentRoom = 'nature';
      scene.background = new THREE.Color(0x88bbf0);
      scene.fog = null;
    } else if (targetRoom === 'exterior') {
      camera.position.set(-20, EYE_HEIGHT, 8);
      camera.lookAt(-20, EYE_HEIGHT, 2);
      currentRoom = 'exterior';
      scene.background = new THREE.Color(0x88bbf0);
      scene.fog = null;
    } else {
      camera.position.set(0, EYE_HEIGHT, 10);
      camera.lookAt(0, EYE_HEIGHT, 0);
      currentRoom = 'ai';
      scene.background = new THREE.Color(0xf4f6f8);
      scene.fog = null;
    }
    setRoomVisibility(currentRoom);

    setTimeout(() => {
      fadeOverlay.classList.remove('active');
    }, 300);
  }, 600);
}

window.__transitionToRoom = transitionToRoom;

// ── Crosshair raycasting (hover + click target center of screen) ──
const centerRaycaster = new THREE.Raycaster();
const screenCenter    = new THREE.Vector2(0, 0);
let lastHovered = null;

function findClickable(hit) {
  let obj = hit.object;
  while (obj && !obj.userData.clickable) obj = obj.parent;
  return obj || null;
}

function updateHoverHighlight() {
  if (!controls.isLocked) {
    if (lastHovered) { clearHoverGlow(lastHovered); lastHovered = null; }
    return;
  }

  centerRaycaster.setFromCamera(screenCenter, camera);
  const hits = centerRaycaster.intersectObjects(clickableObjects, true);
  const hitObj = hits.length ? findClickable(hits[0]) : null;

  if (lastHovered && lastHovered !== hitObj) {
    clearHoverGlow(lastHovered);
    lastHovered = null;
  }

  if (hitObj && lastHovered !== hitObj) {
    lastHovered = hitObj;
    applyHoverGlow(hitObj);
  }

  crosshair.style.color = hitObj ? 'rgba(0,212,255,1)' : 'rgba(0,212,255,0.4)';
  crosshair.style.fontSize = hitObj ? '28px' : '24px';
}

function applyHoverGlow(group) {
  group.traverse(child => {
    if (!child.isMesh || !child.material) return;
    if (child.material.emissive) {
      child.userData._origEmissiveI = child.material.emissiveIntensity;
      child.material.emissiveIntensity = (child.userData._origEmissiveI || 0) + 0.5;
    } else {
      child.userData._origColor = child.material.color.getHex();
      const c = child.material.color;
      child.material.color.setRGB(
        Math.min(c.r + 0.12, 1),
        Math.min(c.g + 0.12, 1),
        Math.min(c.b + 0.15, 1)
      );
    }
  });
}

function clearHoverGlow(group) {
  group.traverse(child => {
    if (!child.isMesh || !child.material) return;
    if (child.userData._origColor !== undefined) {
      child.material.color.setHex(child.userData._origColor);
      delete child.userData._origColor;
    }
    if (child.userData._origEmissiveI !== undefined) {
      child.material.emissiveIntensity = child.userData._origEmissiveI;
      delete child.userData._origEmissiveI;
    }
  });
}

// Click while locked → fire the action on whatever the crosshair targets.
document.addEventListener('mousedown', () => {
  if (!controls.isLocked) return;
  centerRaycaster.setFromCamera(screenCenter, camera);
  const hits = centerRaycaster.intersectObjects(clickableObjects, true);
  if (!hits.length) return;

  const obj = findClickable(hits[0]);
  if (!obj) return;

  const { action, panelId, panelTitle } = obj.userData;

  // UI overlay actions need the cursor back; room transitions stay locked.
  const uiActions = new Set([
    'openPanel', 'openPoster', 'openBook',
    'enterRabbitHole', 'openReport', 'openFinDuMonde'
  ]);
  if (uiActions.has(action)) controls.unlock();

  if (action === 'openPanel')       ui.openPanelDrawer(panelId, panelTitle);
  if (action === 'openPoster')      ui.openPanelDrawer(panelId, panelTitle);
  if (action === 'openBook')        ui.openBook();
  if (action === 'enterRabbitHole') ui.openRabbitHole();
  if (action === 'openReport')      ui.openReport();
  if (action === 'openFinDuMonde')  ui.openFinDuMonde();
  if (action === 'enterNatureRoom') window.__transitionToRoom('nature');
  if (action === 'returnToAIRoom')  window.__transitionToRoom('ai');
  if (action === 'enterAIRoom')     window.__transitionToRoom('ai');
});

document.getElementById('reset-btn').addEventListener('click', () => {
  controls.unlock();
  transitionToRoom('exterior');
});

document.getElementById('guide-btn').addEventListener('click', () => {
  controls.unlock();
  ui.openGatekeeperChat();
});
document.getElementById('inventory-btn').addEventListener('click', () => {
  controls.unlock();
  ui.openInventory();
});

addUpdateCallback(() => ui.updateHints());

animate();
