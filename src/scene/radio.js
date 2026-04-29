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
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ── Channels ────────────────────────────────────────
// Flat channel list: cycling Next cycles through every station regardless
// of source (music or podcast). Mirrors how a real radio works — one
// dial, no mode switch. To add channels, append entries; YouTube uses
// `videoId`, Spotify uses `spotifyShowId`.

const CHANNELS = [
  { type: 'music',   name: 'Channel 1',   videoId: '7rgG3sboipg' },
  { type: 'music',   name: 'Channel 2',   videoId: 'UnCeRajvwps' },
  { type: 'music',   name: 'Channel 3',   videoId: 'HIdNZlBKrTA' },
  { type: 'podcast', name: 'CDN Podcast', spotifyShowId: '0wu2LStxmC2rT8xTSC5ld4' },
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
      JSON.stringify({ channel: state.channel })
    );
  } catch {
    /* ignore quota / privacy errors */
  }
}

// State model:
//   on        — whether the radio is powered on at all
//   playing   — whether audio is actively playing (vs paused)
//   channel   — index into CHANNELS
const state = Object.assign(
  { on: false, playing: false, channel: 0 },
  loadState() ?? {}
);
// Boot state: always silent. Channel persists, but never autoplay on load.
state.on = false;
state.playing = false;
if (state.channel >= CHANNELS.length || state.channel < 0) state.channel = 0;

// ── Audio iframe ────────────────────────────────────

// ── Audio: YouTube (music) + Spotify iFrame API (podcast) ──────────

const HIDDEN_FRAME_CSS =
  'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;visibility:hidden;';
const SPOTIFY_VISIBLE_CSS =
  'position:fixed;bottom:16px;right:16px;width:340px;height:160px;border:0;visibility:visible;z-index:60;border-radius:12px;box-shadow:0 0 18px rgba(0,212,255,0.45),0 0 0 1px rgba(0,212,255,0.6);background:#0a1419;overflow:hidden;';
const SPOTIFY_HIDDEN_CSS =
  'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;visibility:hidden;border:0;';

// YouTube iframe — hidden off-screen, audio-only
let _ytFrame = null;
function ensureYouTubeFrame() {
  if (_ytFrame) return _ytFrame;
  _ytFrame = document.createElement('iframe');
  _ytFrame.id = 'radio-youtube';
  _ytFrame.allow = 'autoplay; encrypted-media';
  _ytFrame.style.cssText = HIDDEN_FRAME_CSS;
  document.body.appendChild(_ytFrame);
  return _ytFrame;
}

// Spotify EmbedController — loaded lazily on first podcast use. Spotify's
// iFrame API replaces a placeholder div with its own iframe, so we don't
// build the iframe ourselves.
let _spotifyController = null;
let _spotifyPending = null; // 'play' | 'pause' | { uri } — queued while loading
let _spotifySetup = false;

function ensureSpotifyController() {
  if (_spotifyController || _spotifySetup) return;
  if (typeof window === 'undefined') return;
  _spotifySetup = true;

  // Container the API will turn into an iframe. Visible by default —
  // toggleSpotifyVisible() hides it when not playing.
  const container = document.createElement('div');
  container.id = 'radio-spotify-container';
  container.style.cssText = SPOTIFY_HIDDEN_CSS;
  document.body.appendChild(container);

  // Inject the SDK script
  const script = document.createElement('script');
  script.src = 'https://open.spotify.com/embed/iframe-api/v1';
  script.async = true;
  document.head.appendChild(script);

  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    const showId = CHANNELS.find(c => c.spotifyShowId)?.spotifyShowId;
    if (!showId) return;
    IFrameAPI.createController(
      container,
      {
        uri: `spotify:show:${showId}`,
        width: '100%',
        height: '100%',
      },
      (controller) => {
        _spotifyController = controller;
        // Drain any queued action that fired before the controller was ready
        if (_spotifyPending === 'play') {
          controller.play();
          toggleSpotifyVisible(true);
        } else if (_spotifyPending === 'pause') {
          controller.pause();
          toggleSpotifyVisible(false);
        }
        _spotifyPending = null;
      }
    );
  };
}

function toggleSpotifyVisible(visible) {
  const c = document.getElementById('radio-spotify-container');
  if (!c) return;
  c.style.cssText = visible ? SPOTIFY_VISIBLE_CSS : SPOTIFY_HIDDEN_CSS;
}

function spotifyPlay() {
  ensureSpotifyController();
  if (_spotifyController) {
    _spotifyController.play();
    toggleSpotifyVisible(true);
  } else {
    _spotifyPending = 'play';
  }
}

function spotifyPause() {
  if (_spotifyController) {
    _spotifyController.pause();
    toggleSpotifyVisible(false);
  } else {
    _spotifyPending = 'pause';
  }
}

function applyAudio() {
  const yt = ensureYouTubeFrame();
  const ch = CHANNELS[state.channel];

  // Off OR paused — silence both sides
  if (!state.on || !state.playing) {
    yt.src = '';
    spotifyPause();
    return;
  }

  if (ch?.type === 'music' && ch.videoId) {
    yt.src = `https://www.youtube.com/embed/${ch.videoId}?autoplay=1`;
    spotifyPause();
  } else if (ch?.type === 'podcast' && ch.spotifyShowId) {
    yt.src = '';
    spotifyPlay();
  } else {
    yt.src = '';
    spotifyPause();
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

  // Channel-type decoration: EQ bars while a podcast plays
  const ch = CHANNELS[state.channel];
  if (ch?.type === 'podcast' && state.playing) {
    _drawEqBars(ctx);
  }

  // Channel label along the bottom
  ctx.fillStyle = FACE.inkDim;
  ctx.font = 'bold 9px "Roboto", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const typeLabel = ch?.type ? ch.type.toUpperCase() : '—';
  const playLabel = state.playing ? '' : ' [PAUSED]';
  ctx.fillText(`${typeLabel} · ${ch?.name ?? '—'}${playLabel}`, 8, DISPLAY_H - 12);

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
let _radioChannelDots = null; // { refresh() } — relights the active channel dot

export function createRadio(scene) {
  const root = new THREE.Group();
  // Couch-side end-table — past the sofa's +Z armrest, with enough
  // clearance from the sofa GLB's footprint that nothing clips. Front
  // face turned toward the sofa centre so a sitter can glance at the
  // display, while a player approaching from +Z still sees the side.
  root.position.set(-3.6, 0, 5.0);
  root.rotation.y = 0; // front faces +Z
  scene.add(root);

  // ── Glass side table the radio sits on ────────────────────────────
  const PED_H = 0.55; // table height — coffee-table scale

  // Top — round glass plate with a thin cyan rim
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xb8e0ec,
    metalness: 0.0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.25,
    transmission: 0.85,
    thickness: 0.4,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.03, 48),
    glassMat
  );
  tableTop.position.y = PED_H - 0.015;
  root.add(tableTop);

  // Cyan rim around the top edge — single accent line
  const topRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.005, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0x5ee0ff, transparent: true, opacity: 0.75 })
  );
  topRim.rotation.x = Math.PI / 2;
  topRim.position.y = PED_H - 0.015;
  root.add(topRim);

  // Slim metallic legs — three angled supports for a tripod look
  const legMat = new THREE.MeshStandardMaterial({
    color: 0xc8d4dc,
    metalness: 0.85,
    roughness: 0.2,
  });
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.018, PED_H - 0.04, 10),
      legMat
    );
    leg.position.set(
      Math.cos(angle) * 0.3,
      (PED_H - 0.04) / 2,
      Math.sin(angle) * 0.3
    );
    // Splay each leg outward by tilting slightly
    leg.rotation.z = -Math.cos(angle) * 0.08;
    leg.rotation.x = Math.sin(angle) * 0.08;
    root.add(leg);
  }

  // Small foot disc on the floor where the legs converge
  const baseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.27, 0.31, 32),
    new THREE.MeshBasicMaterial({ color: 0x5ee0ff, transparent: true, opacity: 0.45 })
  );
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.001;
  root.add(baseRing);

  // ──────────────────────────────────────────────────────────────────
  // Radio body — landscape silhouette, glass-like with cyan accents.
  // Wider than tall + with depth so it reads as a radio, not a screen.
  // ──────────────────────────────────────────────────────────────────

  const bodyW = 0.7, bodyH = 0.34, bodyD = 0.22;

  // Glass body — slightly translucent dark with cyan inner glow
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x142028,
    emissive: 0x0a1a24,
    emissiveIntensity: 0.55,
    metalness: 0.35,
    roughness: 0.25,
    transparent: true,
    opacity: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(bodyW, bodyH, bodyD, 6, 0.05),
    bodyMat
  );
  body.position.y = PED_H + bodyH / 2;
  body.castShadow = true;
  root.add(body);

  // Thin cyan top + bottom edge accents on the front face
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x5ee0ff, transparent: true, opacity: 0.7 });
  for (const yOff of [bodyH - 0.003, 0.003]) {
    const e = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW - 0.04, 0.003, 0.005),
      edgeMat
    );
    e.position.set(0, PED_H + yOff, bodyD / 2 + 0.001);
    root.add(e);
  }

  // ── Minimal speaker on the LEFT of the front face ──
  // Concentric cyan rings — clean futuristic interpretation of a
  // speaker, no perforated grille pattern.
  const speakerR = bodyH * 0.36;
  const speakerX = -bodyW * 0.28;
  const speakerY = PED_H + bodyH * 0.55;
  // Dark recessed disc
  const speakerWell = new THREE.Mesh(
    new THREE.CircleGeometry(speakerR, 40),
    new THREE.MeshStandardMaterial({ color: 0x05101a, roughness: 0.7, metalness: 0.4 })
  );
  speakerWell.position.set(speakerX, speakerY, bodyD / 2 + 0.001);
  root.add(speakerWell);
  // Outer cyan rim
  const speakerRimOuter = new THREE.Mesh(
    new THREE.RingGeometry(speakerR + 0.003, speakerR + 0.011, 40),
    new THREE.MeshBasicMaterial({ color: 0x5ee0ff, transparent: true, opacity: 0.85 })
  );
  speakerRimOuter.position.set(speakerX, speakerY, bodyD / 2 + 0.002);
  root.add(speakerRimOuter);
  // Inner concentric ring
  const speakerRimInner = new THREE.Mesh(
    new THREE.RingGeometry(speakerR * 0.55, speakerR * 0.6, 32),
    new THREE.MeshBasicMaterial({ color: 0x5ee0ff, transparent: true, opacity: 0.5 })
  );
  speakerRimInner.position.set(speakerX, speakerY, bodyD / 2 + 0.0025);
  root.add(speakerRimInner);
  // Small centre dot
  const speakerDot = new THREE.Mesh(
    new THREE.CircleGeometry(speakerR * 0.18, 24),
    new THREE.MeshBasicMaterial({ color: 0x5ee0ff, transparent: true, opacity: 0.85 })
  );
  speakerDot.position.set(speakerX, speakerY, bodyD / 2 + 0.003);
  root.add(speakerDot);

  // ── Display panel — RIGHT half of front face ──
  const dispW = bodyW * 0.42, dispH = bodyH * 0.55;
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(dispW, dispH),
    new THREE.MeshBasicMaterial({ map: _displayTex })
  );
  display.position.set(bodyW * 0.22, PED_H + bodyH * 0.62, bodyD / 2 + 0.002);
  root.add(display);

  // ── Slim glowing antenna — sticks up from the back-left top ──
  // Iconic radio cue, kept very minimal so it doesn't dominate.
  const antennaMat = new THREE.MeshStandardMaterial({
    color: 0xaaffff,
    emissive: 0x5ee0ff,
    emissiveIntensity: 2.5,
    transparent: true,
    opacity: 0.75,
    roughness: 0.05,
  });
  const ANT_H = 0.42;
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.009, ANT_H, 8),
    antennaMat
  );
  antenna.position.set(-bodyW / 2 + 0.05, PED_H + bodyH + ANT_H / 2, -bodyD / 2 + 0.05);
  // Slight angle for a friendly silhouette
  antenna.rotation.z = 0.18;
  root.add(antenna);
  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x5ee0ff })
  );
  antennaTip.position.set(
    -bodyW / 2 + 0.05 + Math.sin(0.18) * ANT_H,
    PED_H + bodyH + Math.cos(0.18) * ANT_H + 0.005,
    -bodyD / 2 + 0.05
  );
  root.add(antennaTip);

  // ── Three hex control pads in a clean row at the bottom ──
  // Pads are flat hexagons (CylinderGeometry with 6 sides) sitting
  // flush to the surface — no protruding caps, no knobs. Press = tap
  // the surface in 3D space.
  function makeHexPad(action, accent, label) {
    const grp = new THREE.Group();
    grp.userData = { clickable: true, action, hoverLabel: label };

    // Hex base — dark fill for the pad
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x05131a,
      emissive: accent,
      emissiveIntensity: 0.35,
      metalness: 0.3,
      roughness: 0.25,
    });
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.04, 0.012, 6),
      padMat
    );
    pad.rotation.x = Math.PI / 2; // face forward
    pad.rotation.z = Math.PI / 6; // flat-top hexagon
    grp.add(pad);

    // Glowing rim — single thin hex outline around the pad
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(0.035, 0.043, 6),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85 })
    );
    rim.rotation.z = Math.PI / 6;
    rim.position.z = 0.0065;
    grp.add(rim);

    // Center glyph — solid small hex for the on-state visual
    const glyph = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 6),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9 })
    );
    glyph.rotation.z = Math.PI / 6;
    glyph.position.z = 0.0066;
    grp.add(glyph);

    // Generous invisible click target — large radius forgives aim
    const target = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    target.rotation.x = Math.PI / 2;
    grp.add(target);

    return grp;
  }

  const padFrontZ = bodyD / 2 + 0.005;
  const padY = PED_H + bodyH * 0.18;
  const padSpacing = 0.13;

  const powerPad = makeHexPad('radioPower', 0xff6b6b, 'Power on / off');
  powerPad.position.set(-padSpacing, padY, padFrontZ);
  root.add(powerPad);

  const playPad = makeHexPad('radioPlayPause', 0x5ee0ff, 'Play / Pause');
  playPad.position.set(0, padY, padFrontZ);
  root.add(playPad);

  const nextPad = makeHexPad('radioNext', 0xff8d8d, 'Next channel');
  nextPad.position.set(padSpacing, padY, padFrontZ);
  root.add(nextPad);

  // ── Power-on indicator — single thin glowing line below the display ──
  const lightDot = new THREE.Mesh(
    new THREE.PlaneGeometry(0.04, 0.003),
    new THREE.MeshBasicMaterial({ color: 0x5ee0ff, transparent: true, opacity: 0 })
  );
  lightDot.position.set(0, PED_H + bodyH * 0.32, bodyD / 2 + 0.0015);
  root.add(lightDot);
  _powerLight = lightDot;

  // Initial visual sync
  drawDisplay();
  _powerLight.material.opacity = state.on ? 1.0 : 0;
  // No more channel-dot indicator — the display itself shows the channel,
  // so wire the runtime hook to a no-op.
  _radioChannelDots = { refresh() { /* nothing — display handles it */ } };

  // ── Floating neon "RADIO" label above the body ──
  // Sprite-based so it always faces the camera, matching the
  // "AI Storytelling" sign above the book pedestal.
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 384;
  labelCanvas.height = 128;
  const lctx = labelCanvas.getContext('2d');
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;

  function drawRadioLabel() {
    const NEON = '#5ee0ff';
    const cx = 192, cy = 72;
    lctx.clearRect(0, 0, 384, 128);
    lctx.font = "84px 'Octosquares', sans-serif";
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    lctx.shadowColor = NEON;
    lctx.shadowBlur = 48; lctx.fillStyle = 'rgba(94, 224, 255, 0.18)'; lctx.fillText('RADIO', cx, cy);
    lctx.shadowBlur = 28; lctx.fillStyle = 'rgba(94, 224, 255, 0.45)'; lctx.fillText('RADIO', cx, cy);
    lctx.shadowBlur = 10; lctx.fillStyle = 'rgba(94, 224, 255, 0.85)'; lctx.fillText('RADIO', cx, cy);
    lctx.shadowBlur =  4; lctx.fillStyle = '#eef9ff';                  lctx.fillText('RADIO', cx, cy);
    labelTex.needsUpdate = true;
  }
  drawRadioLabel();
  if (typeof document !== 'undefined' && document.fonts?.load) {
    document.fonts.load("84px 'Octosquares'").then(() => drawRadioLabel());
  }

  const labelSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );
  labelSprite.scale.set(0.45, 0.15, 1);
  // Place above the antenna tip
  labelSprite.position.set(0, PED_H + bodyH + ANT_H + 0.15, 0);
  labelSprite.renderOrder = 999;
  labelSprite.raycast = () => {};
  root.add(labelSprite);

  return root;
}

// ── Click handler ──────────────────────────────────

export function handleRadioAction(action) {
  if (action === 'radioPower') {
    // Hard power. When turning off, also stop playback so nothing lingers.
    state.on = !state.on;
    if (!state.on) state.playing = false;
    if (state.on) state.playing = true; // power-on starts playing the current station
  } else if (action === 'radioPlayPause') {
    // Independent play/pause: don't toggle power, just the audio state.
    if (!state.on) state.on = true; // pressing play also turns the radio on
    state.playing = !state.playing;
    _triggerExpression('wink');
  } else if (action === 'radioNext') {
    if (!state.on) state.on = true;
    state.channel = (state.channel + 1) % CHANNELS.length;
    state.playing = true; // changing channel resumes playback
    _triggerExpression('wide');
  } else {
    return; // unknown action
  }

  saveState();
  drawDisplay();
  if (_powerLight) _powerLight.material.opacity = state.on ? 1.0 : 0;
  if (_radioChannelDots) _radioChannelDots.refresh();
  applyAudio();
}
