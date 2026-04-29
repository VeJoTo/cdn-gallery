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

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage());
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
