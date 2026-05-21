# AI Loading Screen Full-Load Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AI-room loading screen cover the entire first-entry load (no black/frozen frame), by gating its fade-out on both a minimum animation duration and a caller-supplied `readyPromise`, with a hard safety cap.

**Architecture:** Change `playAiLoadingScreen()` from a fixed 2.5s timeline to a gated one. The slide-in / tuning / lock-in animation timing stays the same up to lock-in; the fade-out is no longer scheduled at a fixed 2200ms but triggered when both `minDurationMs` (default 2500) has elapsed AND `readyPromise` has resolved — or when `maxDurationMs` (default 6000) is hit, whichever first. `main.js`'s `transitionToRoom` builds a `readyPromise` from `renderer.compile(scene, camera)` + a forced render + one rAF, so the overlay stays up until shaders are compiled and the first AI-room frame has been drawn behind it.

**Tech Stack:** Vanilla JS (ES modules), Three.js (`WebGLRenderer.compile`, `WebGLRenderer.render`), Vitest + jsdom for unit tests.

**Spec:** [docs/superpowers/specs/2026-05-21-ai-loading-covers-full-load-design.md](../specs/2026-05-21-ai-loading-covers-full-load-design.md)

---

## File Structure

- **Modify:** `src/loading-ai.js` — new options-object API, gate-driven fade trigger, restructured reduced-motion path. ~50 lines of net change inside the existing module; no new files.
- **Modify:** `src/tests/loading-ai.test.js` — update one existing test (reduced-motion behavior changed), keep two as-is, add four new tests for the new gate logic.
- **Modify:** `src/main.js` — replace the existing `await playAiLoadingScreen()` block (~lines 1775–1779) with a version that builds and passes a `readyPromise`.
- **No new modules.**

A constant `FADE_MS = 300` is introduced at the top of `loading-ai.js` to make the fade duration explicit in the gate math.

---

## Task 1: Add options-object API with back-compat

**Files:**
- Modify: `src/loading-ai.js` (signature + a `FADE_MS` constant)
- Test: `src/tests/loading-ai.test.js` (existing test confirms back-compat)

This task introduces the new signature but keeps all current behavior. `readyPromise` falls back to `Promise.resolve()` so existing callers see no change yet.

- [ ] **Step 1: Add the `FADE_MS` constant and update the signature in `src/loading-ai.js`**

At the top of the file, after the existing `TOTAL_MS` constant, add:

```js
const FADE_MS = 300;
```

Then change the export from:

```js
export function playAiLoadingScreen() {
```

to:

```js
export function playAiLoadingScreen({
  readyPromise,
  minDurationMs = 2500,
  maxDurationMs = 6000,
} = {}) {
```

Inside the function body, immediately after the existing `reduce` check (which currently does `if (reduce) return Promise.resolve();`), add a single line to normalise the ready promise so later steps can rely on it:

```js
  const ready = readyPromise ?? Promise.resolve();
```

(Leave the `if (reduce) return Promise.resolve();` line untouched for now — Task 5 will rewrite that path.)

Do not change any other logic in the function in this step. The existing fixed setTimeouts (fade at 2200, teardown+resolve at 2500) stay exactly as they are.

- [ ] **Step 2: Run existing tests to confirm back-compat**

Run: `npx vitest run src/tests/loading-ai.test.js`

Expected: all 6 existing tests pass. The function ignores `ready` for now, so its observable behavior is unchanged.

If any test fails, the most likely cause is a typo in the new signature destructuring. Re-check the diff against Step 1 verbatim.

- [ ] **Step 3: Commit**

```bash
git add src/loading-ai.js
git commit -m "Extend playAiLoadingScreen API with options object (#102)

Adds readyPromise, minDurationMs, and maxDurationMs as optional
parameters. Back-compat preserved: no-args calls behave identically.
Subsequent commits will wire the new options into the timing logic.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Wire `minDurationMs` into the fade trigger

**Files:**
- Modify: `src/loading-ai.js` (replace fixed-timeline fade with a gate-driven trigger)
- Test: `src/tests/loading-ai.test.js` (new test for custom `minDurationMs`)

This task replaces the two fixed `setTimeout` calls at 2200ms (fade) and 2500ms (teardown+resolve) with a single trigger function gated on `minDurationMs`. With no `readyPromise` (i.e. effectively resolved-immediately), behavior matches today exactly: fade at `minDurationMs - FADE_MS`, resolve at `minDurationMs`.

- [ ] **Step 1: Write the failing test**

In `src/tests/loading-ai.test.js`, inside the existing `describe('playAiLoadingScreen', () => { ... })` block, add this test below the existing "returns a Promise that resolves after ~2.5s" test:

```js
  it('honors a custom minDurationMs', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const promise = playAiLoadingScreen({ minDurationMs: 1000 });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(900);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200); // total 1100ms > 1000ms
    expect(resolved).toBe(true);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/loading-ai.test.js -t "honors a custom minDurationMs"`

Expected: FAIL. The current implementation ignores `minDurationMs` — the function still resolves at ~2500ms regardless of the option.

- [ ] **Step 3: Replace the fixed-timeline fade/teardown with a gate-driven trigger**

In `src/loading-ai.js`, locate the final block of `playAiLoadingScreen`:

```js
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
```

Replace it with:

```js
  return new Promise((resolve) => {
    let faded = false;
    const triggerFade = () => {
      if (faded) return;
      faded = true;
      overlay.style.opacity = '0';
      setTimeout(() => {
        _teardown();
        resolve();
      }, FADE_MS);
    };

    // Trigger fade once both the min duration AND readyPromise are satisfied.
    const minFadeStart = Math.max(0, minDurationMs - FADE_MS);
    const minDelay = new Promise((r) => setTimeout(r, minFadeStart));
    Promise.all([minDelay, ready]).then(triggerFade);
  });
```

Also delete the now-unused `TOTAL_MS` constant near the top of the file.

- [ ] **Step 4: Run the full test file to verify the new test passes and existing tests still pass**

Run: `npx vitest run src/tests/loading-ai.test.js`

Expected: all tests pass, including the new "honors a custom minDurationMs" and the existing "resolves after ~2.5s" (which uses the default 2500ms).

- [ ] **Step 5: Commit**

```bash
git add src/loading-ai.js src/tests/loading-ai.test.js
git commit -m "Gate fade-out on minDurationMs in loading screen (#102)

Replaces the fixed 2200ms fade-start and 2500ms teardown timeouts with
a single triggerFade() function gated on (minDurationMs - FADE_MS). No
behavior change for default values; sets up the readyPromise gate in
the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Wait for `readyPromise` before fading

**Files:**
- Modify: `src/loading-ai.js` (no code change in this task — the `Promise.all([minDelay, ready])` from Task 2 already wires this in; this task verifies it with tests)
- Test: `src/tests/loading-ai.test.js` (two new tests for fast and slow `readyPromise`)

The gate-driven `Promise.all([minDelay, ready])` from Task 2 is already correctly wired. This task locks the behavior in with tests covering both directions: ready faster than min (fade still waits for min) and ready slower than min (fade waits for ready).

- [ ] **Step 1: Write the two new tests**

In `src/tests/loading-ai.test.js`, add these tests inside the `describe('playAiLoadingScreen', () => { ... })` block, after the "honors a custom minDurationMs" test from Task 2:

```js
  it('does not fade before minDurationMs even if readyPromise resolves earlier', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const readyPromise = Promise.resolve(); // already resolved
    const promise = playAiLoadingScreen({ minDurationMs: 1000, readyPromise });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(900);
    expect(resolved).toBe(false); // still under min duration

    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
  });

  it('waits for readyPromise past minDurationMs', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    let resolveReady;
    const readyPromise = new Promise((r) => { resolveReady = r; });
    const promise = playAiLoadingScreen({ minDurationMs: 1000, readyPromise });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(1500);
    expect(resolved).toBe(false); // min duration passed, but ready hasn't

    resolveReady();
    await vi.advanceTimersByTimeAsync(50);   // microtasks flush, fade starts
    await vi.advanceTimersByTimeAsync(350);  // fade (300ms) + buffer
    expect(resolved).toBe(true);
  });
```

- [ ] **Step 2: Run the new tests to verify they pass**

Run: `npx vitest run src/tests/loading-ai.test.js -t "readyPromise"`

Expected: both new tests pass. The gate logic from Task 2 already handles both cases correctly.

If the second test fails with `resolved === false` after the final `advanceTimersByTimeAsync(350)`, the most likely cause is microtask vs. macrotask ordering in vitest. Try increasing the first `advanceTimersByTimeAsync(50)` to `100` to give the `.then` chain another tick.

- [ ] **Step 3: Run the full test file to make sure nothing regressed**

Run: `npx vitest run src/tests/loading-ai.test.js`

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/tests/loading-ai.test.js
git commit -m "Test readyPromise gate in loading screen (#102)

Covers both directions: ready faster than minDuration (fade still waits
for min) and ready slower than minDuration (fade waits for ready). The
gate logic was wired in the previous commit; this commit pins the
behavior with tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Add `maxDurationMs` hard cap

**Files:**
- Modify: `src/loading-ai.js` (add cap timer alongside the gate)
- Test: `src/tests/loading-ai.test.js` (one new test for a never-resolving `readyPromise`)

If `readyPromise` never settles (slow device + missing material + unknown bug), the loading screen must still fade out. This task adds a safety timer at `maxDurationMs - FADE_MS` that calls `triggerFade()` regardless, logs a warning, and lets the player out.

- [ ] **Step 1: Write the failing test**

In `src/tests/loading-ai.test.js`, add this test inside the `describe('playAiLoadingScreen', () => { ... })` block, after the Task 3 tests:

```js
  it('honors maxDurationMs cap when readyPromise never resolves', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const neverReady = new Promise(() => {}); // intentionally pending forever
    const promise = playAiLoadingScreen({
      minDurationMs: 1000,
      maxDurationMs: 3000,
      readyPromise: neverReady,
    });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(2900);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200); // 3100ms total > 3000ms cap
    expect(resolved).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('readyPromise did not settle within 3000ms')
    );
    warnSpy.mockRestore();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/loading-ai.test.js -t "maxDurationMs cap"`

Expected: FAIL. The current implementation has no cap — with a never-resolving `readyPromise`, the function never resolves.

- [ ] **Step 3: Add the cap timer**

In `src/loading-ai.js`, inside the `return new Promise((resolve) => { ... })` block in `playAiLoadingScreen`, after the existing `Promise.all([minDelay, ready]).then(triggerFade);` line, add:

```js
    // Hard cap: trigger fade at (maxDurationMs - FADE_MS) regardless of ready.
    const maxFadeStart = Math.max(0, maxDurationMs - FADE_MS);
    setTimeout(() => {
      if (!faded) {
        console.warn(
          `[loading-ai] readyPromise did not settle within ${maxDurationMs}ms`
        );
        triggerFade();
      }
    }, maxFadeStart);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/loading-ai.test.js -t "maxDurationMs cap"`

Expected: PASS.

- [ ] **Step 5: Run the full test file to confirm no regressions**

Run: `npx vitest run src/tests/loading-ai.test.js`

Expected: all tests pass, including the existing "does not leak overlay elements across repeated calls" (the second invocation in that test will use the default 6000ms cap, which is well above the 2600ms the test waits — the min-duration gate still controls fade timing there).

- [ ] **Step 6: Commit**

```bash
git add src/loading-ai.js src/tests/loading-ai.test.js
git commit -m "Add maxDurationMs safety cap to loading screen (#102)

If readyPromise never settles, force the fade at maxDurationMs - 300ms
and log a warning, so the player isn't trapped under the overlay. Cap
defaults to 6000ms.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Reduced-motion path now covers the load

**Files:**
- Modify: `src/loading-ai.js` (rewrite the reduced-motion short-circuit)
- Test: `src/tests/loading-ai.test.js` (rewrite the existing "resolves immediately under prefers-reduced-motion" test, add one new test)

Current behavior: with `prefers-reduced-motion: reduce`, the function returns `Promise.resolve()` immediately and never builds the overlay. That re-exposes the black gap. New behavior per spec: still skip the animation, but build a static overlay that covers the actual load and fades when `readyPromise` resolves (or at the cap).

The reduced-motion path needs its own simpler gate: just `readyPromise` vs. `maxDurationMs`, no min duration. With no `readyPromise` (back-compat shape), the static overlay flashes for ~300ms (a single fade) — that's a minor change from today's instant resolve, acceptable per spec.

- [ ] **Step 1: Update the existing reduced-motion test**

In `src/tests/loading-ai.test.js`, find this test:

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

Replace it entirely with:

```js
  it('builds a static overlay and fades when ready under prefers-reduced-motion', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    let resolveReady;
    const readyPromise = new Promise((r) => { resolveReady = r; });
    const promise = playAiLoadingScreen({ readyPromise });

    // Overlay must exist while waiting for ready, even with reduced motion.
    expect(document.getElementById('ai-loading-overlay')).not.toBeNull();

    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(1000);
    expect(resolved).toBe(false);

    resolveReady();
    await vi.advanceTimersByTimeAsync(50);   // microtask flush, fade starts
    await vi.advanceTimersByTimeAsync(350);  // fade (300ms) + buffer
    expect(resolved).toBe(true);
    expect(document.getElementById('ai-loading-overlay')).toBeNull();
  });
```

- [ ] **Step 2: Add a second test for reduced-motion + max cap**

Add this test directly after the one from Step 1:

```js
  it('respects maxDurationMs cap under prefers-reduced-motion when readyPromise never resolves', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const neverReady = new Promise(() => {});
    const promise = playAiLoadingScreen({ maxDurationMs: 2000, readyPromise: neverReady });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(1900);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npx vitest run src/tests/loading-ai.test.js -t "prefers-reduced-motion"`

Expected: both FAIL. The current reduced-motion path returns `Promise.resolve()` immediately and never builds the overlay.

- [ ] **Step 4: Rewrite the reduced-motion path in `loading-ai.js`**

Find this block in `src/loading-ai.js`:

```js
export function playAiLoadingScreen({
  readyPromise,
  minDurationMs = 2500,
  maxDurationMs = 6000,
} = {}) {
  const reduce = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    return Promise.resolve();
  }
  const ready = readyPromise ?? Promise.resolve();
```

Replace it with:

```js
export function playAiLoadingScreen({
  readyPromise,
  minDurationMs = 2500,
  maxDurationMs = 6000,
} = {}) {
  const reduce = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ready = readyPromise ?? Promise.resolve();
  if (reduce) {
    return _runReducedMotion(ready, maxDurationMs);
  }
```

Then, at the bottom of the file (before the existing `export function shouldPlayAiLoading`), add this new helper:

```js
function _runReducedMotion(ready, maxDurationMs) {
  const overlay = _ensureOverlay();
  // Snap the stage to its final position; skip slide-in and all looping animations.
  overlay._stage.style.transition = 'none';
  overlay._stage.style.transform = 'translateY(0)';
  overlay._staticLayer.style.display = 'none';
  overlay._radioShake.style.animation = '';
  for (const d of overlay._dials) {
    d.style.animation = '';
  }
  _drawFace(overlay._faceCanvas, 'open', 'smile');
  overlay._caption.textContent = 'TUNING IN…';

  return new Promise((resolve) => {
    let faded = false;
    const triggerFade = () => {
      if (faded) return;
      faded = true;
      overlay.style.opacity = '0';
      setTimeout(() => {
        _teardown();
        resolve();
      }, FADE_MS);
    };
    ready.then(triggerFade);

    const maxFadeStart = Math.max(0, maxDurationMs - FADE_MS);
    setTimeout(() => {
      if (!faded) {
        console.warn(
          `[loading-ai] readyPromise did not settle within ${maxDurationMs}ms`
        );
        triggerFade();
      }
    }, maxFadeStart);
  });
}
```

- [ ] **Step 5: Run the reduced-motion tests to verify they pass**

Run: `npx vitest run src/tests/loading-ai.test.js -t "prefers-reduced-motion"`

Expected: both reduced-motion tests pass.

- [ ] **Step 6: Run the full test file**

Run: `npx vitest run src/tests/loading-ai.test.js`

Expected: all tests pass. Note: the existing "does not leak overlay elements across repeated calls" test mocks `matchMedia` to return `false`, so it still exercises the full animation path and is unaffected by the reduced-motion rewrite.

- [ ] **Step 7: Commit**

```bash
git add src/loading-ai.js src/tests/loading-ai.test.js
git commit -m "Reduced-motion path now covers the full load (#102)

Previously the prefers-reduced-motion short-circuit resolved
immediately and skipped the overlay entirely, which re-exposed the
black-frame gap for motion-sensitive players. Now a static overlay
(radio + 'TUNING IN…' caption, no animations) covers the load and
fades when readyPromise resolves, with the same maxDurationMs safety
cap. Behavior change is intentional and called out in the spec.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wire `readyPromise` into `transitionToRoom`

**Files:**
- Modify: `src/main.js` (lines ~1775–1779 in the current branch)
- **No new tests.** This is integration wiring; the readyPromise composition is verified by hand in the browser since it touches `THREE.WebGLRenderer` (out of scope for jsdom).

This task replaces the existing `await playAiLoadingScreen()` call with a version that builds a `readyPromise` from a yielded rAF (paint the overlay), `renderer.compile(scene, camera)` (compile shaders + upload textures), `renderer.render(scene, camera)` (force one AI-room frame to be drawn), and a second rAF (let it land).

- [ ] **Step 1: Locate the existing block**

Open `src/main.js` and locate the block inside the inner `requestAnimationFrame(() => requestAnimationFrame(() => { ... }))` (around line 1775 on this branch). It currently reads:

```js
      // Show the AI-room loading screen on first entry, then fade in normally.
      // Keep isTransitioning=true across the loading-screen await so a re-entrant
      // transitionToRoom call during the 2.5s gag is blocked by the existing gate.
      (async () => {
        if (shouldPlayAiLoading(targetRoom, _hasPlayedAiLoading)) {
          _hasPlayedAiLoading = true;
          await playAiLoadingScreen();
        }
        isTransitioning = false;
        requestAnimationFrame(() => {
```

- [ ] **Step 2: Replace the `playAiLoadingScreen()` call with the gated version**

Replace those four `if` / `await` lines with:

```js
      (async () => {
        if (shouldPlayAiLoading(targetRoom, _hasPlayedAiLoading)) {
          _hasPlayedAiLoading = true;
          const readyPromise = (async () => {
            // Yield one rAF so the loading overlay paints before we block
            // the main thread on shader compile + texture upload.
            await new Promise((r) => requestAnimationFrame(r));
            try {
              renderer.compile(scene, camera);
              renderer.render(scene, camera);
            } catch (err) {
              console.warn('[loading-ai] renderer.compile failed', err);
            }
            await new Promise((r) => requestAnimationFrame(r));
          })();
          await playAiLoadingScreen({ readyPromise });
        }
        isTransitioning = false;
        requestAnimationFrame(() => {
```

Leave the rest of the inner block (the `fadeOverlay` opacity-to-zero + `setTimeout` to clear styles + the nature-room guide message) unchanged.

- [ ] **Step 3: Confirm `renderer`, `scene`, and `camera` are in scope at that point**

Run: `grep -nE "^(const|let) (renderer|scene|camera) " src/main.js | head -5`

Expected: shows the declarations earlier in `main.js`. All three are module-scope variables. If `grep` does not find a top-level declaration (e.g. they were renamed), find their actual names and adjust the snippet in Step 2.

- [ ] **Step 4: Quick syntax check by running the dev server**

Run: `npm run dev` and confirm the page loads without console errors at the URL printed by Vite.

If you see `ReferenceError: renderer is not defined` (or similar), Step 3 missed something — re-run the grep, find the real names, and update Step 2.

- [ ] **Step 5: Manual verification — first AI entry, normal device**

In the running dev server:
1. Open DevTools → Console (so warnings are visible).
2. Hard-refresh (Cmd+Shift+R) to reset `_hasPlayedAiLoading`.
3. Walk to the AI room portal in the exterior and enter.
4. Observe: black overlay → loading-screen overlay (radio, scanlines, tuning) → "CHANNEL FOUND" → fade → AI room. There must be no black frame between the loading screen and the room.
5. Exit and re-enter AI. Observe: no loading screen, just the normal 0.4s fade.

If you see a black frame between the loading screen and the room, `renderer.compile` likely isn't covering some materials. Check the console for `[loading-ai] renderer.compile failed`, and verify `setRoomVisibility('ai')` ran before the readyPromise IIFE.

- [ ] **Step 6: Manual verification — throttled CPU (simulates cold-cache slow device)**

In the same dev server:
1. Open DevTools → Performance → CPU dropdown → set to "4× slowdown".
2. Hard-refresh.
3. Enter the AI room.
4. Observe: loading screen plays, "CHANNEL FOUND" beat HOLDS (visibly longer than the fast-device case) while compile finishes, then fades. No black frame.
5. Open Console — there should be no `[loading-ai] readyPromise did not settle within 6000ms` warning under 4× throttle. If there is, the 6s cap is too tight for this device class; tune up in a follow-up (do not change in this task).
6. Reset CPU throttle to "No throttling" before continuing.

- [ ] **Step 7: Manual verification — `prefers-reduced-motion`**

In the same dev server:
1. macOS: System Settings → Accessibility → Display → "Reduce motion" ON. (Or use DevTools → Rendering tab → "Emulate CSS media feature prefers-reduced-motion" → "reduce".)
2. Hard-refresh.
3. Enter the AI room.
4. Observe: static overlay (radio + caption, no scanlines/shake) covers the load, then fades into the AI room. No black frame.
5. Disable the reduced-motion emulation when done.

- [ ] **Step 8: Run the full test suite one last time**

Run: `npx vitest run`

Expected: all tests pass across the whole repo.

- [ ] **Step 9: Commit**

```bash
git add src/main.js
git commit -m "Wire readyPromise into AI room transition (#102)

transitionToRoom now builds a readyPromise from renderer.compile +
renderer.render + two rAF yields and passes it to playAiLoadingScreen.
The loading overlay paints before compile blocks the main thread, and
the fade waits for the first AI-room frame to be drawn behind it. No
more black gap on first entry, on slow devices, or under
prefers-reduced-motion.

Verified by hand: normal load, 4x CPU throttle, reduced motion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes

The plan was reviewed against the spec:

- **Spec section "Goal" / "Root cause":** covered by Tasks 2 + 6.
- **Spec section "User-facing behavior" — first-entry / fast device:** Task 2 (min gate) + Task 6 (wiring).
- **Spec section "User-facing behavior" — slow device hold:** Tasks 2 + 3 (gate waits for ready).
- **Spec section "User-facing behavior" — 6s hard cap:** Task 4.
- **Spec section "User-facing behavior" — subsequent entries unchanged:** existing `shouldPlayAiLoading` gate (untouched) — verified by hand in Task 6 Step 5.
- **Spec section "User-facing behavior" — reduced motion now covers load:** Task 5.
- **Spec section "Architecture — API change":** Tasks 1–4.
- **Spec section "Architecture — main.js wiring":** Task 6.
- **Spec section "Edge cases":**
  - tab loses focus: relies on existing CSS-keyframe + setTimeout semantics, no code change needed.
  - re-entrant transitionToRoom: relies on existing `isTransitioning` flag (untouched).
  - `renderer.compile` throws: Task 6 try/catch.
  - max cap reached: Task 4 (animation) + Task 5 (reduced motion).
  - cold network cache: out of scope (spec).
  - other rooms: out of scope (spec).
- **Spec section "Testing":** Tasks 1–5 cover the listed unit tests; Task 6 covers manual verification.
- **Spec section "Out of scope":** no work in this plan.

Type consistency: `playAiLoadingScreen` is called with the same options-object shape (`{ readyPromise, minDurationMs, maxDurationMs }`) in every task. `triggerFade`, `FADE_MS`, and `_runReducedMotion` use consistent naming across Tasks 2, 4, and 5. The wiring code in Task 6 uses the same option name (`readyPromise`) introduced in Task 1.
