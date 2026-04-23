// src/sky.js

const STORAGE_KEY = 'cdn-gallery-sky-mode';
const VALID_MODES = new Set(['day', 'night']);

export function getSkyMode() {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return VALID_MODES.has(stored) ? stored : 'day';
  } catch {
    return 'day';
  }
}

export function setSkyMode(mode) {
  if (!VALID_MODES.has(mode)) return;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage unavailable — choice won't persist, but don't crash.
  }
}
