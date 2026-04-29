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

describe('unlock', () => {
  it('emits "unlocked" event with definition + newXp + newLevel on first call', async () => {
    const { initAchievements, unlock, achievementEvents } = await import('../achievements.js');
    initAchievements();
    const handler = vi.fn();
    achievementEvents.addEventListener('unlocked', handler);
    unlock('book');
    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0][0];
    expect(evt.detail.id).toBe('book');
    expect(evt.detail.definition.title).toBe('Folklorist');
    expect(evt.detail.newXp).toBe(100);
    expect(evt.detail.newLevel).toBe(2);
    achievementEvents.removeEventListener('unlocked', handler);
  });

  it('is a no-op on second call for same id (idempotent)', async () => {
    const { initAchievements, unlock, achievementEvents, getState } = await import('../achievements.js');
    initAchievements();
    const handler = vi.fn();
    achievementEvents.addEventListener('unlocked', handler);
    unlock('book');
    unlock('book');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(getState().xp).toBe(100);
    achievementEvents.removeEventListener('unlocked', handler);
  });

  it('writes to localStorage on unlock', async () => {
    const { initAchievements, unlock } = await import('../achievements.js');
    initAchievements();
    unlock('tv');
    const raw = localStorage.getItem('cdn-gallery:achievements');
    const parsed = JSON.parse(raw);
    expect(parsed.unlocked.tv).toBeTypeOf('number');
    expect(parsed.schemaVersion).toBe(1);
  });

  it('warns and no-ops for unknown id', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initAchievements, unlock, getState } = await import('../achievements.js');
    initAchievements();
    unlock('not-a-real-id');
    expect(warnSpy).toHaveBeenCalled();
    expect(getState().unlockedIds.size).toBe(0);
    warnSpy.mockRestore();
  });

  it('isUnlocked reflects current state', async () => {
    const { initAchievements, unlock, isUnlocked } = await import('../achievements.js');
    initAchievements();
    expect(isUnlocked('book')).toBe(false);
    unlock('book');
    expect(isUnlocked('book')).toBe(true);
  });

  it('getState.recent returns top-3 unlocks ordered desc by timestamp', async () => {
    const { initAchievements, unlock, getState } = await import('../achievements.js');
    initAchievements();
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1000); unlock('globe');
    nowSpy.mockReturnValue(2000); unlock('cultureMap');
    nowSpy.mockReturnValue(3000); unlock('book');
    nowSpy.mockReturnValue(4000); unlock('tv');
    const recent = getState().recent;
    expect(recent.map(r => r.id)).toEqual(['tv', 'book', 'cultureMap']);
    nowSpy.mockRestore();
  });
});
