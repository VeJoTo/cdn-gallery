// src/hud.js — keyboard highlight for the WASD/action HUD overlay
import { achievementEvents } from './achievements.js';

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

// ── Achievement toast ────────────────────────────────────────
const TOAST_HOLD_MS = 3500;
const TOAST_GAP_MS = 200;

let _container = null;
let _queue = [];
let _isShowing = false;
let _eventHandler = null;
let _visibilityHandler = null;

export function initAchievementToast() {
  if (_container) return;
  _container = document.createElement('div');
  _container.id = 'achievement-toast-container';
  _container.setAttribute('role', 'status');
  _container.setAttribute('aria-live', 'polite');
  document.body.appendChild(_container);

  _eventHandler = (e) => {
    if (typeof window !== 'undefined' && window.__isInventoryOpen?.()) {
      return; // suppress when inventory is open
    }
    _queue.push(e.detail);
    if (typeof document !== 'undefined' && document.hidden) {
      return; // hold queue until visible
    }
    _drainQueue();
  };
  achievementEvents.addEventListener('unlocked', _eventHandler);

  if (typeof document !== 'undefined') {
    _visibilityHandler = () => {
      if (!document.hidden) _drainQueue();
    };
    document.addEventListener('visibilitychange', _visibilityHandler);
  }
}

function _drainQueue() {
  if (_isShowing || _queue.length === 0) return;
  const detail = _queue.shift();
  _showToast(detail);
}

function _showToast({ definition }) {
  _isShowing = true;
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const el = document.createElement('div');
  el.className = 'achievement-toast' + (reduceMotion ? ' reduce-motion' : '');
  el.innerHTML = `
    <div class="achievement-toast__icon">${definition.icon}</div>
    <div class="achievement-toast__body">
      <div class="achievement-toast__header">✦ Achievement</div>
      <div class="achievement-toast__title">${definition.title}</div>
      <div class="achievement-toast__desc">${definition.description}</div>
      <div class="achievement-toast__xp">+${definition.xp} XP</div>
    </div>
  `;
  _container.appendChild(el);

  // Play chime; failures (autoplay block) are silent.
  try {
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
    const audio = new Audio(base + 'sounds/achievement-chime.wav');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (_) { /* ignore */ }

  const holdMs = reduceMotion ? 3800 : (350 + TOAST_HOLD_MS);
  const exitMs = reduceMotion ? 200 : 500;
  setTimeout(() => {
    el.classList.add('achievement-toast--exit');
    setTimeout(() => {
      el.remove();
      _isShowing = false;
      setTimeout(_drainQueue, TOAST_GAP_MS);
    }, exitMs);
  }, holdMs);
}

// Test-only helper.
export function _resetToastForTests() {
  if (_eventHandler) achievementEvents.removeEventListener('unlocked', _eventHandler);
  if (_visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', _visibilityHandler);
  }
  _container?.remove();
  _container = null;
  _queue = [];
  _isShowing = false;
  _eventHandler = null;
  _visibilityHandler = null;
}
