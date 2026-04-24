# Globe Start Button Flow
**Date:** 2026-04-24
**Branch:** feat/Fin_du_monde_LookAtScreenBeforeGlobe

## Summary
Replace the current "locked globe with hint text" mechanic with a cleaner two-step flow: the screen starts with only a Start button, the camera zooms in on click, and pressing Start reveals the full screen content and unlocks the globe.

## Screen States

### State 1 — Pre-start (default on load)
- Canvas shows only a large CDN Button 1 styled "Start →" button, centered on the screen
- No descriptive text, no video thumbnails
- Globe markers are dimmed (grey, low opacity) and non-clickable
- Screen mesh has `userData.hotspot = 'screen'` and `userData.action = 'startGlobe'`

### State 2 — Zoomed in (after first click)
- Camera navigates to a hotspot position close in front of the screen
- The Start button is now crosshair-clickable (player is at the hotspot)
- `alreadyAtHotspot` check enables the `startGlobe` action on second click

### State 3 — Started (after Start is pressed)
- Canvas redraws to the full default view: Fin du Monde text left, video thumbnails right, normal CTA
- Globe markers animate from grey → full CDN colors (existing unlock animation)
- `screen.userData.screenMesh.userData.action` switches to `'openGlobeVideos'` for subsequent clicks
- Camera stays zoomed — user steps back manually via the Step Back button
- State is permanent for the session

## Hotspot
- ID: `'screen'`
- Position: close in front of the screen, slightly elevated — defined in `navigation.js` hotspot map alongside existing hotspots like `'pedestal'` and `'tv'`

## Canvas — `drawStartScreen(canvas)`
- Background: CDN navy `#0d1f33` with scan lines
- Centered heading: "Fin du Monde" in CDN blue `#1b7ab8` with glow
- Large pill button below heading: "Start →"
  - CDN Button 1 style: dark fill `rgba(10,20,38,0.88)`, rounded rect, cyan `#00d4ff` border with glow
  - Button text: white, centered
- Subtle hint below button: "click to begin" in dim cyan

## Files Changed

### `src/scene/globe-screen.js`
- Add `drawStartScreen(canvas)` function
- Initial canvas uses `drawStartScreen` instead of `drawDefaultScreen(locked=true)`
- Remove the old locked CTA text from `drawDefaultScreen` — `locked` param no longer needed
- `start()` method: calls `drawDefaultScreen`, calls `unlock()`, switches action to `'openGlobeVideos'`
- Screen mesh `userData` initialised with `hotspot: 'screen', action: 'startGlobe'`

### `src/navigation.js` (or `main.js` hotspot map)
- Add `'screen'` hotspot position: in front of the screen at ~`(5.5, 1.6, -7.5)`

### `src/main.js`
- Add `'startGlobe'` to `uiActions` set
- Handle `if (action === 'startGlobe' && alreadyAtHotspot) globeScreen.start()`
- Remove `globeScreen.unlock()` from `openGlobeVideos` handler (unlock now happens via `start()`)

## Non-goals
- No auto step-back after pressing Start
- No progress indicator or timer
- No changes to the video overlay itself
