# AI Room Loading Screen — Design

**Issue:** [#102](https://github.com/VeJoTo/cdn-gallery/issues/102)
**Date:** 2026-05-12
**Status:** Approved — ready for implementation plan

## Goal

Replace the plain 0.4s black fade with a playful, narrative loading-screen animation the *first time* a player enters the AI room in a session. Subsequent entries (and all other room transitions) keep the existing quick fade.

The screen is a deliberate staged moment, not a real loader — assets are already in memory by the time it plays. Its job is to set the tone of AI-rommet (neon arcade, playful, slightly retro) before the player sees the room itself.

## User-facing behavior

A small radio slides in from below to screen center. Its dials spin while the pixel-art face cycles through expressions and the caption reads "TUNING IN…". The dials snap to a final position, the face does an "aha" beat, the caption flips to "CHANNEL FOUND" in cyan, the radio glows briefly, then the whole overlay fades out to reveal the AI room. Total duration: ~2.5s. Plays once per session.

## Animation timeline

| Time | Beat | Visual |
|------|------|--------|
| 0.0–0.5s | Slide in | Black bg. Radio body slides in from below to screen center. Face: `idle` (eyes open, smile). |
| 0.5–1.2s | Tuning | Radio settled. Dials spin (CSS rotation). Face cycles `wide` → `blink` → `wink` → `wide`. Caption "TUNING IN…" with animated dots. |
| 1.2–1.8s | Found it! | Dials snap to final position. Face: `wide` eyes + `oh` mouth. Caption: "CHANNEL FOUND" in cyan. |
| 1.8–2.2s | Hold + glow | Subtle cyan neon pulse around radio body. Face settles to happy smile. |
| 2.2–2.5s | Fade out | Whole overlay fades to transparent over 0.3s, revealing AI room behind. |

## Visual style

Matches AI-rommet's actual palette (verified against `src/scene/room.js`):

- **Background:** very dark navy (matches `#0d1f33` / `#0a1420` floor & wall tones)
- **Accent / glow / caption:** cyan `#00d4ff` (the room's signature emissive)
- **Radio body:** dark with subtle cyan edge glow, in the same family as the existing in-scene radio
- **Face ink:** reuses the existing radio face palette (`FACE.ink` / `FACE.inkDim` from `radio.js`)
- **Caption font:** Roboto monospace, bold, already loaded in the project

No pink — confirmed absent from the room's palette.

## Architecture

### New module: `src/loading-ai.js`

Exports a single async function:

```js
export function playAiLoadingScreen(): Promise<void>
```

Resolves when the animation has fully completed and the overlay is removed. Internally:

- Lazily creates a fullscreen DOM overlay element on first call; reuses it on subsequent calls.
- Renders the radio body and dials as styled DOM (gradients, `border-radius`, `box-shadow` for the cyan edge glow, CSS keyframes for the slide-in and dial rotation).
- Renders the face into a small `<canvas>` child element using face-drawing primitives imported from `src/scene/radio.js`.
- Drives the expression schedule via timed `setTimeout`s aligned to the beats above.
- Honors `prefers-reduced-motion`: skips the gag entirely and resolves immediately (the existing 0.4s fade handles the transition visually).

### Small refactor: `src/scene/radio.js`

Currently `_drawEyes` and `_drawMouth` are module-private. Wrap them in one exported helper:

```js
export function drawRadioFace(ctx, { eyes, mouth }) { ... }
```

Where `eyes` is one of `'open' | 'wink' | 'wide' | 'closed'` and `mouth` is one of `'smile' | 'smirk' | 'oh'`. Eyes and mouth are decoupled so the loading screen can compose its own expression beats (e.g. `wide` eyes + `oh` mouth for the "channel found" moment). Internal callers in `radio.js` continue to use the private helpers — no behavioral change to the in-scene radio.

### Wire-up in `src/main.js`

In the existing `transitionToRoom(targetRoom)` function (currently lines ~1679–1740):

1. Add a module-scoped `let _hasPlayedAiLoading = false;` near `currentRoom`.
2. After the existing blackout + camera-move logic and before the `fade-overlay` opacity-to-0 fade-in:
   - If `targetRoom === 'ai'` and `!_hasPlayedAiLoading`:
     - `await playAiLoadingScreen()`
     - Set `_hasPlayedAiLoading = true`
   - Then proceed with the existing 0.4s fade-out of the black overlay.
3. All other transitions (return-to-AI from Nature on repeat, exit-to-exterior, enter-nature) are untouched.

The existing `isTransitioning` lock already prevents input during the entire sequence, including the loading-screen window.

## Gating and edge cases

- **First-time-per-session:** A module-scoped boolean in `main.js`. Page reload resets it, matching how `currentRoom` already resets on reload.
- **Tab loses focus mid-animation:** `requestAnimationFrame`-driven CSS animations pause and resume cleanly. Accepted behavior.
- **Re-entry during transition:** Blocked by the existing `isTransitioning` flag — no new code needed.
- **`prefers-reduced-motion`:** Skip the gag, fall back to the plain 0.4s fade. Still flip `_hasPlayedAiLoading = true` so behavior stays consistent across the session.

## Testing

New file: `src/tests/loading-ai.test.js` (matches the existing `src/tests/*` pattern).

Unit tests cover:

- `playAiLoadingScreen()` returns a Promise that resolves at ~2.5s under fake timers.
- Multiple calls share a single overlay element (no DOM leak).
- The overlay is fully removed from the DOM (or hidden cleanly) by the time the Promise resolves.
- With `prefers-reduced-motion: reduce`, the Promise resolves immediately and the gag is skipped.
- Gating: `transitionToRoom` is not currently exported from `main.js`, so the gating logic will be extracted into a small testable helper (e.g. `shouldPlayAiLoading(targetRoom, alreadyPlayed)`) that returns a boolean. Unit test that helper directly — returns true the first time `targetRoom === 'ai'`, false thereafter. The in-`main.js` wiring then calls `playAiLoadingScreen()` conditionally on its result.

Visual correctness (face beats, slide-in motion, cyan glow) is verified by eye in the browser dev server. No DOM snapshot tests — they would be brittle against the CSS keyframes and offer little value.

## Out of scope

- Adding loading screens to other transitions (exterior, nature).
- Real asset-load progress (assets are already in memory).
- Audio cues (radio static, "tuning" sound). Could be a follow-up issue.
- Persisting the "already seen" flag across sessions (e.g. `localStorage`). Intentionally per-session only.
