# Achievements & XP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-achievement, 4-level XP system to the CDN gallery. Each unlock fires a polaroid-style toast popup with a chime; unlocked achievements persist to localStorage and show as a polaroid grid in a new "Achievements" tab inside the existing inventory scrapbook.

**Architecture:** Single source-of-truth module `src/achievements.js` exposes `unlock(id)`, manages localStorage persistence, and emits `unlocked` events on a public `EventTarget`. Scene/UI code calls `unlock('id')` at exhibit-open sites (idempotent — second call is a no-op). The toast component subscribes to events and renders the popup. The inventory's Achievements tab reads `getState()` directly when opened.

**Tech Stack:** Vanilla JS (ES modules), Three.js (existing), vitest + jsdom (existing), no new runtime deps.

**Spec:** `docs/superpowers/specs/2026-04-29-achievements-design.md`

---

## File structure

| File | Status | Responsibility |
|---|---|---|
| `src/achievements.js` | NEW | State + persistence + events. Public API: `ACHIEVEMENTS`, `initAchievements`, `unlock`, `getState`, `isUnlocked`, `achievementEvents`. |
| `src/tests/achievements.test.js` | NEW | Unit tests for the module. |
| `src/hud.js` | MODIFY | Mount toast container; render toast on `unlocked` event; queue and reduced-motion handling. |
| `src/tests/hud.test.js` | NEW | Tests for toast queue + suppression behavior. |
| `src/main.js` | MODIFY | Call `initAchievements()` at boot; add `unlock('tv')` inside `enterTVMode()`. |
| `src/navigation.js` | (no change) | Existing dispatcher — unlock calls live inside `ui.openBook` / `ui.openFinDuMonde` instead. |
| `src/ui.js` | MODIFY | Call `unlock('book')` inside `openBook()`; call `unlock('globe')` inside `openFinDuMonde()`; rebuild inventory `openInventory()` to render tab-switchable content with new Achievements tab. |
| `src/scene/kultur-kartet.js` | MODIFY | Call `unlock('cultureMap')` inside `handleKartetMapClick()`. |
| `styles/main.css` | MODIFY | Toast styles, locked/unlocked polaroid styles, tab switching active states. |
| `public/sounds/achievement-chime.wav` | NEW | ~150ms paper-flick sample. |

---

## Task 1: Achievements module — definitions and `getState` skeleton

**Files:**
- Create: `src/achievements.js`
- Create: `src/tests/achievements.test.js`

- [ ] **Step 1: Write failing tests for definitions and initial state**

Create `src/tests/achievements.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/achievements.test.js`
Expected: FAIL — `Failed to resolve import '../achievements.js'`

- [ ] **Step 3: Create the module skeleton**

Create `src/achievements.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/achievements.test.js`
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/achievements.js src/tests/achievements.test.js
git commit -m "Add achievements module skeleton with definitions and getState"
```

---

## Task 2: Persistence — load and save to localStorage

**Files:**
- Modify: `src/achievements.js`
- Modify: `src/tests/achievements.test.js`

- [ ] **Step 1: Add failing tests for persistence**

Append to `src/tests/achievements.test.js`:

```js
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
```

> **Note:** Each `await import(...)` is intentional — vitest module cache is reset per test file but not per test. To avoid cross-test bleed, we'll add `beforeEach` reset of `_state` via a test-only helper.

- [ ] **Step 2: Add a test-only `_resetForTests` helper to the module**

In `src/achievements.js`, add at the bottom:

```js
// Test-only — do not call from production code.
export function _resetForTests() {
  _state = { unlocked: {} };
}
```

And in `src/tests/achievements.test.js`, update the top-level `beforeEach`:

```js
beforeEach(async () => {
  vi.stubGlobal('localStorage', mockLocalStorage());
  const mod = await import('../achievements.js');
  mod._resetForTests();
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/tests/achievements.test.js`
Expected: FAIL — `initAchievements is not a function` (or similar).

- [ ] **Step 4: Implement `initAchievements` and persistence**

Add to `src/achievements.js`:

```js
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/tests/achievements.test.js`
Expected: PASS — all 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/achievements.js src/tests/achievements.test.js
git commit -m "Add localStorage persistence with schema version and corruption recovery"
```

---

## Task 3: `unlock()` with idempotency + event emission

**Files:**
- Modify: `src/achievements.js`
- Modify: `src/tests/achievements.test.js`

- [ ] **Step 1: Add failing tests for unlock behavior**

Append to `src/tests/achievements.test.js`:

```js
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
    // Fake out timestamps by stubbing Date.now between calls.
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/achievements.test.js`
Expected: FAIL — `unlock is not a function` and `achievementEvents is undefined`.

- [ ] **Step 3: Implement `unlock` and `achievementEvents`**

Add to `src/achievements.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/achievements.test.js`
Expected: PASS — all 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/achievements.js src/tests/achievements.test.js
git commit -m "Add idempotent unlock with event emission and persistence"
```

---

## Task 4: Wire `initAchievements()` into app boot

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Find the boot section in main.js**

Read `src/main.js` lines 1-50 to find the import block and confirm the right import location.

- [ ] **Step 2: Add the import and init call**

At the top of `src/main.js` (alongside other module imports), add:

```js
import { initAchievements } from './achievements.js';
```

After the imports complete and before any scene setup runs, add:

```js
initAchievements();
```

(Place this near the existing top-of-file initialization — before `createKulturKartet`, before `buildTV`, etc. The exact line varies; place it as the first call after imports complete.)

- [ ] **Step 3: Run dev server briefly and check console**

```bash
npm run dev
```

Open the browser, look at DevTools console. Expected: no errors about `initAchievements` or `localStorage`. Ctrl-C to stop.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "Initialize achievements module at app boot"
```

---

## Task 5: Add unlock calls at the 4 exhibit sites

**Files:**
- Modify: `src/ui.js` (book + globe/Fin du Monde)
- Modify: `src/main.js` (TV)
- Modify: `src/scene/kultur-kartet.js` (Culture Map)

This task adds 4 single-line calls. No tests in this task — the unit-tested module guarantees idempotency, and integration is verified manually in Task 11.

- [ ] **Step 1: Add `unlock('book')` inside `openBook()` in ui.js**

Find `function openBook()` in `src/ui.js` (around line 1118).
Add at the top of the function body (before any other code):

```js
import('./achievements.js').then(m => m.unlock('book'));
```

> **Why dynamic import here:** `ui.js` is large and circular-import sensitive; dynamic import sidesteps any cycle risk. Idempotency means calling it on every `openBook` is safe.

- [ ] **Step 2: Add `unlock('globe')` inside `openFinDuMonde()` in ui.js**

Find `function openFinDuMonde()` in `src/ui.js` (search for `openFinDuMonde`).
Add at the top of the function body:

```js
import('./achievements.js').then(m => m.unlock('globe'));
```

- [ ] **Step 3: Add `unlock('tv')` inside `enterTVMode()` in main.js**

Find `function enterTVMode()` in `src/main.js` (around line 1051).
Add at the top of the function body:

```js
unlock('tv');
```

And add to the imports at the top of `src/main.js`:

```js
import { initAchievements, unlock } from './achievements.js';
```

(Replace the existing `import { initAchievements }` line from Task 4.)

- [ ] **Step 4: Add `unlock('cultureMap')` inside `handleKartetMapClick()` in kultur-kartet.js**

Find `export function handleKartetMapClick` in `src/scene/kultur-kartet.js`.
Add at the top of the function body:

```js
import('../achievements.js').then(m => m.unlock('cultureMap'));
```

- [ ] **Step 5: Manually smoke-test in the browser**

```bash
npm run dev
```

In DevTools console, run `localStorage.removeItem('cdn-gallery:achievements')` then refresh. Walk through each exhibit:
- Open the book → check `localStorage.getItem('cdn-gallery:achievements')` shows `book` unlocked.
- Open Fin du Monde → confirm `globe` unlocked.
- Click the culture map → confirm `cultureMap` unlocked.
- Enter TV mode → confirm `tv` unlocked.

Expected: all 4 ids present in localStorage, no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/ui.js src/main.js src/scene/kultur-kartet.js
git commit -m "Wire unlock calls at the 4 exhibit open sites"
```

---

## Task 6: Toast component — render, queue, suppression, reduced-motion

**Files:**
- Modify: `src/hud.js`
- Create: `src/tests/hud.test.js`

> **Approach:** the toast lives in a dedicated `<div id="achievement-toast-container">` mounted under `<body>`. The component subscribes to `achievementEvents` once. Each event pushes onto a queue; the queue drains one at a time, respecting an "inventory open" check.

- [ ] **Step 1: Add a way for the inventory to publish open/close state**

The toast component needs to know if the inventory is open. Add a tiny shared module.

In `src/ui.js`, near the top of the `createUI` function (right after `inventoryOverlay` is grabbed), expose the open-state on the global window object so other modules can read it without an import cycle:

```js
window.__isInventoryOpen = () => !inventoryOverlay.classList.contains('hidden');
```

This will be the integration point the toast checks.

- [ ] **Step 2: Write failing tests for the toast component**

Create `src/tests/hud.test.js`:

```js
// src/tests/hud.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

beforeEach(async () => {
  document.body.innerHTML = '';
  vi.useFakeTimers();
  // Reset achievements module
  vi.stubGlobal('localStorage', {
    _store: new Map(),
    getItem(k) { return this._store.has(k) ? this._store.get(k) : null; },
    setItem(k, v) { this._store.set(k, String(v)); },
    removeItem(k) { this._store.delete(k); },
  });
  const m = await import('../achievements.js');
  m._resetForTests();
  m.initAchievements();
});

afterEach(() => {
  vi.useRealTimers();
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
    expect(toasts[0].textContent).toContain('Folklorist'); // first in queue
  });

  it('suppresses toast when inventory is open', async () => {
    window.__isInventoryOpen = () => true;
    const hud = await import('../hud.js');
    hud.initAchievementToast();
    const ach = await import('../achievements.js');
    ach.unlock('book');
    const toast = document.querySelector('#achievement-toast-container .achievement-toast');
    expect(toast).toBeNull();
    delete window.__isInventoryOpen;
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/tests/hud.test.js`
Expected: FAIL — `initAchievementToast is not a function`.

- [ ] **Step 4: Implement the toast component in `src/hud.js`**

Add to `src/hud.js` (export at the end of the file):

```js
import { achievementEvents } from './achievements.js';

const TOAST_HOLD_MS = 3500;
const TOAST_GAP_MS = 200;

let _container = null;
let _queue = [];
let _isShowing = false;

export function initAchievementToast() {
  if (_container) return;
  _container = document.createElement('div');
  _container.id = 'achievement-toast-container';
  _container.setAttribute('role', 'status');
  _container.setAttribute('aria-live', 'polite');
  document.body.appendChild(_container);

  achievementEvents.addEventListener('unlocked', (e) => {
    if (typeof window !== 'undefined' && window.__isInventoryOpen?.()) {
      return; // suppress when inventory is open
    }
    _queue.push(e.detail);
    if (typeof document !== 'undefined' && document.hidden) {
      return; // hold queue; visibilitychange listener below will drain
    }
    _drainQueue();
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) _drainQueue();
    });
  }
}

function _drainQueue() {
  if (_isShowing || _queue.length === 0) return;
  const detail = _queue.shift();
  _showToast(detail);
}

function _showToast({ id, definition, newXp }) {
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
    const audio = new Audio(import.meta.env.BASE_URL + 'sounds/achievement-chime.wav');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (_) { /* ignore */ }

  const totalLifetime = reduceMotion ? 4000 : 4350;
  setTimeout(() => {
    el.classList.add('achievement-toast--exit');
    setTimeout(() => {
      el.remove();
      _isShowing = false;
      setTimeout(_drainQueue, TOAST_GAP_MS);
    }, reduceMotion ? 200 : 500);
  }, reduceMotion ? 3800 : (350 + TOAST_HOLD_MS));
}

// Test-only helper.
export function _resetToastForTests() {
  _container?.remove();
  _container = null;
  _queue = [];
  _isShowing = false;
}
```

> **Note:** the `import.meta.env.BASE_URL` prefix matches the pattern in `globe-screen.js` for asset paths (avoids the Vite base-path doubling bug from the memory).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/tests/hud.test.js`
Expected: PASS — 3 tests pass.

> **If the "queues a second unlock" test fails because both toasts render synchronously:** the queue logic should ensure only the head of `_queue` is rendered; the second `unlock` pushes onto the queue but `_drainQueue` returns early because `_isShowing` is true. Verify this in the implementation.

- [ ] **Step 6: Mount the toast at app boot**

In `src/main.js`, near the existing `initAchievements()` call, add:

```js
import { initAchievementToast } from './hud.js';
// ...
initAchievementToast();
```

Update the existing `import { initAchievements, unlock } from './achievements.js';` line — `initAchievementToast` is imported from `hud.js`, separate.

- [ ] **Step 7: Commit**

```bash
git add src/hud.js src/main.js src/ui.js src/tests/hud.test.js
git commit -m "Add achievement toast component with queue and inventory suppression"
```

---

## Task 7: Toast styles + chime audio asset

**Files:**
- Modify: `styles/main.css`
- Create: `public/sounds/achievement-chime.wav`

- [ ] **Step 1: Source the chime sample**

The audio file needs to be a short (~150ms) paper-flick / soft stamp click.

Options (pick one):
- (a) Find a CC0 sample on freesound.org with `[paper flick]` or `[stamp click]` — download `.wav`, trim to ~150ms, save as `public/sounds/achievement-chime.wav`.
- (b) Generate one with `sox` or similar:
  ```bash
  mkdir -p public/sounds
  sox -n -r 44100 public/sounds/achievement-chime.wav synth 0.15 noise band 800 200 fade 0 0.15 0.05
  ```
  Produces a brief filtered-noise tap.
- (c) Use any short paper/click sample already in your collection.

Confirm the file plays in a browser by opening `http://localhost:5173/cdn-gallery/sounds/achievement-chime.wav` in dev mode.

- [ ] **Step 2: Add toast styles to `styles/main.css`**

Append to `styles/main.css`:

```css
/* ── Achievement toast ────────────────────────────── */
#achievement-toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1500;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.achievement-toast {
  display: flex;
  gap: 12px;
  width: 320px;
  padding: 12px 14px;
  background: #f5f0e0;
  border: 2px solid #3a2818;
  box-shadow: 2px 4px 12px rgba(0,0,0,0.3);
  font-family: 'Caveat', 'Georgia', cursive;
  color: #3a2818;
  transform: translate(40px, -20px) rotate(-8deg) scale(.92);
  opacity: 0;
  animation: ach-toast-enter 350ms cubic-bezier(.2,.8,.2,1.2) forwards,
             ach-toast-breathe 4s ease-in-out 350ms infinite,
             ach-toast-exit 500ms ease-in 3850ms forwards;
}

.achievement-toast.reduce-motion {
  animation: ach-toast-fade-in 200ms ease-out forwards,
             ach-toast-fade-out 200ms ease-in 3800ms forwards;
}

.achievement-toast::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 8px;
  width: 32px;
  height: 12px;
  background: rgba(0, 212, 255, 0.55);
  transform: rotate(-2deg);
}

.achievement-toast__icon {
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  background: #fff;
  border: 1px solid #d4c8a0;
}

.achievement-toast__body { flex: 1; min-width: 0; }
.achievement-toast__header {
  font-family: 'Pixelify Sans', system-ui, sans-serif;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #00d4ff;
  margin-bottom: 2px;
}
.achievement-toast__title {
  font-family: 'Caveat', cursive;
  font-size: 22px;
  line-height: 1.1;
  color: #3a2818;
}
.achievement-toast__desc {
  font-family: 'Caveat', cursive;
  font-size: 14px;
  font-style: italic;
  color: #5a4a3a;
  margin-top: 2px;
  line-height: 1.2;
}
.achievement-toast__xp {
  font-family: 'Pixelify Sans', system-ui, sans-serif;
  font-size: 12px;
  color: #00d4ff;
  margin-top: 4px;
}

@keyframes ach-toast-enter {
  from { transform: translate(40px, -20px) rotate(-8deg) scale(.92); opacity: 0; }
  to   { transform: translate(0, 0) rotate(-1.5deg) scale(1); opacity: 1; }
}
@keyframes ach-toast-breathe {
  0%, 100% { transform: translate(0, 0) rotate(-1.5deg) scale(1); }
  50%      { transform: translate(0, 0) rotate(-1.2deg) scale(1); }
}
@keyframes ach-toast-exit {
  from { transform: translate(0, 0) rotate(-1.5deg) scale(1); opacity: 1; }
  to   { transform: translate(0, -30px) rotate(-1.5deg) scale(1); opacity: 0; }
}
@keyframes ach-toast-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ach-toast-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .achievement-toast {
    animation: ach-toast-fade-in 200ms ease-out forwards,
               ach-toast-fade-out 200ms ease-in 3800ms forwards;
    transform: none;
  }
}
```

- [ ] **Step 3: Smoke test in browser**

```bash
npm run dev
```

Clear localStorage in DevTools, refresh, walk into one exhibit. Expected: toast slides in from top-right, holds, drifts up-and-out. Chime plays. No console errors.

Try also with `prefers-reduced-motion` enabled (DevTools → Rendering → Emulate CSS media feature). Expected: toast fades in/out, no slide.

- [ ] **Step 4: Commit**

```bash
git add styles/main.css public/sounds/achievement-chime.wav
git commit -m "Style achievement toast and add chime sound"
```

---

## Task 8: Achievements tab content rendering

**Files:**
- Modify: `src/ui.js`
- Modify: `src/tests/ui.test.js` (or create `src/tests/achievements-tab.test.js`)

> **Pure-rendering function:** create `renderAchievementsTab(state)` that returns an HTML string. This makes it unit-testable without spinning up the full inventory.

- [ ] **Step 1: Add failing tests for the rendering function**

Append to `src/tests/ui.test.js` (or create `src/tests/achievements-tab.test.js` with the same structure as the existing ui.test.js header):

```js
import { renderAchievementsTab } from '../ui.js';

describe('renderAchievementsTab', () => {
  it('renders 4 polaroid slots with correct unlocked/locked classes', () => {
    const html = renderAchievementsTab({
      unlockedIds: new Set(['book']),
      xp: 100,
      level: 2,
      recent: [{ id: 'book', ts: Date.now() }],
    });
    expect((html.match(/class="polaroid achievement-polaroid/g) || []).length).toBe(4);
    expect((html.match(/achievement-polaroid--unlocked/g) || []).length).toBe(1);
    expect((html.match(/achievement-polaroid--locked/g) || []).length).toBe(3);
  });

  it('shows level number and XP fraction below max', () => {
    const html = renderAchievementsTab({
      unlockedIds: new Set(['book', 'tv']),
      xp: 200,
      level: 3,
      recent: [],
    });
    expect(html).toContain('Level 3');
    expect(html).toContain('200 / 300 XP');
  });

  it('shows MAX label at level cap', () => {
    const html = renderAchievementsTab({
      unlockedIds: new Set(['book', 'tv', 'globe', 'cultureMap']),
      xp: 400,
      level: 5,
      recent: [],
    });
    expect(html).toContain('MAX');
    expect(html).not.toContain('500 XP'); // does not show non-existent next level
  });

  it('shows description for unlocked, hides for locked', () => {
    const html = renderAchievementsTab({
      unlockedIds: new Set(['book']),
      xp: 100,
      level: 2,
      recent: [],
    });
    expect(html).toContain('You read the AI'); // book description visible
    expect(html).not.toContain('You watched the AI imagine'); // globe locked, no desc
  });

  it('hides recent stamps section when empty', () => {
    const html = renderAchievementsTab({
      unlockedIds: new Set(),
      xp: 0, level: 1, recent: [],
    });
    expect(html).not.toContain('recent stamps');
    expect(html).not.toContain('Recent stamps');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/ui.test.js`
Expected: FAIL — `renderAchievementsTab is not exported`.

- [ ] **Step 3: Implement `renderAchievementsTab`**

Add to `src/ui.js` near the top (after the existing exports):

```js
import { ACHIEVEMENTS } from './achievements.js';

export function renderAchievementsTab(state) {
  const total = ACHIEVEMENTS.length;
  const atMax = state.unlockedIds.size === total;
  const nextThreshold = state.level * 100;
  const xpInLevel = state.xp - (state.level - 1) * 100;
  const fillPct = atMax ? 100 : Math.min(100, (xpInLevel / 100) * 100);

  const subtitle = atMax
    ? 'All exhibits visited'
    : `${numWord(state.unlockedIds.size)} of ${numWord(total)} exhibits visited`;

  const xpLabel = atMax ? `${state.xp} XP — MAX` : `${state.xp} / ${nextThreshold} XP`;

  const polaroids = ACHIEVEMENTS.map((a, i) => {
    const unlocked = state.unlockedIds.has(a.id);
    const tilt = i % 2 === 0 ? -2 : 2;
    return `
      <div class="polaroid achievement-polaroid ${unlocked ? 'achievement-polaroid--unlocked' : 'achievement-polaroid--locked'}"
           style="transform: rotate(${tilt}deg)">
        <div class="polaroid-img" style="display:flex;align-items:center;justify-content:center;font-size:38px">${a.icon}</div>
        <div class="polaroid-caption">${a.title}</div>
        ${unlocked ? `<div class="achievement-polaroid__desc">${a.description}</div>` : ''}
      </div>
    `;
  }).join('');

  const recentList = state.recent.length > 0 ? `
    <div class="achievement-recent">
      <h4>Recent stamps</h4>
      <ul>
        ${state.recent.map(r => {
          const def = ACHIEVEMENTS.find(a => a.id === r.id);
          const time = new Date(r.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `<li>${def?.title ?? r.id} <span>${time}</span></li>`;
        }).join('')}
      </ul>
    </div>
  ` : '';

  return `
    <div class="scrapbook">
      <div class="scrapbook-page scrapbook-left">
        <h2 class="scrapbook-title">Curator's Notebook</h2>
        <div class="achievement-rank">
          <div class="achievement-rank__level">✦ Level ${state.level}</div>
          <div class="achievement-rank__bar">
            <div class="achievement-rank__bar-fill" style="width:${fillPct}%"></div>
            ${atMax ? '<div class="achievement-rank__max">MAX</div>' : ''}
          </div>
          <div class="achievement-rank__xp">${xpLabel}</div>
          <div class="achievement-rank__subtitle">${subtitle}</div>
        </div>
        ${recentList}
      </div>
      <div class="scrapbook-spine"></div>
      <div class="scrapbook-page scrapbook-right">
        <h2 class="scrapbook-title">Stamps &amp; Souvenirs</h2>
        <div class="achievement-grid">
          ${polaroids}
        </div>
      </div>
    </div>
  `;
}

function numWord(n) {
  return ['Zero', 'One', 'Two', 'Three', 'Four'][n] ?? String(n);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/ui.test.js`
Expected: PASS — 5 new tests pass alongside any existing ui tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui.js src/tests/ui.test.js
git commit -m "Add Achievements tab rendering function"
```

---

## Task 9: Tab switching — move existing inventory body to Profile tab

**Files:**
- Modify: `src/ui.js`

This task changes the inventory's `openInventory()` to render tab-switchable content. The existing body (Tasks + Discoveries + Settings) becomes the **Profile** tab. The new **Achievements** tab calls `renderAchievementsTab(getState())`.

- [ ] **Step 1: Refactor `openInventory()` to render via tabs**

In `src/ui.js`, locate `function openInventory()` (around line 348). The current implementation sets `inventoryContent.innerHTML` to a multiline template literal containing `<div class="scrapbook">…</div>`.

**Extract** the current template literal body (everything between the backticks at lines ~349-411) into a new function `renderProfileTab()` that returns it as a string — but **omit the existing `<div class="scrapbook-tabs">…</div>` block** (the four tab buttons starting around line 404). The tab sidebar is rendered separately by `renderTabSidebar()` below so we don't double-render.

```js
function renderProfileTab() {
  return `
    <div class="scrapbook">
      <div class="scrapbook-page scrapbook-left">
        <!-- Paste the existing left-page content verbatim from current openInventory():
             - <h2 class="scrapbook-title">The Game Room</h2>
             - the .polaroid block
             - the .sticky-note "Tasks" block
             - the .sticky-note.settings-stickynote block (with sky toggle)
             - the .scrapbook-doodle ✨ -->
      </div>
      <div class="scrapbook-spine"></div>
      <div class="scrapbook-page scrapbook-right">
        <h2 class="scrapbook-title">Discoveries</h2>
        <!-- Paste the existing .discovery-grid block and .scrapbook-page-num verbatim.
             Do NOT include the .scrapbook-tabs block — that is rendered by renderTabSidebar(). -->
      </div>
    </div>
  `;
}
```

> **Concrete steps:** Open `src/ui.js` at line 348. Select the contents of the template literal (everything between the opening and closing backticks of `inventoryContent.innerHTML = \`...\``). Paste into the new `renderProfileTab()`. Delete the `<div class="scrapbook-tabs">…</div>` block within the pasted HTML. Then replace `openInventory()`'s body with the new tab-aware logic shown below.

Then in `openInventory()`:

```js
let _activeTab = 'profile';

async function openInventory() {
  await renderInventoryWithTab(_activeTab);
  inventoryOverlay.classList.remove('hidden');
}

async function renderInventoryWithTab(tab) {
  _activeTab = tab;
  const ach = await import('./achievements.js');
  const body = tab === 'achievements'
    ? renderAchievementsTab(ach.getState())
    : renderProfileTab();

  inventoryContent.innerHTML = body + renderTabSidebar(tab);

  // Re-wire interactions that the old code wired up.
  if (tab === 'profile') wireSkyToggle();
  wireTabButtons();
}

function renderTabSidebar(activeTab) {
  return `
    <div class="scrapbook-tabs">
      <button class="scrapbook-tab ${activeTab==='achievements'?'is-active':''}" data-tab="achievements">🏆 Achievements</button>
      <button class="scrapbook-tab ${activeTab==='profile'?'is-active':''}" data-tab="profile">👤 Profile</button>
      <button class="scrapbook-tab" data-tab="resources">📚 Resources</button>
      <button class="scrapbook-tab" data-tab="cdn">🌐 CDN Website</button>
    </div>
  `;
}

function wireTabButtons() {
  inventoryContent.querySelectorAll('.scrapbook-tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === 'achievements' || tab === 'profile') {
        renderInventoryWithTab(tab);
      }
      // 'resources' and 'cdn' tabs are out of scope — no-op for now.
    });
  });
}

function wireSkyToggle() {
  const skyCheckbox = inventoryContent.querySelector('#sky-mode-checkbox');
  if (!skyCheckbox) return;
  skyCheckbox.checked = getSkyMode() === 'night';
  skyCheckbox.addEventListener('change', () => {
    const nextMode = skyCheckbox.checked ? 'night' : 'day';
    setSkyMode(nextMode);
    applySkyMode(scene, nextMode);
  });
}
```

> **Critical:** when copying the existing `openInventory()` HTML into `renderProfileTab()`, leave the **scrapbook-tabs** block out — the sidebar is now rendered separately by `renderTabSidebar()`. Don't double-render the tab buttons.

- [ ] **Step 2: Smoke test in browser**

```bash
npm run dev
```

- Press `E` to open inventory. Expected: lands on Profile tab; existing Tasks/Discoveries/Settings content visible.
- Click 🏆 Achievements. Expected: switches to Achievements tab; greyed-out polaroids if nothing unlocked, level 1, "Zero of Four exhibits visited."
- Walk into the Book exhibit (close inventory first), then re-open and click Achievements. Expected: Folklorist polaroid is now full color, recent stamps list shows it.
- Click 📚 Resources or 🌐 CDN Website. Expected: no change (out of scope).

- [ ] **Step 3: Commit**

```bash
git add src/ui.js
git commit -m "Add tab switching to inventory; move existing body to Profile tab"
```

---

## Task 10: Achievements tab styles + locked/unlocked polaroid styles

**Files:**
- Modify: `styles/main.css`

- [ ] **Step 1: Append achievement-tab styles to `styles/main.css`**

```css
/* ── Achievements tab ─────────────────────────────── */
.achievement-rank {
  margin-bottom: 16px;
}
.achievement-rank__level {
  font-family: 'Caveat', cursive;
  font-size: 32px;
  color: #3a2818;
  line-height: 1;
}
.achievement-rank__level::first-letter,
.achievement-rank__level {
  /* the ✦ glyph stays in cyan via inline span if needed */
}
.achievement-rank__bar {
  position: relative;
  height: 8px;
  background: rgba(0,0,0,0.05);
  border: 2px dashed #c0b090;
  border-radius: 4px;
  margin: 8px 0 4px;
  overflow: hidden;
}
.achievement-rank__bar-fill {
  height: 100%;
  background: #00d4ff;
  transition: width 250ms ease-out;
}
.achievement-rank__max {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Pixelify Sans', system-ui, sans-serif;
  font-size: 9px;
  color: #3a2818;
  letter-spacing: 1px;
}
.achievement-rank__xp {
  font-family: 'Pixelify Sans', system-ui, sans-serif;
  font-size: 12px;
  color: #5a4a3a;
}
.achievement-rank__subtitle {
  font-family: 'Caveat', cursive;
  font-style: italic;
  font-size: 16px;
  color: #5a4a3a;
  margin-top: 8px;
}

.achievement-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.achievement-polaroid {
  position: relative;
  margin: 0;
  cursor: default;
  transition: transform 0.2s, filter 0.2s;
}
.achievement-polaroid--unlocked::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 8px;
  width: 28px;
  height: 10px;
  background: rgba(0, 212, 255, 0.55);
  transform: rotate(-3deg);
}
.achievement-polaroid--unlocked:hover {
  transform: translateY(-3px) rotate(0deg) !important;
}
.achievement-polaroid--locked {
  filter: grayscale(1) opacity(.55);
}
.achievement-polaroid--locked .polaroid-caption {
  color: #8a7a60;
}

.achievement-polaroid__desc {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  padding: 8px;
  background: #fef3a0;
  font-family: 'Caveat', cursive;
  font-size: 13px;
  color: #3a2818;
  z-index: 5;
  box-shadow: 1px 2px 4px rgba(0,0,0,0.15);
}
.achievement-polaroid--unlocked:hover .achievement-polaroid__desc {
  display: block;
}
@media (hover: none) {
  /* Touch — toggle via .is-tapped class instead of hover */
  .achievement-polaroid--unlocked:hover .achievement-polaroid__desc {
    display: none;
  }
  .achievement-polaroid--unlocked.is-tapped .achievement-polaroid__desc {
    display: block;
  }
}

.achievement-recent {
  margin-top: 16px;
  font-family: 'Caveat', cursive;
}
.achievement-recent h4 {
  font-size: 16px;
  color: #5a4a3a;
  margin-bottom: 4px;
}
.achievement-recent ul {
  list-style: none;
  padding: 0;
}
.achievement-recent li {
  font-size: 14px;
  color: #3a2818;
  padding: 2px 0;
}
.achievement-recent li span {
  font-family: 'Pixelify Sans', system-ui, sans-serif;
  font-size: 11px;
  color: #8a7a60;
  margin-left: 8px;
}

/* Active tab styling */
.scrapbook-tab.is-active {
  transform: translateX(8px);
  box-shadow: 4px 4px 6px rgba(0,0,0,0.2);
  font-weight: bold;
}
```

- [ ] **Step 2: Wire touch-tap toggle for `.achievement-polaroid--unlocked`**

In `src/ui.js`, after the call to `wireTabButtons()` for the Achievements tab specifically, add:

```js
function wireAchievementPolaroids() {
  inventoryContent.querySelectorAll('.achievement-polaroid--unlocked').forEach(el => {
    el.addEventListener('click', () => {
      const wasOpen = el.classList.contains('is-tapped');
      inventoryContent.querySelectorAll('.achievement-polaroid--unlocked.is-tapped')
        .forEach(e => e.classList.remove('is-tapped'));
      if (!wasOpen) el.classList.add('is-tapped');
    });
  });
}
```

Call it from `renderInventoryWithTab` when `tab === 'achievements'`:

```js
if (tab === 'achievements') wireAchievementPolaroids();
```

- [ ] **Step 3: Smoke test in browser**

```bash
npm run dev
```

Open inventory → Achievements tab. Verify:
- Locked polaroids appear desaturated, no tape corner, dim title.
- Unlocked polaroid has cyan tape, clear icon/title.
- Hover an unlocked polaroid (desktop): description appears below.
- Active tab button is shifted right with stronger shadow.
- The progress bar shows correct fill; "MAX" label appears only when all 4 unlocked.

- [ ] **Step 4: Commit**

```bash
git add styles/main.css src/ui.js
git commit -m "Style Achievements tab and locked/unlocked polaroids"
```

---

## Task 11: Manual playtest walk-through

**Files:** none (observational checklist).

This task is a manual run-through of the spec's playtest scenarios. No code changes. Document any issues found and create follow-up tasks if needed.

- [ ] **Step 1: Reset state and start dev server**

```bash
npm run dev
```

In DevTools console: `localStorage.removeItem('cdn-gallery:achievements')`. Refresh.

- [ ] **Step 2: Run the 6 playtest scenarios**

| # | Scenario | Pass criteria |
|---|---|---|
| 1 | Open the book cold | Toast appears top-right with "Folklorist" title, slides in, holds ~3.5s, drifts up-and-out. Chime plays. |
| 2 | Visit all 4 exhibits in one session | Open inventory → Achievements tab. Level 5, 4 unlocked polaroids, "Recent stamps" shows last 3, "All exhibits visited" subtitle. |
| 3 | Earn 2 → refresh → check inventory | localStorage persists. After refresh, both polaroids still unlocked, level matches. |
| 4 | `prefers-reduced-motion: reduce` | DevTools → Rendering → emulate `prefers-reduced-motion: reduce`. Trigger an unlock. Toast fades in/out, no slide/rotate/wobble. Chime still plays. |
| 5 | Open book → close → re-open | Second open: NO toast appears, no XP added (idempotency). Verify in DevTools console: `localStorage.getItem('cdn-gallery:achievements')` shows the same `book` timestamp from first open. |
| 6 | Open inventory, then unlock | Open inventory first; then in console run `(await import('/cdn-gallery/src/achievements.js')).unlock('cultureMap')`. Toast suppressed. Switch to Achievements tab → polaroid is now unlocked. |

- [ ] **Step 3: If any scenario fails, file a follow-up**

For each failure, write a new task in this file (under a "Follow-ups" section) with the scenario number, the observed behavior, and the suspected file/code area.

- [ ] **Step 4: Commit any documentation updates**

```bash
git add docs/superpowers/plans/2026-04-29-achievements.md
git commit -m "Document playtest results for achievements feature"
```

(If no failures: skip this commit.)

---

## Out of scope (deferred to future PRs)

- "New" badge on freshly-unlocked polaroids (mentioned as optional polish in spec §5).
- Resources / CDN Website tab content (the buttons exist but the tabs are no-ops).
- Achievement icon thumbnails (currently using emoji; could become illustrated stamp images).
- HUD-level XP bar.
- Unlock-event emission to telemetry / analytics.

---

## Self-review notes

- **Spec coverage:** all 10 spec sections have at least one task implementing them. §1 (player goal) and §9 (out of scope) are non-implementation. §10 (open items) — exhibit call-sites are now confirmed in this plan; chime sourcing is in Task 7 step 1; "new" badge is explicitly deferred.
- **Type consistency:** `unlock(id)`, `getState()`, `isUnlocked(id)`, `achievementEvents`, `ACHIEVEMENTS`, `initAchievements()`, `_resetForTests()` — names match across all tasks. The toast component uses `_resetToastForTests` as a separate helper to avoid name collision.
- **Bar math** (Task 8) matches spec §5 — `(xp - (level-1)*100) / 100` for fill, "MAX" label at cap.
