// src/scene/radio.js
//
// A small physical radio in the AI room. Because the gallery's cursor is
// pointer-locked while exploring, the controls are physical buttons on the
// radio body — not an HTML overlay.
//
// Audio plays via a hidden YouTube iframe added to the DOM. Clicking the
// power button counts as user interaction, so YouTube's autoplay rules
// allow audio playback after the first click.
//
// Public API:
//   createRadio(scene)   → build the radio meshes; returns the root group
//   handleRadioAction(a) → dispatch a button-click action; called from
//                          the central click handler in main.js / navigation.js

import * as THREE from 'three';

// ── Channels ────────────────────────────────────────
// To add more channels: append to the arrays below. Each entry needs a
// human-readable `name` (shown on the display) and a YouTube `videoId`
// (the part after `?v=` in the URL).

const MUSIC_CHANNELS = [
  { name: 'Channel 1', videoId: '7rgG3sboipg' },
  // TODO: add more music channels — e.g. lo-fi, ambient, classical
];

const PODCAST_CHANNELS = [
  // TODO: add CDN podcast episodes when the team confirms the source.
  { name: 'Coming soon', videoId: null },
];

// ── Persistence ─────────────────────────────────────

const STORAGE_KEY = 'cdn-gallery:radio';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ on: state.on, mode: state.mode, musicChannel: state.musicChannel, podcastChannel: state.podcastChannel })
    );
  } catch {
    /* ignore quota / privacy errors */
  }
}

const state = Object.assign(
  { on: false, mode: 'music', musicChannel: 0, podcastChannel: 0 },
  loadState() ?? {}
);
// Don't auto-resume audio on page load (autoplay would be blocked anyway,
// and silent visits to the gallery shouldn't suddenly start playing music).
state.on = false;

// ── Audio iframe ────────────────────────────────────

let _audioIframe = null;
function ensureAudioIframe() {
  if (_audioIframe) return _audioIframe;
  _audioIframe = document.createElement('iframe');
  _audioIframe.id = 'radio-audio';
  _audioIframe.allow = 'autoplay; encrypted-media';
  _audioIframe.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;visibility:hidden;';
  document.body.appendChild(_audioIframe);
  return _audioIframe;
}

function applyAudio() {
  const frame = ensureAudioIframe();
  if (!state.on) {
    frame.src = '';
    return;
  }
  const list = state.mode === 'music' ? MUSIC_CHANNELS : PODCAST_CHANNELS;
  const idx = state.mode === 'music' ? state.musicChannel : state.podcastChannel;
  const id = list[idx]?.videoId;
  if (!id) {
    frame.src = ''; // placeholder slot — silent
    return;
  }
  frame.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
}

// ── Display canvas (rendered to a mesh on the radio front) ──

const DISPLAY_W = 320;
const DISPLAY_H = 96;

const _displayCanvas = document.createElement('canvas');
_displayCanvas.width = DISPLAY_W;
_displayCanvas.height = DISPLAY_H;
const _displayTex = new THREE.CanvasTexture(_displayCanvas);

function drawDisplay() {
  const ctx = _displayCanvas.getContext('2d');
  // Background — dark with cyan inner glow
  ctx.fillStyle = '#0a1419';
  ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
  // Subtle scanlines
  for (let y = 0; y < DISPLAY_H; y += 3) {
    ctx.fillStyle = 'rgba(0, 212, 255, 0.045)';
    ctx.fillRect(0, y, DISPLAY_W, 1);
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  if (!state.on) {
    ctx.fillStyle = 'rgba(0, 212, 255, 0.45)';
    ctx.font = 'bold 28px "Octosquares", sans-serif';
    ctx.fillText('— OFF —', DISPLAY_W / 2, DISPLAY_H / 2);
    _displayTex.needsUpdate = true;
    return;
  }

  // Mode label (small)
  ctx.fillStyle = '#00d4ff';
  ctx.font = 'bold 12px "Roboto", sans-serif';
  ctx.fillText(`▸ ${state.mode.toUpperCase()}`, DISPLAY_W / 2, 22);

  // Channel name (large)
  const list = state.mode === 'music' ? MUSIC_CHANNELS : PODCAST_CHANNELS;
  const idx = state.mode === 'music' ? state.musicChannel : state.podcastChannel;
  const ch = list[idx];
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Octosquares", sans-serif';
  // Truncate long names so they fit
  const label = ch?.name ?? '—';
  const maxLabel = label.length > 24 ? label.slice(0, 22) + '…' : label;
  ctx.fillText(maxLabel, DISPLAY_W / 2, 56);

  // Channel index footer
  ctx.fillStyle = 'rgba(214, 244, 251, 0.55)';
  ctx.font = '11px "Roboto", monospace';
  ctx.fillText(
    `${idx + 1} / ${list.length}`,
    DISPLAY_W / 2,
    DISPLAY_H - 16
  );

  _displayTex.needsUpdate = true;
}

drawDisplay();

// ── Build the radio mesh ────────────────────────────

let _powerLight = null; // updated when on/off

export function createRadio(scene) {
  const root = new THREE.Group();
  // Sit it on a small stand to the side of the sofa group, not crowding
  // the chess table. Sofa is at (-4, ?, 2.75); chess table at (-5.5, 0, 2.75).
  // Put the radio at (-2.4, 0, 1.5) — right of the sofa, slightly forward.
  root.position.set(-2.4, 0, 1.5);
  // Face roughly toward the centre of the room
  root.rotation.y = -Math.PI / 8;
  scene.add(root);

  // ── Pedestal (slim glass cylinder) ──
  const pedMat = new THREE.MeshStandardMaterial({
    color: 0xaaffff,
    emissive: 0x00ffee,
    emissiveIntensity: 2.5,
    transparent: true,
    opacity: 0.5,
    roughness: 0.1,
    metalness: 0.0,
  });
  const PED_H = 0.5;
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, PED_H, 12),
    pedMat
  );
  pedestal.position.y = PED_H / 2;
  root.add(pedestal);

  // ── Radio body — rounded-ish dark box ──
  const bodyW = 0.32, bodyH = 0.16, bodyD = 0.13;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0a1419,
    metalness: 0.4,
    roughness: 0.45,
    emissive: 0x002030,
    emissiveIntensity: 0.6,
  });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW, bodyH, bodyD),
    bodyMat
  );
  body.position.y = PED_H + bodyH / 2;
  body.castShadow = true;
  root.add(body);

  // Cyan border lights along the body edges (one per face boundary on top)
  const stripMat = new THREE.MeshBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.7,
  });
  // Top-front edge strip
  const topEdge = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW - 0.02, 0.003, 0.005),
    stripMat
  );
  topEdge.position.set(0, PED_H + bodyH - 0.001, bodyD / 2 + 0.001);
  root.add(topEdge);

  // ── Display panel (canvas-on-mesh on the front face) ──
  const dispW = bodyW * 0.7, dispH = bodyH * 0.55;
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(dispW, dispH),
    new THREE.MeshBasicMaterial({ map: _displayTex })
  );
  display.position.set(-bodyW * 0.07, PED_H + bodyH * 0.55, bodyD / 2 + 0.001);
  root.add(display);

  // ── Speaker grille (small dark circle on the right side of the body) ──
  const grilleMat = new THREE.MeshStandardMaterial({
    color: 0x05101a,
    roughness: 0.95,
  });
  const grille = new THREE.Mesh(
    new THREE.CircleGeometry(0.045, 24),
    grilleMat
  );
  grille.position.set(bodyW * 0.34, PED_H + bodyH * 0.5, bodyD / 2 + 0.002);
  root.add(grille);
  // Tiny holes (decorative)
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if ((i - 2) ** 2 + (j - 2) ** 2 > 4) continue; // disc shape
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.004, 8),
        holeMat
      );
      hole.position.set(
        bodyW * 0.34 + (i - 2) * 0.014,
        PED_H + bodyH * 0.5 + (j - 2) * 0.014,
        bodyD / 2 + 0.003
      );
      root.add(hole);
    }
  }

  // ── Buttons (clickable) — three on the top of the body ──
  function makeButton(action, color, label) {
    const btnGroup = new THREE.Group();
    btnGroup.userData = { clickable: true, action, hoverLabel: label };

    const btnMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.3,
    });
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.012, 16),
      btnMat
    );
    btnGroup.add(cap);

    return btnGroup;
  }

  const btnY = PED_H + bodyH + 0.005;
  const btnZ = -bodyD / 2 + 0.04;
  const btnSpacing = 0.06;

  const powerBtn = makeButton('radioPower', 0x00d4ff, 'Power on / off');
  powerBtn.position.set(-btnSpacing, btnY, btnZ);
  root.add(powerBtn);

  const modeBtn = makeButton('radioMode', 0x8df0c8, 'Switch mode (music ↔ podcast)');
  modeBtn.position.set(0, btnY, btnZ);
  root.add(modeBtn);

  const channelBtn = makeButton('radioNext', 0xff8d8d, 'Next channel');
  channelBtn.position.set(btnSpacing, btnY, btnZ);
  root.add(channelBtn);

  // ── Power-on light (small dot on the body that lights up when on) ──
  const lightDot = new THREE.Mesh(
    new THREE.CircleGeometry(0.005, 16),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0 })
  );
  lightDot.position.set(-bodyW * 0.42, PED_H + bodyH * 0.85, bodyD / 2 + 0.002);
  root.add(lightDot);
  _powerLight = lightDot;

  // Sync visuals to whatever state was loaded (default: off, but display
  // still shows the persisted mode + channel so the user sees their last
  // choice the moment they walk up to it).
  drawDisplay();
  _powerLight.material.opacity = state.on ? 1.0 : 0;

  return root;
}

// ── Click handler ──────────────────────────────────

export function handleRadioAction(action) {
  if (action === 'radioPower') {
    state.on = !state.on;
  } else if (action === 'radioMode') {
    if (!state.on) state.on = true; // switching mode also turns it on
    state.mode = state.mode === 'music' ? 'podcast' : 'music';
  } else if (action === 'radioNext') {
    if (!state.on) state.on = true;
    if (state.mode === 'music') {
      state.musicChannel = (state.musicChannel + 1) % MUSIC_CHANNELS.length;
    } else {
      state.podcastChannel = (state.podcastChannel + 1) % PODCAST_CHANNELS.length;
    }
  } else {
    return; // unknown action
  }

  saveState();
  drawDisplay();
  if (_powerLight) _powerLight.material.opacity = state.on ? 1.0 : 0;
  applyAudio();
}
