// src/hud.js — keyboard highlight for the WASD/action HUD overlay
const TRACKED_KEYS = new Set(['w', 'a', 's', 'd', 'e', 'g']);

export function initHUD() {
  const keyEls = {};
  document.querySelectorAll('[data-hud-key]').forEach(el => {
    keyEls[el.dataset.hudKey] = el;
  });

  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (TRACKED_KEYS.has(k) && keyEls[k]) keyEls[k].classList.add('pressed');
  });

  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (TRACKED_KEYS.has(k) && keyEls[k]) keyEls[k].classList.remove('pressed');
  });
}
