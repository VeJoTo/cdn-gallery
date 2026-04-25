# Dark Mode Toggle — Design

**Status:** Approved, ready for implementation plan
**Branch:** `dark-mode`

## Summary

Add a sun/moon toggle that switches the exterior 3D scene between day (current) and night. The toggle lives inside the inventory as a "Settings" sticky-note. The inventory is opened via the `E` key; the standalone Inventory button is removed.

## Scope

**In scope**

- Exterior scene sky: day ↔ night visual swap
- New `Settings` sticky-note inside the inventory, containing a pill-style sun/moon toggle
- `E` keybind opens and closes the inventory (ESC also closes)
- Removal of the existing `#inventory-btn` HUD button and its CSS
- Persist choice across sessions via `localStorage`

**Out of scope**

- UI overlays (guide chat, inventory, book, rabbit hole) do NOT get a dark theme
- AI room interior keeps its existing clinical-grey sky regardless of toggle state
- Other interiors (Game Room, etc.) are unaffected

## Night visuals

When mode is `"night"`:

- Scene background swaps from `0x88bbf0` (light blue) to a dark night color (near-black with slight blue cast, e.g. `0x0a1128`)
- A starfield is added: ~800 points on a large sphere using `THREE.Points` with a small circular sprite, white/pale-blue tint
- A moon sprite is added at a fixed elevation, visible from typical camera angles on the exterior
- **Scene lighting is NOT dimmed.** Existing lights stay at full intensity so posters, signage, and gallery objects remain legible. This is an aesthetic swap, not an immersive darkness simulation.

When mode is `"day"`:

- Scene background restored to `0x88bbf0`
- Starfield and moon removed from the scene graph

## UI

### Toggle control

Pill-style toggle matching the reference image:

- Sun icon on the **left** side of the pill (light/day state)
- Moon icon on the **right** side of the pill (dark/night state)
- Knob slides left (day) or right (night)
- Visual style reuses the existing `.toggle-switch` / `.toggle-slider` pattern from the sound toggle as a starting point, adapted for icons on both sides

### Placement

Inside the inventory, on the **left scrapbook page**, as a new sticky-note styled to match the existing Tasks sticky-note:

```
┌──────────────────────┐
│   THE GAME ROOM      │
│                      │
│   [polaroid]         │
│                      │
│   ┌ Tasks ─────────┐ │
│   │ ...            │ │
│   └────────────────┘ │
│                      │
│   ┌ Settings ──────┐ │
│   │  Sky           │ │
│   │  ☀  ●────  🌙  │ │
│   └────────────────┘ │
└──────────────────────┘
```

### Removed

- `#inventory-btn` removed from `index.html`
- All CSS rules targeting `#inventory-btn` removed from `styles/main.css`
- Any JS in `src/ui.js` that wired the Inventory button's `click` handler is removed

## Keybinds

- `E` pressed when inventory is **closed** → opens the inventory
- `E` pressed when inventory is **open** → closes the inventory
- `ESC` still closes the inventory (existing behavior preserved)
- `E` must be ignored when other overlays are open (book, rabbit-hole, guide chat, etc.) — follow the same gating logic as existing keyboard shortcuts

## Persistence

- Key: `cdn-gallery-sky-mode`
- Values: `"day"` | `"night"`
- Default on first visit: `"day"`
- Bad/missing values fall back to `"day"`
- Read on boot, applied once before first render (after the initial `scene.background` assignment in `src/main.js`)

## Code organization

### `src/sky.js` (new)

Single source of truth for sky state. Exports:

- `applySkyMode(scene, mode)` — sets `scene.background`, creates/destroys the starfield + moon children
- `getSkyMode()` — reads and validates the localStorage flag, returns `"day"` | `"night"`
- `setSkyMode(mode)` — writes to localStorage

### `src/ui.js`

- Inventory's `openInventory()` render extended to include the Settings sticky-note + pill toggle
- Pill toggle `change` handler calls `setSkyMode(mode)` and `applySkyMode(scene, mode)`
- Toggle reflects current state on open (read from `getSkyMode()`)
- Keydown handler extended: `E` key opens/closes inventory, respecting existing overlay-gating rules

### `src/main.js`

- On boot, immediately after the initial `scene.background = new THREE.Color(0x88bbf0)` (line 36), call `applySkyMode(scene, getSkyMode())`
- **Room-transition sky resets must respect the current mode.** The exterior sky color is currently hardcoded to `0x88bbf0` in two transition handlers (around `src/main.js:769` and `:775`). Replace both with `applySkyMode(scene, getSkyMode())` so returning to the exterior re-applies the user's chosen mode rather than snapping back to day.
- The AI-room-specific sky at `src/main.js:781` (`0xf4f6f8`) is left unchanged — per scope, the AI room is not affected by the toggle.

### `index.html`

- Remove `<button id="inventory-btn">Inventory</button>`

### `styles/main.css`

- Remove `#inventory-btn` rules
- Add `.settings-stickynote` (mirrors `.sticky-note` styling, tweaked for Settings context)
- Add `.sky-toggle` for the pill with sun/moon icons

## Tests

### Unit (Vitest)

- `getSkyMode()` returns `"day"` when no localStorage value
- `getSkyMode()` returns `"day"` when localStorage has a garbage value
- `getSkyMode()` returns stored value when valid (`"night"` round-trip)
- `setSkyMode("night")` writes to the correct key
- `applySkyMode(scene, "night")` sets `scene.background` to night color and adds a starfield + moon to `scene.children`
- `applySkyMode(scene, "day")` restores the day color and removes the starfield + moon from `scene.children`

### Manual

- Fresh load (clear localStorage): sky is day, toggle shows sun
- Press `E`: inventory opens, Settings sticky-note visible with pill
- Click the toggle knob: sky flips to night live, stars/moon appear
- Press `E`: inventory closes; sky stays night
- Press `E`: inventory opens; pill still shows night state
- Reload page: sky is night on load, pill shows night state
- Press `ESC` while inventory open: inventory closes (regression check)
- Open another overlay (book, guide chat): press `E` — does NOT toggle inventory while the other overlay is open
- **Room-transition regression:** with night mode on, enter the AI room then return to the exterior — exterior sky should still be night (not snap back to day)

## Open questions

None — all decisions confirmed during brainstorming.

## References

- Reference image for toggle style: sun-left / moon-right pill toggle
- Existing toggle pattern: `#sound-toggle` / `.toggle-switch` / `.toggle-slider` in `styles/main.css`
- Existing sticky-note pattern: `.sticky-note` (Tasks, inside `openInventory()` in `src/ui.js`)
- Existing sky background line: `src/main.js:36`, `:769`, `:775`, `:781`
