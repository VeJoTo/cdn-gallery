# AI Room Loading Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain 0.4s black fade with a 2.5s "radio tunes you in" loading animation, played only on the first AI-room entry per session.

**Architecture:** A DOM overlay module (`src/loading-ai.js`) exposes `playAiLoadingScreen()` that returns a Promise resolving after the animation. The radio body and dials are styled DOM; the pixel-art face is rendered to a small `<canvas>` using face primitives exported from `src/scene/radio.js`. A small testable helper `shouldPlayAiLoading()` decides whether to play; `src/main.js`'s `transitionToRoom` awaits the screen conditionally before fading the existing black overlay out.

**Tech Stack:** Vanilla JS modules, ESM, Vite, Three.js (existing), Vitest + jsdom for unit tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-12-ai-room-loading-screen-design.md`

---

## File Structure

- **Modify** `src/scene/radio.js` — export a parameterized `drawRadioFace(ctx, opts)` wrapper around the existing `_drawEyes` / `_drawMouth` primitives. Internal callers continue to use the private helpers (no behavior change).
- **Create** `src/loading-ai.js` — exports `playAiLoadingScreen(): Promise<void>` and `shouldPlayAiLoading(targetRoom, alreadyPlayed): boolean`. Owns its DOM overlay element lifecycle.
- **Create** `src/tests/loading-ai.test.js` — Vitest unit tests for both exports.
- **Modify** `src/main.js` (around lines 1661–1742, `transitionToRoom`) — add `_hasPlayedAiLoading` flag, await loading screen on first AI entry.

---

## Task 1: Export parameterized face primitives from `radio.js`

**Files:**
- Modify: `src/scene/radio.js`
- Test: covered indirectly by Task 3 tests; the existing in-scene radio's behavior is unchanged.

The existing `_drawEyes` / `_drawMouth` use module-scoped `FACE.cx`, `FACE.cy`, `FACE.px`, `FACE.ink`, `FACE.inkDim`. The loading screen needs to draw on a different canvas at a different size, so we need to parameterize those.

- [ ] **Step 1: Refactor `_drawPixel` to accept a face config**

In `src/scene/radio.js`, replace the existing `_drawPixel` (around lines 233–241) with this version that takes the face config explicitly:

```js
function _drawPixel(ctx, gx, gy, w = 1, h = 1, color, face = FACE) {
  ctx.fillStyle = color ?? face.ink;
  ctx.fillRect(
    Math.round(face.cx + gx * face.px - (w * face.px) / 2),
    Math.round(face.cy + gy * face.px - (h * face.px) / 2),
    w * face.px,
    h * face.px
  );
}
```

- [ ] **Step 2: Refactor `_drawEyes` / `_drawMouth` to accept and forward the face config**

Replace `_drawEyes(ctx, kind)` and `_drawMouth(ctx, kind)` (lines 243–296) so they take a `face = FACE` parameter and forward it to `_drawPixel`:

```js
function _drawEyes(ctx, kind, face = FACE) {
  const lx = -5;
  const rx = 5;
  const ey = -2;
  if (kind === 'open') {
    _drawPixel(ctx, lx, ey, 2, 3, undefined, face);
    _drawPixel(ctx, rx, ey, 2, 3, undefined, face);
  } else if (kind === 'closed') {
    _drawPixel(ctx, lx, ey, 3, 1, undefined, face);
    _drawPixel(ctx, rx, ey, 3, 1, undefined, face);
  } else if (kind === 'wide') {
    _drawPixel(ctx, lx, ey, 4, 4, undefined, face);
    _drawPixel(ctx, rx, ey, 4, 4, undefined, face);
    _drawPixel(ctx, lx, ey, 2, 2, '#0a1419', face);
    _drawPixel(ctx, rx, ey, 2, 2, '#0a1419', face);
  } else if (kind === 'wink') {
    _drawPixel(ctx, lx, ey, 3, 1, undefined, face);
    _drawPixel(ctx, rx, ey, 2, 3, undefined, face);
  }
}

function _drawMouth(ctx, kind, face = FACE) {
  const my = 3;
  if (kind === 'smile') {
    _drawPixel(ctx, -4, my,     1, 1, undefined, face);
    _drawPixel(ctx, -3, my + 1, 1, 1, undefined, face);
    _drawPixel(ctx, -2, my + 2, 1, 1, undefined, face);
    _drawPixel(ctx, -1, my + 2, 1, 1, undefined, face);
    _drawPixel(ctx,  0, my + 2, 1, 1, undefined, face);
    _drawPixel(ctx,  1, my + 2, 1, 1, undefined, face);
    _drawPixel(ctx,  2, my + 2, 1, 1, undefined, face);
    _drawPixel(ctx,  3, my + 1, 1, 1, undefined, face);
    _drawPixel(ctx,  4, my,     1, 1, undefined, face);
  } else if (kind === 'flat') {
    _drawPixel(ctx, 0, my + 1, 5, 1, undefined, face);
  } else if (kind === 'oh') {
    _drawPixel(ctx, -1, my,     3, 1, undefined, face);
    _drawPixel(ctx, -2, my + 1, 1, 1, undefined, face);
    _drawPixel(ctx,  2, my + 1, 1, 1, undefined, face);
    _drawPixel(ctx, -1, my + 2, 3, 1, undefined, face);
  } else if (kind === 'smirk') {
    _drawPixel(ctx, -3, my,     1, 1, undefined, face);
    _drawPixel(ctx, -2, my + 1, 1, 1, undefined, face);
    _drawPixel(ctx, -1, my + 2, 1, 1, undefined, face);
    _drawPixel(ctx,  0, my + 2, 1, 1, undefined, face);
    _drawPixel(ctx,  1, my + 2, 1, 1, undefined, face);
    _drawPixel(ctx,  2, my + 2, 1, 1, undefined, face);
    _drawPixel(ctx,  3, my + 2, 1, 1, undefined, face);
  }
}
```

- [ ] **Step 3: Add an exported `drawRadioFace` wrapper at the bottom of the file**

Append at the end of `src/scene/radio.js` (after all existing exports):

```js
// Public face renderer — used by the AI room loading screen.
// Lets callers draw the radio face on any canvas at any size.
export function drawRadioFace(ctx, { eyes, mouth, cx, cy, px = 6, ink = '#5ee0ff' }) {
  const face = { px, cx, cy, ink, inkDim: 'rgba(94, 224, 255, 0.55)' };
  if (eyes) _drawEyes(ctx, eyes, face);
  if (mouth) _drawMouth(ctx, mouth, face);
}
```

- [ ] **Step 4: Run the existing test suite to confirm no regression**

Run: `npm test -- --run`
Expected: All existing tests pass. (No new tests yet; we're verifying the refactor didn't break the in-scene radio.)

- [ ] **Step 5: Commit**

```bash
git add src/scene/radio.js
git commit -m "Export drawRadioFace from radio.js for reuse in loading screen

Refactor _drawPixel, _drawEyes, _drawMouth to accept the face config
as a parameter (defaults to the module's FACE constant). Add an
exported drawRadioFace wrapper that lets callers render the pixel
face on any canvas at any size, with no change to the in-scene radio.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Failing test for `playAiLoadingScreen()` skeleton

**Files:**
- Create: `src/tests/loading-ai.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/tests/loading-ai.test.js`:

```js
// src/tests/loading-ai.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('playAiLoadingScreen', () => {
  it('returns a Promise that resolves after ~2.5s', async () => {
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const promise = playAiLoadingScreen();
    expect(promise).toBeInstanceOf(Promise);

    // Before 2.5s the promise should not have resolved.
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(2400);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
  });

  it('attaches an overlay element to the DOM while playing', async () => {
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const promise = playAiLoadingScreen();
    const overlay = document.getElementById('ai-loading-overlay');
    expect(overlay).not.toBeNull();
    await vi.advanceTimersByTimeAsync(2600);
    await promise;
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/tests/loading-ai.test.js`
Expected: FAIL — `Cannot find module '../loading-ai.js'`.

---

## Task 3: Minimal `playAiLoadingScreen()` skeleton to pass the test

**Files:**
- Create: `src/loading-ai.js`

- [ ] **Step 1: Write the skeleton**

Create `src/loading-ai.js`:

```js
// src/loading-ai.js
// Plays the AI-room entrance loading animation. See
// docs/superpowers/specs/2026-05-12-ai-room-loading-screen-design.md
import { drawRadioFace } from './scene/radio.js';

const OVERLAY_ID = 'ai-loading-overlay';
const TOTAL_MS = 2500;

let _overlay = null;

function _ensureOverlay() {
  if (_overlay && document.body.contains(_overlay)) return _overlay;
  const el = document.createElement('div');
  el.id = OVERLAY_ID;
  el.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: #0a1420;
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto;
  `;
  document.body.appendChild(el);
  _overlay = el;
  return el;
}

function _teardown() {
  if (_overlay && _overlay.parentNode) {
    _overlay.parentNode.removeChild(_overlay);
  }
  _overlay = null;
}

export function playAiLoadingScreen() {
  _ensureOverlay();
  return new Promise((resolve) => {
    setTimeout(() => {
      _teardown();
      resolve();
    }, TOTAL_MS);
  });
}

// Used internally by the wrapper that adds the radio + face content.
export const _internals = { drawRadioFace };
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm test -- --run src/tests/loading-ai.test.js`
Expected: PASS — both tests green.

- [ ] **Step 3: Commit**

```bash
git add src/loading-ai.js src/tests/loading-ai.test.js
git commit -m "Add playAiLoadingScreen() skeleton with overlay lifecycle

Minimal implementation: lazily creates a fullscreen DOM overlay,
resolves the Promise after 2.5s, removes the overlay on resolve.
Visual content (radio, dials, face) added in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Build the radio body + dials + face content

**Files:**
- Modify: `src/loading-ai.js`

This task adds the visible content. It's a single visual build-out — no new unit tests, since the slide-in motion and face beats are verified by eye in Task 9. We do keep the overlay lifecycle tests from Task 2 green.

- [ ] **Step 1: Replace `_ensureOverlay` with the full radio layout**

In `src/loading-ai.js`, replace the existing `_ensureOverlay` function with this expanded version:

```js
function _ensureOverlay() {
  if (_overlay && document.body.contains(_overlay)) return _overlay;
  const el = document.createElement('div');
  el.id = OVERLAY_ID;
  el.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: #0a1420;
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto;
    font-family: "Roboto", monospace;
    opacity: 1;
    transition: opacity 0.3s ease;
  `;

  const stage = document.createElement('div');
  stage.style.cssText = `
    display: flex; flex-direction: column; align-items: center; gap: 24px;
    transform: translateY(120%);
    transition: transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.1);
  `;
  el.appendChild(stage);

  // Radio body
  const radio = document.createElement('div');
  radio.style.cssText = `
    position: relative;
    width: 240px; height: 140px;
    background: linear-gradient(180deg, #142536 0%, #0d1a28 100%);
    border-radius: 14px;
    box-shadow:
      0 0 0 2px #1a3a5c inset,
      0 0 24px rgba(0, 212, 255, 0.35),
      0 12px 28px rgba(0, 0, 0, 0.6);
    padding: 16px;
    display: flex; align-items: center; gap: 14px;
  `;

  // Face canvas (left side of the radio)
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 96;
  faceCanvas.height = 72;
  faceCanvas.style.cssText = `
    background: #0a1419;
    border-radius: 6px;
    box-shadow: 0 0 0 2px rgba(94, 224, 255, 0.25) inset;
    image-rendering: pixelated;
  `;
  radio.appendChild(faceCanvas);

  // Dials (right side of the radio)
  const dialsWrap = document.createElement('div');
  dialsWrap.style.cssText = `display: flex; flex-direction: column; gap: 10px;`;
  for (let i = 0; i < 2; i++) {
    const dial = document.createElement('div');
    dial.className = 'ai-loading-dial';
    dial.style.cssText = `
      width: 44px; height: 44px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #2a4a6c, #0d1a28 70%);
      box-shadow: 0 0 0 2px #1a3a5c inset, 0 0 8px rgba(0, 212, 255, 0.25);
      position: relative;
    `;
    const tick = document.createElement('div');
    tick.style.cssText = `
      position: absolute; top: 4px; left: 50%;
      width: 2px; height: 12px;
      background: #00d4ff;
      transform: translateX(-50%);
      box-shadow: 0 0 6px #00d4ff;
    `;
    dial.appendChild(tick);
    dialsWrap.appendChild(dial);
  }
  radio.appendChild(dialsWrap);

  stage.appendChild(radio);

  // Caption
  const caption = document.createElement('div');
  caption.className = 'ai-loading-caption';
  caption.textContent = 'TUNING IN…';
  caption.style.cssText = `
    color: #00d4ff;
    font-size: 14px; letter-spacing: 0.3em; font-weight: 700;
    text-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
  `;
  stage.appendChild(caption);

  document.body.appendChild(el);

  _overlay = el;
  _overlay._stage = stage;
  _overlay._faceCanvas = faceCanvas;
  _overlay._caption = caption;
  _overlay._dials = dialsWrap.children;
  return el;
}
```

- [ ] **Step 2: Inject the animation keyframes once on first use**

At the top of `src/loading-ai.js`, just below the imports, add:

```js
let _stylesInjected = false;
function _injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ai-loading-dial-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(720deg); }
    }
    @keyframes ai-loading-glow {
      0%, 100% { box-shadow: 0 0 0 2px #1a3a5c inset, 0 0 24px rgba(0, 212, 255, 0.35), 0 12px 28px rgba(0, 0, 0, 0.6); }
      50%      { box-shadow: 0 0 0 2px #1a3a5c inset, 0 0 48px rgba(0, 212, 255, 0.85), 0 12px 28px rgba(0, 0, 0, 0.6); }
    }
  `;
  document.head.appendChild(style);
}
```

Then call `_injectStyles()` as the first line of `_ensureOverlay()` (right after the early-return guard).

- [ ] **Step 3: Replace the trivial `playAiLoadingScreen` with the timed sequence**

Replace the existing `playAiLoadingScreen` export with this version:

```js
function _drawFace(canvas, eyes, mouth) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRadioFace(ctx, {
    eyes, mouth,
    cx: canvas.width / 2,
    cy: canvas.height / 2,
    px: 4,
  });
}

export function playAiLoadingScreen() {
  const overlay = _ensureOverlay();
  const { _stage, _faceCanvas, _caption, _dials } = overlay;

  // Initial frame
  _drawFace(_faceCanvas, 'open', 'smile');

  // Slide in (0 → 500ms)
  requestAnimationFrame(() => {
    _stage.style.transform = 'translateY(0)';
  });

  // Start dial spin once the radio is on screen
  setTimeout(() => {
    for (const d of _dials) {
      d.style.animation = 'ai-loading-dial-spin 0.7s linear infinite';
    }
  }, 500);

  // Face beats during "tuning"
  const beats = [
    { at: 700,  eyes: 'wide',   mouth: 'smile', caption: 'TUNING IN…' },
    { at: 900,  eyes: 'closed', mouth: 'smile', caption: 'TUNING IN. .' },
    { at: 1100, eyes: 'wink',   mouth: 'smirk', caption: 'TUNING IN. . .' },
    { at: 1300, eyes: 'wide',   mouth: 'oh',    caption: 'CHANNEL FOUND' },
    { at: 1800, eyes: 'open',   mouth: 'smile', caption: 'CHANNEL FOUND' },
  ];
  for (const b of beats) {
    setTimeout(() => {
      _drawFace(_faceCanvas, b.eyes, b.mouth);
      _caption.textContent = b.caption;
    }, b.at);
  }

  // Dials snap to a final position at the "found" beat
  setTimeout(() => {
    for (const d of _dials) {
      d.style.animation = '';
      d.style.transform = 'rotate(35deg)';
      d.style.transition = 'transform 0.15s ease-out';
    }
    const radio = _stage.firstElementChild;
    radio.style.animation = 'ai-loading-glow 0.6s ease-in-out';
  }, 1300);

  // Fade out (2200 → 2500ms)
  setTimeout(() => {
    overlay.style.opacity = '0';
  }, 2200);

  return new Promise((resolve) => {
    setTimeout(() => {
      _teardown();
      resolve();
    }, TOTAL_MS);
  });
}
```

- [ ] **Step 4: Run the existing tests to confirm overlay lifecycle still works**

Run: `npm test -- --run src/tests/loading-ai.test.js`
Expected: PASS — both Task 2 tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/loading-ai.js
git commit -m "Build radio body, dials, and face animation for loading screen

Adds the actual visible content: pixel-art face on a small canvas
using the exported drawRadioFace helper, two CSS-animated dials, and
a TUNING IN → CHANNEL FOUND caption. Beats and timing match the
spec's 2.5s timeline.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Reduced-motion fallback

**Files:**
- Modify: `src/tests/loading-ai.test.js`
- Modify: `src/loading-ai.js`

- [ ] **Step 1: Write the failing test**

Append to `src/tests/loading-ai.test.js`, inside the `describe('playAiLoadingScreen', ...)` block:

```js
  it('resolves immediately under prefers-reduced-motion', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const promise = playAiLoadingScreen();
    let resolved = false;
    promise.then(() => { resolved = true; });
    await vi.advanceTimersByTimeAsync(20);
    expect(resolved).toBe(true);
    expect(document.getElementById('ai-loading-overlay')).toBeNull();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/tests/loading-ai.test.js`
Expected: FAIL — the test currently waits 2.5s before resolving.

- [ ] **Step 3: Short-circuit when reduced-motion is set**

In `src/loading-ai.js`, modify the top of `playAiLoadingScreen` to check the media query before doing any work:

```js
export function playAiLoadingScreen() {
  const reduce = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    return Promise.resolve();
  }
  const overlay = _ensureOverlay();
  // ... rest unchanged
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run src/tests/loading-ai.test.js`
Expected: PASS — all three tests green.

- [ ] **Step 5: Commit**

```bash
git add src/loading-ai.js src/tests/loading-ai.test.js
git commit -m "Skip loading animation under prefers-reduced-motion

Resolves the Promise immediately and creates no DOM overlay when
the user has reduced-motion enabled. The plain 0.4s fade in
transitionToRoom handles the visual transition in that case.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Overlay reuse across multiple calls

**Files:**
- Modify: `src/tests/loading-ai.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/tests/loading-ai.test.js`, inside the `describe('playAiLoadingScreen', ...)` block:

```js
  it('does not leak overlay elements across repeated calls', async () => {
    const { playAiLoadingScreen } = await import('../loading-ai.js');

    await Promise.all([
      (async () => { const p = playAiLoadingScreen(); await vi.advanceTimersByTimeAsync(2600); await p; })(),
    ]);
    await Promise.all([
      (async () => { const p = playAiLoadingScreen(); await vi.advanceTimersByTimeAsync(2600); await p; })(),
    ]);

    const overlays = document.querySelectorAll('#ai-loading-overlay');
    expect(overlays.length).toBe(0);
  });
```

- [ ] **Step 2: Run the test to verify the current behavior**

Run: `npm test -- --run src/tests/loading-ai.test.js`
Expected: PASS — `_teardown` already removes the element from the DOM, so no leak. If this fails, fix `_teardown` so it always sets `_overlay = null` and removes the element. (The current implementation already does this.)

- [ ] **Step 3: Commit (if any change was needed; otherwise skip)**

If Step 2 passed without modification, no commit needed for this task — move on to Task 7.

If a fix was needed:

```bash
git add src/loading-ai.js src/tests/loading-ai.test.js
git commit -m "Guarantee single-overlay teardown across repeated loading screens

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Add `shouldPlayAiLoading` gate helper

**Files:**
- Modify: `src/tests/loading-ai.test.js`
- Modify: `src/loading-ai.js`

- [ ] **Step 1: Write the failing test**

Append to `src/tests/loading-ai.test.js`, at the top level (outside the existing describe block):

```js
describe('shouldPlayAiLoading', () => {
  it('returns true when entering the AI room and not yet played', async () => {
    const { shouldPlayAiLoading } = await import('../loading-ai.js');
    expect(shouldPlayAiLoading('ai', false)).toBe(true);
  });

  it('returns false when entering the AI room but already played', async () => {
    const { shouldPlayAiLoading } = await import('../loading-ai.js');
    expect(shouldPlayAiLoading('ai', true)).toBe(false);
  });

  it('returns false for other room targets', async () => {
    const { shouldPlayAiLoading } = await import('../loading-ai.js');
    expect(shouldPlayAiLoading('nature', false)).toBe(false);
    expect(shouldPlayAiLoading('exterior', false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/tests/loading-ai.test.js`
Expected: FAIL — `shouldPlayAiLoading` is not exported yet.

- [ ] **Step 3: Add the export**

In `src/loading-ai.js`, append at the end of the file:

```js
export function shouldPlayAiLoading(targetRoom, alreadyPlayed) {
  return targetRoom === 'ai' && !alreadyPlayed;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run src/tests/loading-ai.test.js`
Expected: PASS — all tests across both describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/loading-ai.js src/tests/loading-ai.test.js
git commit -m "Add shouldPlayAiLoading gate helper for first-time-per-session play

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Wire the loading screen into `transitionToRoom`

**Files:**
- Modify: `src/main.js`

This task has no new unit test — `transitionToRoom` is not exported and pulls in the full Three.js scene. The gating logic itself is already tested via `shouldPlayAiLoading` in Task 7. Manual verification happens in Task 9.

- [ ] **Step 1: Add the import and flag near the top of the room-transition block**

In `src/main.js`, find the room transitions section (around line 1661). Add the import alongside the existing imports at the top of the file:

```js
import { playAiLoadingScreen, shouldPlayAiLoading } from './loading-ai.js';
```

Then, near the existing `let currentRoom = "exterior";` and `let isTransitioning = false;` (lines 1663–1664), add:

```js
let _hasPlayedAiLoading = false;
```

- [ ] **Step 2: Wrap the fade-out in a conditional `await`**

Find the inner `requestAnimationFrame` block that fades the overlay out (currently around lines 1728–1737):

```js
      // Fade the new room in smoothly.
      requestAnimationFrame(() => {
        fadeOverlay.style.transition = "opacity 0.4s ease";
        fadeOverlay.style.opacity = "0";
        setTimeout(() => {
          fadeOverlay.style.transition = "";
          fadeOverlay.style.opacity = "";
          fadeOverlay.style.pointerEvents = "none";
        }, 400);
      });
```

Replace it with an async IIFE that conditionally awaits the loading screen first:

```js
      // Show the AI-room loading screen on first entry, then fade in normally.
      (async () => {
        if (shouldPlayAiLoading(targetRoom, _hasPlayedAiLoading)) {
          _hasPlayedAiLoading = true;
          await playAiLoadingScreen();
        }
        requestAnimationFrame(() => {
          fadeOverlay.style.transition = "opacity 0.4s ease";
          fadeOverlay.style.opacity = "0";
          setTimeout(() => {
            fadeOverlay.style.transition = "";
            fadeOverlay.style.opacity = "";
            fadeOverlay.style.pointerEvents = "none";
          }, 400);
        });
      })();
```

Note: `_hasPlayedAiLoading` is set to `true` *before* `await` to prevent a re-entrant call (e.g. if the player somehow triggers another AI transition while the screen is up) from playing a second screen. The existing `isTransitioning` flag would also block that, but flag-then-await is defensive and cheap.

- [ ] **Step 3: Run the full test suite to confirm nothing else broke**

Run: `npm test -- --run`
Expected: All existing tests still pass; the new `loading-ai.test.js` tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "Wire AI room loading screen into transitionToRoom

On the first transition into the AI room per session, await the
playAiLoadingScreen Promise before fading the black overlay out.
Other transitions are untouched. Subsequent AI re-entries skip the
gag and use the existing 0.4s fade.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Manual browser verification

**Files:** none

This is a UI feature; the test suite verifies orchestration but not the visual feel. Run the dev server and verify the experience matches the spec.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite prints a local URL (typically `http://localhost:5173`).

- [ ] **Step 2: Verify the first-entry flow**

In the browser:
1. Land in Eksteriør (exterior).
2. Walk to the building door and trigger the entrance.
3. Confirm:
   - Black overlay appears immediately.
   - Radio slides in from below over ~0.5s.
   - Dials spin for ~0.7s.
   - Face cycles through wide → blink → wink → wide → smile.
   - Caption changes from "TUNING IN…" to "CHANNEL FOUND".
   - Radio glow pulses once.
   - Overlay fades out at ~2.2s; AI room appears.
4. Total perceived duration: ~2.5s, with the room visible by 2.5s.

- [ ] **Step 3: Verify subsequent entries skip the gag**

Still in the same tab session:
1. From AI room, enter Naturrommet via portal.
2. Return to AI room.
3. Confirm: plain 0.4s black fade, no loading screen.

- [ ] **Step 4: Verify reload resets the flag**

1. Reload the page.
2. Walk through the entrance again.
3. Confirm: loading screen plays again (this is the intended per-session reset).

- [ ] **Step 5: Verify reduced-motion fallback**

In Chrome DevTools: open Rendering panel → set "Emulate CSS media feature prefers-reduced-motion" to `reduce`.

1. Reload.
2. Walk through the entrance.
3. Confirm: no loading screen overlay appears; plain 0.4s black fade plays.

- [ ] **Step 6: If any of the above fail, file follow-up issues or fix inline**

If issues are minor (timing tweaks, palette adjustment), fix them in `src/loading-ai.js` and commit a follow-up. If the issue reveals a design problem, surface it for discussion before fixing.

---

## Self-Review Notes

Done after writing — these were checked and resolved inline:

- **Spec coverage:** Tasks 1–8 cover every section of the spec (module, refactor, wire-up, gating, reduced-motion, testing). Visual style is realized in Task 4's CSS and verified in Task 9.
- **Placeholders:** None — every code step contains the actual code to write.
- **Type consistency:** `drawRadioFace` signature matches between Task 1 (export) and Task 4 (usage). `shouldPlayAiLoading(targetRoom, alreadyPlayed)` matches between Task 7 (test + impl) and Task 8 (call site). `_hasPlayedAiLoading` is the single source of truth for the flag.
- **Known limitations:** Task 8 has no unit test for the wiring itself, which is documented in the task. Task 6 may be a no-op depending on whether the Task 3 implementation already handles repeated calls cleanly — instructions explicitly handle both cases.
