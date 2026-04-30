# Enter Portal Label Visibility

GitHub issue: [#88](https://github.com/VeJoTo/cdn-gallery/issues/88) — *Fix: "Enter portal" teksten må være mer synlig*

## Problem

The floating "▸ ENTER PORTAL ◂" label above the portal in `buildPortal()` is hard to read. Current implementation uses thin cyan text on a transparent plane with only an 8px shadow, so it washes out against the bright portal glow and varying scene backgrounds. Goal: make it prominent at all times.

## Solution

Replace the transparent text plane with a **glowing pill** — a dark rounded-rect backdrop with a cyan border and white text — and add a subtle opacity pulse so it breathes.

## Scope

- **File:** `src/scene/objects.js`
- **Functions touched:**
  - `buildPortal()` — label construction (currently lines 104-121)
  - `sceneUpdate()` inside `addExtraObjects` — animation tick (currently around line 1126)
- **No other files change.**

## Visual specification

| Property | Current | New |
|---|---|---|
| Canvas resolution | 256 × 48 | **512 × 128** |
| Backdrop | none (transparent) | **Rounded rect, ~16px radius, fill `rgba(5, 10, 20, 0.85)`, cyan stroke `#00d4ff` 3px, cyan shadow blur ~20** |
| Font | bold 24px Octosquares | **bold 44px Octosquares** |
| Text fill | `#00d4ff` | **`#ffffff`** |
| Text glow | shadow blur 8 | **shadow blur ~16, color `#00d4ff`** |
| Plane size | 0.8 × 0.15 | **1.2 × 0.3** |
| Y position | 1.35 | **1.45** (raise to clear larger pill from rings) |

The pill is drawn first onto the canvas; the text is drawn on top so the cyan stroke/glow frames the white text.

## Animation

Expose the label mesh on `portal.userData.label`. In the existing `sceneUpdate(delta)` loop (which already drives ring spin and inner-glow pulse), add:

```js
portal.userData.label.material.opacity = 0.85 + Math.sin(elapsed * 1.5) * 0.15;
```

This breathes the label between ~0.70 and ~1.00 over ~4 seconds. The material already has `transparent: true`, so no flag changes needed. No new animation infrastructure — reuses the same `elapsed` timer that drives `innerGlow.material.emissiveIntensity`.

## Out of scope

- Repositioning the portal itself
- Changing portal ring/glow colors or sizes
- Adding interaction-state variants (hover/click) for the label
- Localizing the label text

## Testing

Manual verification only — this is a visual change.

1. Load gallery, walk to portal area: label should be clearly readable.
2. Stand close, partially overlapping the portal glow: label still legible (dark backdrop guarantees contrast).
3. View from across the room: pill silhouette and text remain visible.
4. Watch for ~5 seconds: opacity breathes smoothly, no flicker or jump.
5. Click the portal: existing `enterNatureRoom` action still fires (clickTarget unchanged).

## Branch & PR

- Branch: `fix/enter-portal-visibility` off `master`
- PR closes issue #88
