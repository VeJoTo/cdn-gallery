# Globe Videos Overlay — Two-Column Redesign
**Date:** 2026-04-23
**Branch:** feat/fin_du_monde_v2

## Summary
Restructure the `#globe-videos-overlay` so the Fin du Monde descriptive text and the 2×2 Vimeo video grid are visible simultaneously, side by side.

## Current State
- Overlay has a title, subtitle, and a `#globe-videos-grid` (2×2 iframes)
- Descriptive text exists only on the 3D canvas screen (`drawDefaultScreen` in `globe-screen.js`)
- Opening the overlay hides the 3D screen, so text and videos are never visible together

## New Layout

### Overall container
- `#globe-videos-content` widens to `min(1200px, 94vw)`
- Title (`#globe-videos-title`) and subtitle (`#globe-videos-subtitle`) are removed from above the grid
- A two-column flex row replaces the current single-column layout

### Left column — Text panel
Matches the aesthetic of the left panel on the 3D canvas screen:
- Title: "Fin du Monde" — CDN blue `#1b7ab8` with matching text-shadow glow
- Thin horizontal divider below title: `rgba(27,122,184,0.5)`
- Body paragraph 1: the AI dark comedy / meteor description
- Body paragraph 2: the news anchors paragraph
- CTA at bottom: "Press one of the highlighted parts on the globe to begin exploring!" — mint teal `#3dd6c0`
- Subtle scan-line background using a CSS repeating-linear-gradient

### Divider
Vertical line between columns: `1px solid rgba(0,212,255,0.2)` — matches the canvas screen divider

### Right column — Video grid
- Existing `#globe-videos-grid` (2×2 Vimeo iframes), unchanged in behaviour
- Takes equal width to the text column

### Close button
Stays at top-right of `#globe-videos-content`, unchanged

## Files changed
- `index.html` — restructure `#globe-videos-overlay` inner HTML
- `styles/main.css` — update `#globe-videos-content`, add column layout styles, remove title/subtitle styles that are no longer needed

## Files NOT changed
- `src/scene/globe-screen.js` — no changes
- `src/ui.js` — no changes (open/close logic identical)
- `src/main.js` — no changes
