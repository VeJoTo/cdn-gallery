// src/achievements.js
//
// Single source of truth for achievement state.
// Public API: ACHIEVEMENTS, initAchievements, unlock, getState, isUnlocked, achievementEvents.

export const ACHIEVEMENTS = [
  { id: 'globe',      title: 'Doomsday Theorist',     description: 'You watched the AI imagine the end of the world.',     icon: '🌍', xp: 100 },
  { id: 'cultureMap', title: 'Cultural Cartographer', description: 'You mapped the geography of digital narrative.',       icon: '🗺',  xp: 100 },
  { id: 'book',       title: 'Folklorist',            description: 'You read the AI\'s retelling of a Norwegian folktale.', icon: '📖', xp: 100 },
  { id: 'tv',         title: 'AI Artist',             description: 'You watched AI-generated art on the gallery TV.',       icon: '📺', xp: 100 },
];

let _state = { unlocked: {} }; // id -> timestampMs

export function getState() {
  const unlockedIds = new Set(Object.keys(_state.unlocked));
  const xp = Array.from(unlockedIds).reduce(
    (sum, id) => sum + (ACHIEVEMENTS.find(a => a.id === id)?.xp ?? 0),
    0
  );
  const level = Math.floor(xp / 100) + 1;
  const recent = Object.entries(_state.unlocked)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, ts]) => ({ id, ts }));
  return { unlockedIds, xp, level, recent };
}

export function isUnlocked(id) {
  return Object.prototype.hasOwnProperty.call(_state.unlocked, id);
}

const STORAGE_KEY = 'cdn-gallery:achievements';
const SCHEMA_VERSION = 1;

export function initAchievements() {
  _state = _readFromStorage();
}

function _readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: {} };
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== SCHEMA_VERSION) return { unlocked: {} };
    if (!parsed.unlocked || typeof parsed.unlocked !== 'object') return { unlocked: {} };
    return { unlocked: { ...parsed.unlocked } };
  } catch (err) {
    console.warn('[achievements] localStorage read failed:', err);
    return { unlocked: {} };
  }
}

function _writeToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      unlocked: _state.unlocked,
    }));
  } catch (err) {
    console.warn('[achievements] localStorage write failed:', err);
  }
}

export const achievementEvents = new EventTarget();

export function unlock(id) {
  const definition = ACHIEVEMENTS.find(a => a.id === id);
  if (!definition) {
    console.warn(`[achievements] unknown id: ${id}`);
    return;
  }
  if (isUnlocked(id)) return; // idempotent

  _state.unlocked[id] = Date.now();
  _writeToStorage();

  const { xp: newXp, level: newLevel } = getState();
  achievementEvents.dispatchEvent(new CustomEvent('unlocked', {
    detail: { id, definition, newXp, newLevel },
  }));
}

// Test-only — do not call from production code.
export function _resetForTests() {
  _state = { unlocked: {} };
}
