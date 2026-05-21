# AI Room Loading Screen — Loop Tuning Until Ready

**Follows:** [2026-05-21 full-load coverage design](./2026-05-21-ai-loading-covers-full-load-design.md)
**Date:** 2026-05-21
**Status:** Approved — ready for implementation plan

## Goal

The loading screen must keep moving for the entire load — sustained motion that distracts from wait time — and the "CHANNEL FOUND" payoff must fire only when the room is actually ready, not at a fixed timestamp that lies to the player on slow devices.

## Problem we're fixing

Browser verification of the previous design surfaced a UX issue: with the fade gated on `readyPromise`, the lock-in moment ("CHANNEL FOUND") still fires at a fixed 1300ms regardless of load progress, and the radio then freezes in the locked-in pose until the fade can start. The frozen pose looks broken; the early "CHANNEL FOUND" reads as a fake completion when the room hasn't actually finished loading. Two complaints in one: "it just sits there" and "channel found is too quick."

## User-facing behavior

Three animation states with one moving transition.

| State | Duration | Visuals |
|---|---|---|
| `SLIDE_IN` | 500ms fixed | Radio slides up from below to screen center. Face: open + smile. Caption empty. |
| `TUNING` | loops until both `minLockinStart` elapsed AND `readyPromise` settled, capped at `maxLockinStart` | Continuous motion. Dials spin (CSS), radio shakes (CSS), static layer at full visibility (CSS), scanlines drift (CSS). Face cycles `wide+smile → closed+smile → wink+smirk → wide+smirk` every 200ms. Caption cycles `"TUNING IN…" → "TUNING IN. ." → "TUNING IN. . ." → "TUNING IN…"` every 200ms. One `setInterval` drives both cycles. |
| `LOCK_IN` | 700ms fixed | Dials snap to 35°, shake stops, static fades to 0, radio cyan-pulse glow runs, face transitions wide+oh, caption flicker-flips to "CHANNEL FOUND" with cyan-glow text-shadow loop. After 700ms, fade begins. |
| `FADE` | 300ms fixed | Overlay opacity → 0, teardown, function resolves. |

The deliberate `LOCK_IN` beat now gets its full 700ms regardless of when the gate opens. The "CHANNEL FOUND" moment lines up with reality: the room behind the fade is about to be visible.

## Timing math

Three internal constants in `loading-ai.js`:

```js
const SLIDE_IN_MS = 500;
const LOCKIN_MS = 700;
const FADE_MS = 300;
```

Public API (`minDurationMs` default 2500, `maxDurationMs` default 6000) keeps its current meaning — total function duration floor and cap.

Derived gate times:

```
minLockinStart = max(SLIDE_IN_MS, minDurationMs − LOCKIN_MS − FADE_MS)
maxLockinStart = max(minLockinStart, maxDurationMs − LOCKIN_MS − FADE_MS)
```

Lock-in starts at:

```
lockinStartTime = min(maxLockinStart, max(minLockinStart, readyResolveTime))
```

Function resolves at `lockinStartTime + LOCKIN_MS + FADE_MS`.

### Worked examples

- **Default (`minDurationMs=2500`), fast device, ready at 1000ms.** `minLockinStart = 1500`. Lock-in starts at 1500ms (waits for min), function resolves at 2500ms. Same total as today.
- **Default, slow device, ready at 3500ms.** Lock-in starts at 3500ms, function resolves at 4500ms. Tuning state stays animated the whole way — no frozen frames.
- **Default, ready never resolves.** `maxLockinStart = 5000`. Lock-in fires at 5000ms via cap, function resolves at 6000ms. Same cap as today.
- **Custom `minDurationMs=1000`.** `minLockinStart = max(500, 0) = 500`. Tuning loop runs effectively zero ms. Lock-in starts at 500ms (right after slide-in), function resolves at 1500ms. The 1500ms floor (slide+lockin+fade) is the practical minimum.

## Architecture

Production code change is confined to `src/loading-ai.js`. Public API unchanged.

### Internal restructuring

Replace the existing fixed-timeline `setTimeout` chain (face beats at 700/900/1100, lock-in DOM mutations at 1300, fade trigger via `Promise.all`) with a three-stage state machine:

```js
// State 1: slide-in (runs immediately on overlay append; pure CSS transform transition)
// State 2: tuning loop
const tuningTick = () => {
  // advance face index and caption-dots index, render
};
const tuningInterval = setInterval(tuningTick, 200);

// State 3: lock-in start — gated by Promise.all + max cap
let lockedIn = false;
const startLockin = () => {
  if (lockedIn) return;
  lockedIn = true;
  clearInterval(tuningInterval);
  // Existing lock-in DOM mutations:
  //   dials snap, shake stops, static fades, radio glow pulse,
  //   face wide+oh, caption flicker-flips to "CHANNEL FOUND"
  setTimeout(startFade, LOCKIN_MS);
};

const startFade = () => {
  overlay.style.opacity = '0';
  setTimeout(() => { _teardown(); resolve(); }, FADE_MS);
};

const minLockinStart = Math.max(SLIDE_IN_MS, minDurationMs - LOCKIN_MS - FADE_MS);
const maxLockinStart = Math.max(minLockinStart, maxDurationMs - LOCKIN_MS - FADE_MS);

Promise.all([
  new Promise((r) => setTimeout(r, minLockinStart)),
  ready,
]).then(startLockin);

setTimeout(() => {
  if (!lockedIn) {
    console.warn(`[loading-ai] readyPromise did not settle within ${maxDurationMs}ms`);
    startLockin();
  }
}, maxLockinStart);
```

Idempotency: `startLockin` is guarded by `lockedIn`. The `triggerFade` pattern from the previous version is replaced by `startLockin` + `startFade` — same shape, different beat composition.

### Tuning-tick content

```js
const FACE_CYCLE = [
  { eyes: 'wide',   mouth: 'smile' },
  { eyes: 'closed', mouth: 'smile' },
  { eyes: 'wink',   mouth: 'smirk' },
  { eyes: 'wide',   mouth: 'smirk' },
];
const CAPTION_CYCLE = ['TUNING IN…', 'TUNING IN. .', 'TUNING IN. . .', 'TUNING IN…'];

let tickIndex = 0;
const tuningTick = () => {
  const i = tickIndex % FACE_CYCLE.length;
  _drawFace(faceCanvas, FACE_CYCLE[i].eyes, FACE_CYCLE[i].mouth);
  caption.textContent = CAPTION_CYCLE[i];
  tickIndex++;
};
tuningTick(); // immediate first frame so the caption isn't blank
const tuningInterval = setInterval(tuningTick, 200);
```

CSS-driven elements (dial spin, radio shake, scanlines, static layer) need no JS involvement during tuning — they start at overlay-append time and run until lock-in clears them, exactly as today.

### Reduced-motion path

Unchanged from the previous spec. Static overlay, no tuning loop, no lock-in beat — waits for `readyPromise` (or `maxDurationMs` cap), then fades. Motion-sensitive users get the same calm static overlay.

### `main.js`

No changes. The `readyPromise` construction from the previous task is preserved.

## Edge cases

| Case | Behavior |
|---|---|
| `minDurationMs ≤ SLIDE_IN_MS + LOCKIN_MS + FADE_MS = 1500ms` | `minLockinStart` clamps to `SLIDE_IN_MS = 500`. Function floor is 1500ms regardless of the passed value. |
| `readyPromise` resolves during slide-in | Lock-in waits for `minLockinStart` anyway. Same behavior as today. |
| Tab loses focus mid-tuning | `setInterval` throttles in background tabs, resumes on return. CSS animations also throttle. Accepted. |
| Second AI-room entry in same session | Loading screen doesn't trigger (existing `_hasPlayedAiLoading` gate). |
| `setInterval` leak | `startLockin` is the single owner of `clearInterval(tuningInterval)`. `startFade` and teardown don't restart it. Max-cap path also routes through `startLockin`, so cleanup happens there. |
| `startLockin` called twice (race between min-gate Promise.all and max-cap setTimeout) | `lockedIn` guard makes the second call a no-op. The first caller wins. |

## Testing

Existing 12 tests need updates because total-duration math changes for non-default `minDurationMs` values.

| Test | Status |
|---|---|
| 3 `shouldPlayAiLoading` tests | Keep as-is |
| `returns a Promise that resolves after ~2.5s` (no-args) | Keep as-is — default still totals 2500ms |
| `attaches an overlay element to the DOM while playing` | Keep as-is |
| `does not leak overlay elements across repeated calls` | Keep as-is — default total still resolves at 2500ms, the existing 2600ms wait still has 100ms margin |
| `honors a custom minDurationMs` (param=1000) | Update — expected resolve time changes from ~1000ms to ~1500ms (floor of `SLIDE_IN + LOCKIN + FADE`). Either bump `minDurationMs` to ≥1500 or change assertion. |
| `does not fade before minDurationMs even if readyPromise resolves earlier` | Update — same shift, expected resolve at ~1500ms with `minDurationMs=1000`. |
| `waits for readyPromise past minDurationMs` | Update — with `minDurationMs=1000` and ready at 1500ms, lock-in starts at 1500ms, function resolves at 2500ms. Update timing assertions. |
| `honors maxDurationMs cap when readyPromise never resolves` (`max=3000`) | Keep as-is — `maxLockinStart = 2000`, function resolves at 3000ms, matches existing assertion. |
| 2 reduced-motion tests | Keep as-is — reduced-motion path unchanged |

Total: **3 tests updated, 10 unchanged.**

No new unit tests. The tuning-loop motion is verified by eye in the browser (a DOM-snapshot test on `setInterval` content would be brittle and offer little value).

Manual verification:

- Normal device, first AI entry: continuous motion throughout the tuning state (face + caption cycle visible, dials spin, shake continues, static visible). Lock-in fires after ~1500ms with face surprised → smile, caption flicker. Fade reveals the AI room.
- 4× CPU throttle: tuning state visibly extends longer (5–8s). Motion is sustained the entire time — no frozen frames. Lock-in fires near the actual ready point.
- `prefers-reduced-motion: reduce`: static overlay covers the load, no looping animation. Unchanged from current.

## Out of scope

Same as the previous spec: no other-room loading screens, no progress indicator, no audio, no pre-compile-at-boot, no cross-session persistence.
