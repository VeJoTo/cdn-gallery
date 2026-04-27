import * as THREE from 'three';
import gsap from 'gsap';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { aiArtVideos } from './videoData.js';
import { createRoom, ROOM_WIDTH, ROOM_DEPTH } from './scene/room.js';
import { createKulturKartet, handleKartetMapClick, handleKartetBtnClick, updateKartetHover, tickKartet } from './scene/kultur-kartet.js';
import { createObjects } from './scene/objects.js';
import { createNatureRoom, NATURE_CENTER_X } from './scene/nature-room.js';
import { createExteriorRoom } from './scene/exterior-room.js';
import { createGlobeScreenInstallation } from './scene/globe-screen.js';
import { createNavigationState, createNavigationSystem } from './navigation.js';
import { createUI } from './ui.js';
import { applySkyMode, getSkyMode, clearSkyObjects } from './sky.js';
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
// Sky mode is applied later (after setRoomVisibility) so the skydome-visibility
// changes aren't overridden. See the `setRoomVisibility('exterior')` call below.
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
window.__hideFPOverlay = () => fpOverlay.classList.add('hidden');
window.__relockControls = () => controls.lock();
window.__showFPOverlay  = () => { fpOverlay.classList.remove('hidden'); crosshair.classList.add('hidden'); };
window.__isControlsLocked = () => controls.isLocked;
window.__isAtTV = () => atTV;

// TV cursor mode — set by enterTVMode(), cleared by exitTVMode()
let atTV = false;
let suppressFPOverlay = false;
// Free-cursor window after TV step-back — allows mouse-position nav clicks
let _freeCursorAfterTV = false;

// Re-lock pointer on first keydown after stepping back from TV
let _tvRelockListener = null;
function _scheduleRelockOnKey() {
  _cancelRelockOnKey();
  _tvRelockListener = (ev) => {
    if (ev.key === 'Escape') return; // another ESC shouldn't re-lock
    _cancelRelockOnKey();
    if (!controls.isLocked && !atTV && !magActive) controls.lock();
  };
  document.addEventListener('keydown', _tvRelockListener, true);
}
function _cancelRelockOnKey() {
  if (_tvRelockListener) {
    document.removeEventListener('keydown', _tvRelockListener, true);
    _tvRelockListener = null;
  }
}

controls.addEventListener('lock', () => {
  // Don't clear _freeCursorAfterTV here — it persists into FPS mode so click-to-zoom
  // still works. It's cleared when the user navigates to any hotspot (see ui.updateHUD).
  fpOverlay.classList.add('hidden');
  crosshair.classList.remove('hidden');
  exitTVMode();
  if (magActive) {
    magActive = false;
    holoMagBtn?.userData.setActive(false);
    magDiv.style.display = 'none';
    magIframe.src = '';
  }
});
// Clicking the canvas while unlocked re-locks without showing the FP overlay.
// This is the fallback path when controls.lock() fails from a non-canvas gesture
// (e.g. step-back button after TV mode).
renderer.domElement.addEventListener('click', () => {
  if (!controls.isLocked && !atTV && !magActive) controls.lock();
});

controls.addEventListener('unlock', () => {
  // When pointer lock drops outside of TV/magnifier mode, hide the crosshair
  // so the cursor is visibly free. Canvas click re-enters FPS mode.
  if (!atTV && !magActive) crosshair.classList.add('hidden');
});

// ── Movement (WASD relative to look direction) ──
const MOVE_SPEED = 5.0;
const EYE_HEIGHT = 1.6;
const moveState = { forward: false, backward: false, left: false, right: false };

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') {
    if (magActive) { window.__toggleMagnifier?.(); e.stopImmediatePropagation(); return; }
    if (atTV) { e.stopImmediatePropagation(); return; } // × button handles TV exit
    fpOverlay.classList.remove('hidden');
    crosshair.classList.add('hidden');
    return;
  }
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    moveState.forward = true; break;
    case 'KeyS': case 'ArrowDown':  moveState.backward = true; break;
    case 'KeyA': case 'ArrowLeft':  moveState.left = true; break;
    case 'KeyD': case 'ArrowRight': moveState.right = true; break;
    case 'KeyG':
      controls.unlock();
      ui.openGatekeeperChat();
      break;
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

  // Keep the book facing the camera and gently bobbing
  const _bookGroup = pedestal?.userData?.bookGroup;
  if (_bookGroup?.userData?.isAnimating) {
    _bookGroup.userData.updatePageBend?.();
  }
  if (_bookGroup && !_bookGroup.userData.isAnimating) {
    _bookGroup.rotation.y = Math.atan2(
      camera.position.x - (-2.8),
      camera.position.z - 2.6
    ) + Math.PI / 2;
    _bookGroup.position.y = 1.28 + Math.sin(Date.now() * 0.0015) * 0.025;
  }
  // Hide sign while book animation is running; restore handled by animation reset
  const _signSprite = pedestal?.userData?.signGroup;
  const _signLight  = pedestal?.userData?.signLight;
  if (_signSprite && _bookGroup?.userData?.isAnimating) {
    _signSprite.scale.set(0, 0, 0);
    if (_signLight) _signLight.intensity = 0;
  }
  updateHoverHighlight();
  if (isTransitioning) {
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
  } else if (currentRoom === 'exterior') {
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
let globeScreen;
let kulturKartet;
const { result: aiObjects, added: aiRoomChildren } = trackChildren(() => {
  createRoom(scene);
  globeScreen = createGlobeScreenInstallation(scene, camera);
  kulturKartet = createKulturKartet(scene);
  return createObjects(scene);
});
const { pedestal, tv, sceneUpdate, extras } = aiObjects;
const holoPlayPauseBtn = tv.userData.playPauseBtn;
const holoMagBtn     = tv.userData.magBtn;
const holoInfoBtn    = tv.userData.infoBtn;
const holoSpeakerBtn  = tv.userData.speakerBtn;
const holoPlaylistBtn = tv.userData.playlistBtn;
addUpdateCallback(sceneUpdate);
addUpdateCallback(globeScreen.update);
addUpdateCallback((delta) => tickKartet(delta));

// Tiny floating animation on TV buttons — each offset by phase so they don't all move together
{
  const btns = tv.userData.buttons ?? [];
  const baseZ = 0.13;
  addUpdateCallback(() => {
    const t = performance.now() * 0.001;
    btns.forEach((btn, i) => {
      btn.position.z = baseZ + Math.sin(t * 1.1 + i * 1.2) * 0.003;
      btn.position.y = btn.userData._baseY ??= btn.position.y;
      btn.position.y = btn.userData._baseY + Math.sin(t * 0.9 + i * 0.8) * 0.002;
    });
  });
}

// ── Book particle burst ───────────────────────────────────────────────────────
function spawnBookParticles(worldPos) {
  const count = 1400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = worldPos.x + (Math.random() - 0.5) * 0.3;
    pos[i * 3 + 1] = worldPos.y + (Math.random() - 0.5) * 0.4;
    pos[i * 3 + 2] = worldPos.z + (Math.random() - 0.5) * 0.2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x00cfff, size: 0.004, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  const vel = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 3.0,
    y: (Math.random() - 0.3) * 2.5,
    z: (Math.random() - 0.5) * 3.0,
  }));
  let elapsed = 0;
  const duration = 1.6;
  function tick(_time, deltaTime) {
    elapsed += deltaTime / 1000;
    const t = Math.min(elapsed / duration, 1);
    const attr = geo.getAttribute('position');
    for (let i = 0; i < count; i++) {
      attr.array[i * 3]     = pos[i * 3]     + vel[i].x * elapsed;
      attr.array[i * 3 + 1] = pos[i * 3 + 1] + vel[i].y * elapsed;
      attr.array[i * 3 + 2] = pos[i * 3 + 2] + vel[i].z * elapsed;
    }
    attr.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - t * 1.4);
    if (t >= 1) { gsap.ticker.remove(tick); scene.remove(points); geo.dispose(); mat.dispose(); }
  }
  gsap.ticker.add(tick);
}

// ── Book open animation ───────────────────────────────────────────────────────
window.__openBookWithAnimation = (openBookFn) => {
  const bookGroup = pedestal.userData.bookGroup;
  if (!bookGroup) { openBookFn(); return; }

  bookGroup.userData.isAnimating = true;
  const model  = bookGroup.userData.model;
  const origY  = bookGroup.position.y;
  const origRotZ = Math.PI / 2 - 0.4;

  const meshes = bookGroup.userData.bookMeshes ?? [];
  meshes.forEach(m => {
    if (m.material && !m.material._fadeable) {
      m.material = m.material.clone();
      m.material.transparent = true;
      m.material._fadeable = true;
    }
    if (m.material?.emissive) {
      m.material._origEmissiveIntensity = m.material.emissiveIntensity;
      m.material.emissive.set(0x00cfff);
      m.material.emissiveIntensity = 0;
    }
  });

  const bookWorldPos = new THREE.Vector3(-2.8, origY, 2.6);
  const facingY = Math.atan2(
    camera.position.x - bookWorldPos.x,
    camera.position.z - bookWorldPos.z
  ) + Math.PI / 2;

  const signSprite = pedestal?.userData?.signGroup;
  const signLight  = pedestal?.userData?.signLight;
  // Scale to zero — zero-size quad generates no WebGL fragments, guaranteed invisible
  if (signSprite) { gsap.killTweensOf(signSprite.scale); signSprite.scale.set(0, 0, 0); }
  if (signLight)  signLight.intensity = 0;

  const tl = gsap.timeline();

  // Zoom camera back out to the pedestal view while the book starts spinning
  // Derive current lookAt from camera's forward direction (PointerLockControls has no .target)
  const _fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const camProxy = {
    px: camera.position.x, py: camera.position.y, pz: camera.position.z,
    tx: camera.position.x + _fwd.x,
    ty: camera.position.y + _fwd.y,
    tz: camera.position.z + _fwd.z,
  };
  tl.to(camProxy, {
    px: -2.0, py: 1.4, pz: 1.6,
    tx: -2.8, ty: 1.2, tz: 2.6,
    duration: 0.6, ease: 'power2.inOut',
    onUpdate: () => {
      camera.position.set(camProxy.px, camProxy.py, camProxy.pz);
      camera.lookAt(camProxy.tx, camProxy.ty, camProxy.tz);
    },
  });

  tl.to(bookGroup.position, { y: origY + 0.08, duration: 0.5, ease: 'power2.out' }, '<');
  tl.to(bookGroup.rotation, { y: bookGroup.rotation.y + Math.PI * 2, duration: 1.0, ease: 'power2.inOut' }, '<');
  tl.to(bookGroup.position, { y: origY + 0.15, duration: 0.4, ease: 'power2.out' });
  if (model) {
    tl.to(model.rotation,     { z: 0,       duration: 0.55, ease: 'power2.inOut' });
    tl.to(bookGroup.rotation, { y: facingY, duration: 0.35, ease: 'power2.out' }, '<0.15');
    // Tilt the book toward the camera so the open pages face the user
    tl.to(model.rotation, { z: 0.65, duration: 0.4, ease: 'power2.out' }, '+=0.05');
  }

  // Open the front cover, flip 4 pages, then reveal the open spread
  const frontCoverPivot   = bookGroup.userData.frontCoverPivot;
  const openPagesGroup    = bookGroup.userData.openPagesGroup;
  const pageFlipPivots    = bookGroup.userData.pageFlipPivots ?? [];
  const spineHoloObjects  = bookGroup.userData.spineHoloObjects ?? [];
  if (frontCoverPivot) {
    tl.to(frontCoverPivot.rotation, { x: -Math.PI, duration: 0.6, ease: 'power2.inOut' }, '+=0.12');
    // Hide spine details just as the first page starts flipping
    tl.add(() => { spineHoloObjects.forEach(o => { o.visible = false; }); });
    // Flip 4 pages one after another — each at a slightly different speed
    const flipDurations = [0.34, 0.26, 0.20, 0.24];
    pageFlipPivots.forEach((pivot, i) => {
      tl.to(pivot.rotation, { x: -Math.PI, duration: flipDurations[i], ease: 'power2.inOut' }, '+=0.08');
    });
    tl.add(() => { if (openPagesGroup) openPagesGroup.visible = true; });
    tl.to({}, { duration: 0.35 }); // hold on the open spread
  }

  meshes.forEach(m => {
    if (m.material?.emissive)
      tl.to(m.material, { emissiveIntensity: 8.0, duration: 0.55, ease: 'power2.in' }, '<');
  });

  // Move toward camera as it dissolves — direction in pedestal-local space
  const towardCam = new THREE.Vector3(
    camera.position.x - bookWorldPos.x,
    0,
    camera.position.z - bookWorldPos.z,
  ).normalize();
  tl.to(bookGroup.scale,    { x: 1.5, y: 1.5, z: 1.5, duration: 0.4, ease: 'power2.in' }, '+=0.1');
  tl.to(bookGroup.position, { x: towardCam.x * 0.6, y: origY + 0.2, z: towardCam.z * 0.6, duration: 0.4, ease: 'power2.in' }, '<');
  meshes.forEach(m => {
    tl.to(m.material, { opacity: 0, duration: 0.4, ease: 'power2.in' }, '<');
  });
  if (openPagesGroup) {
    openPagesGroup.children.forEach(pg => {
      tl.to(pg.material, { opacity: 0, duration: 0.4, ease: 'power2.in' }, '<');
    });
  }
  tl.add(() => {
    const wp = new THREE.Vector3();
    bookGroup.getWorldPosition(wp);
    spawnBookParticles(wp);
  }, '<');
  tl.add(() => {
    openBookFn();
    bookGroup.position.set(0, origY, 0);
    bookGroup.rotation.y = 0.9 - Math.PI;
    bookGroup.rotation.x = 0;
    bookGroup.scale.set(1, 1, 1);
    if (model) model.rotation.z = origRotZ;
    if (frontCoverPivot) frontCoverPivot.rotation.x = 0;
    if (openPagesGroup)  openPagesGroup.visible = false;
    pageFlipPivots.forEach(p => { p.rotation.x = 0; });
    spineHoloObjects.forEach(o => { o.visible = true; });
    meshes.forEach(m => {
      m.material.opacity = 1;
      if (m.material?.emissive)
        m.material.emissiveIntensity = m.material._origEmissiveIntensity ?? 0;
    });
    bookGroup.userData.isAnimating = false;
    // Reset nav state back to pedestal so book interaction restarts from step 1
    navState.resetTo('pedestal');
    ui.updateHUD('pedestal');
    // Fade sign back in — scale from 0 back to normal size
    if (signSprite) gsap.to(signSprite.scale, { x: 0.72, y: 0.12, z: 1, duration: 0.6, ease: 'power2.out' });
    if (signLight)  gsap.to(signLight, { intensity: 1.4, duration: 0.6, ease: 'power2.out' });
  }, '+=0.1');
};

// ── TV: YouTube iframe via CSS3DRenderer ──────────────────────────────────────
let currentVideoIndex = 0;

function buildVideoSrc(vid, autoplay = 1, startSec = 0, mute = true) {
  const s = Math.max(0, Math.floor(startSec));
  if (vid.platform === 'vimeo') {
    const hash = s > 0 ? `#t=${s}s` : '';
    return `https://player.vimeo.com/video/${vid.id}?autoplay=${autoplay}&muted=${mute ? 1 : 0}&loop=1&controls=0&autopause=0&title=0&byline=0&portrait=0&api=1${hash}`;
  }
  return `https://www.youtube.com/embed/${vid.id}?autoplay=${autoplay}&start=${s}&mute=${mute ? 1 : 0}&loop=1&playlist=${vid.id}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&showinfo=0&fs=0&disablekb=1&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
}

// Platform-aware postMessage: YouTube uses event/func, Vimeo uses method
function tvCommand(ytFunc, vimeoMethod, args = '') {
  const vid = aiArtVideos[currentVideoIndex];
  if (vid.platform === 'vimeo') {
    tvVideoIframe.contentWindow?.postMessage(JSON.stringify({ method: vimeoMethod }), 'https://player.vimeo.com');
  } else {
    tvVideoIframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: ytFunc, args }), '*');
  }
}
function tvSeekTo(t) {
  const vid = aiArtVideos[currentVideoIndex];
  if (vid.platform === 'vimeo') {
    tvVideoIframe.contentWindow?.postMessage(JSON.stringify({ method: 'setCurrentTime', value: t }), 'https://player.vimeo.com');
  } else {
    tvVideoIframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [t, true] }), '*');
  }
}

const tvVideoIframe = document.createElement('iframe');
tvVideoIframe.src = buildVideoSrc(aiArtVideos[currentVideoIndex], 0, 0, aiArtVideos[currentVideoIndex].mute !== false);
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
// Portrait panel: 800 px wide, height auto-fits content
const hologramDiv = document.createElement('div');
hologramDiv.style.cssText = `
  position:relative; width:800px; box-sizing:border-box;
  background:linear-gradient(160deg,rgba(2,0,28,0.94) 0%,rgba(10,0,40,0.90) 100%);
  border:1px solid rgba(255,255,255,0.35); border-top:2px solid rgba(0,212,255,0.9);
  border-bottom:2px solid rgba(255,255,255,0.5); border-radius:23px;
  box-shadow:inset 0 0 80px rgba(255,255,255,0.06),inset 0 0 160px rgba(0,212,255,0.06);
  font-family:'Courier New',monospace; color:#fff; pointer-events:auto; cursor:pointer;
  display:flex; flex-direction:column;
  padding:60px 70px; backdrop-filter:blur(2px);
  opacity:0; transition:opacity 0.4s ease;
`;

function showHologram() {
  hologramDiv.style.opacity = '1';
  hologramDiv.style.pointerEvents = 'auto';
  holoInfoBtn?.userData.setActive(true);
}

function hideHologram() {
  hologramDiv.style.opacity = '0';
  hologramDiv.style.pointerEvents = 'none';
  holoInfoBtn?.userData.setActive(false);
}

// Pagination state for the info panel
let holoPages = [];
let currentHoloPage = 0;

function renderHoloPage(video) {
  const bodyText = holoPages[currentHoloPage] ?? '';
  const multiPage = holoPages.length > 1;
  const hasPrev   = currentHoloPage > 0;
  const hasNext   = currentHoloPage < holoPages.length - 1;
  const chevStyle = (active) =>
    `font-size:82px;line-height:1;cursor:pointer;user-select:none;pointer-events:auto;` +
    `color:rgba(0,212,255,${active ? '0.9' : '0.2'});` +
    `text-shadow:${active ? '0 0 18px rgba(0,212,255,0.7),0 0 36px rgba(0,212,255,0.35)' : 'none'};` +
    `transition:color 0.2s,text-shadow 0.2s`;
  hologramDiv.innerHTML = `
    <span data-holo-action="close" style="position:absolute;top:22px;right:28px;font-size:56px;line-height:1;cursor:pointer;user-select:none;pointer-events:auto;color:rgba(255,255,255,0.45)">×</span>
    <div style="color:#fff;font-size:24px;letter-spacing:5px;text-transform:uppercase;margin-bottom:32px;text-shadow:0 0 10px #fff,0 0 20px rgba(255,255,255,0.6)">◈ &nbsp;NOW PLAYING &nbsp;◈</div>
    <div style="font-size:44px;font-weight:bold;color:#fff;margin-bottom:24px;line-height:1.25;text-shadow:0 0 20px rgba(255,255,255,0.5)">${video.title}</div>
    <div style="font-size:37px;color:rgba(168,216,234,0.9);margin-bottom:32px">${video.artist}</div>
    ${bodyText ? `<div style="font-size:34px;color:rgba(0,212,255,0.85);border-top:1px solid rgba(255,255,255,0.2);padding-top:28px;line-height:1.6;overflow:hidden">${bodyText}</div>` : ''}
    ${multiPage ? `
    <div style="display:flex;gap:40px;margin-top:28px;pointer-events:none">
      <span data-holo-action="prevPage" style="${chevStyle(hasPrev)}">‹</span>
      <span data-holo-action="nextPage" style="${chevStyle(hasNext)}">›</span>
    </div>` : ''}
    <div style="margin-top:auto;padding-top:16px;padding-bottom:4px;font-size:22px;color:rgba(255,255,255,0.7);letter-spacing:2px;display:flex;justify-content:space-between;flex-shrink:0;white-space:nowrap;">
      <span>CDN &nbsp;/&nbsp; AIART ARCHIVE</span>
      <span>${multiPage ? `${currentHoloPage + 1}&thinsp;/&thinsp;${holoPages.length} &nbsp;·&nbsp; ` : ''}${currentVideoIndex + 1}&nbsp;/&nbsp;${aiArtVideos.length}</span>
    </div>
  `;
}

function updateHologram(video) {
  // Use moreInfo split into paragraphs, falling back to description as single page
  const longText = video.moreInfo || video.description || '';
  holoPages = longText.split('\n\n').map(p => p.trim()).filter(Boolean);
  if (!holoPages.length) holoPages = [''];
  currentHoloPage = 0;
  renderHoloPage(video);
}

window.__holoPagePrev = () => {
  if (currentHoloPage > 0) {
    currentHoloPage--;
    renderHoloPage(aiArtVideos[currentVideoIndex]);
  }
};
window.__holoPageNext = () => {
  if (currentHoloPage < holoPages.length - 1) {
    currentHoloPage++;
    renderHoloPage(aiArtVideos[currentVideoIndex]);
  }
};


// Info panel — CSS3DObject so it is physically anchored to the wall next to the TV.
// Scale: 1200 px → 1.21 world units (matches TV frame height as reference).
const _panelScale = 1.21 / 1200;
const holoPanelCSS3D = new CSS3DObject(hologramDiv);
holoPanelCSS3D.scale.setScalar(_panelScale);
cssScene.add(holoPanelCSS3D);

// Show info panel for the first video on load (same behaviour as loadVideo)
updateHologram(aiArtVideos[currentVideoIndex]);
showHologram();

// ── Playlist panel ────────────────────────────────────────────────────────────
let shuffleMode = false;

const playlistDiv = document.createElement('div');
playlistDiv.style.cssText = `
  position:relative; width:680px; height:1200px; box-sizing:border-box;
  background:linear-gradient(160deg,rgba(2,0,28,0.94) 0%,rgba(10,0,40,0.90) 100%);
  border:1px solid rgba(255,255,255,0.35); border-top:2px solid rgba(0,212,255,0.9);
  border-bottom:2px solid rgba(255,255,255,0.5); border-radius:23px;
  box-shadow:inset 0 0 80px rgba(255,255,255,0.06),inset 0 0 160px rgba(0,212,255,0.06);
  font-family:'Courier New',monospace; color:#fff; pointer-events:none;
  display:flex; flex-direction:column; overflow:hidden; backdrop-filter:blur(2px);
  opacity:0; transition:opacity 0.4s ease;
`;
const playlistPanelCSS3D = new CSS3DObject(playlistDiv);
playlistPanelCSS3D.scale.setScalar(_panelScale);
cssScene.add(playlistPanelCSS3D);

function showPlaylist() {
  playlistDiv.style.opacity = '1';
  playlistDiv.style.pointerEvents = 'auto';
}
function hidePlaylist() {
  playlistDiv.style.opacity = '0';
  playlistDiv.style.pointerEvents = 'none';
}

function renderPlaylist() {
  const items = aiArtVideos.map((v, i) => {
    const active = i === currentVideoIndex;
    const num = String(i + 1).padStart(2, '0');
    return `<div data-playlist-index="${i}" style="
      display:flex;align-items:center;gap:22px;padding:18px 28px;cursor:pointer;
      border-bottom:1px solid rgba(255,255,255,0.07);
      border-left:4px solid rgba(0,212,255,${active ? '0.9' : '0'});
      background:${active ? 'rgba(0,212,255,0.10)' : 'transparent'};
    ">
      <span style="font-size:30px;color:rgba(0,212,255,${active ? '0.9' : '0.3'});min-width:40px;flex-shrink:0">${num}</span>
      <div style="overflow:hidden;min-width:0">
        <div style="font-size:30px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          color:${active ? '#00d4ff' : '#fff'};text-shadow:${active ? '0 0 10px rgba(0,212,255,0.5)' : 'none'}">${v.title}</div>
        <div style="font-size:24px;color:rgba(168,216,234,0.65);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.artist}</div>
      </div>
    </div>`;
  }).join('');

  playlistDiv.innerHTML = `
    <div style="padding:32px 28px 22px;border-bottom:1px solid rgba(255,255,255,0.18);flex-shrink:0">
      <div style="font-size:26px;letter-spacing:5px;text-transform:uppercase;margin-bottom:20px;
        text-shadow:0 0 10px #fff,0 0 20px rgba(255,255,255,0.6)">◈ &nbsp;PLAYLIST &nbsp;◈</div>
      <div data-playlist-action="shuffle" style="
        display:inline-flex;align-items:center;gap:10px;font-size:24px;letter-spacing:3px;
        cursor:pointer;padding:10px 20px;border-radius:8px;
        border:1px solid rgba(0,212,255,${shuffleMode ? '0.9' : '0.3'});
        color:rgba(0,212,255,${shuffleMode ? '1' : '0.45'});
        background:rgba(0,212,255,${shuffleMode ? '0.14' : '0'});
        text-shadow:${shuffleMode ? '0 0 10px rgba(0,212,255,0.7)' : 'none'};
      ">⇄ &nbsp;SHUFFLE ${shuffleMode ? 'ON' : 'OFF'}</div>
    </div>
    <div style="flex:1;overflow-y:auto;overflow-x:hidden">${items}</div>
    <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.14);
      font-size:22px;color:rgba(255,255,255,0.45);letter-spacing:3px;flex-shrink:0">
      ${aiArtVideos.length}&nbsp;VIDEOS
    </div>
  `;
}

let playlistVisible = false;
function togglePlaylist() {
  playlistVisible = !playlistVisible;
  if (playlistVisible) { renderPlaylist(); showPlaylist(); }
  else hidePlaylist();
  holoPlaylistBtn?.userData.setActive(playlistVisible);
}

playlistDiv.addEventListener('click', (e) => {
  const action = e.target.closest('[data-playlist-action]')?.dataset?.playlistAction;
  if (action === 'shuffle') { shuffleMode = !shuffleMode; renderPlaylist(); return; }
  const idx = e.target.closest('[data-playlist-index]')?.dataset?.playlistIndex;
  if (idx !== undefined) loadVideo(parseInt(idx, 10));
});

renderPlaylist();

// Per-frame sync — keeps TV iframe, overlay, and side panels locked to the TV wall
const _cssPos = new THREE.Vector3();
const _cssQuat = new THREE.Quaternion();
const screenMesh = tv.userData.screenMesh;
// World-space half-widths of each panel at panelScale = 1.21/1200
const _infoHalfW     = 800 * _panelScale / 2;  // ≈ 0.403 units
const _playlistHalfW = 680 * _panelScale / 2;   // ≈ 0.343 units
const _tvHalfW = 1.025; // TV edge to centre in world Z
const _panelGap = 0.04; // gap between TV edge and panel edge (world units)
addUpdateCallback(() => {
  screenMesh.getWorldPosition(_cssPos);
  screenMesh.getWorldQuaternion(_cssQuat);
  tvCSS3D.position.copy(_cssPos);
  tvCSS3D.quaternion.copy(_cssQuat);
  tvOverlayCSS3D.position.copy(_cssPos);
  tvOverlayCSS3D.quaternion.copy(_cssQuat);
  // Info panel — right of TV from viewer (world −Z side)
  holoPanelCSS3D.position.set(_cssPos.x, _cssPos.y, _cssPos.z - _tvHalfW - _panelGap - _infoHalfW);
  holoPanelCSS3D.quaternion.copy(_cssQuat);
  // Playlist panel — left of TV from viewer (world +Z side)
  playlistPanelCSS3D.position.set(_cssPos.x, _cssPos.y, _cssPos.z + _tvHalfW + _panelGap + _playlistHalfW);
  playlistPanelCSS3D.quaternion.copy(_cssQuat);
});

// ── TV playback state ─────────────────────────────────────────────────────────
let isPlaying    = false;
let soundEnabled = false;  // true only when current video has mute:false and user hasn't muted
let _playStartWall = null;
let _playOffset    = 0;

function approxCurrentTime() {
  if (!isPlaying || _playStartWall === null) return _playOffset;
  return _playOffset + (performance.now() - _playStartWall) / 1000;
}

function _markPlaying() {
  _playStartWall = performance.now();
  isPlaying = true;
  if (magActive) {
    const t = approxCurrentTime();
    magIframe.src = buildVideoSrc(aiArtVideos[currentVideoIndex], 1, t, true); // magnifier always muted
  }
}
function _markPaused() {
  _playOffset = approxCurrentTime();
  _playStartWall = null;
  isPlaying = false;
  if (magActive) {
    const t = approxCurrentTime();
    magIframe.src = buildVideoSrc(aiArtVideos[currentVideoIndex], 0, t, true); // magnifier always muted
  }
}

// Load new video: show info panel first, start paused so user reads
function loadVideo(index) {
  currentVideoIndex = (index + aiArtVideos.length) % aiArtVideos.length;
  const vid = aiArtVideos[currentVideoIndex];
  _playOffset = 0;
  _playStartWall = null;
  isPlaying = false;
  soundEnabled = vid.mute === false;
  tvVideoIframe.src = buildVideoSrc(vid, 0, 0, !soundEnabled); // autoplay=0
  updateHologram(vid);
  showHologram();
  if (playlistVisible) renderPlaylist();
  holoPlayPauseBtn?.userData.updateIcon('▶');
  // Speaker button: show only for sound-capable videos
  if (holoSpeakerBtn) {
    holoSpeakerBtn.visible = soundEnabled;
    holoSpeakerBtn.userData.updateIcon('🔊');
    holoSpeakerBtn.userData.setActive(soundEnabled);
  }
}

window.__nextVideo = () => {
  if (shuffleMode && aiArtVideos.length > 1) {
    let next;
    do { next = Math.floor(Math.random() * aiArtVideos.length); }
    while (next === currentVideoIndex);
    loadVideo(next);
  } else {
    loadVideo(currentVideoIndex + 1);
  }
};

const SEEK_STEP = 10; // seconds
window.__seekBack = () => {
  const t = Math.max(0, approxCurrentTime() - SEEK_STEP);
  if (isPlaying) _playStartWall = performance.now() - t * 1000;
  else _playOffset = t;
  tvSeekTo(t);
};
window.__seekFwd = () => {
  const t = approxCurrentTime() + SEEK_STEP;
  if (isPlaying) _playStartWall = performance.now() - t * 1000;
  else _playOffset = t;
  tvSeekTo(t);
};

window.__toggleSound = () => {
  soundEnabled = !soundEnabled;
  const vid = aiArtVideos[currentVideoIndex];
  const t   = approxCurrentTime();
  tvVideoIframe.src = buildVideoSrc(vid, isPlaying ? 1 : 0, t, !soundEnabled);
  holoSpeakerBtn?.userData.updateIcon(soundEnabled ? '🔊' : '🔇');
  holoSpeakerBtn?.userData.setActive(soundEnabled);
};
window.__prevVideo = () => loadVideo(currentVideoIndex - 1);

window.__showInfo = () => {
  if (hologramDiv.style.opacity !== '0') { hideHologram(); return; }
  showHologram();
  tvCommand('pauseVideo', 'pause');
  _markPaused();
  holoPlayPauseBtn?.userData.updateIcon('▶');
};

window.__toggleTV = () => {
  if (isPlaying) {
    tvCommand('pauseVideo', 'pause');
    _markPaused();
    holoPlayPauseBtn?.userData.updateIcon('▶');
  } else if (_playOffset === 0 && hologramDiv.style.opacity === '0') {
    // Video hasn't started and panel is hidden — show panel first
    showHologram();
  } else {
    tvCommand('playVideo', 'play');
    _markPlaying();
    holoPlayPauseBtn?.userData.updateIcon('⏸');
  }
};

// Clicking the TV screen overlay:
//   left 25%  → seek back 10s
//   right 25% → seek forward 10s
//   center 50% → play/pause toggle
tvOverlayDiv.addEventListener('click', (e) => {
  const ratio = e.offsetX / 1280;
  if (ratio < 0.25)      window.__seekBack?.();
  else if (ratio > 0.75) window.__seekFwd?.();
  else                   window.__toggleTV?.();
});
hologramDiv.addEventListener('click', (e) => {
  const action = e.target.closest('[data-holo-action]')?.dataset?.holoAction;
  if (action === 'close')    { hideHologram(); return; }
  if (action === 'prevPage') { window.__holoPagePrev?.(); return; }
  if (action === 'nextPage') { window.__holoPageNext?.(); return; }
  window.__toggleTV?.();
});

updateHologram(aiArtVideos[currentVideoIndex]);
// hologram visible is fine — CSS3D visibility hides it until user enters AI room

// ── Magnifier ─────────────────────────────────────────────────────────────────
const MAG_SIZE = 220;
const MAG_ZOOM = 2.8; // zoom factor relative to TV screen size on screen

const magDiv = document.createElement('div');
magDiv.style.cssText = `
  position:fixed; width:${MAG_SIZE}px; height:${MAG_SIZE}px;
  border-radius:50%;
  border:3px solid #00d4ff;
  box-shadow:0 0 28px rgba(0,212,255,0.75),inset 0 0 18px rgba(0,0,0,0.5);
  overflow:hidden; pointer-events:none; display:none; z-index:1000;
  transform:translate(-50%,-50%);
`;
document.body.appendChild(magDiv);

const magIframe = document.createElement('iframe');
magIframe.allow = 'autoplay; encrypted-media';
magIframe.style.cssText = `border:none; position:absolute; pointer-events:none;`;
magDiv.appendChild(magIframe);

let magActive   = false;
let _tvRect     = null; // {left,top,width,height} of TV screen in screen px

// Project the TV screen mesh corners to 2D screen coordinates
function getTVScreenRect() {
  const sm = tv.userData.screenMesh;
  sm.geometry.computeBoundingBox();
  const b = sm.geometry.boundingBox;
  const corners = [
    new THREE.Vector3(b.min.x, b.min.y, 0),
    new THREE.Vector3(b.max.x, b.min.y, 0),
    new THREE.Vector3(b.max.x, b.max.y, 0),
    new THREE.Vector3(b.min.x, b.max.y, 0),
  ].map(v => {
    v.applyMatrix4(sm.matrixWorld);
    v.project(camera);
    return {
      x: (v.x + 1) / 2 * window.innerWidth,
      y: (-v.y + 1) / 2 * window.innerHeight,
    };
  });
  const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
  return {
    left:   Math.min(...xs),
    top:    Math.min(...ys),
    width:  Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function _positionMagIframe(mx, my) {
  if (!_tvRect) return;
  const { left, top, width, height } = _tvRect;
  // Normalised position [0,1] within the video at the cursor
  const vx = Math.max(0, Math.min(1, (mx - left)  / width));
  const vy = Math.max(0, Math.min(1, (my - top)   / height));
  // iframe is rendered at zoom × screen-size of the TV
  const fw = width  * MAG_ZOOM;
  const fh = height * MAG_ZOOM;
  // Offset so the hovered point sits at the centre of the circle
  const ox = MAG_SIZE / 2 - vx * fw;
  const oy = MAG_SIZE / 2 - vy * fh;
  magIframe.style.width  = `${fw}px`;
  magIframe.style.height = `${fh}px`;
  magIframe.style.left   = `${ox}px`;
  magIframe.style.top    = `${oy}px`;
}

document.addEventListener('mousemove', (e) => {
  if (!magActive) return;
  magDiv.style.left = `${e.clientX}px`;
  magDiv.style.top  = `${e.clientY}px`;
  _positionMagIframe(e.clientX, e.clientY);
});

window.__toggleMagnifier = () => {
  magActive = !magActive;
  holoMagBtn?.userData.setActive(magActive);
  if (magActive) {
    _tvRect = getTVScreenRect();
    const t = approxCurrentTime();
    magIframe.src = buildVideoSrc(aiArtVideos[currentVideoIndex], isPlaying ? 1 : 0, t, true); // magnifier always muted
    magDiv.style.display = 'block';
    // Start centred on the TV screen
    const cx = _tvRect.left + _tvRect.width  / 2;
    const cy = _tvRect.top  + _tvRect.height / 2;
    magDiv.style.left = `${cx}px`;
    magDiv.style.top  = `${cy}px`;
    _positionMagIframe(cx, cy);
    controls.unlock();
  } else {
    magDiv.style.display = 'none';
    magIframe.src = '';
    _tvRect = null;
  }
};

const clickableObjects = [pedestal, ...extras, ...globeScreen.clickables, ...kulturKartet.clickables];

const ui       = createUI(camera, renderer, controls, scene);
const _origUpdateHUD = ui.updateHUD.bind(ui);
ui.updateHUD = (id) => {
  _origUpdateHUD(id);
  if (id === 'tv') enterTVMode();
  else { exitTVMode(); _freeCursorAfterTV = false; }
};
const navState = createNavigationState();
const nav      = createNavigationSystem(camera, navState, ui, controls);

// When arriving at the pedestal, smoothly turn the book to face the camera
const _navGoTo = nav.goTo.bind(nav);
nav.goTo = (id) => {
  _navGoTo(id);
  if (id === 'pedestal') {
    const dur = 0.6 * 1000 + 200; // hotspot default duration + buffer
    setTimeout(() => {
      const bookGroup = pedestal?.userData?.bookGroup;
      if (!bookGroup || bookGroup.userData.isAnimating) return;
      const targetY = Math.atan2(
        camera.position.x - (-2.8),
        camera.position.z - 2.6
      ) + Math.PI / 2;
      gsap.to(bookGroup.rotation, { y: targetY, duration: 0.5, ease: 'power2.out' });
    }, dur);
  }
};

// Open panel drawer with current video's moreInfo text
window.__openVideoMoreInfo = () => {
  const video = aiArtVideos[currentVideoIndex];
  if (!video.moreInfo) return;
  window.__currentVideoMoreInfo = { title: video.title, body: video.moreInfo };
  ui.openPanelDrawer('video-more-info', video.title);
};

// ── TV cursor mode helpers ─────────────────────────────────────────────────────
const tvMouse     = new THREE.Vector2();
const tvRaycaster = new THREE.Raycaster();
let   tvHovered   = null;

// × button — click to step back from TV and re-lock controls in one gesture
const tvBackBtn = document.createElement('button');
tvBackBtn.innerHTML = '&times;';
tvBackBtn.style.cssText = `
  position:fixed; bottom:36px; left:50%; transform:translateX(-50%);
  width:54px; height:54px; border-radius:50%; border:1.5px solid rgba(0,212,255,0.75);
  background:rgba(0,0,0,0.55); color:rgba(0,212,255,0.9); font-size:30px; line-height:1;
  cursor:pointer; display:none; align-items:center; justify-content:center;
  box-shadow:0 0 14px rgba(0,212,255,0.35),inset 0 0 12px rgba(0,212,255,0.08);
  text-shadow:0 0 8px rgba(0,212,255,0.7); z-index:100;
  transition:background 0.15s, box-shadow 0.15s;
`;
document.body.appendChild(tvBackBtn);
tvBackBtn.addEventListener('mouseenter', () => {
  tvBackBtn.style.background = 'rgba(0,212,255,0.12)';
  tvBackBtn.style.boxShadow  = '0 0 22px rgba(0,212,255,0.6),inset 0 0 14px rgba(0,212,255,0.15)';
});
tvBackBtn.addEventListener('mouseleave', () => {
  tvBackBtn.style.background = 'rgba(0,0,0,0.55)';
  tvBackBtn.style.boxShadow  = '0 0 14px rgba(0,212,255,0.35),inset 0 0 12px rgba(0,212,255,0.08)';
});
tvBackBtn.addEventListener('click', () => {
  stepBackFromTV();
  // Re-lock immediately — click is a valid user gesture so the browser allows it.
  // _freeCursorAfterTV stays true through the lock event so click-to-zoom still works.
  controls.lock();
});

function enterTVMode() {
  _cancelRelockOnKey();
  _freeCursorAfterTV = false;
  atTV = true;
  suppressFPOverlay = true;
  controls.unlock();
  crosshair.classList.add('hidden');
  tvBackBtn.style.display = 'flex';
  if (playlistVisible) showPlaylist();
}

function exitTVMode() {
  atTV = false;
  crosshair.classList.remove('hidden');
  tvBackBtn.style.display = 'none';
  if (tvHovered) { clearHoverGlow(tvHovered); tvHovered = null; }
  renderer.domElement.style.cursor = '';
  // Panels remain visible on the wall — positions are updated every frame
}

// Hover highlight while in TV mode (free mouse)
document.addEventListener('mousemove', (e) => {
  if (!atTV) return;
  const rect = renderer.domElement.getBoundingClientRect();
  tvMouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  tvMouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  tvRaycaster.setFromCamera(tvMouse, camera);
  const hits = tvRaycaster.intersectObjects(clickableObjects, true);
  const hitObj = hits.length ? findClickable(hits[0]) : null;
  if (tvHovered && tvHovered !== hitObj) { clearHoverGlow(tvHovered); tvHovered = null; }
  if (hitObj && tvHovered !== hitObj) { tvHovered = hitObj; applyHoverGlow(hitObj); }
  renderer.domElement.style.cursor = hitObj ? 'pointer' : 'default';
});

// Click holographic buttons while in TV mode
document.addEventListener('click', (e) => {
  if (!atTV || controls.isLocked) return;
  // Only handle clicks that reach the canvas (not UI overlays like Guide/Inventory buttons)
  if (e.target.closest('button, input, #gatekeeper-chat, #inventory-overlay, #panel-drawer')) return;
  // Close magnifier when clicking outside the TV frame
  if (magActive && _tvRect) {
    const { left, top, width, height } = _tvRect;
    const outside = e.clientX < left || e.clientX > left + width ||
                    e.clientY < top  || e.clientY > top  + height;
    if (outside) { window.__toggleMagnifier?.(); return; }
  }
  const rect = renderer.domElement.getBoundingClientRect();
  tvMouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  tvMouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  tvRaycaster.setFromCamera(tvMouse, camera);
  const hits = tvRaycaster.intersectObjects(clickableObjects, true);
  if (!hits.length) return;
  const obj = findClickable(hits[0]);
  if (!obj) return;
  const { action } = obj.userData;
  if (action === 'nextVideo')       window.__nextVideo?.();
  if (action === 'prevVideo')       window.__prevVideo?.();
  if (action === 'toggleTV')        window.__toggleTV?.();
  if (action === 'showInfo')        window.__showInfo?.();
  if (action === 'toggleMagnifier') window.__toggleMagnifier?.();
  if (action === 'toggleSound')     window.__toggleSound?.();
  if (action === 'togglePlaylist')  togglePlaylist();
});

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
  // CSS3DRenderer respects .visible — use it to suppress TV from other rooms
  const inAI = activeRoom === 'ai';
  tvCSS3D.visible             = inAI;
  tvOverlayCSS3D.visible      = inAI;
  holoPanelCSS3D.visible      = inAI;
  playlistPanelCSS3D.visible  = inAI;
  if (!inAI) { hideHologram(); hidePlaylist(); }
}

// Start visible only in the spawn room.
setRoomVisibility('exterior');
// Apply persisted sky mode AFTER setRoomVisibility so night mode can hide the
// skydome (which setRoomVisibility just made visible for the exterior room).
applySkyMode(scene, getSkyMode());

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
let isTransitioning = false;

function transitionToRoom(targetRoom) {
  if (isTransitioning) return;
  isTransitioning = true;
  nav.clearSaved();

  // Stop all movement so the player doesn't keep walking during the cut.
  moveState.forward = moveState.backward = moveState.left = moveState.right = false;

  // Also black out the DOM overlay as a belt-and-suspenders measure.
  fadeOverlay.style.transition = 'none';
  fadeOverlay.style.opacity = '1';
  fadeOverlay.style.pointerEvents = 'auto';

  // isTransitioning=true makes animate() clear the WebGL canvas to black
  // this frame. Wait two frames to guarantee the black frame has been
  // presented before we move the camera.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (targetRoom === 'nature') {
      camera.position.set(NATURE_CENTER_X, EYE_HEIGHT, -3);
      camera.lookAt(NATURE_CENTER_X, EYE_HEIGHT, 0);
      currentRoom = 'nature';
      scene.fog = null;
    } else if (targetRoom === 'exterior') {
      camera.position.set(-20, EYE_HEIGHT, 8);
      camera.lookAt(-20, EYE_HEIGHT, 2);
      currentRoom = 'exterior';
      scene.fog = null;
    } else {
      camera.position.set(0, EYE_HEIGHT, 10);
      camera.lookAt(0, EYE_HEIGHT, 0);
      currentRoom = 'ai';
      clearSkyObjects(scene);
      scene.background = new THREE.Color(0xf4f6f8);
      scene.fog = null;
    }
    setRoomVisibility(currentRoom);
    // applySkyMode must run AFTER setRoomVisibility so its skydome-visibility
    // changes (night = hide dome to reveal scene.background) aren't overridden.
    if (currentRoom !== 'ai') {
      applySkyMode(scene, getSkyMode());
    }
    isTransitioning = false;

    // Fade the new room in smoothly.
    requestAnimationFrame(() => {
      fadeOverlay.style.transition = 'opacity 0.4s ease';
      fadeOverlay.style.opacity = '0';
      setTimeout(() => {
        fadeOverlay.style.transition = '';
        fadeOverlay.style.opacity = '';
        fadeOverlay.style.pointerEvents = 'none';
      }, 400);
    });
  }));
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

  // UV-based hover for the Kultur-kartet map
  if (hits.length && hits[0].object === kulturKartet.mapMesh && hits[0].uv) {
    updateKartetHover(hits[0].uv);
  } else {
    updateKartetHover(null);
  }

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

// Returns true if this mesh lives inside a child clickable sub-group (e.g. a TV button),
// so that hovering the parent group doesn't bleed glow onto separate interactive elements.
function insideChildClickable(mesh, rootGroup) {
  let p = mesh.parent;
  while (p && p !== rootGroup) {
    if (p.userData.clickable) return true;
    p = p.parent;
  }
  return false;
}

function applyHoverGlow(group) {
  group.traverse(child => {
    if (!child.isMesh || !child.material) return;
    if (insideChildClickable(child, group)) return;
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
    if (insideChildClickable(child, group)) return;
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

// ── Button active (press) state ───────────────────────────────────────────────
let tvPressed = null;
function applyActivePress(group) { group.scale.setScalar(0.82); }
function clearActivePress(group) { group.scale.setScalar(1.0); }

document.addEventListener('mousedown', (e) => {
  if (!atTV || controls.isLocked) return;
  if (e.target.closest('button, input, #gatekeeper-chat, #inventory-overlay, #panel-drawer')) return;
  const rect = renderer.domElement.getBoundingClientRect();
  tvMouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  tvMouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  tvRaycaster.setFromCamera(tvMouse, camera);
  const hits = tvRaycaster.intersectObjects(clickableObjects, true);
  if (!hits.length) return;
  const obj = findClickable(hits[0]);
  if (!obj || !obj.userData.action || obj.userData.hotspot) return; // buttons only
  tvPressed = obj;
  applyActivePress(obj);
});
document.addEventListener('mouseup', () => {
  if (tvPressed) { clearActivePress(tvPressed); tvPressed = null; }
});

// Click while locked → fire the action on whatever the crosshair targets.
document.addEventListener('mousedown', () => {
  if (!controls.isLocked) return;
  centerRaycaster.setFromCamera(screenCenter, camera);
  const hits = centerRaycaster.intersectObjects(clickableObjects, true);
  if (!hits.length) return;

  const obj = findClickable(hits[0]);
  if (!obj) return;

  const { hotspot, action, panelId, panelTitle } = obj.userData;

  // Capture whether we're already at this hotspot before nav changes state
  const alreadyAtHotspot = hotspot && navState.current === hotspot && navState.canNavigate();

  // Book uses a 3-step click sequence; all other objects navigate normally
  const atCoverZoom = action === 'openBook' && navState.current === 'book-cover-zoom' && navState.canNavigate();
  if (action === 'openBook') {
    if (atCoverZoom) {
      // Step 3 — at cover zoom: start animation (unlock cursor)
    } else if (alreadyAtHotspot) {
      nav.goTo('book-cover-zoom'); // Step 2 — zoom to cover
    } else if (hotspot) {
      nav.goTo(hotspot);           // Step 1 — navigate to pedestal
    }
  } else {
    if (hotspot) nav.goTo(hotspot);
  }

  // UI overlay actions need the cursor back; room transitions stay locked.
  const uiActions = new Set([
    'openPanel', 'openPoster',
    'enterRabbitHole', 'openReport', 'openFinDuMonde', 'openGlobeVideos',
  ]);
  const opensOverlay = uiActions.has(action) || atCoverZoom;
  if (opensOverlay) {
    suppressFPOverlay = true;
    controls.unlock();
  }

  if (action === 'openPanel')        ui.openPanelDrawer(panelId, panelTitle);
  if (action === 'openPoster')       ui.openPanelDrawer(panelId, panelTitle);
  if (atCoverZoom) {
    if (window.__openBookWithAnimation) window.__openBookWithAnimation(() => ui.openBook());
    else ui.openBook();
  }
  if (action === 'enterRabbitHole')  ui.openRabbitHole();
  if (action === 'openReport')       ui.openReport();
  if (action === 'openFinDuMonde')   ui.openFinDuMonde();
  if (action === 'openGlobeVideos')  ui.openGlobeVideos(() => globeScreen.start());
  if (action === 'selectCountry')    globeScreen.selectCountry(obj.userData.country);
  if (action === 'resetGlobeScreen') globeScreen.reset();
  if (action === 'kulturKartetMap') { const hit = hits[0]; if (hit?.uv) handleKartetMapClick(hit.uv); }
  if (action === 'kulturKartetBtn') handleKartetBtnClick(obj.userData.btnMode);
  if (action === 'enterNatureRoom')  window.__transitionToRoom('nature');
  if (action === 'returnToAIRoom')   window.__transitionToRoom('ai');
  if (action === 'enterAIRoom')      window.__transitionToRoom('ai');
  // TV button actions only fire when the user is at the TV hotspot
  if (atTV) {
    if (action === 'nextVideo')       window.__nextVideo?.();
    if (action === 'prevVideo')       window.__prevVideo?.();
    if (action === 'toggleTV')        window.__toggleTV?.();
    if (action === 'showInfo')        window.__showInfo?.();
    if (action === 'toggleMagnifier') window.__toggleMagnifier?.();
    if (action === 'toggleSound')     window.__toggleSound?.();
    if (action === 'togglePlaylist')  togglePlaylist();
  }
});

let _stepBackTween = null;
window.__cancelStepBack = () => {
  if (_stepBackTween) { _stepBackTween.kill(); _stepBackTween = null; }
};

function stepBackFromTV() {
  nav.clearSaved();
  exitTVMode();
  _freeCursorAfterTV = true;
  const target = { x: -7.5, y: 1.6, z: 0 };
  if (_stepBackTween) _stepBackTween.kill();
  _stepBackTween = gsap.to(camera.position, {
    x: target.x, y: target.y, z: target.z,
    duration: 0.8,
    ease: 'power2.inOut',
    onComplete: () => {
      _stepBackTween = null;
      camera.lookAt(-10, 1.6, 0);
      if (controls?.target) controls.target.set(-10, 1.6, 0);
    }
  });
}

// After TV step-back, clicking the TV mesh, any holographic button, or either panel zooms back in.
const _tvButtonActions = new Set(['toggleTV','showInfo','toggleMagnifier','toggleSound','togglePlaylist','nextVideo','prevVideo']);
document.addEventListener('mousedown', (e) => {
  if (!_freeCursorAfterTV) return;

  // Panels are CSS3DObjects — raycasting misses them. Use bounding rect instead.
  for (const panel of [hologramDiv, playlistDiv]) {
    if (panel.style.opacity === '0') continue;
    const r = panel.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      nav.goTo('tv'); return;
    }
  }

  // 3D objects: include `tv` group so holographic button children are raycasted.
  // In pointer lock mode clientX/Y are stale — use crosshair (screen centre) instead.
  let castMouse;
  if (controls.isLocked) {
    castMouse = screenCenter; // { x: 0, y: 0 }
  } else {
    const rect = renderer.domElement.getBoundingClientRect();
    tvMouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    tvMouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    castMouse = tvMouse;
  }
  tvRaycaster.setFromCamera(castMouse, camera);
  const hits = tvRaycaster.intersectObjects([...clickableObjects, tv], true);
  const obj = hits.length ? findClickable(hits[0]) : null;
  const isTVArea = obj?.userData.hotspot === 'tv' || _tvButtonActions.has(obj?.userData.action);
  if (isTVArea) nav.goTo('tv');
});

document.getElementById('reset-btn').addEventListener('click', () => {
  exitTVMode();
  fpOverlay.classList.remove('hidden');
  crosshair.classList.add('hidden');
  controls.unlock();
  transitionToRoom('exterior');
});


// Closing the Guide re-locks the cursor instantly (same user gesture, so the
// browser allows it without the fp-overlay round-trip).
document.getElementById('chat-close').addEventListener('click', () => {
  try { controls.lock(); } catch { /* browser may refuse; fp-overlay will still reappear */ }
});

addUpdateCallback(() => ui.updateHints());

// Auto-transition when player walks into the building door.
// Exterior bounds allow z down to -0.5; door front is at world z ≈ -0.25.
// Trigger just as the player crosses the door threshold.
let doorAutoTriggered = false;
addUpdateCallback(() => {
  if (currentRoom !== 'exterior') {
    doorAutoTriggered = false;
    return;
  }
  if (doorAutoTriggered) return;
  if (Math.abs(camera.position.x - (-20)) <= 0.55 && camera.position.z <= -0.1) {
    doorAutoTriggered = true;
    transitionToRoom('ai');
  }
});

animate();

// Welcome intro — fires on every page load.
ui.playIntro();
