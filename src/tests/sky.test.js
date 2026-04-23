// src/tests/sky.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSkyMode, setSkyMode } from '../sky.js';
import * as THREE from 'three';
import { applySkyMode, DAY_COLOR, NIGHT_COLOR } from '../sky.js';

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

describe('applySkyMode', () => {
  it('day mode sets the day background and adds no sky objects', () => {
    const scene = new THREE.Scene();
    applySkyMode(scene, 'day');
    expect(scene.background.getHex()).toBe(DAY_COLOR);
    expect(scene.getObjectByName('sky-stars')).toBeUndefined();
    expect(scene.getObjectByName('sky-moon')).toBeUndefined();
  });

  it('night mode sets the night background and adds stars + moon', () => {
    const scene = new THREE.Scene();
    applySkyMode(scene, 'night');
    expect(scene.background.getHex()).toBe(NIGHT_COLOR);
    expect(scene.getObjectByName('sky-stars')).toBeDefined();
    expect(scene.getObjectByName('sky-moon')).toBeDefined();
  });

  it('switching night → day removes sky objects', () => {
    const scene = new THREE.Scene();
    applySkyMode(scene, 'night');
    applySkyMode(scene, 'day');
    expect(scene.getObjectByName('sky-stars')).toBeUndefined();
    expect(scene.getObjectByName('sky-moon')).toBeUndefined();
  });

  it('calling night twice does not duplicate sky objects', () => {
    const scene = new THREE.Scene();
    applySkyMode(scene, 'night');
    applySkyMode(scene, 'night');
    const stars = scene.children.filter((c) => c.name === 'sky-stars');
    const moons = scene.children.filter((c) => c.name === 'sky-moon');
    expect(stars).toHaveLength(1);
    expect(moons).toHaveLength(1);
  });

  it('invalid mode falls back to day', () => {
    const scene = new THREE.Scene();
    applySkyMode(scene, 'banana');
    expect(scene.background.getHex()).toBe(DAY_COLOR);
  });
});
