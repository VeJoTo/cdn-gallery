# Neon Arcade Style — Design Spec

## Goal

Restyle the CDN 3D gallery gaming room from its current warm-brown placeholder theme to a **Spiritfarer / ocean-night base with neon arcade lighting** — dark navy walls, three coloured neon point lights, emissive floor strips, per-cabinet screen colours, and matching dark CSS UI with glowing borders.

## Palette

| Role | Hex | Usage |
|---|---|---|
| Void black | `#050d14` | Scene background, fog, ceiling, button hover text |
| Ocean navy | `#0d1b2a` | Floor, bean bag base |
| Teal-slate | `#0a1a28` | Walls, control panels |
| Dark teal | `#1b3a4b` | Table, Gatekeeper robe, message bubbles |
| Electric teal | `#00e5ff` | Right screen emissive, neon point light, UI borders/glow, XP bar |
| Neon pink | `#ff006e` | Left screen emissive, neon point light, chat chip hover |
| Purple | `#9b00ff` | Centre fill light, bean bag cushion, chat border, user bubbles |
| Gold | `#ffd166` | Key directional light, Gatekeeper stars, UI titles, hotspot hints, XP level |
| Cool teal-white | `#90e0ef` | UI body text, breadcrumb, arcade screen base tint |

---

## Scene & Room (`src/scene/room.js`)

- **Scene background + fog colour**: `#050d14`
- **Floor** `MeshLambertMaterial`: `#0d1b2a`
- **Walls** `MeshLambertMaterial`: `#0a1a28`
- **Ceiling** `MeshLambertMaterial`: `#050d14`
- **AmbientLight**: colour `#1a3a5c`, intensity `0.2`
- **DirectionalLight**: colour `#ffd166`, intensity `0.6` (warm gold key, casts shadows)
- **PointLight — neon pink**: colour `#ff006e`, intensity `1.5`, distance `8`, placed near arcade-left (`x: -2.5, y: 1.5, z: 0.5`)
- **PointLight — electric teal**: colour `#00e5ff`, intensity `1.5`, distance `8`, placed near arcade-right (`x: 2.5, y: 1.5, z: 0.5`)
- **PointLight — purple fill**: colour `#9b00ff`, intensity `0.8`, distance `12`, placed centre above gatekeeper (`x: 0, y: 2.5, z: 1.5`)
- **Emissive floor strips**: two thin `BoxGeometry(7, 0.02, 0.06)` strips running along the base of the left and right walls at `y: 0.01`. Left strip uses `MeshStandardMaterial` colour + emissive `#ff006e`, emissiveIntensity `1.0`. Right strip uses `#00e5ff`, emissiveIntensity `1.0`. No shadow casting.

---

## Objects (`src/scene/objects.js`)

### Arcade cabinets

| Part | Colour | Notes |
|---|---|---|
| Body | `#080f18` | Near-black shell |
| Bezel | `#030810` | Darkest |
| Screen — left cabinet | `#ff006e` + emissive `#ff006e` @ `1.2` | Neon pink |
| Screen — right cabinet | `#00e5ff` + emissive `#00e5ff` @ `1.2` | Electric teal |
| Control panel | `#0d1a28` | Dark matte |
| Joystick base + stick | `#0a0a0a` | Black |
| Button 0 | `#ff006e` + emissive @ `0.8` | Neon pink |
| Button 1 | `#00e5ff` + emissive @ `0.8` | Electric teal |
| Button 2 | `#ffd166` + emissive @ `0.8` | Gold |

`buildArcadeCabinet` receives a second argument `screenColor` (hex int) so left and right cabinets can be built with different screen colours. `createObjects` passes `0xff006e` for left and `0x00e5ff` for right.

### Table

| Part | Colour |
|---|---|
| Top | `#1b3a4b` |
| Legs | `#0d1b2a` |
| Cards | `#e0f7ff` (cool white) |

### Bean bags

| Part | Colour |
|---|---|
| Base | `#1b3a4b` |
| Cushion | `#9b00ff` |

### Gatekeeper (`src/scene/gatekeeper.js`)

| Part | Colour | Notes |
|---|---|---|
| Head sphere | `#f5d0a9` | Keep warm skin tone |
| Hat (brim + cone) | `#050d14` | Near-black |
| Robe / body cone | `#1b3a4b` | Deep teal |
| Spectacle torus rings | `#00e5ff` + emissive @ `0.6` | Teal glow |
| Star orbs | `#ffd166` + emissive @ `1.0` | Gold glow |

---

## Wall Panels (`src/scene/panels.js`)

Canvas texture colours updated:

| Element | Colour |
|---|---|
| Panel background | `#0a1a28` |
| Panel title text | `#ffd166` |
| Body text / labels | `#90e0ef` |
| Chart bars | `#00e5ff`, `#ff006e`, `#9b00ff` |
| Timeline line | `#00e5ff` |
| Timeline dots | `#ffd166` |

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

## Files Changed

| File | Change |
|---|---|
| `src/scene/room.js` | Colours, all lights, add neon floor strips |
| `src/scene/objects.js` | All colours, `screenColor` param for cabinets |
| `src/scene/gatekeeper.js` | Hat, robe, spectacles, star colours |
| `src/scene/panels.js` | Canvas texture colours |
| `styles/main.css` | Full colour restyle |

No new files. No changes to navigation, tests, or main.js.
