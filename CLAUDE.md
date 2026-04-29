# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack
Vite + Three.js (WebGL) + CSS3DRenderer + GSAP. No framework. Entry: `index.html` → `src/main.js`.

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build (outputs to dist/)
npm test         # run all tests (vitest + jsdom)
npx vitest run src/tests/navigation.test.js   # single test file
```

## Key files

| File | Responsibility |
|------|---------------|
| `src/main.js` | Everything: scene init, TV/panel/hint logic, room transitions, click handler, magnifier, playlist, YouTube iframe |
| `src/navigation.js` | `HOTSPOTS` map (camera positions), `createNavigationSystem` (GSAP tweens), click raycaster |
| `src/ui.js` | HUD, panel drawer, rabbit hole, book UI, all overlay open/close |
| `src/videoData.js` | `aiArtVideos` array — video metadata, ULDN flags |
| `src/data/storiesData.js` | Info-panel text content per video |
| `src/scene/tv.js` | `buildTV()` — TV mesh, holographic buttons (`makeHoloButton`), button positions |
| `src/scene/room.js` | Main AI room geometry |
| `src/scene/objects.js` | Arcade cabinets, desk, globe, pedestal, posters, radio |
| `src/scene/sofa.js` | Sofa GLB loader (clickable → `tv` hotspot) |
| `src/scene/panels.js` | Wall art panels |
| `src/scene/nature-room.js` | Garden/nature room |
| `src/scene/exterior-room.js` | Exterior/entrance |
| `src/scene/kultur-kartet.js` | Kultur-kartet exhibit |
| `src/scene/globe-screen.js` | Globe video screen (Fin du Monde installation) |
| `src/intro.js` | Intro / gatekeeper sequence |
| `src/sky.js` | Skybox |

## Rooms
Two rooms: `'ai'` (main gallery) and `'nature'` (garden). Switched via `window.__transitionToRoom(name)`. `setRoomVisibility(activeRoom)` shows/hides objects and manages TV iframe state.

## TV system (main.js)
- `tvCSS3D` — CSS3DObject wrapping the YouTube iframe; kept always visible (opacity toggled, never `display:none`) to prevent YouTube re-buffering
- `tvOverlayCSS3D` — invisible click-intercept plane over the screen
- `holoPanelCSS3D` — info panel (left of TV from viewer)
- `playlistPanelCSS3D` — playlist panel (right of TV from viewer)
- All four are synced to `screenMesh` world position every frame via `addUpdateCallback`
- `enterTVMode()` / `exitTVMode()` / `stepBackFromTV()` manage the zoomed-in TV hotspot state
- `atTV` flag gates TV-mode mouse handling
- `_freeCursorAfterTV` flag enables click-to-re-enter after step-back; cleared when any non-TV hotspot is reached
- Free-cursor mode pattern: `enterXxxMode()` calls `controls.unlock()` + hides crosshair + shows back button; `exitXxxMode()` reverses it

## TV zoom handler (main.js)
The `mousedown` listener that auto-zooms to TV has two guards that must stay in sync with any new overlay work:
1. `if (e.target.closest('[id$="-overlay"]:not(.hidden)')) return` — skips zoom when closing any overlay (prevents spurious TV zoom when clicking ✕ or backdrop)
2. Panel bounding-rect check only runs in free-cursor mode (`!controls.isLocked`) — in pointer-lock mode the 3D raycast handles detection

## Holographic buttons (tv.js)
Bottom row (y: -0.58): `|◀` prevVideo x:-0.13, `▶` toggleTV x:0.00, `▶|` nextVideo x:0.13
Right cluster: `ⓘ` showInfo x:0.72, `MAG+` toggleMagnifier x:0.85
Left cluster: `PL` togglePlaylist x:-0.85, `🔊` toggleSound x:-0.72
TV group scale: 1.5×. `tvBackBtn` is a fixed DOM `×` button at `bottom:36px; right:36px`.

## Hint system (main.js)
- `_startInfoHint` / `_stopInfoHint` — pulses info button; only fires on video index 0; auto-opens panel after 6 s if not clicked; stopped permanently once `_infoEverUsed = true`
- `_startMagHint` / `_stopMagHint` — pulses magnifier button; only for ULDN videos; stopped permanently once `_magEverUsed = true`
- `_pulseHoloBtn(btn, onDone, opts)` — GSAP timeline, `repeat:-1`, `repeatDelay:1.8`

## Radio system (feat/scifi-radio branch)
- GLB at `public/models/SketchFab/radio_scifi.glb`
- `PLAYLIST` array — podcast URLs; HTML Audio element (no `crossOrigin`)
- GLB button nodes hidden; clickable `THREE.Sprite` icons placed at button world positions
- `atRadio` flag mirrors `atTV`; `enterRadioMode()` / `exitRadioMode()` in main.js
- `'radio'` hotspot in `HOTSPOTS`

## Navigation
`HOTSPOTS` in `navigation.js` — each entry has `position`, `target`, optional `duration`.
`nav.goTo(id)` animates camera. `nav.goBack()` restores saved position.
`ui.updateHUD(id)` is called on navigation complete — wired in main.js to call `enterTVMode()` when `id === 'tv'`, otherwise `exitTVMode()` + clears `_freeCursorAfterTV`.

## Vite config
`base: '/cdn-gallery/'` — all public asset URLs must start with `/cdn-gallery/` (e.g. `/cdn-gallery/models/SketchFab/sofa.glb`). Easy to miss and causes silent 404s.

## GLB loading pattern
```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
loader.load('/cdn-gallery/models/SketchFab/file.glb', (gltf) => { ... });
```
Models go in `public/models/SketchFab/`. Avoid special characters/spaces in filenames.

## Clickable objects pattern
Every interactive 3D object sets `userData.clickable = true` plus any of:
- `userData.hotspot` — navigates camera to that HOTSPOT id on click
- `userData.action` — fires a named action (e.g. `'openPanel'`, `'openFinDuMonde'`, `'enterNatureRoom'`)
- `userData.panelId` / `userData.panelTitle` — used with `openPanel` / `openPoster` actions

Objects are collected into the `clickableObjects` array in main.js and raycasted each frame/click.

## Adding a new overlay
1. Add HTML element with id ending in `-overlay` (e.g. `id="foo-overlay"`)
2. Add open/close functions in `ui.js` using `unlockForOverlay()` / `relockAfterOverlay()`
3. Add action string to the `uiActions` Set in main.js click handler so `controls.unlock()` fires
4. The TV-zoom guard `[id$="-overlay"]:not(.hidden)` covers it automatically — no extra wiring needed

## Known WebGL warning (not our code)
`GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image` — from the CSS3DRenderer/YouTube iframe layer. Safe to ignore.

## Main branch: `master`
