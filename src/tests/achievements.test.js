// src/tests/achievements.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

function mockLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(async () => {
  vi.stubGlobal('localStorage', mockLocalStorage());
  const mod = await import('../achievements.js');
  mod._resetForTests();
});

describe('ACHIEVEMENTS definitions', () => {
  it('has exactly 4 achievements with required fields', async () => {
    const { ACHIEVEMENTS } = await import('../achievements.js');
    expect(ACHIEVEMENTS).toHaveLength(4);
    for (const a of ACHIEVEMENTS) {
      expect(a).toHaveProperty('id');
      expect(a).toHaveProperty('title');
      expect(a).toHaveProperty('description');
      expect(a).toHaveProperty('icon');
      expect(a).toHaveProperty('xp');
    }
  });

  it('includes the 4 expected ids', async () => {
    const { ACHIEVEMENTS } = await import('../achievements.js');
    const ids = ACHIEVEMENTS.map(a => a.id).sort();
    expect(ids).toEqual(['book', 'cultureMap', 'globe', 'tv']);
  });
});

describe('getState — initial', () => {
  it('returns empty unlocked set, xp 0, level 1, empty recent before init', async () => {
    const { getState } = await import('../achievements.js');
    const s = getState();
    expect(s.unlockedIds).toEqual(new Set());
    expect(s.xp).toBe(0);
    expect(s.level).toBe(1);
    expect(s.recent).toEqual([]);
  });
});

describe('initAchievements — persistence', () => {
  const STORAGE_KEY = 'cdn-gallery:achievements';

  it('loads empty state when nothing is stored', async () => {
    const { initAchievements, getState } = await import('../achievements.js');
    initAchievements();
    expect(getState().unlockedIds.size).toBe(0);
  });

  it('round-trips unlocked set across re-init via real shape', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      unlocked: { book: 1234567890, tv: 1234567999 },
    }));
    const { initAchievements, getState } = await import('../achievements.js');
    initAchievements();
    const s = getState();
    expect(s.unlockedIds).toEqual(new Set(['book', 'tv']));
    expect(s.xp).toBe(200);
    expect(s.level).toBe(3);
  });

  it('falls back to empty state on corrupted JSON', async () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initAchievements, getState } = await import('../achievements.js');
    initAchievements();
    expect(getState().unlockedIds.size).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('falls back to empty state on unknown schemaVersion', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 999,
      unlocked: { book: 1 },
    }));
    const { initAchievements, getState } = await import('../achievements.js');
    initAchievements();
    expect(getState().unlockedIds.size).toBe(0);
  });
});
