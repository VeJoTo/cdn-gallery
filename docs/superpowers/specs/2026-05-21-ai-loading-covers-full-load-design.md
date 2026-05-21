# AI Room Loading Screen — Cover the Full Load

**Follows:** [2026-05-12 AI Room Loading Screen design](./2026-05-12-ai-room-loading-screen-design.md)
**Date:** 2026-05-21
**Status:** Approved — ready for implementation plan

## Goal

The loading screen must cover the *entire* first-entry load of the AI room. No black or frozen frame before, during, or after the gag.

## Root cause

Three.js compiles shaders and uploads textures lazily — on the first render of each new material. The AI room has many new materials (TV, hologram, neon, kultur-kartet, globe screen, do-not-press, radio, …). The first frame after `setRoomVisibility('ai')` therefore stalls the main thread for hundreds of ms to multiple seconds, depending on device.

Today, that stall happens *during or after* the fixed 2.5s gag, so the overlay either freezes in place or finishes before the room is drawable. The player sees a black frame between the loading screen and the room.

## User-facing behavior

The animation timeline (slide-in → tuning → lock-in → fade) is unchanged. What changes is when it ends.

- **First AI-room entry.** Overlay appears immediately. The gag plays for its full ~2.5s. The overlay also waits for the room to be GPU-ready before fading out.
  - Fast device, ready before 2.5s → fade at 2.5s as today.
  - Slow device, ready after 2.5s → lock-in / fade hold until ready.
- **Hard cap.** If "ready" never resolves within 6s, force the fade anyway and log a warning, so the player isn't trapped.
- **Subsequent AI entries, nature, exterior.** Unchanged. No loading screen, no prewarm.
- **`prefers-reduced-motion`.** Today the gag is skipped and the function resolves immediately, which re-exposes the black gap. New behavior: still skip the *animation*, but show a quiet static overlay (radio centered, "TUNING IN…" caption, no scanlines / shake / static / glow pulse) that stays up until the room is ready, then fades. This is a behavior change from the 2026-05-12 spec; it preserves the invariant "loading-ai always covers the load."

## Architecture

### `src/loading-ai.js` — API change

```js
export function playAiLoadingScreen({
  readyPromise,
  minDurationMs = 2500,
  maxDurationMs = 6000,
} = {}): Promise<void>
```

- `readyPromise` (optional): caller-supplied. Resolves when the AI room is GPU-ready.
- `minDurationMs`: gag plays for at least this long. Default 2500.
- `maxDurationMs`: hard cap. Resolves anyway after this, regardless of `readyPromise`. Default 6000.
- Resolves when **both** `minDurationMs` has elapsed **and** `readyPromise` is fulfilled — or when `maxDurationMs` is hit, whichever comes first.

Calling with no args (current call shape) keeps today's behavior: 2.5s timeline, no wait for readiness. Back-compat for existing tests and any future callers that don't need a ready gate.

#### Internal sequencing change

The current implementation drives the fade-out on a fixed `setTimeout(2200ms)`. That has to move so the fade can start *after* both gates are satisfied:

1. Slide in (0 → 500ms) — unchanged.
2. Tuning beats (500 → 1300ms) — unchanged.
3. Lock-in "CHANNEL FOUND" (1300ms onward) — unchanged.
4. **Hold.** Instead of starting the 300ms fade at 2200ms, hold the locked-in state (caption + cyan glow pulse + happy face) until both `minDurationMs` has elapsed and `readyPromise` has fulfilled. Hold has no upper bound except `maxDurationMs`.
5. **Fade out** (300ms) — runs when the hold is released.
6. Teardown when fade completes.

Reduced-motion path:

1. Build the overlay with the static layout (radio + "TUNING IN…" caption), no animations attached.
2. Await `Promise.race([readyPromise, maxDurationMs timer])`.
3. 300ms fade, teardown, resolve.

### `src/main.js` — `transitionToRoom` wiring

Today's block (lines ~1775–1779):

```js
if (shouldPlayAiLoading(targetRoom, _hasPlayedAiLoading)) {
  _hasPlayedAiLoading = true;
  await playAiLoadingScreen();
}
```

becomes:

```js
if (shouldPlayAiLoading(targetRoom, _hasPlayedAiLoading)) {
  _hasPlayedAiLoading = true;
  const readyPromise = (async () => {
    // Yield one rAF so the overlay paints before we block on compile.
    await new Promise((r) => requestAnimationFrame(r));
    try {
      renderer.compile(scene, camera);   // shaders + uniform/texture uploads
      renderer.render(scene, camera);    // force one frame so the canvas buffers AI room
    } catch (err) {
      console.warn('[loading-ai] renderer.compile failed', err);
    }
    await new Promise((r) => requestAnimationFrame(r));
  })();
  await playAiLoadingScreen({ readyPromise });
}
```

Ordering note: `setRoomVisibility('ai')` already ran earlier in `transitionToRoom` (line ~1764), so when `renderer.compile` walks the scene it sees AI-room objects as visible and compiles their materials. No reordering of existing logic is needed.

No new modules.

## Edge cases

| Case | Behavior |
|------|----------|
| Tab loses focus mid-load | `renderer.compile` is sync and runs regardless. CSS keyframes + `setTimeout` throttle in background tabs but resume on return. Accepted. |
| Second entry triggered mid-gag | Blocked by existing `isTransitioning` flag. No new code. |
| `renderer.compile` throws | Caught, logged, `readyPromise` resolves anyway. Loading screen still fades; first AI frame may stall briefly. |
| `maxDurationMs` (6s) reached without ready | Resolve, fade out, `console.warn('[loading-ai] readyPromise did not settle within ${maxDurationMs}ms')`. |
| Cold network cache | Out of scope — the existing app-boot path already preloads GLTFs and textures into memory before the player can reach the AI portal. The `readyPromise` only covers compile and first-frame upload, not asset fetch. Worth a manual cold-cache pass. |
| Other rooms (nature, exterior) | Unchanged. Future polish could apply the same pattern; not in this spec. |

## Testing

`src/tests/loading-ai.test.js` updates:

- **Updated:** `playAiLoadingScreen()` (no args) still resolves at `minDurationMs` under fake timers. Back-compat.
- **New:** `readyPromise` resolves before `minDurationMs` → function resolves at `minDurationMs`.
- **New:** `readyPromise` resolves after `minDurationMs` → function resolves when `readyPromise` settles.
- **New:** `readyPromise` never resolves → function resolves at `maxDurationMs`.
- **New:** `prefers-reduced-motion` + `readyPromise` → overlay is created (was not before), animation is skipped, function resolves on ready or cap.
- **Unchanged:** overlay teardown, no DOM leak across repeated calls.
- **Not unit-tested (verified manually):** the visual "hold while waiting" beat — brittle as a unit assertion, cheaper to eyeball.

Manual verification:

- Cold cache + Chrome DevTools 4× CPU throttle → first AI entry has no black gap.
- Repeat AI entry → no loading screen, no perf regression.
- `prefers-reduced-motion: reduce` → static overlay covers the load, no animation, no black gap.

## Out of scope

- Loading screens for nature / exterior first entry.
- Real progress indicator (% loaded). Radio-tuning stays purely atmospheric.
- Audio cues (still a possible follow-up from the original spec).
- Persisting "already seen" across sessions.
- Pre-compiling the AI room *before* the player approaches the portal (could eliminate the wait entirely; trade-off is boot-time cost — separate decision).
