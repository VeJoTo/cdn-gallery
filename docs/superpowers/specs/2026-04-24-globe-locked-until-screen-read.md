# Globe Locked Until Screen Is Read
**Date:** 2026-04-24
**Branch:** feat/Fin_du_monde_LookAtScreenBeforeGlobe

## Summary
Country markers on the globe start locked (dimmed, non-clickable) when the player enters the AI room. They unlock permanently once the user clicks the Fin du Monde screen, ensuring the contextual text is seen before the globe becomes interactive.

## States

### Locked (default)
- All three country marker buttons are visible but desaturated and low-opacity (grey tint, ~30% opacity)
- Connector lines are dimmed (low opacity)
- Surface dots on the globe are at reduced emissive intensity
- Marker `userData.clickable = false` — crosshair raycaster ignores them entirely
- Screen canvas CTA text reads: "← Click the screen to begin" (pulsing, mint teal) instead of the normal globe prompt

### Unlocked (after screen click)
- Markers animate from grey → full CDN colors over ~0.5s (emissive intensity fade)
- Connector lines return to normal animated opacity
- Surface dots return to full emissive intensity
- Marker `userData.clickable = true` restored
- Screen canvas redraws with the normal CTA: "Press one of the highlighted parts on the globe to begin exploring!"
- Unlock is permanent for the session — does not reset on `globeScreen.reset()`

## Unlock trigger
- User clicks the screen in default state → `openGlobeVideos` action fires
- `main.js` calls `globeScreen.unlock()` at the same time

## Files changed

### `src/scene/globe-screen.js`
- Add `let unlocked = false` flag inside `createGlobeScreenInstallation`
- `buildGlobe`: markers initialised with grey material color, low opacity, `emissiveIntensity: 0`
- `drawDefaultScreen(canvas, locked)`: accepts a `locked` boolean — when true, CTA reads "← Click the screen to begin" with a pulse animation hint; when false, normal CTA
- Add `unlock()` function:
  - Sets `unlocked = true`
  - Animates each marker's material from grey → original CDN color + emissive over 0.5s (lerp in update loop or via small elapsed timer)
  - Sets `userData.clickable = true` on all markerGroups
  - Redraws screen canvas with `locked = false`
  - Updates `texture.needsUpdate`
- `update()`: if not yet fully unlocked, drive the fade animation

### `src/main.js`
- When `action === 'openGlobeVideos'`: call `globeScreen.unlock()` before/alongside `ui.openGlobeVideos()`

## Non-goals
- No lock reset on room transition or `globeScreen.reset()` — once unlocked stays unlocked
- No progress indicator or timer — purely click-triggered
