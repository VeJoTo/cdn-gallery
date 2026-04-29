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

  // ──────────────────────────────────────────────────────────────────
  // Clean, futuristic monolith: a thin glass tablet floating on the
  // alien stand. The face display fills the front; three glowing
  // hex pads at the bottom are the only controls. No speaker grille,
  // no antenna, no knobs — let the surface itself communicate state.
  // ──────────────────────────────────────────────────────────────────

  const bodyW = 0.7, bodyH = 0.45, bodyD = 0.06; // slim slab

  // Glass body — translucent cyan with strong emissive glow
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x102228,
    emissive: 0x0a1a22,
    emissiveIntensity: 0.6,
    metalness: 0.2,
    roughness: 0.18,
    transparent: true,
    opacity: 0.92,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(bodyW, bodyH, bodyD, 8, 0.04),
    bodyMat
  );
  body.position.y = PED_H + bodyH / 2;
  body.castShadow = true;
  root.add(body);

  // Thin cyan edge halo — single ring around the front silhouette
  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0x5ee0ff,
    transparent: true,
    opacity: 0.7,
  });
  // Bottom edge strip
  const bottomEdge = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW - 0.04, 0.003, 0.005),
    edgeMat
  );
  bottomEdge.position.set(0, PED_H + 0.002, bodyD / 2 + 0.001);
  root.add(bottomEdge);
  // Top edge strip
  const topEdge = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW - 0.04, 0.003, 0.005),
    edgeMat
  );
  topEdge.position.set(0, PED_H + bodyH - 0.002, bodyD / 2 + 0.001);
  root.add(topEdge);

  // ── Display — fills the upper portion of the front ──
  const dispW = bodyW * 0.85, dispH = bodyH * 0.62;
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(dispW, dispH),
    new THREE.MeshBasicMaterial({ map: _displayTex })
  );
  display.position.set(0, PED_H + bodyH * 0.65, bodyD / 2 + 0.001);
  root.add(display);

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
