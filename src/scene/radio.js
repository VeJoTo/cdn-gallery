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

// ── Animated pixel face on the display ────────────────────────────
// State drives expressions:
//   off                  → sleeping (closed eyes, flat mouth)
//   on (music idle)      → smile, occasional blink
//   on (podcast idle)    → smile with little EQ bars wiggling next to it
//   transient: 'wink'    → left eye closed, smirk (briefly, on Mode click)
//   transient: 'wide'    → big eyes + "o" mouth (briefly, on Next click)
//   blink                → eyes closed for ~150ms, scheduled at random intervals

const FACE = {
  // Pixel size — chunky CRT feel
  px: 6,
  // Center of the face area in canvas pixels
  cx: DISPLAY_W / 2,
  cy: DISPLAY_H / 2,
  // Cyan glow color
  ink: '#5ee0ff',
  inkDim: 'rgba(94, 224, 255, 0.55)',
};

// transient face state — these timers drive what's rendered each frame
const _face = {
  blinkUntil: 0,
  nextBlinkAt: 0,
  expr: null,       // 'wink' | 'wide' | null
  exprUntil: 0,
  lastTickEq: 0,    // for the EQ bars in podcast mode
};

function _drawPixel(ctx, gx, gy, w = 1, h = 1, color = FACE.ink) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(FACE.cx + gx * FACE.px - (w * FACE.px) / 2),
    Math.round(FACE.cy + gy * FACE.px - (h * FACE.px) / 2),
    w * FACE.px,
    h * FACE.px
  );
}

function _drawEyes(ctx, kind) {
  const lx = -5; // left eye grid X (negative = left of center)
  const rx = 5;
  const ey = -2; // eye row (above center)
  if (kind === 'open') {
    _drawPixel(ctx, lx, ey, 2, 3);
    _drawPixel(ctx, rx, ey, 2, 3);
  } else if (kind === 'closed') {
    _drawPixel(ctx, lx, ey, 3, 1);
    _drawPixel(ctx, rx, ey, 3, 1);
  } else if (kind === 'wide') {
    // big eyes — outer + inner pupil
    _drawPixel(ctx, lx, ey, 4, 4);
    _drawPixel(ctx, rx, ey, 4, 4);
    _drawPixel(ctx, lx, ey, 2, 2, '#0a1419'); // inner dark dot
    _drawPixel(ctx, rx, ey, 2, 2, '#0a1419');
  } else if (kind === 'wink') {
    _drawPixel(ctx, lx, ey, 3, 1); // closed
    _drawPixel(ctx, rx, ey, 2, 3); // open
  }
}

function _drawMouth(ctx, kind) {
  const my = 3; // mouth baseline (below center)
  if (kind === 'smile') {
    // Three-segment smile curve, pixel-art style
    _drawPixel(ctx, -4, my,     1, 1);
    _drawPixel(ctx, -3, my + 1, 1, 1);
    _drawPixel(ctx, -2, my + 2, 1, 1);
    _drawPixel(ctx, -1, my + 2, 1, 1);
    _drawPixel(ctx,  0, my + 2, 1, 1);
    _drawPixel(ctx,  1, my + 2, 1, 1);
    _drawPixel(ctx,  2, my + 2, 1, 1);
    _drawPixel(ctx,  3, my + 1, 1, 1);
    _drawPixel(ctx,  4, my,     1, 1);
  } else if (kind === 'flat') {
    _drawPixel(ctx, 0, my + 1, 5, 1);
  } else if (kind === 'oh') {
    // Small "o" — a 3×3 ring
    _drawPixel(ctx, -1, my,     3, 1);
    _drawPixel(ctx, -2, my + 1, 1, 1);
    _drawPixel(ctx,  2, my + 1, 1, 1);
    _drawPixel(ctx, -1, my + 2, 3, 1);
  } else if (kind === 'smirk') {
    // Asymmetric — left side goes up, right side flat
    _drawPixel(ctx, -3, my,     1, 1);
    _drawPixel(ctx, -2, my + 1, 1, 1);
    _drawPixel(ctx, -1, my + 2, 1, 1);
    _drawPixel(ctx,  0, my + 2, 1, 1);
    _drawPixel(ctx,  1, my + 2, 1, 1);
    _drawPixel(ctx,  2, my + 2, 1, 1);
    _drawPixel(ctx,  3, my + 2, 1, 1);
  }
}

function _drawEqBars(ctx) {
  // Little EQ bars to the right of the face — only when podcast is playing
  const baseX = DISPLAY_W - 36;
  const baseY = DISPLAY_H - 14;
  const heights = [0, 1, 2, 3].map(i =>
    3 + Math.floor(Math.abs(Math.sin(_face.lastTickEq * 0.18 + i * 1.3)) * 4)
  );
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i] * 3;
    ctx.fillStyle = FACE.inkDim;
    ctx.fillRect(baseX + i * 6, baseY - h, 4, h);
  }
}

function drawDisplay() {
  const ctx = _displayCanvas.getContext('2d');
  // Background — dark with subtle scan lines (CRT vibe)
  ctx.fillStyle = '#0a1419';
  ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
  for (let y = 0; y < DISPLAY_H; y += 3) {
    ctx.fillStyle = 'rgba(94, 224, 255, 0.05)';
    ctx.fillRect(0, y, DISPLAY_W, 1);
  }
  // Slight inner glow border
  ctx.strokeStyle = 'rgba(94, 224, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, DISPLAY_W - 4, DISPLAY_H - 4);

  ctx.imageSmoothingEnabled = false;

  if (!state.on) {
    _drawEyes(ctx, 'closed');
    _drawMouth(ctx, 'flat');
    // Tiny "Z" sleep indicator next to the face
    ctx.fillStyle = FACE.inkDim;
    ctx.font = 'bold 14px "Roboto", monospace';
    ctx.fillText('z', DISPLAY_W - 38, 24);
    ctx.font = 'bold 18px "Roboto", monospace';
    ctx.fillText('Z', DISPLAY_W - 28, 18);
    _displayTex.needsUpdate = true;
    return;
  }

  // Decide current expression
  const now = Date.now();
  let expression = 'idle';
  if (now < _face.exprUntil && _face.expr) {
    expression = _face.expr;
  } else {
    // Idle scheduling: random blink every 3-6s
    if (now > _face.nextBlinkAt && now > _face.blinkUntil) {
      _face.blinkUntil = now + 160;
      _face.nextBlinkAt = now + 3000 + Math.random() * 3000;
    }
    if (now < _face.blinkUntil) expression = 'blink';
  }

  switch (expression) {
    case 'wink':
      _drawEyes(ctx, 'wink');
      _drawMouth(ctx, 'smirk');
      break;
    case 'wide':
      _drawEyes(ctx, 'wide');
      _drawMouth(ctx, 'oh');
      break;
    case 'blink':
      _drawEyes(ctx, 'closed');
      _drawMouth(ctx, 'smile');
      break;
    default:
      _drawEyes(ctx, 'open');
      _drawMouth(ctx, 'smile');
      break;
  }

  // Mode-specific decoration
  if (state.mode === 'podcast') {
    _drawEqBars(ctx);
  }

  // Mode + channel label, small along the bottom
  ctx.fillStyle = FACE.inkDim;
  ctx.font = 'bold 9px "Roboto", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const list = state.mode === 'music' ? MUSIC_CHANNELS : PODCAST_CHANNELS;
  const idx = state.mode === 'music' ? state.musicChannel : state.podcastChannel;
  const ch = list[idx];
  ctx.fillText(`${state.mode.toUpperCase()} · ${ch?.name ?? '—'}`, 8, DISPLAY_H - 12);

  _displayTex.needsUpdate = true;
}

// Animation loop — 8 fps is enough for chunky CRT feel and is cheap
let _faceLoopHandle = null;
function _startFaceLoop() {
  if (_faceLoopHandle) return;
  _faceLoopHandle = setInterval(() => {
    _face.lastTickEq++;
    drawDisplay();
  }, 125);
}

function _triggerExpression(name, ms = 450) {
  _face.expr = name;
  _face.exprUntil = Date.now() + ms;
}

drawDisplay();
_startFaceLoop();

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

  // ── Alien tractor beam: octagonal landing pad + flared light beam ──
  // The radio sits at the top of the beam as if abducted / hovering.
  const PED_H = 0.85;

  // Landing pad — octagonal flat disc on the floor, glowing rim
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x0d2230,
    emissive: 0x00d4ff,
    emissiveIntensity: 0.6,
    metalness: 0.55,
    roughness: 0.35,
  });
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.46, 0.04, 8),
    padMat
  );
  pad.position.y = 0.02;
  root.add(pad);

  // Cyan ring of light around the pad rim — alien landing-strip vibe
  const padRimMat = new THREE.MeshBasicMaterial({
    color: 0x5ee0ff,
    transparent: true,
    opacity: 0.85,
  });
  const padRim = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.48, 32),
    padRimMat
  );
  padRim.rotation.x = -Math.PI / 2;
  padRim.position.y = 0.041;
  root.add(padRim);

  // Inner concentric ring on the pad — more "runway markings"
  const padInner = new THREE.Mesh(
    new THREE.RingGeometry(0.27, 0.30, 24),
    new THREE.MeshBasicMaterial({ color: 0x5ee0ff, transparent: true, opacity: 0.55 })
  );
  padInner.rotation.x = -Math.PI / 2;
  padInner.position.y = 0.042;
  root.add(padInner);

  // Tractor beam — tapered cylinder, wider at the bottom, translucent
  // cyan with additive blending so it reads as light, not solid glass.
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x5ee0ff,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beamH = PED_H - 0.08;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.32, beamH, 32, 1, true),
    beamMat
  );
  beam.position.y = 0.04 + beamH / 2;
  root.add(beam);

  // Inner "core" beam — denser, narrower, brighter
  const beamCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.18, beamH, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x5ee0ff,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  beamCore.position.y = 0.04 + beamH / 2;
  root.add(beamCore);

  // Anti-grav disc — thin disc the radio appears to float on top of
  const antigrav = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.16, 0.025, 16),
    new THREE.MeshStandardMaterial({
      color: 0x0d2230,
      emissive: 0x00d4ff,
      emissiveIntensity: 1.4,
      metalness: 0.7,
      roughness: 0.25,
    })
  );
  antigrav.position.y = PED_H - 0.012;
  root.add(antigrav);

  // Cyan halo just under the antigrav disc — the "lift force" glow
  const liftHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.22, 32),
    new THREE.MeshBasicMaterial({
      color: 0x5ee0ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  liftHalo.rotation.x = -Math.PI / 2;
  liftHalo.position.y = PED_H - 0.001;
  root.add(liftHalo);

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
    _triggerExpression('wink');
  } else if (action === 'radioNext') {
    if (!state.on) state.on = true;
    if (state.mode === 'music') {
      state.musicChannel = (state.musicChannel + 1) % MUSIC_CHANNELS.length;
    } else {
      state.podcastChannel = (state.podcastChannel + 1) % PODCAST_CHANNELS.length;
    }
    _triggerExpression('wide');
  } else {
    return; // unknown action
  }

  saveState();
  drawDisplay();
  if (_powerLight) _powerLight.material.opacity = state.on ? 1.0 : 0;
  applyAudio();
}
