# Globe + Screen Installation — Design Spec
**Date:** 2026-04-21  
**Branch:** feat/fin_du_monde

## Summary
A holographic globe with three clickable countries (Norway, Greece, France) and a news screen beside it, installed in the back-right corner of the AI room. Part of the "Fin du Monde" feature.

## Placement
- Globe pedestal: `(6, 0, -10)` in AI room
- Globe sphere floats at: `(6, 1.5, -10)`
- Screen panel: `(9, 1.5, -10.1)` facing `+Z` (toward player)

## Globe
- Cyan wireframe sphere over transparent deep-blue solid — matches existing holoSphere visual language
- Lat/lon grid rings for equator and key meridians
- Three glowing markers at correct geographic positions: Norway (65°N 15°E), Greece (39°N 22°E), France (46°N 2°E)
- Floating country name labels above each marker
- Slow rotation (~0.05 rad/s)
- Markers are children of the rotating group — clickable via existing crosshair raycaster

## Screen
- Dark-framed monitor mesh (2m wide, 1.25m tall)
- Canvas texture updated in-place on country selection

### Default state
- **Left half:** Title "Fin du Monde" + full description text + "Press one of the highlighted parts on the globe to begin exploring!"
- **Right half:** 2×2 grid of news anchor placeholder tiles (dark boxes with ▶ icon)

### Country selected state
- Full-screen placeholder card: country name, apocalypse-toned colored background, "← back" prompt
- Clicking screen in this state resets to default

## New file
`src/scene/globe-screen.js` — exports `createGlobeScreenInstallation(scene)`

## Wiring (main.js)
- `selectCountry` action → calls `globeScreen.selectCountry(country)`
- `resetGlobeScreen` action → calls `globeScreen.reset()`
- Both objects added to `clickableObjects`
