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
  { name: 'Channel 2', videoId: 'UnCeRajvwps' },
  { name: 'Channel 3', videoId: 'HIdNZlBKrTA' },
  // To extend: append { name, videoId } entries.
];

const PODCAST_CHANNELS = [
  { name: 'CDN Podcast', spotifyShowId: '0wu2LStxmC2rT8xTSC5ld4' },
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

// CSS for the two iframe states (set inline so the file is self-contained)
const HIDDEN_FRAME_CSS =
  'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;visibility:hidden;';
const VISIBLE_FRAME_CSS =
  'position:fixed;bottom:16px;right:16px;width:340px;height:160px;border:0;visibility:visible;z-index:60;border-radius:12px;box-shadow:0 0 18px rgba(0,212,255,0.45),0 0 0 1px rgba(0,212,255,0.6);background:#0a1419;';

let _audioIframe = null;
function ensureAudioIframe() {
  if (_audioIframe) return _audioIframe;
  _audioIframe = document.createElement('iframe');
  _audioIframe.id = 'radio-audio';
  _audioIframe.allow = 'autoplay; encrypted-media; clipboard-write';
  _audioIframe.style.cssText = HIDDEN_FRAME_CSS;
  document.body.appendChild(_audioIframe);
  return _audioIframe;
}

function applyAudio() {
  const frame = ensureAudioIframe();
  if (!state.on) {
    frame.src = '';
    frame.style.cssText = HIDDEN_FRAME_CSS;
    return;
  }
  const list = state.mode === 'music' ? MUSIC_CHANNELS : PODCAST_CHANNELS;
  const idx = state.mode === 'music' ? state.musicChannel : state.podcastChannel;
  const ch = list[idx];
  if (!ch) {
    frame.src = '';
    frame.style.cssText = HIDDEN_FRAME_CSS;
    return;
  }
  if (ch.videoId) {
    // YouTube — autoplay works after the user-gesture click on the power
    // button. Keep the iframe hidden off-screen; audio still plays.
    frame.src = `https://www.youtube.com/embed/${ch.videoId}?autoplay=1`;
    frame.style.cssText = HIDDEN_FRAME_CSS;
  } else if (ch.spotifyShowId) {
    // Spotify embeds don't autoplay (Spotify policy). Show the player as
    // a small visible widget in the bottom-right so the user can pick an
    // episode and hit play.
    frame.src = `https://open.spotify.com/embed/show/${ch.spotifyShowId}?utm_source=generator&theme=0`;
    frame.style.cssText = VISIBLE_FRAME_CSS;
  } else {
    frame.src = '';
    frame.style.cssText = HIDDEN_FRAME_CSS;
  }
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
  // Tucked into a room corner so it reads as a deliberate listening
  // station rather than a floating object in open space. AI room spans
  // X ∈ [-8, +8], Z ∈ [-11, +11]; place the radio in the back-left
  // corner (sofa-side, opposite the TV) and face it diagonally inward.
  root.position.set(-7.2, 0, 9.5);
  root.rotation.y = (3 * Math.PI) / 4; // front faces diagonally into the room
  scene.add(root);

  // ── Pedestal — short, wide stand instead of a thin pole ──
  const pedMat = new THREE.MeshStandardMaterial({
    color: 0xaaffff,
    emissive: 0x00ffee,
    emissiveIntensity: 2.5,
    transparent: true,
    opacity: 0.5,
    roughness: 0.1,
    metalness: 0.0,
  });
  const PED_H = 0.85;
  // Wider base (foot) for stability, narrow waist, then a top plate the
  // radio sits on. Reads as a side-table stand.
  const pedFoot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.04, 16),
    pedMat
  );
  pedFoot.position.y = 0.02;
  root.add(pedFoot);

  const pedStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, PED_H - 0.08, 12),
    pedMat
  );
  pedStem.position.y = (PED_H - 0.08) / 2 + 0.04;
  root.add(pedStem);

  const pedTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.20, 0.04, 16),
    pedMat
  );
  pedTop.position.y = PED_H - 0.02;
  root.add(pedTop);

  // ── Radio body — even bigger now (1.5× larger again) ──
  const bodyW = 0.85, bodyH = 0.42, bodyD = 0.32;
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

  // ── Futuristic edge lighting — cyan strips along the body's seams ──
  const stripMat = new THREE.MeshBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.85,
  });
  // Front-top + front-bottom horizontal seams
  for (const yOff of [bodyH - 0.002, 0.002]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW - 0.03, 0.004, 0.006),
      stripMat
    );
    strip.position.set(0, PED_H + yOff, bodyD / 2 + 0.002);
    root.add(strip);
  }
  // Front-side vertical seams (left + right edges of the front face)
  for (const xOff of [-bodyW / 2 + 0.002, bodyW / 2 - 0.002]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, bodyH - 0.02, 0.006),
      stripMat
    );
    strip.position.set(xOff, PED_H + bodyH / 2, bodyD / 2 + 0.002);
    root.add(strip);
  }

  // ── Antenna — slim glass rod sticking up from the right rear corner ──
  const antennaMat = new THREE.MeshStandardMaterial({
    color: 0xaaffff,
    emissive: 0x00ffee,
    emissiveIntensity: 3.0,
    transparent: true,
    opacity: 0.7,
    roughness: 0.05,
  });
  const ANT_H = 0.55;
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.012, ANT_H, 10),
    antennaMat
  );
  antenna.position.set(bodyW / 2 - 0.04, PED_H + bodyH + ANT_H / 2, -bodyD / 2 + 0.04);
  root.add(antenna);
  // Tip glow ball
  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff })
  );
  antennaTip.position.set(bodyW / 2 - 0.04, PED_H + bodyH + ANT_H + 0.005, -bodyD / 2 + 0.04);
  root.add(antennaTip);

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
    new THREE.CircleGeometry(0.115, 32),
    grilleMat
  );
  grille.position.set(bodyW * 0.34, PED_H + bodyH * 0.5, bodyD / 2 + 0.002);
  root.add(grille);
  // Cyan glow ring around the speaker grille — futuristic accent
  const grilleRing = new THREE.Mesh(
    new THREE.RingGeometry(0.118, 0.128, 32),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.7 })
  );
  grilleRing.position.set(bodyW * 0.34, PED_H + bodyH * 0.5, bodyD / 2 + 0.003);
  root.add(grilleRing);
  // Decorative hole pattern on the speaker
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if ((i - 2) ** 2 + (j - 2) ** 2 > 4) continue; // disc shape
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.011, 8),
        holeMat
      );
      hole.position.set(
        bodyW * 0.34 + (i - 2) * 0.036,
        PED_H + bodyH * 0.5 + (j - 2) * 0.036,
        bodyD / 2 + 0.004
      );
      root.add(hole);
    }
  }

  // ── Buttons (clickable) — three big, futuristic pads on top of the body ──
  // Each button is a tall cap with a glowing ring at its base. The whole
  // group is clickable, with a wide invisible click target around it so
  // it's forgiving to aim at from a meter or two away.
  function makeButton(action, color, label) {
    const btnGroup = new THREE.Group();
    btnGroup.userData = { clickable: true, action, hoverLabel: label };

    const btnMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 0.25,
      roughness: 0.25,
    });

    // Tall cap — sticks up from the body, easy to see from across the room
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.062, 0.04, 24),
      btnMat
    );
    cap.position.y = 0.02;
    btnGroup.add(cap);

    // Glowing ring at the base — the futuristic pulse halo
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.07, 0.082, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    btnGroup.add(ring);

    // Invisible larger click target so the hit area is generous
    const target = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.06, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    target.position.y = 0.03;
    btnGroup.add(target);

    return btnGroup;
  }

  const btnY = PED_H + bodyH + 0.01;
  const btnZ = -bodyD / 2 + 0.09;
  const btnSpacing = 0.18;

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
