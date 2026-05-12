// src/loading-ai.js
// Plays the AI-room entrance loading animation. See
// docs/superpowers/specs/2026-05-12-ai-room-loading-screen-design.md
import { drawRadioFace } from './scene/face-primitives.js';

const OVERLAY_ID = 'ai-loading-overlay';
const TOTAL_MS = 2500;

let _overlay = null;

let _stylesInjected = false;
function _injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ai-loading-dial-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(720deg); }
    }
    @keyframes ai-loading-glow {
      0%, 100% { box-shadow: 0 0 0 2px #1a3a5c inset, 0 0 24px rgba(0, 212, 255, 0.35), 0 12px 28px rgba(0, 0, 0, 0.6); }
      50%      { box-shadow: 0 0 0 2px #1a3a5c inset, 0 0 48px rgba(0, 212, 255, 0.85), 0 12px 28px rgba(0, 0, 0, 0.6); }
    }
    @keyframes ai-loading-scanlines {
      from { background-position: 0 0; }
      to   { background-position: 0 6px; }
    }
    @keyframes ai-loading-static {
      0%   { transform: translate(0, 0); }
      25%  { transform: translate(-2%, 1%); }
      50%  { transform: translate(1%, -1%); }
      75%  { transform: translate(-1%, 2%); }
      100% { transform: translate(0, 0); }
    }
    @keyframes ai-loading-shake {
      0%, 100% { transform: translateX(0); }
      20%      { transform: translateX(-1.5px); }
      40%      { transform: translateX(1.5px); }
      60%      { transform: translateX(-1px); }
      80%      { transform: translateX(1px); }
    }
    @keyframes ai-loading-found-flicker {
      0%   { opacity: 0; transform: scale(0.92); }
      18%  { opacity: 1; transform: scale(1.06); }
      26%  { opacity: 0.35; }
      40%  { opacity: 1; transform: scale(1); }
      55%  { opacity: 0.7; }
      70%  { opacity: 1; }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes ai-loading-caption-glow {
      0%, 100% { text-shadow: 0 0 8px rgba(0, 212, 255, 0.6), 0 0 18px rgba(0, 212, 255, 0.3); }
      50%      { text-shadow: 0 0 14px rgba(0, 212, 255, 0.95), 0 0 28px rgba(0, 212, 255, 0.55); }
    }
  `;
  document.head.appendChild(style);
}

function _ensureOverlay() {
  if (_overlay && document.body.contains(_overlay)) return _overlay;
  _injectStyles();
  const el = document.createElement('div');
  el.id = OVERLAY_ID;
  el.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background:
      radial-gradient(ellipse at center, #0e1a2a 0%, #06101a 70%, #03070d 100%);
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto;
    font-family: "Roboto", monospace;
    opacity: 1;
    transition: opacity 0.3s ease;
    overflow: hidden;
  `;

  // Scanlines layer (drifts down)
  const scanlines = document.createElement('div');
  scanlines.style.cssText = `
    position: absolute; inset: 0;
    background-image: repeating-linear-gradient(
      to bottom,
      rgba(0, 212, 255, 0.05) 0px,
      rgba(0, 212, 255, 0.05) 1px,
      transparent 1px,
      transparent 3px
    );
    background-size: 100% 6px;
    animation: ai-loading-scanlines 1.4s linear infinite;
    pointer-events: none;
    mix-blend-mode: screen;
  `;
  el.appendChild(scanlines);

  // Static/noise layer — only visible during "TUNING" phase
  const staticLayer = document.createElement('div');
  staticLayer.className = 'ai-loading-static';
  staticLayer.style.cssText = `
    position: absolute; inset: -4%;
    background-image:
      radial-gradient(rgba(0, 212, 255, 0.18) 1px, transparent 1px),
      radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
    background-size: 3px 3px, 4px 4px;
    background-position: 0 0, 1px 1px;
    animation: ai-loading-static 0.12s steps(1) infinite;
    opacity: 0.35;
    transition: opacity 0.4s ease;
    pointer-events: none;
    mix-blend-mode: screen;
  `;
  el.appendChild(staticLayer);

  // Inner vignette to draw focus to the radio
  const vignette = document.createElement('div');
  vignette.style.cssText = `
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 85%);
    pointer-events: none;
  `;
  el.appendChild(vignette);

  const stage = document.createElement('div');
  stage.style.cssText = `
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center; gap: 28px;
    transform: translateY(120%);
    transition: transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.1);
  `;
  el.appendChild(stage);

  // Radio body (wrapped so we can shake the body without affecting children's positioning)
  const radioShake = document.createElement('div');
  radioShake.className = 'ai-loading-radio-shake';
  radioShake.style.cssText = `display: inline-block;`;

  const radio = document.createElement('div');
  radio.style.cssText = `
    position: relative;
    width: 240px; height: 140px;
    background: linear-gradient(180deg, #142536 0%, #0d1a28 100%);
    border-radius: 14px;
    box-shadow:
      0 0 0 2px #1a3a5c inset,
      0 0 24px rgba(0, 212, 255, 0.35),
      0 12px 28px rgba(0, 0, 0, 0.6);
    padding: 16px;
    display: flex; align-items: center; gap: 14px;
  `;

  // Face canvas (left side of the radio)
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 96;
  faceCanvas.height = 72;
  faceCanvas.style.cssText = `
    background: #0a1419;
    border-radius: 6px;
    box-shadow: 0 0 0 2px rgba(94, 224, 255, 0.25) inset;
    image-rendering: pixelated;
  `;
  radio.appendChild(faceCanvas);

  // Dials (right side of the radio)
  const dialsWrap = document.createElement('div');
  dialsWrap.style.cssText = `display: flex; flex-direction: column; gap: 10px;`;
  for (let i = 0; i < 2; i++) {
    const dial = document.createElement('div');
    dial.className = 'ai-loading-dial';
    dial.style.cssText = `
      width: 44px; height: 44px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #2a4a6c, #0d1a28 70%);
      box-shadow: 0 0 0 2px #1a3a5c inset, 0 0 8px rgba(0, 212, 255, 0.25);
      position: relative;
    `;
    const tick = document.createElement('div');
    tick.style.cssText = `
      position: absolute; top: 4px; left: 50%;
      width: 2px; height: 12px;
      background: #00d4ff;
      transform: translateX(-50%);
      box-shadow: 0 0 6px #00d4ff;
    `;
    dial.appendChild(tick);
    dialsWrap.appendChild(dial);
  }
  radio.appendChild(dialsWrap);

  radioShake.appendChild(radio);
  stage.appendChild(radioShake);

  // Caption
  const caption = document.createElement('div');
  caption.className = 'ai-loading-caption';
  caption.textContent = 'TUNING IN…';
  caption.style.cssText = `
    color: #00d4ff;
    font-size: 14px; letter-spacing: 0.32em; font-weight: 700;
    text-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
    min-height: 1.2em;
  `;
  stage.appendChild(caption);

  document.body.appendChild(el);

  _overlay = el;
  _overlay._stage = stage;
  _overlay._faceCanvas = faceCanvas;
  _overlay._caption = caption;
  _overlay._dials = dialsWrap.children;
  _overlay._radio = radio;
  _overlay._radioShake = radioShake;
  _overlay._staticLayer = staticLayer;
  return el;
}

function _teardown() {
  if (_overlay && _overlay.parentNode) {
    _overlay.parentNode.removeChild(_overlay);
  }
  _overlay = null;
}

function _drawFace(canvas, eyes, mouth) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // jsdom safety
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRadioFace(ctx, {
    eyes, mouth,
    cx: canvas.width / 2,
    cy: canvas.height / 2,
    px: 4,
  });
}

export function playAiLoadingScreen() {
  const reduce = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    return Promise.resolve();
  }
  const overlay = _ensureOverlay();
  const { _stage, _faceCanvas, _caption, _dials, _radio, _radioShake, _staticLayer } = overlay;

  // Initial frame
  _drawFace(_faceCanvas, 'open', 'smile');

  // Slide in (0 → 500ms)
  requestAnimationFrame(() => {
    _stage.style.transform = 'translateY(0)';
  });

  // Start dial spin + signal shake once the radio is on screen
  setTimeout(() => {
    for (const d of _dials) {
      d.style.animation = 'ai-loading-dial-spin 0.7s linear infinite';
    }
    _radioShake.style.animation = 'ai-loading-shake 0.18s steps(2) infinite';
  }, 500);

  // Face beats during "tuning"
  const beats = [
    { at: 700,  eyes: 'wide',   mouth: 'smile', caption: 'TUNING IN…' },
    { at: 900,  eyes: 'closed', mouth: 'smile', caption: 'TUNING IN. .' },
    { at: 1100, eyes: 'wink',   mouth: 'smirk', caption: 'TUNING IN. . .' },
    { at: 1800, eyes: 'open',   mouth: 'smile', caption: 'CHANNEL FOUND' },
  ];
  for (const b of beats) {
    setTimeout(() => {
      _drawFace(_faceCanvas, b.eyes, b.mouth);
      _caption.textContent = b.caption;
    }, b.at);
  }

  // "Found it" moment: dials snap, shake stops, static clears, caption flicker-in,
  // radio glow pulses, face goes wide-eyed surprised.
  setTimeout(() => {
    for (const d of _dials) {
      d.style.animation = '';
      d.style.transform = 'rotate(35deg)';
      d.style.transition = 'transform 0.15s ease-out';
    }
    _radioShake.style.animation = '';
    _staticLayer.style.opacity = '0';
    _radio.style.animation = 'ai-loading-glow 0.6s ease-in-out';
    _drawFace(_faceCanvas, 'wide', 'oh');
    _caption.textContent = 'CHANNEL FOUND';
    _caption.style.fontSize = '18px';
    _caption.style.animation = 'ai-loading-found-flicker 0.5s steps(1) 1, ai-loading-caption-glow 1.2s ease-in-out 0.5s infinite';
  }, 1300);

  // Fade out (2200 → 2500ms)
  setTimeout(() => {
    overlay.style.opacity = '0';
  }, 2200);

  return new Promise((resolve) => {
    setTimeout(() => {
      _teardown();
      resolve();
    }, TOTAL_MS);
  });
}

export function shouldPlayAiLoading(targetRoom, alreadyPlayed) {
  return targetRoom === 'ai' && !alreadyPlayed;
}
