// src/achievements.js
//
// Single source of truth for achievement state.
// Public API: ACHIEVEMENTS, initAchievements, unlock, getState, isUnlocked, achievementEvents.

export const ACHIEVEMENTS = [
  { id: 'globe',      title: 'Doomsday Theorist',     description: 'You watched the AI imagine the end of the world.',     icon: '🌍', xp: 100 },
  { id: 'cultureMap', title: 'Cultural Cartographer', description: 'You mapped the geography of digital narrative.',       icon: '🗺',  xp: 100 },
  { id: 'book',       title: 'Folklorist',            description: 'You read the AI\'s retelling of a Norwegian folktale.', icon: '📖', xp: 100 },
  { id: 'tv',         title: 'Archivist',             description: 'You spent time in the CDN broadcast archive.',          icon: '📺', xp: 100 },
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
