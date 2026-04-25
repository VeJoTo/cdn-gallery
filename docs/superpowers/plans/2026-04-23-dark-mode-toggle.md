# Dark Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sun/moon toggle inside the inventory that switches the 3D scene between day (current) and night (dark sky + stars + moon). Inventory opens/closes with `E` key; the standalone Inventory button is removed.

**Architecture:** A new `src/sky.js` module owns all sky state — the night-mode color, the starfield/moon scene objects, and the localStorage persistence. Boot and room transitions in `src/main.js` call `applySkyMode(scene, getSkyMode())` instead of hardcoding the day color, so the user's choice survives scene changes. The toggle control lives as a settings sticky-note in the inventory scrapbook and fires the same `setSkyMode` + `applySkyMode` pair on change.

**Tech Stack:** Three.js (r165), Vite 5, Vitest 1.6, vanilla DOM/CSS.

**Spec:** `docs/superpowers/specs/2026-04-23-dark-mode-toggle-design.md`

---

## File Structure

**New files**

- `src/sky.js` — exports `applySkyMode`, `getSkyMode`, `setSkyMode`, plus the `DAY_COLOR` / `NIGHT_COLOR` constants used by the rest of the app
- `src/tests/sky.test.js` — unit tests for the three exported functions

**Modified files**

- `src/main.js` — apply sky mode on boot (line 36) and during room transitions (lines 769, 775); remove inventory button click handler (lines 929–932); pass a `toggleInventory` helper from the UI object
- `src/ui.js` — extend `openInventory()` to render the Settings sticky-note + pill toggle; expose `isInventoryOpen` and `toggleInventory`; add `E` key to the global keydown handler
- `index.html` — remove `<button id="inventory-btn">Inventory</button>`
- `styles/main.css` — remove `#inventory-btn` rules; add `.settings-stickynote` and `.sky-toggle` rules

---

## Task 1: localStorage helpers in `src/sky.js`

**Files:**
- Create: `src/sky.js`
- Create: `src/tests/sky.test.js`

- [ ] **Step 1: Write failing tests for `getSkyMode`/`setSkyMode`**

Create `src/tests/sky.test.js`:

```js
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/sky.test.js`
Expected: FAIL — module `../sky.js` cannot be resolved.

- [ ] **Step 3: Create `src/sky.js` with minimal helpers**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/sky.test.js`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sky.js src/tests/sky.test.js
git commit -m "feat(sky): getSkyMode/setSkyMode localStorage helpers"
```

---

## Task 2: `applySkyMode` — sky color, starfield, moon

**Files:**
- Modify: `src/sky.js`
- Modify: `src/tests/sky.test.js`

- [ ] **Step 1: Write failing tests for `applySkyMode`**

Append to `src/tests/sky.test.js` (after the existing `describe` block):

```js
import * as THREE from 'three';
import { applySkyMode, DAY_COLOR, NIGHT_COLOR } from '../sky.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/sky.test.js`
Expected: FAIL — `applySkyMode`, `DAY_COLOR`, `NIGHT_COLOR` not exported.

- [ ] **Step 3: Implement `applySkyMode` in `src/sky.js`**

Append to `src/sky.js`:

```js
import * as THREE from 'three';

export const DAY_COLOR = 0x88bbf0;
export const NIGHT_COLOR = 0x0a1128;

const STAR_COUNT = 800;
const SKY_RADIUS = 500;

function createStarfield() {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    // Upper hemisphere, with a little overhang so stars wrap past the horizon
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.9);
    const r = SKY_RADIUS;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.6,
    sizeAttenuation: true,
    depthWrite: false,
    transparent: true,
  });
  const points = new THREE.Points(geom, mat);
  points.name = 'sky-stars';
  points.frustumCulled = false;
  return points;
}

function createMoon() {
  const geom = new THREE.SphereGeometry(14, 24, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff4d6 });
  const moon = new THREE.Mesh(geom, mat);
  moon.position.set(260, 180, -240);
  moon.name = 'sky-moon';
  moon.frustumCulled = false;
  return moon;
}

function removeSkyObjects(scene) {
  for (const name of ['sky-stars', 'sky-moon']) {
    const existing = scene.getObjectByName(name);
    if (existing) scene.remove(existing);
  }
}

export function applySkyMode(scene, mode) {
  const resolved = VALID_MODES.has(mode) ? mode : 'day';
  removeSkyObjects(scene);
  if (resolved === 'night') {
    scene.background = new THREE.Color(NIGHT_COLOR);
    scene.add(createStarfield());
    scene.add(createMoon());
  } else {
    scene.background = new THREE.Color(DAY_COLOR);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/sky.test.js`
Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sky.js src/tests/sky.test.js
git commit -m "feat(sky): applySkyMode adds starfield + moon on night"
```

---

## Task 3: Integrate sky mode on boot and room transitions

**Files:**
- Modify: `src/main.js:36` (boot)
- Modify: `src/main.js:769` (nature-room transition)
- Modify: `src/main.js:775` (exterior-room transition)

The `ai` branch at `src/main.js:781` stays unchanged (AI room keeps `0xf4f6f8`).

- [ ] **Step 1: Add the import at the top of `src/main.js`**

Find the existing THREE import block near the top and add below it:

```js
import { applySkyMode, getSkyMode } from './sky.js';
```

- [ ] **Step 2: Replace the boot-time sky assignment**

Locate the line (currently `src/main.js:36`):

```js
// Start with exterior sky (overridden per room in transitions)
scene.background = new THREE.Color(0x88bbf0);
```

Replace with:

```js
// Start with exterior sky (overridden per room in transitions).
// applySkyMode respects the user's persisted day/night choice.
applySkyMode(scene, getSkyMode());
```

- [ ] **Step 3: Replace the nature-room transition sky reset**

Locate (currently `src/main.js:769`):

```js
    } else if (targetRoom === 'nature') {
      camera.position.set(NATURE_CENTER_X, EYE_HEIGHT, -3);
      camera.lookAt(NATURE_CENTER_X, EYE_HEIGHT, 0);
      currentRoom = 'nature';
      scene.background = new THREE.Color(0x88bbf0);
      scene.fog = null;
```

Replace the `scene.background = ...` line with:

```js
      applySkyMode(scene, getSkyMode());
```

So the block becomes:

```js
    } else if (targetRoom === 'nature') {
      camera.position.set(NATURE_CENTER_X, EYE_HEIGHT, -3);
      camera.lookAt(NATURE_CENTER_X, EYE_HEIGHT, 0);
      currentRoom = 'nature';
      applySkyMode(scene, getSkyMode());
      scene.fog = null;
```

- [ ] **Step 4: Replace the exterior-room transition sky reset**

Locate (currently `src/main.js:771`):

```js
    } else if (targetRoom === 'exterior') {
      camera.position.set(-20, EYE_HEIGHT, 8);
      camera.lookAt(-20, EYE_HEIGHT, 2);
      currentRoom = 'exterior';
      scene.background = new THREE.Color(0x88bbf0);
      scene.fog = null;
```

Replace the `scene.background = ...` line with:

```js
      applySkyMode(scene, getSkyMode());
```

So the block becomes:

```js
    } else if (targetRoom === 'exterior') {
      camera.position.set(-20, EYE_HEIGHT, 8);
      camera.lookAt(-20, EYE_HEIGHT, 2);
      currentRoom = 'exterior';
      applySkyMode(scene, getSkyMode());
      scene.fog = null;
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors referencing `sky.js`.

- [ ] **Step 6: Manually smoke-test day mode still works**

Run: `npm run dev`
Expected: load the page, exterior sky is the existing light blue, no stars/moon present, no console errors.

Stop the dev server with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "feat(sky): apply sky mode on boot and room transitions"
```

---

## Task 4: Remove the Inventory button from the HUD

**Files:**
- Modify: `index.html:31`
- Modify: `src/main.js:929-932`
- Modify: `styles/main.css` (all `#inventory-btn` rules)

- [ ] **Step 1: Remove the button from `index.html`**

Find and delete the line:

```html
  <button id="inventory-btn">Inventory</button>
```

- [ ] **Step 2: Remove the click handler from `src/main.js`**

Find and delete this block (currently `src/main.js:929-932`):

```js
document.getElementById('inventory-btn').addEventListener('click', () => {
  controls.unlock();
  ui.openInventory();
});
```

- [ ] **Step 3: Remove `#inventory-btn` CSS rules**

Open `styles/main.css`. Find and delete **all** rules targeting `#inventory-btn`. There are two blocks around lines 380 and 394:

```css
#inventory-btn { ... }
#inventory-btn:hover { ... }
```

Delete both. If adjacent rules reference `#inventory-btn` in selector lists, remove just the `#inventory-btn` portion of those selectors.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: succeeds, no `inventory-btn` references remain in output.

- [ ] **Step 5: Verify no dangling references**

Run: `grep -rn "inventory-btn" src/ index.html styles/`
Expected: no output (empty result).

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.js styles/main.css
git commit -m "chore: remove Inventory button from HUD"
```

---

## Task 5: `E` key opens and closes the inventory

**Files:**
- Modify: `src/ui.js` — expose `isInventoryOpen` + `toggleInventory` helpers; add E-key handling
- Modify: `src/main.js` — hook the E key through the UI object (or add the listener inside UI module)

The cleanest place for the keybind is inside `createUI()` in `src/ui.js` (the existing UI factory, currently at `src/ui.js:75`), alongside the existing global `Escape` handler (currently at `src/ui.js:709-720`). Reason: all other overlay refs are already in scope there.

- [ ] **Step 1: Add helpers inside `createUI()` in `src/ui.js`**

Just above the existing `closeInventory` function (currently `src/ui.js:330`), add:

```js
  function isInventoryOpen() {
    return !inventoryOverlay.classList.contains('hidden');
  }

  function isAnyOtherOverlayOpen() {
    // Any overlay that should block the E-key shortcut while it's open.
    const ids = [
      'panel-drawer',
      'gatekeeper-chat',
      'book-overlay',
      'rabbit-hole-overlay',
    ];
    return ids.some((id) => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden');
    });
  }

  function toggleInventory() {
    if (isInventoryOpen()) {
      closeInventory();
      return;
    }
    if (isAnyOtherOverlayOpen()) return;
    // Release pointer lock before showing the overlay — same behavior the
    // old Inventory button had (`controls.unlock(); openInventory();`).
    controls.unlock();
    openInventory();
  }
```

- [ ] **Step 2: Extend the global keydown handler**

Replace the existing handler at `src/ui.js:709-720`:

```js
  // ── Global Escape key ────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanelDrawer();
      closeGatekeeperChat();
      closeInventory();
      closeBook();
      closeRabbitHole();
      closeReport();
      closeFinDuMonde();
    }
  });
```

With:

```js
  // ── Global keyboard shortcuts ────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanelDrawer();
      closeGatekeeperChat();
      closeInventory();
      closeBook();
      closeRabbitHole();
      closeReport();
      closeFinDuMonde();
      return;
    }

    // "E" toggles the inventory, but not while the user is typing.
    if (e.key === 'e' || e.key === 'E') {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      toggleInventory();
    }
  });
```

- [ ] **Step 3: Export the helpers from the return object**

Find the `return { ... }` block at the end of `createUI()` (currently `src/ui.js:726-736`) and add `toggleInventory` and `isInventoryOpen`:

```js
  return {
    updateHUD,
    openPanelDrawer,
    openGatekeeperChat,
    openInventory,
    openBook,
    openRabbitHole,
    openReport,
    openFinDuMonde,
    updateHints,
    toggleInventory,
    isInventoryOpen,
  };
```

- [ ] **Step 4: Run existing tests to catch regressions**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`, open the gallery in the browser:

1. Click canvas to enter first-person → pointer locks
2. Press `E` → inventory opens, pointer unlocks
3. Press `E` → inventory closes
4. Press `ESC` while inventory is open → inventory closes (regression check)
5. Open the Guide chat → press `E` → inventory does NOT open (blocked by `isAnyOtherOverlayOpen`)
6. Close the chat, put focus in chat input, press `e` → inventory does NOT open (blocked by active-element check)

If any step fails, fix and repeat.

- [ ] **Step 6: Commit**

```bash
git add src/ui.js
git commit -m "feat(inventory): E key toggles inventory"
```

---

## Task 6: Settings sticky-note with sun/moon pill toggle

**Files:**
- Modify: `src/ui.js` — extend `openInventory()` and wire the toggle

- [ ] **Step 1: Import sky helpers at the top of `src/ui.js`**

Add below any other imports (there may not be any yet — check the first lines of the file):

```js
import { applySkyMode, getSkyMode, setSkyMode } from './sky.js';
```

- [ ] **Step 2: Inject the Settings sticky-note in the rendered HTML**

Find `openInventory()` in `src/ui.js` (currently line 274). Inside the `scrapbook-left` page, after the existing `<div class="sticky-note">...Tasks...</div>` block (ends around line 293), add a second sticky-note:

```html
          <div class="sticky-note settings-stickynote">
            <h3>Settings</h3>
            <label class="sky-toggle" aria-label="Toggle day or night sky">
              <span class="sky-toggle-label">Sky</span>
              <span class="sky-toggle-pill">
                <span class="sky-toggle-icon sky-toggle-sun" aria-hidden="true">☀</span>
                <input type="checkbox" class="sky-toggle-input" id="sky-mode-checkbox" />
                <span class="sky-toggle-knob"></span>
                <span class="sky-toggle-icon sky-toggle-moon" aria-hidden="true">🌙</span>
              </span>
            </label>
          </div>
```

The `scrapbook-left` page becomes (showing the relevant part — keep the existing polaroid and doodle):

```html
        <div class="scrapbook-page scrapbook-left">
          <h2 class="scrapbook-title">The Game Room</h2>
          <div class="polaroid">
            <div class="polaroid-img" style="background:#1a1a3e;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:32px">🎮</span>
            </div>
            <div class="polaroid-caption">My exploration so far</div>
          </div>
          <div class="sticky-note">
            <h3>Tasks</h3>
            <ul>
              <li>Explore the game room</li>
              <li>Read the wall panels</li>
              <li>Visit the rabbit hole</li>
              <li>Talk to the Guide</li>
            </ul>
          </div>
          <div class="sticky-note settings-stickynote">
            <h3>Settings</h3>
            <label class="sky-toggle" aria-label="Toggle day or night sky">
              <span class="sky-toggle-label">Sky</span>
              <span class="sky-toggle-pill">
                <span class="sky-toggle-icon sky-toggle-sun" aria-hidden="true">☀</span>
                <input type="checkbox" class="sky-toggle-input" id="sky-mode-checkbox" />
                <span class="sky-toggle-knob"></span>
                <span class="sky-toggle-icon sky-toggle-moon" aria-hidden="true">🌙</span>
              </span>
            </label>
          </div>
          <div class="scrapbook-doodle" style="position:absolute;bottom:20px;right:20px;font-size:24px;transform:rotate(-8deg);opacity:0.5">✨</div>
        </div>
```

- [ ] **Step 3: Wire the toggle after render**

Immediately before the `inventoryOverlay.classList.remove('hidden');` line at the end of `openInventory()`, add:

```js
    // Reflect current sky mode and wire the checkbox
    const skyCheckbox = inventoryContent.querySelector('#sky-mode-checkbox');
    if (skyCheckbox) {
      skyCheckbox.checked = getSkyMode() === 'night';
      skyCheckbox.addEventListener('change', () => {
        const nextMode = skyCheckbox.checked ? 'night' : 'day';
        setSkyMode(nextMode);
        applySkyMode(scene, nextMode);
      });
    }
```

This references a `scene` variable — `ui.js` doesn't have one yet. Make `scene` available to `initUI` by changing the signature.

- [ ] **Step 4: Thread `scene` into `createUI`**

`createUI` is currently defined at `src/ui.js:75` as:

```js
export function createUI(camera, renderer, controls) {
```

Add `scene` as a fourth positional parameter:

```js
export function createUI(camera, renderer, controls, scene) {
```

Then in `src/main.js`, find the call site (search `createUI(`) and add `scene` as the fourth argument:

```js
const ui = createUI(camera, renderer, controls, scene);
```

- [ ] **Step 5: Run existing tests**

Run: `npx vitest run`
Expected: all tests PASS. The existing tests only exercise pure helpers (`BOOK_PAGES`, `getNextPageIndex`, `answer`, etc.), so the `createUI` signature change should not break them.

- [ ] **Step 6: Manual test**

Run `npm run dev`:

1. Open inventory with `E`
2. See the Settings sticky-note on the left page with a sun☀ / moon🌙 pill
3. Click the pill knob — sky flips to night (dark blue + stars + moon appear)
4. Close inventory, walk around — sky stays night
5. Reopen inventory — pill still shows night state
6. Click pill again — sky returns to day
7. Reload page in night mode — sky starts night on load, pill reflects night

- [ ] **Step 7: Commit**

```bash
git add src/ui.js src/main.js
git commit -m "feat(inventory): Settings sticky-note with sun/moon toggle"
```

---

## Task 7: CSS for Settings sticky-note and pill toggle

**Files:**
- Modify: `styles/main.css`

Styling goal: the Settings sticky-note matches the existing Tasks sticky-note but with the pill laid out horizontally (label + pill inline). The pill reuses the visual language of the sun/moon reference: rounded capsule, sun icon on the left inside the "off" position, moon icon on the right inside the "on" position, knob slides between them.

- [ ] **Step 1: Add styles at the end of `styles/main.css`**

```css
/* ── Settings sticky-note (inventory) ────────── */
.settings-stickynote {
  /* Inherits .sticky-note — this class just differentiates for future tweaks */
  margin-top: 14px;
}

.settings-stickynote h3 {
  margin: 0 0 10px 0;
}

/* ── Sky toggle (sun / moon pill) ────────────── */
.sky-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.sky-toggle-label {
  font-size: 14px;
  font-weight: 500;
}

.sky-toggle-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 62px;
  height: 28px;
  padding: 0 6px;
  border-radius: 14px;
  background: #e6e6ea;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: background 0.25s ease;
}

.sky-toggle-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
  z-index: 2;
}

.sky-toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.25s ease, background 0.25s ease;
  z-index: 1;
}

.sky-toggle-icon {
  font-size: 14px;
  line-height: 1;
  z-index: 1;
  pointer-events: none;
}

.sky-toggle-sun { color: #f2b732; }
.sky-toggle-moon { color: #6f7280; }

/* Checked = night */
.sky-toggle-input:checked ~ .sky-toggle-knob {
  transform: translateX(32px);
  background: #1d2033;
}

.sky-toggle-input:checked + .sky-toggle-knob + .sky-toggle-moon {
  color: #e9e3c4;
}

.sky-toggle:has(.sky-toggle-input:checked) .sky-toggle-pill {
  background: #2a2f44;
}

.sky-toggle:has(.sky-toggle-input:checked) .sky-toggle-sun {
  color: #7a6d3a;
}
```

- [ ] **Step 2: Manually verify styling**

Run `npm run dev`, open inventory:

- Settings sticky-note visually matches Tasks sticky-note (same paper look)
- Pill is rounded, sun on left, moon on right
- White knob starts on the left (day) with the sun visible in its spot
- Clicking animates the knob to the right; pill background darkens; moon becomes the prominent icon

If the layout is cramped inside the sticky-note, adjust `.sticky-note` padding via the settings variant, not the base class.

- [ ] **Step 3: Commit**

```bash
git add styles/main.css
git commit -m "feat(inventory): styles for Settings sticky-note + sky pill"
```

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: ALL tests PASS.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 3: Grep sweep for leftovers**

Run:

```bash
grep -rn "inventory-btn" src/ index.html styles/
grep -rn "0x88bbf0" src/
```

Expected:
- First grep: no output
- Second grep: **no results in `src/main.js`** (all three hardcoded references have been replaced by `applySkyMode`). The only remaining `0x88bbf0` occurrence should be the `DAY_COLOR` constant inside `src/sky.js`.

If any stray `0x88bbf0` remains in `src/main.js`, go back and replace it with `applySkyMode(scene, getSkyMode())`.

- [ ] **Step 4: End-to-end manual walkthrough**

Run: `npm run dev`

Clear localStorage (DevTools → Application → Clear site data), then:

1. Load → day sky, no stars
2. `E` → inventory opens, Settings sticky-note visible, pill shows sun
3. Click pill → night sky, stars + moon appear live
4. `E` → inventory closes, night persists
5. Walk into AI room → AI room uses its own grey sky (unaffected)
6. Walk back out to exterior → exterior is still night
7. Walk into Game Room / nature → nature sky is also night
8. Reload page → still night on load
9. `E` → pill shows moon position
10. Click pill → back to day
11. Reload → day persists

- [ ] **Step 5: Commit any small fixes from verification**

If the walkthrough surfaced small adjustments:

```bash
git add -p
git commit -m "fix(sky): <specific issue>"
```

- [ ] **Step 6: Push the branch**

```bash
git push -u origin dark-mode
```

- [ ] **Step 7: Open PR**

Link the PR to the four GitHub issues related to this work if relevant; the dark-mode toggle doesn't have its own filed issue per the spec, so the PR description should reference the spec file directly:

```
Spec: docs/superpowers/specs/2026-04-23-dark-mode-toggle-design.md
Plan: docs/superpowers/plans/2026-04-23-dark-mode-toggle.md
```
