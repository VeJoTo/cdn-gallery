# Neon Arcade Gaming Room — Design Spec

## Goal

Restyle the CDN 3D gallery gaming room from its current warm-brown placeholder theme to a **Spiritfarer / ocean-night base with neon arcade lighting**, and flesh out the room with **gaming decor** — posters, a desk with monitors and a globe, gaming chair, bookshelf, neon sign, rug, mini fridge, floor lamp.

## Palette

| Role | Hex | Usage |
|---|---|---|
| Void black | `#050d14` | Scene background, fog, ceiling, button hover text |
| Ocean navy | `#0d1b2a` | Floor, bean bag base, desk top |
| Teal-slate | `#0a1a28` | Walls, control panels, fridge body |
| Dark teal | `#1b3a4b` | Table, Gatekeeper robe, message bubbles, chair frame |
| Electric teal | `#00e5ff` | Right screen emissive, neon point light, UI borders/glow, XP bar |
| Neon pink | `#ff006e` | Left screen emissive, neon point light, neon sign, chat chip hover |
| Purple | `#9b00ff` | Centre fill light, bean bag cushion, chat border, user bubbles |
| Gold | `#ffd166` | Key directional light, Gatekeeper stars, UI titles, hotspot hints, XP level |
| Cool teal-white | `#90e0ef` | UI body text, breadcrumb, monitor base tint |

---

## Scene & Room (`src/scene/room.js`)

- **Scene background + fog colour**: `#050d14`
- **Floor** `MeshLambertMaterial`: `#0d1b2a`
- **Walls** `MeshLambertMaterial`: `#0a1a28`
- **Ceiling** `MeshLambertMaterial`: `#050d14`
- **AmbientLight**: colour `#1a3a5c`, intensity `0.2`
- **DirectionalLight**: colour `#ffd166`, intensity `0.6` (warm gold key, casts shadows)
- **PointLight — neon pink**: colour `#ff006e`, intensity `1.5`, distance `8`, position `(-2.5, 1.5, 0.5)`
- **PointLight — electric teal**: colour `#00e5ff`, intensity `1.5`, distance `8`, position `(2.5, 1.5, 0.5)`
- **PointLight — purple fill**: colour `#9b00ff`, intensity `0.8`, distance `12`, position `(0, 2.5, 1.5)`
- **Emissive floor strips**: two `BoxGeometry(7, 0.02, 0.06)` strips along the base of the left and right walls at `y: 0.01`. Left strip `MeshStandardMaterial` colour + emissive `#ff006e` @ `1.0`. Right strip `#00e5ff` @ `1.0`. No shadow casting.

---

## Objects (`src/scene/objects.js`)

### Existing — Arcade cabinets

| Part | Colour | Notes |
|---|---|---|
| Body | `#080f18` | Near-black shell |
| Bezel | `#030810` | Darkest |
| Screen — left cabinet | `#ff006e` + emissive `#ff006e` @ `1.2` | Neon pink |
| Screen — right cabinet | `#00e5ff` + emissive `#00e5ff` @ `1.2` | Electric teal |
| Control panel | `#0d1a28` | |
| Joystick base + stick | `#0a0a0a` | |
| Button 0 | `#ff006e` + emissive @ `0.8` | |
| Button 1 | `#00e5ff` + emissive @ `0.8` | |
| Button 2 | `#ffd166` + emissive @ `0.8` | |

`buildArcadeCabinet(xPos, screenColor)` — second arg is hex int. `createObjects` passes `0xff006e` left, `0x00e5ff` right.

### Existing — Table

| Part | Colour |
|---|---|
| Top | `#1b3a4b` |
| Legs | `#0d1b2a` |
| Cards | `#e0f7ff` |

### Existing — Bean bags

| Part | Colour |
|---|---|
| Base | `#1b3a4b` |
| Cushion | `#9b00ff` |

---

### NEW — Gaming desk + dual monitors + globe

`buildDesk()` returns a `THREE.Group`. Position: against the back wall, right of centre, `(1.8, 0, -2.6)`. Faces forward (toward the room). The back of the desk (`z ≈ -3.05`) sits flush against the back wall at `z = -3.5`.

- **Desk top**: `BoxGeometry(2.4, 0.06, 0.9)`, `#0d1b2a`, position `y: 0.85`.
- **Desk legs**: 4 × `BoxGeometry(0.06, 0.85, 0.06)`, `#0a0a0a`, at the corners.
- **Left monitor**: bezel `BoxGeometry(0.7, 0.45, 0.04)` `#030810` + screen `BoxGeometry(0.66, 0.41, 0.02)` `MeshStandardMaterial` `#9b00ff` emissive `#9b00ff` @ `1.0`. Position `(-0.55, 1.25, -0.2)` (relative to desk group origin), tilted slightly inward `rotation.y = 0.15`.
- **Right monitor**: same geometry, screen colour `#00e5ff` emissive `#00e5ff` @ `1.0`. Position `(0.55, 1.25, -0.2)`, `rotation.y = -0.15`.
- **Monitor stands**: 2 × `BoxGeometry(0.08, 0.18, 0.08)` `#0a0a0a`, under each monitor.
- **Keyboard**: `BoxGeometry(0.55, 0.02, 0.18)` `#0a0a0a` with thin emissive `#ff006e` strip on top edge (`BoxGeometry(0.55, 0.005, 0.005)` emissive @ `0.8`). Position `(0, 0.89, 0.05)`.
- **Mouse**: `BoxGeometry(0.06, 0.02, 0.1)` `#0a0a0a` at `(0.4, 0.89, 0.05)`.
- **Globe** (`buildGlobe()` called as part of desk group):
  - **Stand base**: `CylinderGeometry(0.06, 0.08, 0.04, 12)` `#1b3a4b` at `(-1.0, 0.91, 0.1)` (relative to desk).
  - **Stand arc**: `TorusGeometry(0.13, 0.008, 8, 16, Math.PI)` `#1b3a4b`, rotated to form a half-arc holding the sphere.
  - **Sphere**: `SphereGeometry(0.12, 24, 16)` with a `CanvasTexture` showing simple stylized continents (dark teal `#1b3a4b` ocean, gold `#ffd166` continents drawn as rough blobs). Position centred in the arc.
  - The globe's userData on the parent group sets `clickable: true, action: 'openPanel', panelId: 'globe', panelTitle: 'CDN International Reach'`.
  - The sphere mesh is referenced from the desk group (`group.userData.globeMesh = sphere`) so the update loop can rotate it: `sphere.rotation.y += delta * 0.3`.
- The desk group root sets `userData = { clickable: true, hotspot: 'desk' }`. Camera flies in close to the desk on click. The monitors and globe inside are individually clickable for their actions (handled by the click walker in `navigation.js` finding the nearest `clickable` ancestor — globe wins if clicked directly).
- The left monitor mesh sets `userData = { clickable: true, action: 'openPanel', panelId: 'desk-research', panelTitle: 'Digital Storytelling Research' }`.

### NEW — Gaming chair

`buildGamingChair()`. Position: in front of the desk, `(1.8, 0, -1.7)`, facing the desk (`rotation.y = Math.PI`).

- **Seat base**: `BoxGeometry(0.5, 0.08, 0.5)` `#1b3a4b` at `y: 0.45`.
- **Backrest**: `BoxGeometry(0.5, 0.85, 0.08)` `#1b3a4b` at `(0, 0.92, -0.21)`.
- **Headrest accent**: `BoxGeometry(0.5, 0.12, 0.08)` `#ff006e` at `(0, 1.28, -0.21)` — neon pink stripe.
- **Backrest accent strip**: `BoxGeometry(0.06, 0.85, 0.085)` `#00e5ff` at `(0, 0.92, -0.205)` — vertical teal accent down the centre.
- **Armrests**: 2 × `BoxGeometry(0.08, 0.08, 0.4)` `#0a0a0a` at `(±0.29, 0.6, 0)`.
- **Wheel base**: `CylinderGeometry(0.04, 0.04, 0.4, 6)` `#0a0a0a` at `y: 0.2`.
- **Wheel star**: 5 × `BoxGeometry(0.25, 0.04, 0.04)` `#0a0a0a` rotated around `y: 0.02`, like a chair foot star.

### NEW — Bookshelf

`buildBookshelf()`. Position: against the **left wall**, `(-3.4, 0, -2.5)`, rotated `rotation.y = Math.PI / 2` to face into the room.

- **Frame**: `BoxGeometry(1.2, 1.8, 0.3)` `#1b3a4b` at `y: 0.9`.
- **Shelves**: 3 × `BoxGeometry(1.15, 0.03, 0.28)` `#0a1a28` at heights `y: 0.5, 0.95, 1.4`.
- **Books**: ~12 small `BoxGeometry(0.08, 0.22, 0.18)` boxes per shelf in alternating colours from the palette (`#ff006e`, `#00e5ff`, `#9b00ff`, `#ffd166`, `#1b3a4b`). Stand them upright on each shelf with slight x-spacing variation.

### NEW — Wall posters

3 × `buildPoster(x, y, panelId)`. All on the **back wall** (`z: -3.45`, facing into the room with no rotation).

- Each: `PlaneGeometry(0.8, 1.1)`, `MeshBasicMaterial` with a `CanvasTexture`. Canvas draws a rectangular neon-frame poster (3px stroke, alternating frame colours `#ff006e`, `#00e5ff`, `#9b00ff` per poster), title text in `#ffd166`, simple geometric shapes (circle, triangle) as placeholder game art.
- Positions: `(-2.5, 2.0, -3.45)`, `(-1.4, 2.0, -3.45)`, `(-0.3, 2.0, -3.45)` — three on the left half of the back wall (right half is occupied by the desk and neon sign).
- `userData = { clickable: true, action: 'openPanel', panelId: 'poster-N', panelTitle: 'Game Poster N' }`.

### NEW — Neon sign "GAME ROOM"

`buildNeonSign()`. Position: on the back wall above the desk, `(1.8, 2.9, -3.4)`.

- Build the letters G-A-M-E and R-O-O-M from groups of `BoxGeometry(0.04, 0.18, 0.04)` segments (stick-letter style) using `MeshStandardMaterial` with colour + emissive `#ff006e`, emissiveIntensity `1.4`.
- Two rows: "GAME" on top (`y: 3.0`), "ROOM" below (`y: 2.75`). Total width ~1.6 units, centred.
- Helper `letterSegments` map gives each letter the segment positions (top, middle, bottom, left, right, etc.). Use a small lookup table for the 7 letters G, A, M, E, R, O, M needed.

### NEW — Rug

`buildRug()`. Position: floor centre, `(0, 0.005, 0.5)`.

- `PlaneGeometry(3.5, 2.5)`, rotated `rotation.x = -Math.PI/2`.
- `MeshStandardMaterial` colour `#1b3a4b` + a `CanvasTexture` drawn with concentric neon rings (`#ff006e`, `#00e5ff`, `#9b00ff`) on a dark background. `receiveShadow = true`.

### NEW — Mini fridge

`buildMiniFridge()`. Position: back-left corner, `(-3.0, 0, -2.8)`.

- **Body**: `BoxGeometry(0.7, 1.0, 0.6)` `#0a1a28` at `y: 0.5`.
- **Door split line**: `BoxGeometry(0.72, 0.01, 0.605)` `#030810` at `y: 0.65` (horizontal trim).
- **Handle**: `BoxGeometry(0.04, 0.2, 0.04)` `#00e5ff` emissive @ `0.6` at `(0.3, 0.7, 0.31)`.
- **Top emissive strip**: `BoxGeometry(0.7, 0.02, 0.6)` `MeshStandardMaterial` `#00e5ff` emissive @ `1.0` at `y: 1.01`.
- `castShadow = true`, `receiveShadow = true`.

### NEW — Floor lamp

`buildFloorLamp()`. Position: between the bean bags and the right wall, `(2.6, 0, 1.8)`.

- **Base**: `CylinderGeometry(0.15, 0.15, 0.04, 12)` `#0a0a0a` at `y: 0.02`.
- **Pole**: `CylinderGeometry(0.025, 0.025, 1.6, 8)` `#0a0a0a` at `y: 0.84`.
- **Tube shade**: `CylinderGeometry(0.06, 0.06, 0.5, 12)` `MeshStandardMaterial` colour + emissive `#9b00ff` @ `1.2` at `y: 1.7`.
- **Halo PointLight**: colour `#9b00ff`, intensity `0.5`, distance `4`, at `y: 1.7` (attached to the lamp group).

---

### `createObjects(scene)` — updated return

```js
return { arcadeLeft, arcadeRight, desk, globeUpdate };
```

`globeUpdate(delta)` is a function that rotates the globe sphere; `main.js` registers it with `addUpdateCallback`. (Same pattern as `gatekeeper.update`.)

The desk group is added to `clickableObjects` (its descendants traversed by the existing click walker).

Posters, fridge handle (no, fridge is scenery), bookshelf (scenery), chair (scenery), neon sign (scenery), rug (scenery), floor lamp (scenery) — only **desk + monitors + globe + posters** are clickable. Everything else is decoration.

---

## Navigation (`src/navigation.js`)

Add new hotspot:

```js
desk: { position: { x: 1.8, y: 1.5, z: -0.6 }, target: { x: 1.8, y: 1.2, z: -2.6 }, label: 'Gaming Desk' }
```

---

## Gatekeeper (`src/scene/gatekeeper.js`)

| Part | Colour | Notes |
|---|---|---|
| Head sphere | `#f5d0a9` | Keep warm skin tone |
| Hat (brim + cone) | `#050d14` | Near-black |
| Robe / body cone | `#1b3a4b` | Deep teal |
| Spectacle torus rings | `#00e5ff` + emissive @ `0.6` | Teal glow |
| Star orbs | `#ffd166` + emissive @ `1.0` | Gold glow |

---

## Wall Panels (`src/scene/panels.js`)

Canvas texture colours:

| Element | Colour |
|---|---|
| Panel background | `#0a1a28` |
| Panel title text | `#ffd166` |
| Body text / labels | `#90e0ef` |
| Chart bars | `#00e5ff`, `#ff006e`, `#9b00ff` |
| Timeline line | `#00e5ff` |
| Timeline dots | `#ffd166` |

---

## UI (`src/ui.js`)

Add two new entries to `GATEKEEPER_RESPONSES` is not needed. The existing `openPanelDrawer(panelId, panelTitle)` already handles `desk-research`, `globe`, and `poster-N` IDs through its placeholder text — no code change in `ui.js` is required for the new clickable objects.

---

## CSS UI (`styles/main.css`)

| Element | Value |
|---|---|
| `body` background | `#050d14` |
| `#hud` background | `rgba(5,13,20,0.88)` |
| Breadcrumb text | `#90e0ef` |
| HUD buttons border + text | `#00e5ff` |
| HUD button hover | bg `#00e5ff`, text `#050d14` |
| `#panel-drawer` background | `rgba(10,26,40,0.97)` |
| Drawer border | `1px solid #00e5ff` + `box-shadow: 0 0 14px rgba(0,229,255,0.35)` |
| Drawer `h2` | `#ffd166` |
| Drawer body text | `#90e0ef` |
| `#gatekeeper-chat` background | `rgba(10,26,40,0.97)` |
| Chat border | `1px solid #9b00ff` + purple glow shadow |
| `.chat-msg.gatekeeper` | bg `#1b3a4b`, text `#90e0ef` |
| `.chat-msg.user` | bg `#9b00ff`, text `#fff` |
| `.chat-chip` | border `#ff006e`, text `#ff006e` |
| Chat chip hover | bg `#ff006e`, text `#050d14` |
| `#inventory-overlay` bg | `rgba(5,13,20,0.93)` |
| Level text | `#ffd166` |
| XP bar fill | `#00e5ff` |
| Earned achievement border | `1px solid #ffd166` + gold glow |
| `.hotspot-hint` colour | `#ffd166` |

---

## `main.js` Wiring Changes

- `createObjects` now returns `{ arcadeLeft, arcadeRight, desk, globeUpdate }`.
- Register: `addUpdateCallback(globeUpdate)`.
- `clickableObjects` includes `...desk.children` (which recursively contains monitors and globe via the click walker — actually the existing walker walks up `parent` chain, so passing the **descendant meshes** is correct). Use `desk.traverse` to collect all meshes, or simply `clickableObjects.push(desk)` and let the raycaster recurse via `intersectObjects([...], true)` — which it already does. So just push `desk` and the new poster meshes.
- New posters returned from `createObjects` as an array: update return signature to `{ arcadeLeft, arcadeRight, desk, posters, globeUpdate }`. Push `...posters` to `clickableObjects`.

---

## Files Changed

| File | Change |
|---|---|
| `src/scene/room.js` | Colours, all lights, neon floor strips |
| `src/scene/objects.js` | Restyle existing objects + add desk, chair, bookshelf, posters, neon sign, rug, fridge, floor lamp, globe; new return shape |
| `src/scene/gatekeeper.js` | Hat, robe, spectacles, star colours |
| `src/scene/panels.js` | Canvas texture colours |
| `src/navigation.js` | Add `desk` hotspot |
| `src/main.js` | Register `globeUpdate`, push desk + posters to `clickableObjects` |
| `styles/main.css` | Full colour restyle |

No new files. No changes to tests.
