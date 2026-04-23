import * as THREE from 'three';
import gsap from 'gsap';
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
import { applySkyMode, getSkyMode } from './sky.js';

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
// Start with exterior sky (overridden per room in transitions).
// applySkyMode respects the user's persisted day/night choice.
applySkyMode(scene, getSkyMode());
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

// TV cursor mode — set by enterTVMode(), cleared by exitTVMode()
let atTV = false;
let suppressFPOverlay = false;

controls.addEventListener('lock', () => {
  fpOverlay.classList.add('hidden');
  crosshair.classList.remove('hidden');
  exitTVMode();
  if (magActive) {
    magActive = false;
    magDiv.style.display = 'none';
    magIframe.src = '';
  }
});
controls.addEventListener('unlock', () => {
  if (suppressFPOverlay) { suppressFPOverlay = false; return; }
  if (atTV) return; // already in TV cursor mode — don't show fpOverlay
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
const { result: aiObjects, added: aiRoomChildren } = trackChildren(() => {
  createRoom(scene);
  return createObjects(scene);
});
const { pedestal, tv, sceneUpdate, extras } = aiObjects;
const holoPlayPauseBtn = tv.userData.playPauseBtn;
addUpdateCallback(sceneUpdate);

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
  ) - Math.PI / 2;

  const tl = gsap.timeline();

  tl.to(bookGroup.position, { y: origY + 0.15, duration: 0.5, ease: 'power2.out' });
  tl.to(bookGroup.rotation, { y: bookGroup.rotation.y + Math.PI * 2, duration: 1.0, ease: 'power2.inOut' }, '<');
  tl.to(bookGroup.position, { y: origY + 0.3, duration: 0.4, ease: 'power2.out' });
  if (model) {
    tl.to(model.rotation,     { z: 0,       duration: 0.55, ease: 'power2.inOut' });
    tl.to(bookGroup.rotation, { y: facingY, duration: 0.35, ease: 'power2.out' }, '<0.15');
  }
  meshes.forEach(m => {
    if (m.material?.emissive)
      tl.to(m.material, { emissiveIntensity: 8.0, duration: 0.55, ease: 'power2.in' }, '<');
  });
  tl.to(bookGroup.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.4, ease: 'power2.in' }, '+=0.1');
  meshes.forEach(m => {
    tl.to(m.material, { opacity: 0, duration: 0.4, ease: 'power2.in' }, '<');
  });
  tl.add(() => {
    const wp = new THREE.Vector3();
    bookGroup.getWorldPosition(wp);
    spawnBookParticles(wp);
  }, '<');
  tl.add(() => {
    openBookFn();
    bookGroup.position.y = origY;
    bookGroup.rotation.y = 0.9;
    bookGroup.rotation.x = 0;
    bookGroup.scale.set(1, 1, 1);
    if (model) model.rotation.z = origRotZ;
    meshes.forEach(m => {
      m.material.opacity = 1;
      if (m.material?.emissive)
        m.material.emissiveIntensity = m.material._origEmissiveIntensity ?? 0;
    });
    bookGroup.userData.isAnimating = false;
  }, '+=0.1');
};

// ── TV: YouTube iframe via CSS3DRenderer ──────────────────────────────────────
let currentVideoIndex = 0;

function buildTVSrc(id, autoplay = 1, startSec = 0) {
  const s = Math.max(0, Math.floor(startSec));
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay}&start=${s}&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&showinfo=0&fs=0&disablekb=1&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
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

// ── Read More DOM button (lives outside CSS3D so clicks are always reliable) ────
const tvReadMoreBtn = document.getElementById('tv-read-more');
tvReadMoreBtn?.addEventListener('click', () => {
  hideHologram();
  window.__openVideoMoreInfo?.();
});

function showHologram() {
  hologramDiv.style.opacity = '1';
  hologramDiv.style.pointerEvents = 'auto';
  // Only show Read More when zoomed to TV and video has extra content
  if (atTV && aiArtVideos[currentVideoIndex]?.moreInfo) {
    tvReadMoreBtn?.classList.remove('hidden');
  }
}

function hideHologram() {
  hologramDiv.style.opacity = '0';
  hologramDiv.style.pointerEvents = 'none';
  tvReadMoreBtn?.classList.add('hidden');
}

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
let _playStartWall = null;   // performance.now() snapshot when play began
let _playOffset    = 0;      // accumulated seconds before last pause

function approxCurrentTime() {
  if (!isPlaying || _playStartWall === null) return _playOffset;
  return _playOffset + (performance.now() - _playStartWall) / 1000;
}

function _markPlaying() {
  _playStartWall = performance.now();
  isPlaying = true;
}
function _markPaused() {
  _playOffset = approxCurrentTime();
  _playStartWall = null;
  isPlaying = false;
}

// Load new video: show info panel first, start paused so user reads
function loadVideo(index) {
  currentVideoIndex = (index + aiArtVideos.length) % aiArtVideos.length;
  _playOffset = 0;
  _playStartWall = null;
  isPlaying = false;
  tvVideoIframe.src = buildTVSrc(aiArtVideos[currentVideoIndex].id, 0); // autoplay=0
  updateHologram(aiArtVideos[currentVideoIndex]);
  showHologram();
  holoPlayPauseBtn?.userData.updateIcon('▶');
}

window.__nextVideo = () => loadVideo(currentVideoIndex + 1);
window.__prevVideo = () => loadVideo(currentVideoIndex - 1);

window.__showInfo = () => {
  showHologram();
  tvVideoIframe.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
  _markPaused();
  holoPlayPauseBtn?.userData.updateIcon('▶');
};

window.__toggleTV = () => {
  if (hologramDiv.style.opacity !== '0') {
    // Dismiss panel → start playing
    hideHologram();
    tvVideoIframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
    _markPlaying();
    holoPlayPauseBtn?.userData.updateIcon('⏸');
  } else if (isPlaying) {
    tvVideoIframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
    _markPaused();
    holoPlayPauseBtn?.userData.updateIcon('▶');
  } else {
    tvVideoIframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
    _markPlaying();
    holoPlayPauseBtn?.userData.updateIcon('⏸');
  }
};

// Clicking the TV screen overlay or hologram panel toggles play/pause
tvOverlayDiv.addEventListener('click', () => window.__toggleTV?.());
hologramDiv.addEventListener('click', () => window.__toggleTV?.());

const soundCheckbox = document.getElementById('sound-checkbox');
soundCheckbox?.addEventListener('change', () => {
  const cmd = soundCheckbox.checked ? 'unMute' : 'mute';
  tvVideoIframe.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func: cmd, args: '' }), '*');
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
  if (magActive) {
    _tvRect = getTVScreenRect();
    const t = approxCurrentTime();
    magIframe.src = buildTVSrc(aiArtVideos[currentVideoIndex].id, 1, t);
    magDiv.style.display = 'block';
    controls.unlock();
  } else {
    magDiv.style.display = 'none';
    magIframe.src = '';
    _tvRect = null;
  }
};

const clickableObjects = [pedestal, ...extras];

const ui       = createUI(camera, renderer, controls);
const _origUpdateHUD = ui.updateHUD.bind(ui);
ui.updateHUD = (id) => {
  _origUpdateHUD(id);
  if (id === 'tv') enterTVMode(); else exitTVMode();
};
const navState = createNavigationState();
const nav      = createNavigationSystem(camera, navState, ui, controls);

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

function enterTVMode() {
  atTV = true;
  suppressFPOverlay = true;
  controls.unlock();
  // Show Read More if hologram is already visible and video has extra content
  if (hologramDiv.style.opacity !== '0' && aiArtVideos[currentVideoIndex]?.moreInfo) {
    tvReadMoreBtn?.classList.remove('hidden');
  }
}

function exitTVMode() {
  atTV = false;
  tvReadMoreBtn?.classList.add('hidden');
  if (tvHovered) { clearHoverGlow(tvHovered); tvHovered = null; }
  renderer.domElement.style.cursor = '';
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
  tvCSS3D.visible        = inAI;
  tvOverlayCSS3D.visible = inAI;
  infoCss3D.visible      = inAI;
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
      applySkyMode(scene, getSkyMode());
      scene.fog = null;
    } else if (targetRoom === 'exterior') {
      camera.position.set(-20, EYE_HEIGHT, 8);
      camera.lookAt(-20, EYE_HEIGHT, 2);
      currentRoom = 'exterior';
      applySkyMode(scene, getSkyMode());
      scene.fog = null;
    } else {
      camera.position.set(0, EYE_HEIGHT, 10);
      camera.lookAt(0, EYE_HEIGHT, 0);
      currentRoom = 'ai';
      scene.background = new THREE.Color(0xf4f6f8);
      scene.fog = null;
    }
    setRoomVisibility(currentRoom);
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

  const { hotspot, action, panelId, panelTitle } = obj.userData;

  // Capture whether we're already at this hotspot before nav changes state
  const alreadyAtHotspot = hotspot && navState.current === hotspot && navState.canNavigate();

  if (hotspot) nav.goTo(hotspot);

  // UI overlay actions need the cursor back; room transitions stay locked.
  // For openBook, only unlock on the second click (when already at pedestal).
  const uiActions = new Set([
    'openPanel', 'openPoster',
    'enterRabbitHole', 'openReport', 'openFinDuMonde'
  ]);
  const opensOverlay = uiActions.has(action) || (action === 'openBook' && alreadyAtHotspot);
  if (opensOverlay) {
    suppressFPOverlay = true;
    controls.unlock();
  }

  if (action === 'openPanel')        ui.openPanelDrawer(panelId, panelTitle);
  if (action === 'openPoster')       ui.openPanelDrawer(panelId, panelTitle);
  if (action === 'openBook' && alreadyAtHotspot) {
    if (window.__openBookWithAnimation) window.__openBookWithAnimation(() => ui.openBook());
    else ui.openBook();
  }
  if (action === 'enterRabbitHole')  ui.openRabbitHole();
  if (action === 'openReport')       ui.openReport();
  if (action === 'openFinDuMonde')   ui.openFinDuMonde();
  if (action === 'enterNatureRoom')  window.__transitionToRoom('nature');
  if (action === 'returnToAIRoom')   window.__transitionToRoom('ai');
  if (action === 'enterAIRoom')      window.__transitionToRoom('ai');
  if (action === 'nextVideo')        window.__nextVideo?.();
  if (action === 'prevVideo')        window.__prevVideo?.();
  if (action === 'toggleTV')         window.__toggleTV?.();
  if (action === 'showInfo')         window.__showInfo?.();
  if (action === 'toggleMagnifier')  window.__toggleMagnifier?.();
});

document.getElementById('reset-btn').addEventListener('click', () => {
  exitTVMode();
  fpOverlay.classList.remove('hidden');
  crosshair.classList.add('hidden');
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
