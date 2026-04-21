import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { aiArtVideos } from './videoData.js';
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

// ── CSS3D renderer (for the TV's YouTube iframe) ──────────────────────────────
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.top = '0';
cssRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(cssRenderer.domElement);
const cssScene = new THREE.Scene();

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
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
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
  cssRenderer.render(cssScene, camera);
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
const { pedestal, tv, sceneUpdate, extras } = aiObjects;
addUpdateCallback(sceneUpdate);

// ── TV: YouTube iframe via CSS3DRenderer ──────────────────────────────────────
let currentVideoIndex = 0;

function buildTVSrc(id, autoplay = 1) {
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay}&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&showinfo=0&fs=0&disablekb=1&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
}

const tvVideoIframe = document.createElement('iframe');
tvVideoIframe.src = buildTVSrc(aiArtVideos[currentVideoIndex].id, 0);
tvVideoIframe.allow = 'autoplay; encrypted-media; picture-in-picture';
tvVideoIframe.style.width = '1280px';
tvVideoIframe.style.height = '720px';
tvVideoIframe.style.borderRadius = '23px';
tvVideoIframe.style.border = 'none';

const tvScale = 1.92 / 1280;
const tvCSS3D = new CSS3DObject(tvVideoIframe);
tvCSS3D.scale.set(tvScale, tvScale, tvScale);
cssScene.add(tvCSS3D);

// Transparent overlay — catches clicks, hides YouTube UI chrome
const tvOverlayDiv = document.createElement('div');
tvOverlayDiv.style.cssText = `width:1280px;height:720px;border-radius:23px;cursor:pointer;pointer-events:auto;background:rgba(0,0,0,0.001);`;
const tvOverlayCSS3D = new CSS3DObject(tvOverlayDiv);
tvOverlayCSS3D.scale.set(tvScale, tvScale, tvScale);
cssScene.add(tvOverlayCSS3D);

// ── Hologram info panel ───────────────────────────────────────────────────────
const hologramDiv = document.createElement('div');
hologramDiv.style.cssText = `
  width:1280px; height:720px; box-sizing:border-box;
  background:linear-gradient(160deg,rgba(2,0,28,0.94) 0%,rgba(10,0,40,0.90) 100%);
  border:1px solid rgba(255,255,255,0.35); border-top:2px solid rgba(0,212,255,0.9);
  border-bottom:2px solid rgba(255,255,255,0.5); border-radius:23px;
  box-shadow:inset 0 0 80px rgba(255,255,255,0.06),inset 0 0 160px rgba(0,212,255,0.06);
  font-family:'Courier New',monospace; color:#fff; pointer-events:auto; cursor:pointer;
  display:flex; flex-direction:column; justify-content:flex-start;
  overflow-y:auto; padding:80px 100px; backdrop-filter:blur(2px);
  opacity:0; transition:opacity 0.4s ease;
`;

function updateHologram(video) {
  hologramDiv.innerHTML = `
    <div style="color:#fff;font-size:22px;letter-spacing:6px;text-transform:uppercase;margin-bottom:32px;text-shadow:0 0 10px #fff,0 0 20px rgba(255,255,255,0.6)">◈ &nbsp;NOW PLAYING &nbsp;◈</div>
    <div style="font-size:42px;font-weight:bold;color:#fff;margin-bottom:16px;line-height:1.25;text-shadow:0 0 20px rgba(255,255,255,0.5)">${video.title}</div>
    <div style="font-size:28px;color:rgba(168,216,234,0.85);margin-bottom:28px">${video.artist}</div>
    ${video.description ? `<div style="font-size:22px;color:rgba(0,212,255,0.85);border-top:1px solid rgba(255,255,255,0.2);padding-top:28px;line-height:1.6">${video.description}</div>` : ''}
    <div style="margin-top:auto;padding-top:32px;font-size:18px;color:rgba(255,255,255,0.7);letter-spacing:4px;display:flex;justify-content:space-between">
      <span>CDN &nbsp;/&nbsp; AIART ARCHIVE</span>
      <span>${currentVideoIndex + 1}&nbsp;/&nbsp;${aiArtVideos.length}</span>
    </div>
  `;
}

const infoCss3D = new CSS3DObject(hologramDiv);
infoCss3D.scale.setScalar(1.6 / 1280);
cssScene.add(infoCss3D);

// Per-frame sync — keeps all CSS3D panels locked to the TV screen face
const _cssPos = new THREE.Vector3();
const _cssQuat = new THREE.Quaternion();
const screenMesh = tv.userData.screenMesh;
addUpdateCallback(() => {
  screenMesh.getWorldPosition(_cssPos);
  screenMesh.getWorldQuaternion(_cssQuat);
  tvCSS3D.position.copy(_cssPos);
  tvCSS3D.quaternion.copy(_cssQuat);
  tvOverlayCSS3D.position.copy(_cssPos);
  tvOverlayCSS3D.quaternion.copy(_cssQuat);
  infoCss3D.position.copy(_cssPos);
  infoCss3D.quaternion.copy(_cssQuat);
});

// ── TV playback state ─────────────────────────────────────────────────────────
let isPlaying = false;

function loadVideo(index) {
  currentVideoIndex = (index + aiArtVideos.length) % aiArtVideos.length;
  tvVideoIframe.src = buildTVSrc(aiArtVideos[currentVideoIndex].id, 1);
  isPlaying = true;
  updateHologram(aiArtVideos[currentVideoIndex]);
  hologramDiv.style.opacity = '0';
  hologramDiv.style.pointerEvents = 'none';
  const tvPlayPauseBtn = document.getElementById('tv-playpause');
  if (tvPlayPauseBtn) tvPlayPauseBtn.textContent = '▮▮';
}

window.__nextVideo = () => loadVideo(currentVideoIndex + 1);
window.__prevVideo = () => loadVideo(currentVideoIndex - 1);
window.__showInfo  = () => {
  hologramDiv.style.opacity = '1';
  hologramDiv.style.pointerEvents = 'auto';
  tvVideoIframe.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
  isPlaying = false;
  const tvPlayPauseBtn = document.getElementById('tv-playpause');
  if (tvPlayPauseBtn) tvPlayPauseBtn.textContent = '▶';
};

// ── TV DOM controls ───────────────────────────────────────────────────────────
const tvControls     = document.getElementById('tv-controls');
const tvPlayPauseBtn = document.getElementById('tv-playpause');
const tvPrevBtn      = document.getElementById('tv-prev');
const tvNextBtn      = document.getElementById('tv-next');
const tvInfoBtn      = document.getElementById('tv-info');
const soundCheckbox  = document.getElementById('sound-checkbox');

function showTVControls(visible) {
  if (tvControls) tvControls.classList.toggle('hidden', !visible);
}

tvPlayPauseBtn?.addEventListener('click', () => {
  if (hologramDiv.style.opacity !== '0') {
    hologramDiv.style.opacity = '0';
    hologramDiv.style.pointerEvents = 'none';
    tvVideoIframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
    isPlaying = true;
    tvPlayPauseBtn.textContent = '▮▮';
  } else if (isPlaying) {
    tvVideoIframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
    isPlaying = false;
    tvPlayPauseBtn.textContent = '▶';
  } else {
    tvVideoIframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
    isPlaying = true;
    tvPlayPauseBtn.textContent = '▮▮';
  }
});
tvPrevBtn?.addEventListener('click', () => loadVideo(currentVideoIndex - 1));
tvNextBtn?.addEventListener('click', () => loadVideo(currentVideoIndex + 1));
tvInfoBtn?.addEventListener('click', () => window.__showInfo());
tvOverlayDiv.addEventListener('click', () => tvPlayPauseBtn?.click());
hologramDiv.addEventListener('click', () => tvPlayPauseBtn?.click());

soundCheckbox?.addEventListener('change', () => {
  const cmd = soundCheckbox.checked ? 'unMute' : 'mute';
  tvVideoIframe.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func: cmd, args: '' }), '*');
});

updateHologram(aiArtVideos[currentVideoIndex]);
hologramDiv.style.opacity = '1';
hologramDiv.style.pointerEvents = 'auto';

const clickableObjects = [pedestal, ...extras];

const ui       = createUI(camera, renderer, controls);
const _origUpdateHUD = ui.updateHUD.bind(ui);
ui.updateHUD = (id) => {
  _origUpdateHUD(id);
  showTVControls(id === 'tv');
};
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
