// src/loading-ai.js
// Plays the AI-room entrance loading animation. See
// docs/superpowers/specs/2026-05-12-ai-room-loading-screen-design.md
import { drawRadioFace } from './scene/face-primitives.js';

const OVERLAY_ID = 'ai-loading-overlay';
const TOTAL_MS = 2500;

let _overlay = null;

function _ensureOverlay() {
  if (_overlay && document.body.contains(_overlay)) return _overlay;
  const el = document.createElement('div');
  el.id = OVERLAY_ID;
  el.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: #0a1420;
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto;
  `;
  document.body.appendChild(el);
  _overlay = el;
  return el;
}

function _teardown() {
  if (_overlay && _overlay.parentNode) {
    _overlay.parentNode.removeChild(_overlay);
  }
  _overlay = null;
}

export function playAiLoadingScreen() {
  _ensureOverlay();
  return new Promise((resolve) => {
    setTimeout(() => {
      _teardown();
      resolve();
    }, TOTAL_MS);
  });
}
