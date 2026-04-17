import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { aiArtVideos } from './videoData.js';
import { createRoom } from './scene/room.js';
import { createObjects } from './scene/objects.js';
import { createNatureRoom } from './scene/nature-room.js';
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
scene.background = new THREE.Color(0x0a0f1a);
scene.fog = new THREE.FogExp2(0x0a0f1a, 0.04);

// ── Camera ────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.6, 2);
camera.lookAt(0, 1.6, 0);

// ── Resize ────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
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
    const roomX0 = currentRoom === 'nature' ? 20 : 0;
    camera.position.x = Math.max(roomX0 - 3.0, Math.min(roomX0 + 3.0, camera.position.x));
    camera.position.z = Math.max(-2.5, Math.min(2.5, camera.position.z));
    controls.target.x = Math.max(roomX0 - 3.0, Math.min(roomX0 + 3.0, controls.target.x));
    controls.target.z = Math.max(-2.5, Math.min(2.5, controls.target.z));
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

    const roomX1 = currentRoom === 'nature' ? 20 : 0;
    camera.position.x = Math.max(roomX1 - 3.0, Math.min(roomX1 + 3.0, camera.position.x));
    camera.position.z = Math.max(-2.5, Math.min(2.5, camera.position.z));
    controls.target.x = Math.max(roomX1 - 3.0, Math.min(roomX1 + 3.0, controls.target.x));
    controls.target.z = Math.max(-2.5, Math.min(2.5, controls.target.z));
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

  // Only show CSS3D iframes when camera is close to the screens and facing them
  // TV is at (3.419, 2.85, 0), monitor at ~(2.35, 1.22, -2.9)
  const camPos = camera.position;
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);

  // Show CSS3D in AI room, hide in nature room
  // Only hide when camera is clearly facing AWAY from the screens (left wall / back toward arcades)
  const facingAway = camDir.x < -0.5; // facing left wall (away from TV + desk)
  const showCSS3D = currentRoom === 'ai' && !facingAway;

  cssRenderer.domElement.style.display = showCSS3D ? '' : 'none';
  if (showCSS3D) cssRenderer.render(cssScene, camera);
}

createRoom(scene);
const { arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate, extras, tv, globe, musicNotes } = createObjects(scene);
addUpdateCallback(sceneUpdate);

// ── TV YouTube iframe as a real 3D object via CSS3DRenderer ──
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
tvVideoIframe.style.overflow = 'hidden';

const tvCSS3D = new CSS3DObject(tvVideoIframe);
// Screen mesh in buildTV is at local (0, 0, 0.071) inside the TV group.
// TV group is at (3.49, 2.45, 0) with rotation.y = -Math.PI/2.
// Local +Z maps to world -X after that rotation.
// Place iframe inside the bezel (local z=0.04 → world x=3.45)
tvCSS3D.position.set(3.45, 2.45, 0);
// Face world -X: starting orientation (+Z facing) rotated by +π/2 about Y.
tvCSS3D.rotation.y = -Math.PI / 2;
// Iframe CSS size is 1280 × 720 px; target world size is 1.92 × 1.08 units.
// Uniform scale = 1.92 / 1280 = 0.0015
const tvScale = 1.92 / 1280;
tvCSS3D.scale.set(tvScale, tvScale, tvScale);
cssScene.add(tvCSS3D);

// ── TV click overlay — sits just in front of the iframe, catches clicks and hides YouTube's play button ──
const tvOverlayDiv = document.createElement('div');
tvOverlayDiv.style.cssText = `
  width: 1280px;
  height: 720px;
  border-radius: 23px;
  cursor: pointer;
  pointer-events: auto;
  background: transparent;
  transition: background 0.3s ease;
`;
const tvOverlayCSS3D = new CSS3DObject(tvOverlayDiv);
tvOverlayCSS3D.position.set(3.44, 2.45, 0); // just in front of iframe at 3.45
tvOverlayCSS3D.rotation.y = -Math.PI / 2;
tvOverlayCSS3D.scale.set(tvScale, tvScale, tvScale);
cssScene.add(tvOverlayCSS3D);

function updateTVOverlay() {
  // Always nearly transparent — just painted enough to catch pointer events
  tvOverlayDiv.style.background = 'rgba(0,0,0,0.001)';
}

// ── Hologram info-panel (CSS3DObject) — same dimensions as video (1280×720) ──
const hologramDiv = document.createElement('div');
hologramDiv.style.cssText = `
  width: 1280px;
  height: 720px;
  box-sizing: border-box;
  background: linear-gradient(160deg, rgba(2,0,28,0.94) 0%, rgba(10,0,40,0.90) 100%);
  border: 1px solid rgba(255,255,255,0.35);
  border-top: 2px solid rgba(0,212,255,0.9);
  border-bottom: 2px solid rgba(255,255,255,0.5);
  border-radius: 23px;
  box-shadow: inset 0 0 80px rgba(255,255,255,0.06), inset 0 0 160px rgba(0,212,255,0.06);
  font-family: 'Courier New', monospace;
  color: #fff;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 80px 100px;
  backdrop-filter: blur(2px);
`;

function updateHologram(video) {
  hologramDiv.innerHTML = `
    <div style="color:#ffffff;font-size:22px;letter-spacing:6px;text-transform:uppercase;margin-bottom:32px;text-shadow:0 0 10px #ffffff,0 0 20px rgba(255,255,255,0.6)">
      ◈ &nbsp;NOW PLAYING &nbsp;◈
    </div>
    <div style="font-size:42px;font-weight:bold;color:#ffffff;margin-bottom:16px;line-height:1.25;text-shadow:0 0 20px rgba(255,255,255,0.5),0 0 40px rgba(255,255,255,0.3)">
      ${video.title}
    </div>
    <div style="font-size:28px;color:rgba(168,216,234,0.85);margin-bottom:28px">${video.artist}</div>
    ${video.description
      ? `<div style="font-size:22px;color:rgba(0,212,255,0.85);border-top:1px solid rgba(255,255,255,0.2);padding-top:28px;line-height:1.6;text-shadow:0 0 8px rgba(0,212,255,0.5);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
           ${video.description}
         </div>`
      : ''}
    <div style="margin-top:48px;font-size:18px;color:rgba(255,255,255,0.7);letter-spacing:4px;display:flex;justify-content:space-between;text-shadow:0 0 8px rgba(255,255,255,0.5)">
      <span>CDN &nbsp;/&nbsp; AIART ARCHIVE</span>
      <span>${currentVideoIndex + 1}&nbsp;/&nbsp;${aiArtVideos.length}</span>
    </div>
  `;
}

const infoCss3D = new CSS3DObject(hologramDiv);
// Same position and scale as the video — placed just in front of it (local z=0.07 → world x=3.42)
infoCss3D.position.set(3.3, 2.45, 0);
infoCss3D.rotation.y = -Math.PI / 2;
infoCss3D.scale.setScalar(1.6 / 1280);
cssScene.add(infoCss3D);

// Hologram starts hidden; fades in/out via opacity
hologramDiv.style.opacity = '0';
hologramDiv.style.pointerEvents = 'none';
hologramDiv.style.transition = 'opacity 0.4s ease';
let _hologramVisible = false;

window.__setHologramVisible = (show) => {
  _hologramVisible = show;
  hologramDiv.style.opacity = show ? '1' : '0';
  hologramDiv.style.pointerEvents = show ? 'auto' : 'none';
  // Pause video while info panel is visible
  if (show && isPlaying) {
    tvVideoIframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
    isPlaying = false; _onPause();
    if (tvPlayPauseBtn) tvPlayPauseBtn.textContent = '▶';
  }
  // Show info icon only when panel is hidden
  const infoBtn = document.getElementById('tv-info');
  if (infoBtn) infoBtn.classList.toggle('hidden', show);
  updateTVOverlay?.();
};

window.__isHologramVisible = () => _hologramVisible;

updateHologram(aiArtVideos[currentVideoIndex]);
hologramDiv.addEventListener('click', () => tvPlayPauseBtn?.click());

let isPlaying = false;
let _videoPlayStart = null;   // Date.now() when play began
let _videoAccSecs   = 0;      // seconds accumulated before last pause

function getVideoTimeSec() {
  return _videoAccSecs + (_videoPlayStart ? (Date.now() - _videoPlayStart) / 1000 : 0);
}

function _onPlay()  { _videoPlayStart = Date.now(); }
function _onPause() { if (_videoPlayStart) { _videoAccSecs += (Date.now() - _videoPlayStart) / 1000; _videoPlayStart = null; } }

function loadVideo(index) {
  currentVideoIndex = (index + aiArtVideos.length) % aiArtVideos.length;
  _videoAccSecs = 0; _videoPlayStart = null;
  // Load paused — user must press play to start
  tvVideoIframe.src = buildTVSrc(aiArtVideos[currentVideoIndex].id, 0);
  isPlaying = false;
  if (tvPlayPauseBtn) tvPlayPauseBtn.textContent = '▶';
  updateHologram(aiArtVideos[currentVideoIndex]);
  // Force hologram visible (reset even if already showing)
  _hologramVisible = false;
  window.__setHologramVisible(true);
}

window.__nextVideo = () => loadVideo(currentVideoIndex + 1);
window.__prevVideo = () => loadVideo(currentVideoIndex - 1);

// ── Right monitor: Fin du Monde interactive project via CSS3DRenderer ──
const fdmIframe = document.createElement('iframe');
fdmIframe.src = 'https://collection.cdn.uib.no/files/fin-du-monde/index.html';
fdmIframe.style.width = '640px';
fdmIframe.style.height = '370px';
fdmIframe.style.border = '0';

const fdmCSS3D = new CSS3DObject(fdmIframe);
// Right monitor screen world position: desk(1.8, 0, -2.6) + local(0.513, 1.18, -0.158)
fdmCSS3D.position.set(2.348, 1.22, -2.905);
fdmCSS3D.rotation.y = -0.15;
// Screen is 0.66 × 0.38 world units; iframe is 640 × 370 px — scale to fit height
const fdmScale = 0.38 / 370;
fdmCSS3D.scale.set(fdmScale, fdmScale, fdmScale);
cssScene.add(fdmCSS3D);

const clickableObjects = [
  ...arcadeLeft.children, ...arcadeRight.children,
  desk, ...posters,
  pedestal,
  ...extras
];

const ui       = createUI(camera, renderer, controls);
const navState = createNavigationState();
const nav      = createNavigationSystem(camera, navState, ui, controls);

// TV sound toggle — always visible in first-person mode
const soundCheckbox = document.getElementById('sound-checkbox');
const soundToggleDiv = document.getElementById('sound-toggle');
soundToggleDiv.style.display = 'flex';

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
        drop.position.x = 20 + Math.cos(drop.userData.angle) * 0.2;
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
      camera.position.set(20, 1.6, -3);
      controls.target.set(20, 1.6, 0);
      currentRoom = 'nature';
      cssRenderer.domElement.style.display = 'none';
    } else {
      camera.position.set(0, 1.6, 2);
      controls.target.set(0, 1.6, 0);
      currentRoom = 'ai';
      cssRenderer.domElement.style.display = '';
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
  camera.position.set(0, 1.6, 2);
  controls.target.set(0, 1.6, 0);
  controls.update();
  document.getElementById('stepback-btn').classList.add('hidden');
});

// Step back from zoom-in
const stepbackBtn = document.getElementById('stepback-btn');
stepbackBtn.addEventListener('click', () => {
  nav.goBack();
  stepbackBtn.classList.add('hidden');
  tvControls.classList.add('hidden');
  tvMagBtn.classList.add('hidden');
  magnifierActive = false;
  if (_magSyncInterval) { clearInterval(_magSyncInterval); _magSyncInterval = null; }
  magDiv.style.display = 'none';
  magIframe.src = '';
  tvMagBtn.style.color = '';
  window.__setHologramVisible(false);
  // Close any open panel drawer
  const drawer = document.getElementById('panel-drawer');
  drawer.classList.remove('open');
  setTimeout(() => drawer.classList.add('hidden'), 350);
});

// TV controls
const tvControls      = document.getElementById('tv-controls');
const tvPlayPauseBtn  = document.getElementById('tv-playpause');
const tvPrevBtn       = document.getElementById('tv-prev');
const tvNextBtn       = document.getElementById('tv-next');
const tvInfoBtn       = document.getElementById('tv-info');

tvPlayPauseBtn.addEventListener('click', () => {
  if (window.__isHologramVisible()) {
    window.__setHologramVisible(false);
    tvVideoIframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
    isPlaying = true; _onPlay();
    tvPlayPauseBtn.textContent = '▮▮';
  } else if (isPlaying) {
    tvVideoIframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
    isPlaying = false; _onPause();
    tvPlayPauseBtn.textContent = '▶';
  } else {
    tvVideoIframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
    isPlaying = true; _onPlay();
    tvPlayPauseBtn.textContent = '▮▮';
  }
  updateTVOverlay();
});
tvPrevBtn.addEventListener('click', () => loadVideo(currentVideoIndex - 1));
tvNextBtn.addEventListener('click', () => loadVideo(currentVideoIndex + 1));
tvOverlayDiv.addEventListener('click', () => tvPlayPauseBtn.click());

tvInfoBtn.addEventListener('click', () => {
  if (isPlaying) {
    tvVideoIframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
    isPlaying = false;
    tvPlayPauseBtn.textContent = '▶';
  }
  window.__setHologramVisible(true);
});

// ── TV Magnifier ─────────────────────────────────────────────────────────────
const MAG_SIZE = 180;
const MAG_SCALE = 1.8;
let magnifierActive = false;

const magDiv = document.createElement('div');
magDiv.style.cssText = `
  position: fixed;
  width: ${MAG_SIZE}px;
  height: ${MAG_SIZE}px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(0,170,255,0.9);
  box-shadow: 0 0 15px rgba(0,170,255,0.5), 0 0 30px rgba(0,170,255,0.2);
  display: none;
  pointer-events: none;
  z-index: 200;
`;
const magIframe = document.createElement('iframe');
magIframe.style.cssText = `
  position: absolute;
  left: 0; top: 0;
  width: 1280px; height: 720px;
  border: 0;
  transform-origin: 0 0;
  pointer-events: none;
`;
magIframe.allow = 'autoplay; encrypted-media';
magDiv.appendChild(magIframe);
document.body.appendChild(magDiv);

function getVideoScreenRect() {
  // Video world position: center (3.45, 2.45, 0), half-width 0.96 along Z, half-height 0.54 along Y
  const pts = [
    new THREE.Vector3(3.45, 2.99,  0.96),
    new THREE.Vector3(3.45, 2.99, -0.96),
    new THREE.Vector3(3.45, 1.91,  0.96),
    new THREE.Vector3(3.45, 1.91, -0.96),
  ].map(p => {
    const v = p.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth,
             y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  });
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  return { left: Math.min(...xs), top: Math.min(...ys),
           width: Math.max(...xs) - Math.min(...xs),
           height: Math.max(...ys) - Math.min(...ys) };
}

function moveMagnifier(clientX, clientY) {
  const r = getVideoScreenRect();
  const fx = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  const fy = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
  // Translate so that point (fx*1280, fy*720) is centred in the lens
  const tx = fx * 1280 - MAG_SIZE / (2 * MAG_SCALE);
  const ty = fy * 720  - MAG_SIZE / (2 * MAG_SCALE);
  magIframe.style.transform = `scale(${MAG_SCALE}) translate(${-tx}px, ${-ty}px)`;
  magDiv.style.left = (clientX - MAG_SIZE / 2) + 'px';
  magDiv.style.top  = (clientY - MAG_SIZE / 2) + 'px';
}

document.addEventListener('mousemove', e => {
  if (magnifierActive) moveMagnifier(e.clientX, e.clientY);
});

let _magSyncInterval = null;

function _startMagSync() {
  if (_magSyncInterval) clearInterval(_magSyncInterval);
  _magSyncInterval = setInterval(() => {
    if (!magnifierActive) { clearInterval(_magSyncInterval); _magSyncInterval = null; return; }
    const seek = Math.floor(getVideoTimeSec());
    magIframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [seek, true] }), '*');
  }, 1000);
}

const tvMagBtn = document.getElementById('tv-mag-btn');
tvMagBtn.addEventListener('click', () => {
  magnifierActive = !magnifierActive;
  if (magnifierActive) {
    const t = Math.floor(getVideoTimeSec());
    magIframe.src = buildTVSrc(aiArtVideos[currentVideoIndex].id, 1) + `&start=${t}`;
    magDiv.style.display = 'block';
    tvMagBtn.style.color = '#00aaff';
    // After iframe loads, do an initial seek then start continuous sync
    magIframe.onload = () => {
      const seek = Math.floor(getVideoTimeSec());
      magIframe.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seek, true] }), '*');
      _startMagSync();
    };
  } else {
    if (_magSyncInterval) { clearInterval(_magSyncInterval); _magSyncInterval = null; }
    magDiv.style.display = 'none';
    magIframe.src = '';
    magIframe.onload = null;
    tvMagBtn.style.color = '';
  }
});

// Show step-back button when zooming into a hotspot
const _origGoTo = nav.goTo;
nav.goTo = (id) => {
  _origGoTo(id);
  stepbackBtn.classList.remove('hidden');
  if (id === 'tv') {
    tvControls.classList.remove('hidden');
    tvMagBtn.classList.remove('hidden');
    window.__setHologramVisible(true);
  } else {
    tvControls.classList.add('hidden');
    tvMagBtn.classList.add('hidden');
    magnifierActive = false;
    if (_magSyncInterval) { clearInterval(_magSyncInterval); _magSyncInterval = null; }
    magDiv.style.display = 'none';
    magIframe.src = '';
    tvMagBtn.style.color = '';
    window.__setHologramVisible(false);
  }
};

document.getElementById('guide-btn').addEventListener('click', () => ui.openGatekeeperChat());
document.getElementById('inventory-btn').addEventListener('click', () => ui.openInventory());

soundCheckbox.addEventListener('change', () => {
  const cmd = soundCheckbox.checked ? 'unMute' : 'mute';
  tvVideoIframe.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func: cmd, args: '' }),
    '*'
  );
  // Pause music when video sound is turned on
  if (soundCheckbox.checked && musicPlaying) {
    musicCheckbox.checked = false;
    musicPlaying = false;
    sendMusicCommand('pauseVideo');
    musicNotes.setActive(false);
  }
});

// ── Radio: Music / Podcast modes ──
const musicCheckbox = document.getElementById('music-checkbox');
const trackButtons = document.querySelectorAll('.radio-track');
const modeTabs = document.querySelectorAll('.radio-mode');
const musicControls = document.getElementById('radio-music-controls');
const podcastControls = document.getElementById('radio-podcast-controls');
const podcastToggle = document.getElementById('podcast-toggle');
const spotifyPlayer = document.getElementById('spotify-player');
const spotifyClose = document.getElementById('spotify-close');
let musicPlaying = false;
let currentMode = 'music';

const RADIO_TRACKS = [
  `https://www.youtube.com/embed/mRN_T6JkH-c?list=PLwJjxqYuirCLkq42mGw4XKGQlpZSfxsYd&autoplay=0&loop=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
  `https://www.youtube.com/embed/TQvXEza4fPc?autoplay=0&loop=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
  `https://www.youtube.com/embed/K4Ad2MXKLv8?autoplay=0&loop=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
];
let currentTrack = 0;

const musicIframe = document.createElement('iframe');
musicIframe.allow = 'autoplay; encrypted-media';
musicIframe.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px';
musicIframe.src = RADIO_TRACKS[currentTrack];
document.body.appendChild(musicIframe);

function sendMusicCommand(cmd) {
  try {
    musicIframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: cmd, args: '' }),
      '*'
    );
  } catch (e) { /* ignore */ }
}

// Mode switching
modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    if (mode === currentMode) return;
    currentMode = mode;
    modeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    if (mode === 'music') {
      musicControls.classList.remove('hidden');
      podcastControls.classList.add('hidden');
      spotifyPlayer.classList.add('hidden');
    } else {
      musicControls.classList.add('hidden');
      podcastControls.classList.remove('hidden');
      // Pause YouTube music when switching to podcast
      if (musicPlaying) {
        musicCheckbox.checked = false;
        musicPlaying = false;
        sendMusicCommand('pauseVideo');
        musicNotes.setActive(false);
      }
    }
  });
});

// Music controls
musicCheckbox.addEventListener('change', () => {
  musicPlaying = musicCheckbox.checked;
  sendMusicCommand(musicPlaying ? 'playVideo' : 'pauseVideo');
  musicNotes.setActive(musicPlaying);
});

trackButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const idx = parseInt(btn.dataset.track);
    if (idx === currentTrack) return;
    currentTrack = idx;
    trackButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const autoplay = musicPlaying ? '1' : '0';
    musicIframe.src = RADIO_TRACKS[currentTrack].replace('autoplay=0', `autoplay=${autoplay}`);
  });
});

// Podcast controls
let podcastOpen = false;
podcastToggle.addEventListener('click', () => {
  podcastOpen = !podcastOpen;
  if (podcastOpen) {
    // Reload iframe with autoplay to start playing immediately
    const iframe = document.getElementById('spotify-iframe');
    if (iframe) iframe.src = 'https://open.spotify.com/embed/episode/629iwUQqeciMedvx9oseyf?theme=0&autoplay=1';
    spotifyPlayer.classList.remove('hidden');
    podcastToggle.textContent = '⏸ Playing';
    // Pause music if playing
    if (musicPlaying) {
      musicCheckbox.checked = false;
      musicPlaying = false;
      sendMusicCommand('pauseVideo');
      musicNotes.setActive(false);
    }
  } else {
    stopPodcast();
  }
});

function stopPodcast() {
  // Reload iframe src to kill playback
  const iframe = document.getElementById('spotify-iframe');
  if (iframe) { const src = iframe.src; iframe.src = ''; iframe.src = src; }
  spotifyPlayer.classList.add('hidden');
  podcastOpen = false;
  podcastToggle.textContent = '▶ Play';
}

spotifyClose.addEventListener('click', stopPodcast);

addUpdateCallback(() => ui.updateHints());

animate();

// Show info panel for the first video on startup
loadVideo(0);
