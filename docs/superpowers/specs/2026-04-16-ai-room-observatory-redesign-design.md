# AI Room — Observatory Redesign

**Status:** design-approved, pending implementation plan
**Date:** 2026-04-16
**Branch:** `redesign`
**Reference images:** white sci-fi lab with LED-strip walls + circular vault door; curved-wall observatory with central holographic data sphere.

---

## Goal

Re-theme the AI room's shell (walls, ceiling, floor, lighting) from the current dark neon-gaming aesthetic to a bright white holographic observatory. Add a central holo-sphere as the room's hero focal point. Keep all existing interactions; re-home the existing objects into wall alcoves around the new centerpiece.

## Non-goals

- No changes to the nature room, book overlay, panel drawer, rabbit-hole scrollytelling, Fin du Monde overlay, report viewer, or any other overlays. The nature portal retheme is cosmetic only — it still transitions to the nature room.
- No changes to the room dimensions (3.5 × 3.5 × 3 m, left/right walls, back wall, front open, ceiling at ~3 m). The curved walls are inner surfaces only; collision/dimensions stay.
- No new research content in the panels — the floating-motifs panel reuses and cross-references what already exists in the magical-book overlay.

## Objects removed

The following objects are cut entirely; their `buildX` functions, scene.add references, hotspot entries, panel content, and clickable-list entries all get removed:

- `neonSign` (along with its `sign` panel content)
- `rug`
- `floorLamp` (along with its `lamp` panel content)
- `wallTagging`
- `radio` — but the radio widget UI (`#radio-widget`) and its music / podcast / Spotify behaviors stay; it just no longer has a 3D object anchor. The widget is a fixed-position UI element and doesn't depend on the 3D radio existing.

## Objects kept and restyled

Every other object keeps its click behavior but gets re-skinned and moved into an alcove. Dimensions stay the same; materials and placement change.

| Object | New home | Restyle |
|---|---|---|
| Arcade cabinet | Left wall alcove | White sci-fi housing with cyan LED trim, screen kept cyan |
| Coffee machine | Back-left alcove (current spot) | Keep dark gray — it's the lone utility machine and reads intentionally "different" |
| Bookshelf | Left wall alcove | White body, book spines glow cyan |
| Desk + gaming chair + monitors + globe | Back-right alcove (current spot) | White floating-shelf desk; chair to sleek white sci-fi; globe stays; monitors keep Fin du Monde + (desk)-right iframe content |
| TV | Right wall alcove | Framed in curved-top alcove; YouTube iframe content unchanged |
| AI-cinema poster | Right wall alcove | Hologram-panel style (same text, cyan wireframe treatment) |
| Nature-room portal | Right wall alcove | Re-theme as transit gate — same geometry, white frame, cyan glow |
| The 3 AI posters (Galaga, Pac-Man, Space Invaders slots) | Back-center alcove | Reskin as blueprint-style holographic panels — same text ("NEURAL NETWORKS", "MACHINE LEARNING", "SYNTHETIC STORYTELLERS"), cyan wireframe art replacing the pixel-art illustrations |
| Pedestal (magical book) | Front-right alcove | Moved from back-left; keeps glow animation; becomes a satellite station to the hero sphere |
| Rabbit hole | Front-left floor-alcove | Stays on floor; glowing cyan rim around the hole |
| Table (with annual-report action) | Flanks center pedestal | Floating white pad, smaller than current table |
| Bean bags (2) | Perimeter benches | Replace with sleek white curved sci-fi benches that follow the wall curve |

**Hotspot changes:** every re-homed object gets new camera `position` and `target` values in `navigation.js` to match its alcove. Labels, hotspot IDs, and panel IDs stay the same — only the numbers change.

## New centerpiece

### Central pedestal

- Two-tier circular platform, dead center of the AI room at `(0, 0, 0)`.
- **Outer base:** 1.2 m diameter ring, 0.1 m tall, matte white.
- **Inner pillar:** 0.6 m diameter cylinder, 0.6 m tall, white with a thin glowing cyan seam running horizontally at mid-height.
- Small subtle cyan emissive halo on the floor around the outer base.

### Holo-sphere

- Floats at `y ≈ 1.8 m` above the pedestal (eye level for a standing viewer).
- Composed of three layered meshes rotating at different speeds:
  1. Wireframe sphere (IcosahedronGeometry, wireframe material, cyan emissive)
  2. Inner particle cloud (~200 points, random positions on a smaller sphere, cyan)
  3. Two orbiting dot-rings at different tilts (ring of small sphere meshes, counter-rotating)
- Subtle pulsing: emissive intensity oscillates, scale breathes ±3 %.
- **Projection beam:** thin transparent cone of cyan light from pedestal top to just below sphere. Additive blending, gradient alpha.

### Sphere interaction

- The sphere is clickable. `userData = { clickable: true, hotspot: 'holo-sphere', action: 'openPanel', panelId: 'floating-motifs', panelTitle: 'Floating Motifs' }`
- New hotspot in `HOTSPOTS`: `'holo-sphere'` with camera position `~(0, 1.6, 2.5)` looking at `(0, 1.8, 0)`.
- New panel `'floating-motifs'` in `openPanelDrawer`:
  - Title: *Floating Motifs*
  - Body: "Folklorist Lauri Honko called the shared reservoir of oral tradition the **pool of tradition**. When AI retells a folktale, it swims in that pool — but without knowing which drops belong to which story. A trail of breadcrumbs from *Hansel & Gretel* ends up in *The Sweetheart in the Forest*. A forbidden room from *Bluebeard* shows up in *East of the Sun*. These recurring images are **floating motifs** — pieces that drift between tales."
  - Link into the magical book for the full research.
  - Styled like the other panels (existing panel-drawer CSS).

## Shell redesign

### Walls

- **Construction:** each of the 4 wall surfaces is rebuilt as a gently curved inner skin. The box geometry from `room.js` stays for dimension and hit-test purposes but is hidden (material set to invisible). On top of each wall, a curved inner panel is placed.
- For each wall (left/right/back/front-open), the inner panel is a shallow cylinder-segment — concave side facing the room — wide enough to cover the 3.5 m wall length. Final arc angle and radius are picked during implementation to hit a visually subtle curve (rough target: ~60° arc, radius ~3.3 m, so the wall bows inward by ~20 cm at its midpoint).
- Material: matte white `MeshStandardMaterial` (color `#f4f6f8`, metalness 0.1, roughness 0.7).
- **LED seams:** between adjacent wall panels at the corners, a vertical thin emissive cyan strip (BoxGeometry ~0.04 × 3.0 × 0.01, color cyan emissive intensity 1.2) runs floor-to-ceiling.
- **Alcoves:** each alcove is a recessed rectangular pocket with a curved/arch top, cut visually into a wall panel. Since we can't easily CSG-cut the curved panels, we fake it: an alcove is a white arch-shaped backing plane pushed slightly into the wall, framed by two thin vertical posts and a curved arch cap. Cyan LED trim runs around the alcove edge. The framed object sits inside.

### Ceiling

- Replace the flat ceiling with an inverted hemisphere (upper half of a sphere inverted to face down). Radius ≈ 3 m, centered at ceiling height.
- Matte white, same as walls.
- 10 inset circular light panels distributed across the dome: flat white discs (0.3 m diameter) with emissive cyan cores (0.15 m), evenly spaced across the dome's inner surface.
- Positions: one at apex, three in an inner ring, six in an outer ring.

### Floor

- Remove the current dark plank floor of the AI room (nature room floor untouched).
- Replace with a hex-tile pattern:
  - A 4×4 m PlaneGeometry at `y = 0` with a canvas-generated hex texture: matte white hexes with thin dark-gray gaps.
  - Overlay: an actual `THREE.LineSegments` geometry tracing the hex seams in cyan emissive material. These *are* the glow seams.
  - A brighter cyan ring on the floor (TorusGeometry, flat) around the central pedestal, emissive intensity 1.5.

### Lighting

- **Ambient/hemi light:** hemisphere light — cool blue top (`#b8d8ec`), warm gray bottom (`#6a6e78`), intensity 0.6. Replaces the current ambient/hemi mix.
- **Dome point lights:** each of the 10 inset ceiling panels gets a point light (cyan-white, intensity 0.4, range 5 m) positioned slightly below it.
- **Sphere lighting:** the holo-sphere carries a cyan point light (intensity 1.0, range 4 m) to drive the central glow.
- **Alcove lights:** each alcove gets a small cyan point light (intensity 0.3, range 1.5 m) inside it.
- **No more** warm ember accent lighting — the arcade cyan is the dominant accent now.

## Room layout diagram (top-down)

```
                BACK WALL (z = -3.5)
           ┌─────────┬───────────┬─────────┐
           │coffee   │ 3 holo    │  desk   │
           │ machine │  posters  │ + chair │
           │         │           │+ monitors│
           ├─────────┘           └─────────┤
      LEFT │arcade                         │ RIGHT
      WALL │                               │ WALL
   (x=-3.5)├                               ┤(x=+3.5)
           │       ● hero sphere ●         │ TV
           │        on pedestal            │
           │                               │  AI-cinema
           │bookshelf                      │   poster
           ├─────────┐           ┌─────────┤
           │  rabbit │ (entry)   │magical  │ nature
           │  hole   │           │ book    │ portal
           └─────────┴───────────┴─────────┘
               FRONT WALL (z = +3.5, open to exit)
```

## Palette

| Use | Color | Emissive |
|---|---|---|
| Walls, ceiling, pedestal | `#f4f6f8` (matte white) | — |
| Floor hex tiles | `#e6e8eb` | — |
| Hex seams, LED strips, alcove trim, sphere wireframe, projection beam, floor ring | `#00d4ff` (cyan) | intensity 0.9–1.5 |
| Coffee machine | kept dark gray `#4a5058` | unchanged |
| Arcade screen | cyan (kept) | unchanged |
| Book pedestal glow | warm gold (kept) | unchanged |

## File-change summary

| File | Nature of change |
|---|---|
| `src/scene/room.js` | Replace wall/ceiling/floor construction. Add alcove geometry helpers. Keep outer box for dimensions. |
| `src/scene/objects.js` | Delete `buildNeonSign`, `buildRug`, `buildFloorLamp`, `buildWallTagging`, `buildRadio` functions. Restyle remaining build functions' materials. Add `buildHoloSphere` + `buildPedestal` (or rename the book pedestal to avoid collision — book's pedestal becomes `buildBookPedestal`). Update positions in `createObjects`. |
| `src/navigation.js` | Update hotspot coordinates for every re-homed object. Add `'holo-sphere'` hotspot. Remove hotspots for deleted objects (none currently exist for them — they use `action: 'openPanel'` only). |
| `src/ui.js` | Remove `neonSign`, `floorLamp` panel content in `openPanelDrawer`. Add `'floating-motifs'` panel content. |
| `src/main.js` | Update destructuring if any removed objects are referenced. |
| `index.html` | No changes needed (book overlay, all iframes, all overlays stay). |
| `styles/main.css` | No changes expected — no UI styling changes. If radio widget needs repositioning because its 3D anchor is gone, address there. |
| `src/tests/*` | Update tests that reference removed hotspots or build-function names. |

## Testing plan

- Unit tests: update hotspot tests to cover the new `'holo-sphere'` hotspot and removed references.
- Manual: walk through the room, click every restyled object, verify its panel/action still fires. Verify the sphere click → zoom → panel flow. Verify the nature portal still transitions. Verify the TV and Fin du Monde iframes still play.
- Visual: eyeball against the two reference images — observatory shell + central sphere should read correctly.

## Open questions (resolved)

- ~~Cut the neon sign, rug, floor lamp, wall tagging?~~ Yes.
- ~~Restyle arcade or cut it?~~ Restyle (white + cyan), keep clickable.
- ~~Keep TV + Fin du Monde iframe content?~~ Yes, keep as holo-screens.
- ~~Radio — where does it go?~~ Cut the 3D object, keep the widget UI.
