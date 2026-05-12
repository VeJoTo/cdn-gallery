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
    background: #0a1420;
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto;
    font-family: "Roboto", monospace;
    opacity: 1;
    transition: opacity 0.3s ease;
  `;

  const stage = document.createElement('div');
  stage.style.cssText = `
    display: flex; flex-direction: column; align-items: center; gap: 24px;
    transform: translateY(120%);
    transition: transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.1);
  `;
  el.appendChild(stage);

  // Radio body
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

  stage.appendChild(radio);

  // Caption
  const caption = document.createElement('div');
  caption.className = 'ai-loading-caption';
  caption.textContent = 'TUNING IN…';
  caption.style.cssText = `
    color: #00d4ff;
    font-size: 14px; letter-spacing: 0.3em; font-weight: 700;
    text-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
  `;
  stage.appendChild(caption);

  document.body.appendChild(el);

  _overlay = el;
  _overlay._stage = stage;
  _overlay._faceCanvas = faceCanvas;
  _overlay._caption = caption;
  _overlay._dials = dialsWrap.children;
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
  const { _stage, _faceCanvas, _caption, _dials } = overlay;

  // Initial frame
  _drawFace(_faceCanvas, 'open', 'smile');

  // Slide in (0 → 500ms)
  requestAnimationFrame(() => {
    _stage.style.transform = 'translateY(0)';
  });

  // Start dial spin once the radio is on screen
  setTimeout(() => {
    for (const d of _dials) {
      d.style.animation = 'ai-loading-dial-spin 0.7s linear infinite';
    }
  }, 500);

  // Face beats during "tuning"
  const beats = [
    { at: 700,  eyes: 'wide',   mouth: 'smile', caption: 'TUNING IN…' },
    { at: 900,  eyes: 'closed', mouth: 'smile', caption: 'TUNING IN. .' },
    { at: 1100, eyes: 'wink',   mouth: 'smirk', caption: 'TUNING IN. . .' },
    { at: 1300, eyes: 'wide',   mouth: 'oh',    caption: 'CHANNEL FOUND' },
    { at: 1800, eyes: 'open',   mouth: 'smile', caption: 'CHANNEL FOUND' },
  ];
  for (const b of beats) {
    setTimeout(() => {
      _drawFace(_faceCanvas, b.eyes, b.mouth);
      _caption.textContent = b.caption;
    }, b.at);
  }

  // Dials snap to a final position at the "found" beat
  setTimeout(() => {
    for (const d of _dials) {
      d.style.animation = '';
      d.style.transform = 'rotate(35deg)';
      d.style.transition = 'transform 0.15s ease-out';
    }
    const radio = _stage.firstElementChild;
    radio.style.animation = 'ai-loading-glow 0.6s ease-in-out';
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
