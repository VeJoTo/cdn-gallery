# AI Loading Screen Loop-Until-Ready Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed-timeline animation in `playAiLoadingScreen` with a three-state machine (SLIDE_IN → looping TUNING → LOCK_IN → FADE) so the loading screen keeps moving for the entire load and the "CHANNEL FOUND" beat only fires when the room is actually ready.

**Architecture:** Inside `playAiLoadingScreen` (animation path only — reduced-motion path is unchanged), replace the existing `setTimeout`-driven face-beats + fixed 1300ms lock-in with a `setInterval`-driven tuning loop and a `startLockin()` function gated on `Promise.all([minLockinDelay, readyPromise])` with a `maxLockinStart` safety cap. After lock-in plays for `LOCKIN_MS`, a `startFade()` runs for `FADE_MS` and resolves. Public API and `main.js` wiring stay identical.

**Tech Stack:** Vanilla JS (ES modules), Vitest + jsdom for unit tests.

**Spec:** [docs/superpowers/specs/2026-05-21-ai-loading-loop-until-ready-design.md](../specs/2026-05-21-ai-loading-loop-until-ready-design.md)

---

## File Structure

- **Modify:** `src/loading-ai.js` — two new constants (`SLIDE_IN_MS`, `LOCKIN_MS`), two new cycle arrays (`FACE_CYCLE`, `CAPTION_CYCLE`), restructured animation body in `playAiLoadingScreen`. Net ~30 lines added, ~25 removed.
- **Modify:** `src/tests/loading-ai.test.js` — update 3 timing assertions to reflect the new floor (`SLIDE_IN_MS + LOCKIN_MS + FADE_MS = 1500ms`).
- **No new files.**

Reduced-motion path (`_runReducedMotion`) and `main.js` are unchanged.

---

## Task 1: Add internal constants and cycle data

**Files:**
- Modify: `src/loading-ai.js` (additive only — no behavior change)

This task introduces the new constants and the face/caption cycle arrays at the top of the module. Nothing in `playAiLoadingScreen` uses them yet — Task 2 wires them in.

- [ ] **Step 1: Add the new constants near the existing `FADE_MS`**

In `src/loading-ai.js`, find the existing constants block near the top of the file:

```js
const OVERLAY_ID = 'ai-loading-overlay';
const FADE_MS = 300;
```

Replace it with:

```js
const OVERLAY_ID = 'ai-loading-overlay';
const SLIDE_IN_MS = 500;
const LOCKIN_MS = 700;
const FADE_MS = 300;

const FACE_CYCLE = [
  { eyes: 'wide',   mouth: 'smile' },
  { eyes: 'closed', mouth: 'smile' },
  { eyes: 'wink',   mouth: 'smirk' },
  { eyes: 'wide',   mouth: 'smirk' },
];
const CAPTION_CYCLE = ['TUNING IN…', 'TUNING IN. .', 'TUNING IN. . .', 'TUNING IN…'];
```

Leave the rest of the file alone.

- [ ] **Step 2: Run the existing test suite to confirm no behavior change**

Run: `cd /Users/vera/Documents/cdn-gallery && npx vitest run src/tests/loading-ai.test.js`

Expected: all 12 tests pass. The new constants and arrays are declared but unused, so nothing observable has changed.

- [ ] **Step 3: Commit**

```bash
git add src/loading-ai.js
git commit -m "Add SLIDE_IN_MS, LOCKIN_MS, and cycle data (#102)

Introduces the timing constants and face/caption cycle arrays that the
upcoming state-machine refactor will use. No behavior change — these
are unreferenced until the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Restructure animation into tuning-loop state machine

**Files:**
- Modify: `src/loading-ai.js` (replace the animation body of `playAiLoadingScreen`)
- Test: `src/tests/loading-ai.test.js` (update 3 timing assertions)

This is the main task. The existing fixed-timeline `setTimeout` chain (face beats at 700/900/1100/1800, lock-in at 1300, fade gated by `Promise.all([minDelay, ready])`) is replaced with:

- A `setInterval` that cycles `_caption.textContent` and the face every 200ms once slide-in completes.
- A `startLockin()` function that owns the existing lock-in DOM mutations and clears the interval.
- A `startFade()` function that runs the existing fade DOM mutation.
- Gates: `startLockin` is triggered by `Promise.all([minLockinDelay, ready])` or the `maxLockinStart` cap.

The 3 affected unit tests need updated timing assertions because the function's total floor changes from `minDurationMs` to `max(SLIDE_IN_MS + LOCKIN_MS + FADE_MS = 1500, minDurationMs)`.

- [ ] **Step 1: Update test `honors a custom minDurationMs`**

In `src/tests/loading-ai.test.js`, find the test:

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

Replace it with:

```js
  it('honors a custom minDurationMs', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    // minDurationMs=1500 → minLockinStart=500, lock-in 500-1200, fade 1200-1500.
    const promise = playAiLoadingScreen({ minDurationMs: 1500 });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(1400);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200); // total 1600ms > 1500ms
    expect(resolved).toBe(true);
  });
```

- [ ] **Step 2: Update test `does not fade before minDurationMs even if readyPromise resolves earlier`**

Find:

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
```

Replace it with:

```js
  it('does not fade before minDurationMs even if readyPromise resolves earlier', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    const readyPromise = Promise.resolve(); // already resolved
    // minDurationMs=1500 → function still floors at 1500ms even though ready is immediate.
    const promise = playAiLoadingScreen({ minDurationMs: 1500, readyPromise });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(1400);
    expect(resolved).toBe(false); // still under min duration

    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
  });
```

- [ ] **Step 3: Update test `waits for readyPromise past minDurationMs`**

Find:

```js
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

Replace it with:

```js
  it('waits for readyPromise past minDurationMs', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { playAiLoadingScreen } = await import('../loading-ai.js');
    let resolveReady;
    const readyPromise = new Promise((r) => { resolveReady = r; });
    // minDurationMs=1500 → minLockinStart=500. With ready settled at t=2000ms,
    // lock-in starts at 2000ms, fade at 2700ms, resolve at 3000ms.
    const promise = playAiLoadingScreen({ minDurationMs: 1500, readyPromise });
    let resolved = false;
    promise.then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(2000);
    expect(resolved).toBe(false); // past minDurationMs floor, but ready hasn't resolved

    resolveReady();
    await vi.advanceTimersByTimeAsync(50);    // microtasks flush, lock-in starts
    await vi.advanceTimersByTimeAsync(1050);  // LOCKIN_MS (700) + FADE_MS (300) + buffer
    expect(resolved).toBe(true);
  });
```

- [ ] **Step 4: Run all loading-ai tests; verify the 3 updated tests now fail**

Run: `cd /Users/vera/Documents/cdn-gallery && npx vitest run src/tests/loading-ai.test.js`

Expected: **3 tests fail, 9 pass.** The three failing tests should be the ones updated in Steps 1–3. The current implementation resolves at `minDurationMs` (e.g. 1500ms) but the new tests expect different timing (e.g. lock-in must take 700ms before fade can start). Specifically:

- `'honors a custom minDurationMs'` will likely pass on the "expect resolved true at 1600ms" assertion because today's code resolves at 1500ms (which is also true at 1600ms). But the "expect resolved false at 1400ms" should still pass too because today's code resolves at exactly 1500ms. Hmm — both assertions could be satisfied by today's code. **Check carefully:** if the test currently passes without code changes, that's because the new floor (1500ms) happens to equal what today's code does for `minDurationMs=1500`. That's fine — the test will still be useful for the new implementation.

- `'waits for readyPromise past minDurationMs'` will fail at the final `expect(resolved).toBe(true)` because today's code resolves 300ms after `resolveReady()` (just the FADE_MS), not 1000ms (LOCKIN_MS + FADE_MS) as the new test expects.

If only 1 test fails (the "waits for readyPromise past minDurationMs" one), that's the expected primary indicator. Proceed regardless.

- [ ] **Step 5: Replace the animation body of `playAiLoadingScreen`**

In `src/loading-ai.js`, find the entire body of `playAiLoadingScreen` from `const overlay = _ensureOverlay();` down to the closing `});` of the returned `new Promise`. The full current body to replace is:

```js
  const overlay = _ensureOverlay();
  const { _stage, _faceCanvas, _caption, _dials, _radio, _radioShake, _staticLayer } = overlay;

  // Initial frame
  _drawFace(_faceCanvas, 'open', 'smile');

  // Slide in (0 → 500ms)
  requestAnimationFrame(() => {
    _stage.style.transform = 'translateY(0)';
  });

  // Start dial spin + signal shake once the radio is on screen
  setTimeout(() => {
    for (const d of _dials) {
      d.style.animation = 'ai-loading-dial-spin 0.7s linear infinite';
    }
    _radioShake.style.animation = 'ai-loading-shake 0.18s steps(2) infinite';
  }, 500);

  // Face beats during "tuning"
  const beats = [
    { at: 700,  eyes: 'wide',   mouth: 'smile', caption: 'TUNING IN…' },
    { at: 900,  eyes: 'closed', mouth: 'smile', caption: 'TUNING IN. .' },
    { at: 1100, eyes: 'wink',   mouth: 'smirk', caption: 'TUNING IN. . .' },
    { at: 1800, eyes: 'open',   mouth: 'smile', caption: 'CHANNEL FOUND' },
  ];
  for (const b of beats) {
    setTimeout(() => {
      _drawFace(_faceCanvas, b.eyes, b.mouth);
      _caption.textContent = b.caption;
    }, b.at);
  }

  // "Found it" moment: dials snap, shake stops, static clears, caption flicker-in,
  // radio glow pulses, face goes wide-eyed surprised.
  setTimeout(() => {
    for (const d of _dials) {
      d.style.animation = '';
      d.style.transform = 'rotate(35deg)';
      d.style.transition = 'transform 0.15s ease-out';
    }
    _radioShake.style.animation = '';
    _staticLayer.style.opacity = '0';
    _radio.style.animation = 'ai-loading-glow 0.6s ease-in-out';
    _drawFace(_faceCanvas, 'wide', 'oh');
    _caption.textContent = 'CHANNEL FOUND';
    _caption.style.fontSize = '18px';
    _caption.style.animation = 'ai-loading-found-flicker 0.5s steps(1) 1, ai-loading-caption-glow 1.2s ease-in-out 0.5s infinite';
  }, 1300);

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
  });
```

Replace it with the new state-machine body:

```js
  const overlay = _ensureOverlay();
  const { _stage, _faceCanvas, _caption, _dials, _radio, _radioShake, _staticLayer } = overlay;

  // Initial frame
  _drawFace(_faceCanvas, 'open', 'smile');

  // Slide in (0 → SLIDE_IN_MS)
  requestAnimationFrame(() => {
    _stage.style.transform = 'translateY(0)';
  });

  // Start dial spin + signal shake once the radio is on screen
  setTimeout(() => {
    for (const d of _dials) {
      d.style.animation = 'ai-loading-dial-spin 0.7s linear infinite';
    }
    _radioShake.style.animation = 'ai-loading-shake 0.18s steps(2) infinite';
  }, SLIDE_IN_MS);

  // Tuning loop: face + caption cycle every 200ms until lock-in.
  let tickIndex = 0;
  const tuningTick = () => {
    const i = tickIndex % FACE_CYCLE.length;
    _drawFace(_faceCanvas, FACE_CYCLE[i].eyes, FACE_CYCLE[i].mouth);
    _caption.textContent = CAPTION_CYCLE[i];
    tickIndex++;
  };
  let tuningInterval = null;
  setTimeout(() => {
    tuningTick();
    tuningInterval = setInterval(tuningTick, 200);
  }, SLIDE_IN_MS);

  return new Promise((resolve) => {
    let lockedIn = false;

    const startLockin = () => {
      if (lockedIn) return;
      lockedIn = true;
      if (tuningInterval !== null) clearInterval(tuningInterval);

      // Lock-in DOM mutations: dials snap, shake stops, static clears, caption
      // flicker-in, radio glow pulses, face goes wide-eyed surprised.
      for (const d of _dials) {
        d.style.animation = '';
        d.style.transform = 'rotate(35deg)';
        d.style.transition = 'transform 0.15s ease-out';
      }
      _radioShake.style.animation = '';
      _staticLayer.style.opacity = '0';
      _radio.style.animation = 'ai-loading-glow 0.6s ease-in-out';
      _drawFace(_faceCanvas, 'wide', 'oh');
      _caption.textContent = 'CHANNEL FOUND';
      _caption.style.fontSize = '18px';
      _caption.style.animation = 'ai-loading-found-flicker 0.5s steps(1) 1, ai-loading-caption-glow 1.2s ease-in-out 0.5s infinite';

      // After the lock-in beat plays, start the fade.
      setTimeout(startFade, LOCKIN_MS);
    };

    const startFade = () => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        _teardown();
        resolve();
      }, FADE_MS);
    };

    // Gate the lock-in: both min duration AND readyPromise must be satisfied.
    const minLockinStart = Math.max(SLIDE_IN_MS, minDurationMs - LOCKIN_MS - FADE_MS);
    const maxLockinStart = Math.max(minLockinStart, maxDurationMs - LOCKIN_MS - FADE_MS);
    const minLockinDelay = new Promise((r) => setTimeout(r, minLockinStart));
    Promise.all([minLockinDelay, ready]).then(startLockin);

    // Hard cap: trigger lock-in at maxLockinStart regardless of ready.
    setTimeout(() => {
      if (!lockedIn) {
        console.warn(
          `[loading-ai] readyPromise did not settle within ${maxDurationMs}ms`
        );
        startLockin();
      }
    }, maxLockinStart);
  });
```

Key differences from the old body:

- The `beats` array and its for-loop scheduling face/caption changes at 700/900/1100/1800 is gone.
- The fixed `setTimeout(..., 1300)` that ran the lock-in DOM mutations is gone — those mutations now live inside `startLockin`.
- A new `tuningTick` + `setInterval(tuningTick, 200)` drives the looping face/caption (started after the slide-in completes).
- `triggerFade` and `faded` are replaced by `startLockin` + `lockedIn` and `startFade`.
- `minFadeStart` / `maxFadeStart` are replaced by `minLockinStart` / `maxLockinStart`, computed against `LOCKIN_MS + FADE_MS` instead of just `FADE_MS`.

- [ ] **Step 6: Run all loading-ai tests; verify all 12 pass**

Run: `cd /Users/vera/Documents/cdn-gallery && npx vitest run src/tests/loading-ai.test.js`

Expected: 12/12 tests pass.

Common failure modes if a test still fails:

- "`waits for readyPromise past minDurationMs`" fails at the final assertion: your `LOCKIN_MS + FADE_MS` math may be off in the test's `vi.advanceTimersByTimeAsync(1050)`. The new lock-in adds 1000ms of delay between `resolveReady()` firing and the function resolving (700ms lock-in + 300ms fade). The 50ms microtask flush is separate. So total advance after `resolveReady()` should be ~50 + 1050 = 1100ms minimum. The test as written gives 1100ms which is enough; if it fails, double-check your implementation routes lock-in → fade through `setTimeout(startFade, LOCKIN_MS)`.
- "`honors maxDurationMs cap...`" fails: confirm `maxLockinStart = Math.max(minLockinStart, maxDurationMs - LOCKIN_MS - FADE_MS)`. With `maxDurationMs=3000`: `maxLockinStart = max(500, 3000-700-300) = 2000`. Lock-in fires at 2000, fade at 2700, resolve at 3000. The test waits 2900ms then 200ms more (= 3100ms), expects resolved=true at 3100ms. ✓
- "`does not leak overlay elements...`" fails: confirm `_teardown()` is called in `startFade`'s inner setTimeout, exactly once per call (the `lockedIn` guard ensures `startLockin` runs at most once per call, so `startFade` is also scheduled at most once).

If any test fails for a reason not on this list, STOP and report `BLOCKED` — don't guess at fixes.

- [ ] **Step 7: Commit**

```bash
git add src/loading-ai.js src/tests/loading-ai.test.js
git commit -m "Loop tuning until ready in loading screen (#102)

Replaces the fixed-timeline setTimeout chain (face beats at 700/900/
1100/1800, lock-in at 1300, fade gated on Promise.all) with a state
machine: SLIDE_IN -> looping TUNING -> LOCK_IN -> FADE. The TUNING
state cycles face + caption every 200ms until both minDuration has
elapsed and readyPromise has settled. LOCK_IN then plays for its full
700ms before fade. The 'CHANNEL FOUND' moment now lines up with
actual room readiness instead of firing prematurely on slow loads.

Three tests updated to reflect the new total-duration floor
(SLIDE_IN_MS + LOCKIN_MS + FADE_MS = 1500ms). Public API unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Manual Browser Verification

This is not a numbered task with steps — it's a controller-driven checklist after Tasks 1–2 commit. The dev server should already be running (or `cd /Users/vera/Documents/cdn-gallery && npm run dev` to start it).

Three scenarios at http://localhost:5173/cdn-gallery/ :

1. **Normal device, first AI entry.** Hard-refresh (Cmd+Shift+R). Walk to AI portal, enter. The loading screen should show *sustained motion the whole way* — face cycling, caption dots animating, dials spinning, shake going — until the "CHANNEL FOUND" beat fires, which now lands closer to the moment the AI room is actually ready (no frozen pose). Exit and re-enter: no loading screen.

2. **4× CPU throttle.** DevTools → Performance → CPU dropdown → "4× slowdown". Hard-refresh, enter AI. Tuning state should visibly extend (longer than the fast-device case). Motion sustained the whole time. Lock-in fires when the room is genuinely ready. No black gap, no frozen mid-animation. Reset throttle after.

3. **`prefers-reduced-motion: reduce`.** DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" → reduce. Hard-refresh, enter AI. Static overlay (radio + caption, no scanlines / shake / animation) covers the load and fades. Unchanged from the previous spec. Disable emulation when done.

If any scenario looks wrong, stop and report back — do not patch on the fly.

---

## Self-Review Notes

Reviewed against the spec:

- **Spec § Goal / Problem** — covered by Task 2 (replaces fixed timeline with state machine).
- **Spec § User-facing behavior** — all four states (SLIDE_IN, TUNING, LOCK_IN, FADE) are implemented in Task 2 Step 5, with the cycle data from Task 1.
- **Spec § Timing math** — constants (`SLIDE_IN_MS`, `LOCKIN_MS`, `FADE_MS`) introduced in Task 1; `minLockinStart` / `maxLockinStart` formulas in Task 2 Step 5; all four worked examples in the spec match the implementation.
- **Spec § Architecture (internal restructuring)** — Task 2 Step 5 replaces the existing chain exactly as described, including the `startLockin` / `startFade` split and the `lockedIn` idempotency guard.
- **Spec § Architecture (tuning-tick content)** — Task 1 defines the cycle arrays; Task 2 Step 5 wires the `tuningTick` function and the `setInterval`.
- **Spec § Architecture (reduced-motion path)** — explicitly untouched. No task needed.
- **Spec § Architecture (main.js)** — explicitly untouched. No task needed.
- **Spec § Edge cases** — all five edge cases (small `minDurationMs`, fast ready, focus loss, second entry, interval-leak ownership, double-`startLockin`) are handled by the implementation in Task 2 Step 5. The `lockedIn` guard, the `clearInterval` ownership in `startLockin`, and the `Math.max(SLIDE_IN_MS, ...)` clamp all match the spec's table.
- **Spec § Testing — table of 12 tests** — 3 updated in Task 2 Steps 1–3 with new timing math; the other 9 are not touched (per spec). No new unit tests added (per spec). Manual verification noted in the section above.
- **Spec § Out of scope** — no work in this plan.

Placeholder scan: no TBD/TODO/"fill in details" patterns found. Every code block contains the actual code to apply.

Type consistency: `startLockin`, `startFade`, `lockedIn`, `tuningInterval`, `tuningTick`, `minLockinStart`, `maxLockinStart` are used consistently between Task 1, Task 2, and the spec. `FACE_CYCLE` and `CAPTION_CYCLE` are declared in Task 1 and referenced in Task 2 Step 5 with the same names.
