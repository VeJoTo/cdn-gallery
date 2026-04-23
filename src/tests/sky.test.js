// src/tests/sky.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSkyMode, setSkyMode } from '../sky.js';

function mockLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

describe('sky mode persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage());
  });

  it('returns "day" when nothing is stored', () => {
    expect(getSkyMode()).toBe('day');
  });

  it('returns "day" when stored value is garbage', () => {
    localStorage.setItem('cdn-gallery-sky-mode', 'banana');
    expect(getSkyMode()).toBe('day');
  });

  it('round-trips "night"', () => {
    setSkyMode('night');
    expect(getSkyMode()).toBe('night');
  });

  it('round-trips "day"', () => {
    setSkyMode('day');
    expect(getSkyMode()).toBe('day');
  });

  it('setSkyMode rejects invalid values silently (stays at previous)', () => {
    setSkyMode('night');
    setSkyMode('banana');
    expect(getSkyMode()).toBe('night');
  });

  it('setSkyMode does not throw when localStorage.setItem throws', () => {
    const throwingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('QuotaExceededError');
      },
    };
    vi.stubGlobal('localStorage', throwingStorage);
    expect(() => setSkyMode('night')).not.toThrow();
  });
});
