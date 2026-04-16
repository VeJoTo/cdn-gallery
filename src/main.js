import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { sciFiVideos } from './videoData.js';
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
  cssRenderer.render(cssScene, camera);
}

createRoom(scene);
const { arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate, extras, tv, globe, musicNotes } = createObjects(scene);
addUpdateCallback(sceneUpdate);


// ── TV YouTube iframe as a real 3D object via CSS3DRenderer ──
let currentVideoIndex = 0;

function buildTVSrc(id, autoplay = 1) {
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay}&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
}

// ── TV wrapper: iframe + scanline overlay ──
const tvWrapper = document.createElement('div');
tvWrapper.style.cssText = `
  position: relative;
  width: 1280px;
  height: 720px;
  border-radius: 40px;
  overflow: hidden;
`;

const tvVideoIframe = document.createElement('iframe');
tvVideoIframe.src = buildTVSrc(sciFiVideos[currentVideoIndex].id, 0);
tvVideoIframe.allow = 'autoplay; encrypted-media; picture-in-picture';
tvVideoIframe.style.cssText = `
  width: 1280px;
  height: 720px;
  border: none;
  display: block;
`;

// Scanline overlay — CSS gradient stripes + subtle vignette
const tvScanlines = document.createElement('div');
tvScanlines.style.cssText = `
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 40px;
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 3px,
      rgba(0, 0, 0, 0.10) 3px,
      rgba(0, 0, 0, 0.10) 4px
    ),
    radial-gradient(
      ellipse at center,
      transparent 60%,
      rgba(0, 0, 0, 0.35) 100%
    );
  mix-blend-mode: multiply;
`;

tvWrapper.appendChild(tvVideoIframe);
tvWrapper.appendChild(tvScanlines);

const tvCSS3D = new CSS3DObject(tvWrapper);
const tvScale = 1.92 / 1280;
tvCSS3D.scale.set(tvScale, tvScale, tvScale);
cssScene.add(tvCSS3D);

// ── Hologram info-panel (CSS3DObject) – må initialiserast FØR applyTVState() ──
const hologramDiv = document.createElement('div');
hologramDiv.style.cssText = `
  width: 500px;
  max-height: 310px;
  overflow: hidden;
  padding: 22px 28px;
  box-sizing: border-box;
  background: rgba(2, 0, 14, 0.88);
  border: 1px solid rgba(106, 13, 170, 0.7);
  border-top: 2px solid rgba(0, 212, 255, 0.9);
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  line-height: 1.55;
  pointer-events: none;
  text-shadow: 0 0 10px #6a0daa, 0 0 20px #6a0daa;
  box-shadow: 0 0 32px rgba(106, 13, 170, 0.35), inset 0 0 28px rgba(0, 0, 20, 0.7);
`;

function updateHologram(video) {
  hologramDiv.innerHTML = `
    <div style="color:#b833ff;font-size:9px;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;text-shadow:0 0 10px #b833ff,0 0 20px #b833ff">
      ◈ &nbsp;NOW PLAYING &nbsp;◈
    </div>
    <div style="font-size:15px;font-weight:bold;color:#ffffff;margin-bottom:12px;line-height:1.35;text-shadow:0 0 10px #6a0daa,0 0 20px #6a0daa">
      ${video.title}
    </div>
    ${video.description
      ? `<div style="font-size:11px;font-weight:normal;color:rgba(0,212,255,0.8);border-top:1px solid rgba(106,13,170,0.4);padding-top:10px;line-height:1.5;text-shadow:0 0 8px rgba(0,212,255,0.6);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
           ${video.description}
         </div>`
      : ''}
    <div style="margin-top:14px;font-size:9px;color:rgba(106,13,170,0.9);letter-spacing:3px;display:flex;justify-content:space-between;text-shadow:0 0 8px #6a0daa">
      <span>CDN &nbsp;/&nbsp; SCI-FI ARCHIVE</span>
      <span>${currentVideoIndex + 1}&nbsp;/&nbsp;${sciFiVideos.length}</span>
    </div>
  `;
}

const infoCss3D = new CSS3DObject(hologramDiv);
infoCss3D.scale.setScalar(1.5 / 500);
cssScene.add(infoCss3D);

document.getElementById('panel-drawer')?.style.setProperty('display', 'none', 'important');

const infoPanel3D = tv.getObjectByName('infoPanel');

function setHologramVisible(visible) {
  if (!hologramDiv) return;
  hologramDiv.style.opacity = visible ? '1' : '0';
  infoCss3D.visible = visible;
  if (infoPanel3D) infoPanel3D.visible = visible;
}

// ── TV state ──
let tvPlaying = false;
const pauseIcon  = tv.getObjectByName('pauseIcon');
const playIcon   = tv.getObjectByName('playIcon');
const infoIcon3D = tv.getObjectByName('infoIcon');

function applyTVState() {
  if (!hologramDiv) return;
  const playing = tvPlaying;
  tvVideoIframe.contentWindow?.postMessage(
    `{"event":"command","func":"${playing ? 'playVideo' : 'pauseVideo'}","args":""}`, '*'
  );
  tv.userData.screenMesh.material.color.set(playing ? 0x000000 : 0x222222);
  if (pauseIcon)  pauseIcon.visible  = playing;
  if (playIcon)   playIcon.visible   = !playing;
  if (infoIcon3D) infoIcon3D.visible = playing;
  setHologramVisible(!playing);
}

updateHologram(sciFiVideos[currentVideoIndex]);
applyTVState();

window.__toggleTV = () => { tvPlaying = !tvPlaying; applyTVState(); };
window.__showInfo = () => { tvPlaying = false; applyTVState(); };

const _cssPos = new THREE.Vector3();
const _cssQuat = new THREE.Quaternion();
const screenMesh = tv.userData.screenMesh;

let hologramTime = 0;
addUpdateCallback((delta) => {
  hologramTime += delta;

  // Sync iframe to screenMesh world position/rotation (y=0.1 offset is baked into screenMesh)
  screenMesh.getWorldPosition(_cssPos);
  screenMesh.getWorldQuaternion(_cssQuat);
  tvCSS3D.position.copy(_cssPos);
  tvCSS3D.quaternion.copy(_cssQuat);

  // Sync hologram panel with gentle float
  if (infoPanel3D) {
    infoPanel3D.getWorldPosition(_cssPos);
    infoPanel3D.getWorldQuaternion(_cssQuat);
    infoCss3D.position.copy(_cssPos);
    infoCss3D.position.y += Math.sin(hologramTime * 0.25) * 0.015;
    infoCss3D.quaternion.copy(_cssQuat);
  }

  // Hologram panel text flicker
  if (infoCss3D.visible && Math.random() < 0.02)
    hologramDiv.style.opacity = (0.88 + Math.random() * 0.12).toFixed(2);

});

function loadVideo(index) {
  currentVideoIndex = (index + sciFiVideos.length) % sciFiVideos.length;
  tvVideoIframe.src = buildTVSrc(sciFiVideos[currentVideoIndex].id, 1);
  tvPlaying = true;
  updateHologram(sciFiVideos[currentVideoIndex]);
  applyTVState();
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
