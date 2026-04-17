# Glasshus Exterior Entrance — Design Spec

## Overview

Create a new exterior scene where the player spawns outside the CDN glasshus (glass pavilion) building at Langes gate, Bergen. The scene recreates the real building's appearance in 3D with a realistic Bergen setting. Clicking the glass doors triggers a fade transition into the existing AI room. This becomes the starting point of the gallery experience.

## Player Flow

```
SPAWN outside glasshus → WALK up to building → CLICK glass doors → FADE → AI ROOM → PORTAL → NATURE ROOM
```

The exterior scene replaces the AI room as the default spawn location. The AI room becomes a room you transition into (like the nature room), rather than the starting point.

## 3D Scene Elements

### Glasshus Structure

Based on the real CDN building at Langes gate 1-3, Bergen:

- **Glass pyramid roof** — triangular/pyramidal shape with white metal frame edges. Transparent glass panels with slight tint.
- **Glass walls** — floor-to-ceiling glass panels divided by vertical metal mullions (white/light grey). 3 sections wide on the front face.
- **Glass double doors** — centered in the front face, slightly recessed. Clickable interactive element. Hover label: "Enter CDN".
- **Materials** — glass uses `MeshPhysicalMaterial` with transmission, roughness ~0.1, metalness ~0. Metal frame uses light grey `MeshStandardMaterial`.

### Flanking Stone Walls

- Grey concrete block walls on both sides of the glass pavilion
- Extend wider than the glass section
- Slightly taller than the glass walls
- Material: grey with subtle texture/bump for block pattern

### Ground and Landscaping

- **Ground plane** — green grass texture covering the scene
- **Paved path** — stone/concrete walkway leading from spawn point to the glass doors
- **Hedge** — low brown/green hedge running in front of the building (box geometry with brown-green material)

### Background

- **White wooden houses** — simplified box geometry with white material, pitched roofs (triangular prisms), placed behind and to the sides of the glasshus. 2-3 buildings for depth.
- **Sky** — overcast grey Bergen sky. Use scene background color gradient or a simple skybox. Color range: `#8899aa` to `#ccd8e0`.

### CDN Signage

- **Signpost** — thin metal pole with a rectangular sign panel near the entrance path
- **Text** — "Center for Digital Narrative" on the sign (using canvas texture or 3D text)

### Lighting

- **Ambient light** — soft, overcast feel. `AmbientLight` with intensity ~0.6, color `#b0b8c0`
- **Directional light** — subtle, simulating diffused cloud light. Low intensity (~0.4), coming from above
- **Interior glow** — warm point light inside the glasshus visible through the glass, hinting at the AI room within. Color `#ffddaa`, low intensity.

## Interactive Elements

### Glass Doors

- Clickable mesh with `userData.action = 'enterAIRoom'`
- Hover label: "Enter CDN"
- On click: triggers `transitionToRoom('ai')` using the existing room transition system (fade-to-black, same as portal → nature room)

## Player Spawn

- Position: approximately 8 meters in front of the glasshus, centered on the path
- Camera facing the building
- First-person controls: same WASD + mouse look as current implementation
- The "Click to explore" overlay (pointer lock prompt) appears here

## Technical Architecture

### New File

- `src/scene/exterior-room.js` — follows the pattern of `nature-room.js`
- Exports `buildExteriorScene()` returning a group of all meshes
- Exports spawn position and camera target constants
- Contains all geometry builders for glasshus, walls, ground, buildings, sign

### Integration with Existing Code

- **`src/main.js`** — modify to:
  - Import exterior room builder
  - Set exterior as default spawn scene (instead of AI room)
  - Add `'exterior'` to room transition system
  - Handle `'enterAIRoom'` action in transition logic
- **`src/navigation.js`** — add click handler for `'enterAIRoom'` action
- **`src/scene/room.js`** — AI room unchanged, but now loaded on transition (not at startup)
- **`src/scene/objects.js`** — unchanged
- **`src/scene/nature-room.js`** — unchanged

### Room Transition Pattern

Following the existing pattern used by the portal → nature room transition:

1. Player clicks glass doors
2. Fade overlay to black
3. Hide exterior scene objects
4. Show AI room objects (load if not already loaded)
5. Set camera position to AI room spawn
6. Fade in from black

### Scene Offset

Like the nature room uses an x-offset of 20, the exterior scene should use its own offset to avoid geometry overlap:

- Exterior scene offset: e.g., `x = -20` or `z = -20` (positioned away from AI room geometry)

## Out of Scope

- Modifying the AI room interior
- Modifying the portal → nature room transition
- Weather effects, rain, animations
- Interior visibility through glass from inside the AI room (glass is one-way: you can see the glow from outside, but from inside the AI room the walls remain as-is)
