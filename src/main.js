import * as THREE from 'three';
import { createFirstPersonController } from './controls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { createRoom } from './scene/room.js';
import { createObjects } from './scene/objects.js';
import { createNatureRoom } from './scene/nature-room.js';
import { createExteriorRoom } from './scene/exterior-room.js';
import { setupClickHandler } from './navigation.js';
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

// ── CSS3D renderer (for the TV's YouTube iframe) ──
export const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.id = 'css3d-layer';
document.body.appendChild(cssRenderer.domElement);

export const cssScene = new THREE.Scene();

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
camera.position.set(0, 0, 0);

// ── Resize ────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  if (window.__godraysComposer) window.__godraysComposer.setSize(window.innerWidth, window.innerHeight);
});

// ── First-person controller ──
const controller = createFirstPersonController({ canvas, camera });
scene.add(controller.player);

// Spawn in exterior, facing inward
controller.setPose({ position: new THREE.Vector3(-20, 0, 8), yaw: 0, pitch: 0 });

// Show crosshair and overlay
const fpOverlay = document.getElementById('fp-overlay');
const crosshair = document.getElementById('crosshair');
if (fpOverlay) fpOverlay.classList.remove('hidden');
if (crosshair) crosshair.classList.remove('hidden');

// Clicking the overlay or canvas locks the pointer
if (fpOverlay) fpOverlay.addEventListener('click', () => controller.lock());

// Left mouse held down = glide forward (like cdn-3d-room-collab)
canvas.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  if (!controller.isLocked()) {
    controller.lock();
    return;
  }
  controller.setPointerForward(true);
});

window.addEventListener('mouseup', () => controller.setPointerForward(false));
window.addEventListener('blur', () => controller.setPointerForward(false));

// Hide overlay when locked, show it again when unlocked
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    if (fpOverlay) fpOverlay.classList.add('hidden');
  } else {
    controller.setPointerForward(false);
    if (fpOverlay) fpOverlay.classList.remove('hidden');
  }
});

// ── Room bounds helper ──
function currentBounds() {
  if (currentRoom === 'nature')   return { minX: 17,  maxX: 23,  minZ: -2.5, maxZ: 2.5 };
  if (currentRoom === 'exterior') return { minX: -25, maxX: -15, minZ: 0.5,  maxZ: 10  };
  return                                 { minX: -3,  maxX: 3,   minZ: -2.5, maxZ: 2.5 };
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
  controller.update(delta, currentBounds());
  updateHoverHighlight();
  if (currentRoom === 'exterior') {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }

  // Show CSS3D only in AI room when not facing away from screens
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const facingAway = camDir.x < -0.5;
  const showCSS3D = currentRoom === 'ai' && !facingAway;

  cssRenderer.domElement.style.display = showCSS3D ? '' : 'none';
  if (showCSS3D) cssRenderer.render(cssScene, camera);
}

// Track AI room objects for visibility toggling
const aiRoomChildrenBefore = scene.children.length;
createRoom(scene);
const { arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate, extras, tv, globe, musicNotes } = createObjects(scene);
const aiRoomChildren = scene.children.slice(aiRoomChildrenBefore);

// Start with AI room hidden (player spawns in exterior)
for (const child of aiRoomChildren) child.visible = false;
addUpdateCallback(sceneUpdate);

// ── TV YouTube iframe as a real 3D object via CSS3DRenderer ──
const tvVideoIframe = document.createElement('iframe');
tvVideoIframe.src = `https://www.youtube.com/embed/BdGOuNQ_0B8?autoplay=1&mute=1&loop=1&playlist=BdGOuNQ_0B8&controls=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
tvVideoIframe.allow = 'autoplay; encrypted-media; picture-in-picture';
tvVideoIframe.style.width = '1280px';
tvVideoIframe.style.height = '720px';

const tvCSS3D = new CSS3DObject(tvVideoIframe);
tvCSS3D.position.set(3.419, 2.85, 0);
tvCSS3D.rotation.y = -Math.PI / 2;
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
fdmCSS3D.position.set(2.348, 1.22, -2.905);
fdmCSS3D.rotation.y = -0.15;
const fdmScale = 0.38 / 370;
fdmCSS3D.scale.set(fdmScale, fdmScale, fdmScale);
cssScene.add(fdmCSS3D);

const clickableObjects = [
  ...arcadeLeft.children, ...arcadeRight.children,
  desk, ...posters,
  pedestal,
  ...extras
];

const ui = createUI(camera, renderer, null);

// TV sound toggle — always visible in first-person mode
const soundCheckbox = document.getElementById('sound-checkbox');
const soundToggleDiv = document.getElementById('sound-toggle');
soundToggleDiv.style.display = 'flex';

// ── Nature room ──
const natureRoom = createNatureRoom(scene);
clickableObjects.push(...natureRoom.clickables);

// ── Exterior room ──
const exteriorRoom = createExteriorRoom(scene);
clickableObjects.push(...exteriorRoom.clickables);

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

// Animate exterior enter label (gentle bob + pulse)
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
let currentRoom = 'exterior'; // 'ai', 'nature', or 'exterior'

function transitionToRoom(targetRoom) {
  controller.unlock();
  fadeOverlay.classList.add('active');

  setTimeout(() => {
    if (targetRoom === 'nature') {
      controller.setPose({ position: new THREE.Vector3(20, 0, -3), yaw: Math.PI, pitch: 0 });
      currentRoom = 'nature';
      cssRenderer.domElement.style.display = 'none';
      for (const c of aiRoomChildren) c.visible = false;
      scene.background = new THREE.Color(0x88bbf0);
      scene.fog = null;
    } else if (targetRoom === 'exterior') {
      controller.setPose({ position: new THREE.Vector3(-20, 0, 8), yaw: 0, pitch: 0 });
      currentRoom = 'exterior';
      cssRenderer.domElement.style.display = 'none';
      for (const c of aiRoomChildren) c.visible = false;
      scene.background = new THREE.Color(0x88bbf0);
      scene.fog = null;
    } else {
      controller.setPose({ position: new THREE.Vector3(0, 0, 2), yaw: 0, pitch: 0 });
      currentRoom = 'ai';
      cssRenderer.domElement.style.display = '';
      for (const c of aiRoomChildren) c.visible = true;
      scene.background = new THREE.Color(0x0a0f1a);
      scene.fog = new THREE.FogExp2(0x0a0f1a, 0.04);
    }

    setTimeout(() => {
      fadeOverlay.classList.remove('active');
    }, 300);
  }, 600);
}

window.__transitionToRoom = transitionToRoom;

setupClickHandler(renderer, camera, clickableObjects, ui);

// Hover highlight: glow objects the crosshair points at
const hoverRaycaster = new THREE.Raycaster();
const hoverMouse     = new THREE.Vector2();
let lastHovered = null;

function updateHoverHighlight() {
  // When pointer is locked, raycast from center of screen
  if (controller.isLocked()) {
    hoverMouse.set(0, 0);
  }

  hoverRaycaster.setFromCamera(hoverMouse, camera);
  const hits = hoverRaycaster.intersectObjects(clickableObjects, true);

  let hitObj = null;
  if (hits.length) {
    let obj = hits[0].object;
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

  // Highlight current group
  if (hitObj && lastHovered !== hitObj) {
    lastHovered = hitObj;
    hitObj.traverse(child => {
      if (child.isMesh && child.material) {
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
      }
    });
  }

  if (crosshair) {
    crosshair.style.color = hitObj ? 'rgba(0,212,255,1)' : 'rgba(0,212,255,0.4)';
    crosshair.style.fontSize = hitObj ? '28px' : '24px';
  }
}

// Update hover mouse position when pointer is not locked
renderer.domElement.addEventListener('mousemove', (event) => {
  if (controller.isLocked()) return;
  const rect = renderer.domElement.getBoundingClientRect();
  hoverMouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
  hoverMouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
});

document.getElementById('reset-btn').addEventListener('click', () => {
  transitionToRoom('exterior');
});

document.getElementById('guide-btn').addEventListener('click', () => ui.openGatekeeperChat());
document.getElementById('inventory-btn').addEventListener('click', () => ui.openInventory());

soundCheckbox.addEventListener('change', () => {
  const cmd = soundCheckbox.checked ? 'unMute' : 'mute';
  tvVideoIframe.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func: cmd, args: '' }),
    '*'
  );
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
    const iframe = document.getElementById('spotify-iframe');
    if (iframe) iframe.src = 'https://open.spotify.com/embed/episode/629iwUQqeciMedvx9oseyf?theme=0&autoplay=1';
    spotifyPlayer.classList.remove('hidden');
    podcastToggle.textContent = '⏸ Playing';
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
  const iframe = document.getElementById('spotify-iframe');
  if (iframe) { const src = iframe.src; iframe.src = ''; iframe.src = src; }
  spotifyPlayer.classList.add('hidden');
  podcastOpen = false;
  podcastToggle.textContent = '▶ Play';
}

spotifyClose.addEventListener('click', stopPodcast);

addUpdateCallback(() => ui.updateHints());

// Auto-transition when player walks into the building door.
// Door center in world space: x = -20, z ≈ -0.25 (glasshus at z=-2, doorGroup at z=+1.75).
// Exterior bounds clamp player to minZ=0.5, so trigger just as they reach the building front.
let doorAutoTriggered = false;
addUpdateCallback(() => {
  if (currentRoom !== 'exterior') {
    doorAutoTriggered = false;
    return;
  }
  if (doorAutoTriggered) return;
  const pos = controller.player.position;
  if (Math.abs(pos.x - (-20)) <= 0.55 && pos.z <= 0.65) {
    doorAutoTriggered = true;
    transitionToRoom('ai');
  }
});

animate();
