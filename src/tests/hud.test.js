// src/tests/hud.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

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
  document.body.innerHTML = '';
  vi.useFakeTimers();
  vi.stubGlobal('localStorage', mockLocalStorage());
  const ach = await import('../achievements.js');
  ach._resetForTests();
  ach.initAchievements();
  const hud = await import('../hud.js');
  hud._resetToastForTests();
});

afterEach(() => {
  vi.useRealTimers();
  delete window.__isInventoryOpen;
});

describe('toast component', () => {
  it('renders a toast in the DOM when an unlock fires', async () => {
    const hud = await import('../hud.js');
    hud.initAchievementToast();
    const ach = await import('../achievements.js');
    ach.unlock('book');
    const toast = document.querySelector('#achievement-toast-container .achievement-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Folklorist');
  });

  it('queues a second unlock — only one toast in DOM at a time', async () => {
    const hud = await import('../hud.js');
    hud.initAchievementToast();
    const ach = await import('../achievements.js');
    ach.unlock('book');
    ach.unlock('tv');
    const toasts = document.querySelectorAll('#achievement-toast-container .achievement-toast');
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toContain('Folklorist');
  });

  it('suppresses toast when inventory is open', async () => {
    window.__isInventoryOpen = () => true;
    const hud = await import('../hud.js');
    hud.initAchievementToast();
    const ach = await import('../achievements.js');
    ach.unlock('book');
    const toast = document.querySelector('#achievement-toast-container .achievement-toast');
    expect(toast).toBeNull();
  });
});
