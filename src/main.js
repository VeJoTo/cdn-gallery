import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
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
scene.background = new THREE.Color(0x0a0f1a);
scene.fog = new THREE.FogExp2(0x0a0f1a, 0.04);

// ── Camera ────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.6, 2.5);
camera.lookAt(0, 1.6, 0);

// ── Resize ────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ── First-person controls ──
export const controls = new PointerLockControls(camera, document.body);

const fpOverlay = document.getElementById('fp-overlay');
const crosshair = document.getElementById('crosshair');

// Lock pointer on any click on the page
document.addEventListener('click', (e) => {
  // Don't lock if clicking UI buttons (they have their own handlers)
  if (e.target.closest('button, input, label, a, #radio-widget, #gatekeeper-chat, #inventory-overlay, #book-overlay, #rabbit-hole-overlay, #report-overlay, #spotify-player, #guide-dialog')) return;
  if (!controls.isLocked) {
    controls.lock();
  }
});

let hasEnteredOnce = false;
controls.addEventListener('lock', () => {
  hasEnteredOnce = true;
  fpOverlay.classList.add('hidden');
  crosshair.classList.remove('hidden');
  // Close any open panels/overlays when entering first-person
  const drawer = document.getElementById('panel-drawer');
  if (drawer) { drawer.classList.remove('open'); drawer.classList.add('hidden'); }
  const sb = document.getElementById('stepback-btn');
  if (sb) sb.classList.add('hidden');
});
controls.addEventListener('unlock', () => {
  // Only show the intro overlay on the very first visit
  if (!hasEnteredOnce) fpOverlay.classList.remove('hidden');
  crosshair.classList.add('hidden');
});

// WASD movement
const moveState = { forward: false, backward: false, left: false, right: false, sprint: false };
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const MOVE_SPEED = 10.0;

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    moveState.forward = true; break;
    case 'KeyS': case 'ArrowDown':  moveState.backward = true; break;
    case 'KeyA': case 'ArrowLeft':  moveState.left = true; break;
    case 'KeyD': case 'ArrowRight': moveState.right = true; break;
    case 'ShiftLeft': case 'ShiftRight': moveState.sprint = true; break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    moveState.forward = false; break;
    case 'KeyS': case 'ArrowDown':  moveState.backward = false; break;
    case 'KeyA': case 'ArrowLeft':  moveState.left = false; break;
    case 'KeyD': case 'ArrowRight': moveState.right = false; break;
    case 'ShiftLeft': case 'ShiftRight': moveState.sprint = false; break;
  }
});

// Room boundaries (keep player inside)
const ROOM_BOUNDS = { minX: -3.2, maxX: 3.2, minZ: -2.7, maxZ: 2.7 };
const EYE_HEIGHT = 1.6;

function updateMovement(delta) {
  if (!controls.isLocked) return;

  // Damping
  velocity.x -= velocity.x * 8.0 * delta;
  velocity.z -= velocity.z * 8.0 * delta;

  direction.z = Number(moveState.forward) - Number(moveState.backward);
  direction.x = Number(moveState.right) - Number(moveState.left);
  direction.normalize();

  const speed = moveState.sprint ? MOVE_SPEED * 1.8 : MOVE_SPEED;

  if (moveState.forward || moveState.backward) velocity.z -= direction.z * speed * delta;
  if (moveState.left || moveState.right) velocity.x -= direction.x * speed * delta;

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  // Clamp to room bounds
  camera.position.x = Math.max(ROOM_BOUNDS.minX, Math.min(ROOM_BOUNDS.maxX, camera.position.x));
  camera.position.z = Math.max(ROOM_BOUNDS.minZ, Math.min(ROOM_BOUNDS.maxZ, camera.position.z));
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
  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
}

createRoom(scene);
const { arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate, extras, tv, globe, musicNotes } = createObjects(scene);
addUpdateCallback(sceneUpdate);

// ── TV YouTube iframe as a real 3D object via CSS3DRenderer ──
const tvVideoIframe = document.createElement('iframe');
tvVideoIframe.src = `https://www.youtube.com/embed/BdGOuNQ_0B8?autoplay=1&mute=1&loop=1&playlist=BdGOuNQ_0B8&controls=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
tvVideoIframe.allow = 'autoplay; encrypted-media; picture-in-picture';
tvVideoIframe.style.width = '1280px';
tvVideoIframe.style.height = '720px';

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

setupClickHandler(renderer, camera, clickableObjects, nav, ui, navState);

// Pointer cursor on hover over clickable objects
const hoverRaycaster = new THREE.Raycaster();
const hoverMouse     = new THREE.Vector2();

// Hover highlight: glow objects the crosshair points at
let lastHovered = null;
let lastHoveredIntensity = null;
const hoverLabel = document.getElementById('hover-label');

function updateHoverHighlight() {
  if (!controls.isLocked) {
    if (hoverLabel) hoverLabel.classList.add('hidden');
    return;
  }

  hoverMouse.x = 0;
  hoverMouse.y = 0;

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
  camera.position.set(0, 1.6, 2.5);
  camera.lookAt(0, 1.6, 0);
  if (controls.isLocked) controls.unlock();
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
