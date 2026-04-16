# AI Room — Observatory Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the AI room from dark neon-gaming to a bright holographic observatory with a central clickable holo-sphere, re-homing all existing interactive objects into wall alcoves.

**Architecture:** Keep the existing box-room geometry for hit-testing/dimensions, but hide the old dark walls/ceiling/floor behind a new bright white "inner skin" (curved wall panels, dome ceiling, hex-tile floor). A new central pedestal + holo-sphere becomes the focal point. Existing build functions stay but get restyled materials; 5 decorative objects are removed entirely.

**Tech Stack:** Three.js (WebGLRenderer, CylinderGeometry, SphereGeometry, PlaneGeometry, LineSegments, MeshStandardMaterial, CanvasTexture), Vite, Vitest.

**Design doc:** `docs/superpowers/specs/2026-04-16-ai-room-observatory-redesign-design.md`

---

## File Structure

No new files. All changes happen inside existing files:

| File | Responsibility in this plan |
|------|----------------------------|
| `src/scene/room.js` | Replace walls/ceiling/floor + AI front-wall graphic + all neon strips with the new observatory shell (curved inner walls, dome ceiling, hex-tile floor). Keep only the outer box for hit-tests + any lights that survive. |
| `src/scene/objects.js` | **Delete** `buildNeonSign`, `buildRug`, `buildFloorLamp`, `buildWallTagging`, `buildRadio`. **Add** `buildAlcoveFrame`, `buildCentralPedestal`, `buildHoloSphere`. **Restyle** existing build functions' materials. **Rearrange** positions in `createObjects`. |
| `src/navigation.js` | Update hotspot coordinates for every re-homed object. Add `'holo-sphere'` hotspot. |
| `src/ui.js` | Remove `'sign'` and `'lamp'` panel content in `openPanelDrawer`. Add `'floating-motifs'` panel. |
| `src/main.js` | Update `clickableObjects` / destructuring only if they reference removed names (they don't currently reference `neonSign` / `radio` etc. by name — extras is a pass-through). |
| `src/tests/navigation.test.js` | Add holo-sphere hotspot coverage. |
| `src/tests/ui.test.js` | No changes needed (tests do not reference removed panels). |

The `objects.js` file is ~2200 lines — large, but re-splitting it is out of scope for this plan.

---

## Task 1: Cleanup — remove obsolete decorative objects

**Files:**
- Modify: `src/scene/objects.js` — delete `buildNeonSign`, `buildRug`, `buildFloorLamp`, `buildWallTagging`, `buildRadio` functions and all references in `createObjects`
- Modify: `src/ui.js` — remove `'sign'` and `'lamp'` branches in `openPanelDrawer`

- [ ] **Step 1: Delete `buildNeonSign` function**

Open `src/scene/objects.js`. Locate `function buildNeonSign() {` (around line 848) and its matching closing `}`. Delete the entire function body.

- [ ] **Step 2: Delete `buildRug` function**

Locate `function buildRug() {` (around line 891) and its matching closing `}`. Delete entire function.

- [ ] **Step 3: Delete `buildFloorLamp` function**

Locate `function buildFloorLamp() {` (around line 567). Delete entire function.

- [ ] **Step 4: Delete `buildWallTagging` function**

Locate `function buildWallTagging() {` (around line 1321). Delete entire function.

- [ ] **Step 5: Delete `buildRadio` function**

Locate `function buildRadio() {` (around line 1449). Delete entire function.

- [ ] **Step 6: Remove declarations in `createObjects`**

In `createObjects`, delete these lines:

```js
  const floorLamp   = buildFloorLamp();
  const neonSign    = buildNeonSign();
  const rug         = buildRug();
  const wallTagging = buildWallTagging();
  const radio       = buildRadio();
```

- [ ] **Step 7: Remove `userData` assignments**

Delete these lines in `createObjects`:

```js
  floorLamp.userData = { clickable: true, action: 'openPanel', panelId: 'lamp',      panelTitle: 'Mood Lighting' };
  neonSign.userData  = { clickable: true, action: 'openPanel', panelId: 'sign',      panelTitle: 'Welcome to the Game Room' };
```

(There are no `userData` assignments for `rug`, `wallTagging`, or `radio`.)

- [ ] **Step 8: Remove from `scene.add` list**

Find the large `scene.add(...)` call in `createObjects`. Replace:

```js
  scene.add(
    arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, coffeeMachine, floorLamp,
    neonSign, rug, pedestal, rabbitHole, tv, globe, ...posters,
    wallTagging, radio, portal
  );
```

with:

```js
  scene.add(
    arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, coffeeMachine,
    pedestal, rabbitHole, tv, globe, ...posters,
    portal
  );
```

- [ ] **Step 9: Remove from `extras` return array**

Find the `return { ... extras: [...] }` block. Replace:

```js
    extras: [table, beanBag1, beanBag2, chair, bookshelf, coffeeMachine, floorLamp, neonSign, tv, rabbitHole, globe, aiPoster, portal]
```

with:

```js
    extras: [table, beanBag1, beanBag2, chair, bookshelf, coffeeMachine, tv, rabbitHole, globe, aiPoster, portal]
```

- [ ] **Step 10: Remove `sign` and `lamp` panel branches in `ui.js`**

In `src/ui.js`, inside `openPanelDrawer`, there is a long `if/else if` chain on `panelId`. Find and delete any `else if (panelId === 'sign')` and `else if (panelId === 'lamp')` branches. If those panel IDs don't currently have branches, leave `ui.js` unchanged.

Verify by searching:

```
grep -n "panelId === 'sign'" src/ui.js
grep -n "panelId === 'lamp'" src/ui.js
```

Expected: no matches (or if matches, remove the blocks).

- [ ] **Step 11: Run tests**

```bash
npx vitest run
```

Expected: `17 passed` (same as before — no tests referenced removed objects).

- [ ] **Step 12: Run build**

```bash
npx vite build
```

Expected: `✓ built` with no errors.

- [ ] **Step 13: Commit**

```bash
git add src/scene/objects.js src/ui.js
git commit -m "refactor(ai-room): remove neonSign, rug, floorLamp, wallTagging, radio

Strips out the five decorative gaming-room objects ahead of the
observatory redesign. Panel content for 'sign' and 'lamp' removed
from the drawer. Radio widget UI in index.html is untouched — it
doesn't depend on the 3D radio object.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Shell — hide old walls/ceiling/floor, add curved white wall panels

**Files:**
- Modify: `src/scene/room.js` — hide old AI-room walls/ceiling/floor, add new curved white wall panels with cyan LED seams

- [ ] **Step 1: Make the old AI-room shell invisible (but keep for hit-tests)**

In `src/scene/room.js`, find each of these `const` assignments and, immediately after `scene.add(...)`, add `.visible = false` by converting the creation pattern. For each of `floor`, `leftWall`, `rightWall`, `backWall`, `frontWall`, `ceil`, change:

```js
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
```

to:

```js
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.visible = false;
  scene.add(floor);
```

Repeat for `leftWall`, `rightWall`, `backWall`, `frontWall`, `ceil`. Do not remove them — we want them in the scene graph for camera/raycast context, but hidden.

- [ ] **Step 2: Remove the AI front-wall graphic (`aiWallPlane`)**

Still in `room.js`. Find the block that creates `aiWallCanvas` → `aiWallTex` → `aiWallPlane` (starts around line 89 with `const aiWallCanvas = document.createElement('canvas')`, ends around line 225 with `scene.add(aiWallPlane);`). Delete the entire block.

- [ ] **Step 3: Remove the back-wall circuit plane**

Find the block creating `circuitCanvas` through `circuitPlane` (`const circuitCanvas = document.createElement('canvas')` around line 436 through `scene.add(circuitPlane);` around line 495). Delete the block.

- [ ] **Step 4: Remove decorative cable clutter**

Delete the entire "Exposed cables running along walls" block (the section with `cableMat`, horizontal cable bundles, dropPositions loop, and `diagCable`). This is everything between the comment `// ── Exposed cables running along walls` and the comment `// ── AI circuit pattern on back wall ──`.

- [ ] **Step 5: Remove neon floor strips along walls**

Delete the `stripGeom`, `leftStrip`, `rightStrip`, `leftStripMat`, `rightStripMat` block (section starting `// Neon floor strips along the base of left & right walls`).

- [ ] **Step 6: Remove ceiling-edge neon strips + vertical corner strips + back/front floor strips**

Delete everything from the comment `// ── Ceiling-edge neon strips (LED tape along top of walls) ──` through the end of the `backRightCorner`, `frontLeftCorner`, `frontRightCorner` `scene.add` calls. That covers: left/right/back/front ceiling strips, green-teal secondary ceiling accent, amberFill light, back/front floor strips, all 4 vertical corner strips.

- [ ] **Step 7: Remove the existing neon point lights + AI particles**

Delete `neonPink`, `neonTeal`, `neonPurple`, `cyanFill`, `purpleFill`, `pinkFill`, `centerFill` point lights AND the `particleCount`/`particleGeom`/`particles` block.

Keep only: `ambient`, `hemi`, `dirLight`.

- [ ] **Step 8: Update ambient + hemi light for observatory palette**

Replace:

```js
  const ambient = new THREE.AmbientLight(0x1a2a3a, 0.5);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x00d4ff, 0x0a0f1a, 0.3);
  hemi.position.set(0, 4, 0);
  scene.add(hemi);
```

with:

```js
  const ambient = new THREE.AmbientLight(0xc8d8e8, 0.35);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xb8d8ec, 0x6a6e78, 0.8);
  hemi.position.set(0, 4, 0);
  scene.add(hemi);
```

- [ ] **Step 9: Add shared white wall material at top of `createRoom`**

At the top of `createRoom`, after the `import` but before the first material, add:

```js
  // ── Observatory shell materials ──
  const shellWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8, metalness: 0.1, roughness: 0.7, side: THREE.DoubleSide
  });
  const ledCyanMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.2
  });
```

- [ ] **Step 10: Add curved inner wall panels (left, right, back, front)**

After the hidden old walls, add:

```js
  // ── Curved inner wall panels (observatory skin) ──
  // Each wall is a shallow cylinder-segment arched inward. The outer box
  // stays hidden for dimension/collision; this is the visible skin.
  //
  // For a 3.5 m wall length and a target inward bow of ~20 cm, we use a
  // 60° arc at radius ~3.3 m.
  const WALL_ARC = Math.PI / 3;             // 60°
  const WALL_RADIUS = 3.3;
  const WALL_HEIGHT = 3.4;
  function buildCurvedWall(length) {
    // CylinderGeometry(topR, bottomR, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
    // Use a full cylinder segment for the specified arc.
    const geom = new THREE.CylinderGeometry(
      WALL_RADIUS, WALL_RADIUS, WALL_HEIGHT, 48, 1, true,
      -WALL_ARC / 2, WALL_ARC
    );
    return new THREE.Mesh(geom, shellWhiteMat);
  }

  // Left wall (curved, concave facing +x)
  const leftCurved = buildCurvedWall(6);
  // Place the cylinder so its nearest surface to the room center hits x = -3.4
  leftCurved.rotation.z = Math.PI / 2;
  leftCurved.position.set(-3.4 - WALL_RADIUS * (1 - Math.cos(WALL_ARC / 2)), WALL_HEIGHT / 2, 0);
  scene.add(leftCurved);

  // Right wall (mirror of left)
  const rightCurved = buildCurvedWall(6);
  rightCurved.rotation.z = -Math.PI / 2;
  rightCurved.position.set(3.4 + WALL_RADIUS * (1 - Math.cos(WALL_ARC / 2)), WALL_HEIGHT / 2, 0);
  scene.add(rightCurved);

  // Back wall (concave facing +z, curved around y axis)
  const backCurved = new THREE.Mesh(
    new THREE.CylinderGeometry(
      WALL_RADIUS, WALL_RADIUS, WALL_HEIGHT, 48, 1, true,
      -Math.PI / 2 - WALL_ARC / 2, WALL_ARC
    ),
    shellWhiteMat
  );
  backCurved.position.set(0, WALL_HEIGHT / 2, -3.0 - WALL_RADIUS * (1 - Math.cos(WALL_ARC / 2)));
  scene.add(backCurved);

  // Front wall (concave facing -z). Gets a doorway cut visually by keeping it narrower.
  const frontCurved = new THREE.Mesh(
    new THREE.CylinderGeometry(
      WALL_RADIUS, WALL_RADIUS, WALL_HEIGHT, 48, 1, true,
      Math.PI / 2 - WALL_ARC / 2, WALL_ARC
    ),
    shellWhiteMat
  );
  frontCurved.position.set(0, WALL_HEIGHT / 2, 2.95 + WALL_RADIUS * (1 - Math.cos(WALL_ARC / 2)));
  frontCurved.raycast = () => {}; // don't block clicks to portal
  scene.add(frontCurved);
```

- [ ] **Step 11: Add vertical LED seam strips at the four corners**

After the curved walls, add:

```js
  // ── Vertical LED seam strips at corners ──
  const ledSeamGeom = new THREE.BoxGeometry(0.04, WALL_HEIGHT, 0.015);
  const ledCorners = [
    [-3.4,   -2.95],
    [ 3.4,   -2.95],
    [-3.4,    2.95],
    [ 3.4,    2.95]
  ];
  for (const [cx, cz] of ledCorners) {
    const seam = new THREE.Mesh(ledSeamGeom, ledCyanMat);
    seam.position.set(cx, WALL_HEIGHT / 2, cz);
    scene.add(seam);
  }
```

- [ ] **Step 12: Run build**

```bash
npx vite build
```

Expected: `✓ built` with no errors.

- [ ] **Step 13: Manually spot-check in browser**

```bash
npx vite
```

Open the URL, walk into the AI room. Expected: white curved walls visible, no dark gaming-room walls, cyan vertical LED strips at the four corners.

- [ ] **Step 14: Commit**

```bash
git add src/scene/room.js
git commit -m "feat(ai-room): hide old shell, add curved white walls + corner LEDs

Hides the old dark paneled walls, front AI graphic, circuit plane,
cables, neon strips, and corner/ceiling LED tape. Replaces them with
four curved white inner wall panels (60° arc cylinder segments at
radius 3.3 m) and four vertical cyan LED seams at the corners.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Shell — dome ceiling + inset light panels

**Files:**
- Modify: `src/scene/room.js` — add hemispherical dome ceiling + 10 inset circular light panels + ceiling point lights

- [ ] **Step 1: Add dome geometry**

At the end of `createRoom`, add:

```js
  // ── Dome ceiling ──
  const domeGeom = new THREE.SphereGeometry(3.6, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeom, shellWhiteMat);
  dome.rotation.x = Math.PI;   // flip to face downward
  dome.position.set(0, 3.4, 0);
  scene.add(dome);
```

- [ ] **Step 2: Add 10 inset light panels distributed on the dome**

After the dome, add:

```js
  // ── Ceiling inset light panels (10 discs dotted across the dome) ──
  const panelDiscMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8, metalness: 0.1, roughness: 0.5
  });
  const panelCoreMat = new THREE.MeshStandardMaterial({
    color: 0xa8e8ff, emissive: 0x9ce0ff, emissiveIntensity: 1.3
  });
  // Panel placements as (radius from center, angle around Y) pairs.
  // One at apex (r=0), three inner, six outer.
  const panelSpots = [
    { r: 0,   a: 0 },
    { r: 1.2, a: 0 },
    { r: 1.2, a: (2 * Math.PI) / 3 },
    { r: 1.2, a: (4 * Math.PI) / 3 },
    { r: 2.4, a: Math.PI / 6 },
    { r: 2.4, a: Math.PI / 2 },
    { r: 2.4, a: (5 * Math.PI) / 6 },
    { r: 2.4, a: (7 * Math.PI) / 6 },
    { r: 2.4, a: (3 * Math.PI) / 2 },
    { r: 2.4, a: (11 * Math.PI) / 6 }
  ];
  const panelDiscGeom = new THREE.CircleGeometry(0.3, 24);
  const panelCoreGeom = new THREE.CircleGeometry(0.15, 24);
  for (const { r, a } of panelSpots) {
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    const disc = new THREE.Mesh(panelDiscGeom, panelDiscMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(px, 3.38, pz);
    scene.add(disc);

    const core = new THREE.Mesh(panelCoreGeom, panelCoreMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(px, 3.381, pz);
    scene.add(core);

    const panelLight = new THREE.PointLight(0xb8e0ff, 0.4, 5);
    panelLight.position.set(px, 3.2, pz);
    scene.add(panelLight);
  }
```

- [ ] **Step 3: Run build**

```bash
npx vite build
```

Expected: `✓ built`, no errors.

- [ ] **Step 4: Spot-check in browser**

Expected: looking up, a white dome with 10 glowing cyan-white discs. The room is brighter.

- [ ] **Step 5: Commit**

```bash
git add src/scene/room.js
git commit -m "feat(ai-room): dome ceiling with inset cyan light panels

Hemispherical dome (radius 3.6 m, flipped) replaces the flat ceiling.
10 inset circular light panels (apex + 3 inner + 6 outer ring) each
paired with a soft point light provide diffused top-down glow.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Shell — hex-tile glowing floor

**Files:**
- Modify: `src/scene/room.js` — add hex-tile floor with cyan seam overlay + pedestal halo ring

- [ ] **Step 1: Generate the hex texture on a canvas**

In `createRoom`, after the old (hidden) `floor` but before the curved walls block, add:

```js
  // ── Hex-tile floor (observatory) ──
  const hexCanvas = document.createElement('canvas');
  hexCanvas.width = 512;
  hexCanvas.height = 512;
  const hctx = hexCanvas.getContext('2d');
  hctx.fillStyle = '#e6e8eb';
  hctx.fillRect(0, 0, 512, 512);
  hctx.strokeStyle = '#2a2e38';
  hctx.lineWidth = 1.5;
  const hexR = 32;
  const hexW = Math.sqrt(3) * hexR;
  const hexH = 1.5 * hexR;
  function drawHex(cx, cy) {
    hctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI / 6 + (i * Math.PI) / 3;
      const x = cx + Math.cos(ang) * hexR;
      const y = cy + Math.sin(ang) * hexR;
      if (i === 0) hctx.moveTo(x, y); else hctx.lineTo(x, y);
    }
    hctx.closePath();
    hctx.stroke();
  }
  for (let row = -1; row < 10; row++) {
    for (let col = -1; col < 10; col++) {
      const cx = col * hexW + (row % 2 ? hexW / 2 : 0);
      const cy = row * hexH;
      drawHex(cx, cy);
    }
  }
  const hexTex = new THREE.CanvasTexture(hexCanvas);
  hexTex.wrapS = THREE.RepeatWrapping;
  hexTex.wrapT = THREE.RepeatWrapping;
  hexTex.repeat.set(2.5, 2.2);

  const hexFloorMat = new THREE.MeshStandardMaterial({
    map: hexTex, roughness: 0.6, metalness: 0.1
  });
  const hexFloor = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), hexFloorMat);
  hexFloor.rotation.x = -Math.PI / 2;
  hexFloor.position.y = 0.001;
  hexFloor.receiveShadow = true;
  scene.add(hexFloor);
```

- [ ] **Step 2: Add cyan emissive line segments over the hex seams**

Immediately after the hex floor, add:

```js
  // Glowing cyan seams — thin LineSegments overlay on a selected set of hex seams
  const seamPts = [];
  const floorW = 7, floorD = 6;
  const tileR = 0.35;
  const tileW = Math.sqrt(3) * tileR;
  const tileH = 1.5 * tileR;
  for (let row = -2; row < 9; row++) {
    for (let col = -3; col < 9; col++) {
      const cx = col * tileW + (row % 2 ? tileW / 2 : 0) - floorW / 2;
      const cz = row * tileH - floorD / 2;
      // Only draw every 3rd tile's edges to keep the glow sparse
      if ((row + col) % 3 !== 0) continue;
      for (let i = 0; i < 6; i++) {
        const a1 = Math.PI / 6 + (i * Math.PI) / 3;
        const a2 = Math.PI / 6 + ((i + 1) * Math.PI) / 3;
        seamPts.push(cx + Math.cos(a1) * tileR, 0.002, cz + Math.sin(a1) * tileR);
        seamPts.push(cx + Math.cos(a2) * tileR, 0.002, cz + Math.sin(a2) * tileR);
      }
    }
  }
  const seamGeom = new THREE.BufferGeometry();
  seamGeom.setAttribute('position', new THREE.Float32BufferAttribute(seamPts, 3));
  const seamMat = new THREE.LineBasicMaterial({
    color: 0x00d4ff, transparent: true, opacity: 0.9
  });
  const seams = new THREE.LineSegments(seamGeom, seamMat);
  scene.add(seams);
```

- [ ] **Step 3: Add the cyan halo ring around the center pedestal spot**

After the seams, add:

```js
  // Cyan halo ring on the floor around the central pedestal location
  const haloMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5,
    transparent: true, opacity: 0.95
  });
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.85, 0.95, 64), haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.003;
  scene.add(halo);
```

- [ ] **Step 4: Run build**

```bash
npx vite build
```

Expected: `✓ built`.

- [ ] **Step 5: Spot-check**

Expected: entering the AI room, the floor is now off-white with subtle hex grid, cyan glow lines on a sparse hex selection, and a glowing cyan ring in the room's center where the pedestal will go.

- [ ] **Step 6: Commit**

```bash
git add src/scene/room.js
git commit -m "feat(ai-room): hex-tile floor with glowing cyan seams

Replaces the dark plank floor with an off-white hex-tile plane
(canvas-generated texture). Sparse cyan LineSegments overlay the
seams at every third hex for the glow effect. A brighter torus
ring marks where the central pedestal will sit.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Central pedestal

**Files:**
- Modify: `src/scene/objects.js` — add `buildCentralPedestal` function; call it in `createObjects`

- [ ] **Step 1: Add `buildCentralPedestal` near other builders (just above `buildCoffeeMachine`)**

```js
function buildCentralPedestal() {
  const group = new THREE.Group();
  group.position.set(0, 0, 0);

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8, metalness: 0.15, roughness: 0.55
  });
  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.2
  });

  // Outer base ring — 1.2 m diameter, 0.1 m tall
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.65, 0.1, 48),
    whiteMat
  );
  base.position.y = 0.05;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

  // Inner pillar — 0.6 m diameter, 0.6 m tall
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.6, 48),
    whiteMat
  );
  pillar.position.y = 0.4;
  pillar.castShadow = true;
  group.add(pillar);

  // Cyan seam around the pillar at mid-height
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.012, 8, 48),
    cyanMat
  );
  seam.rotation.x = Math.PI / 2;
  seam.position.y = 0.4;
  group.add(seam);

  // Flat emissive cap on top where the projection beam emerges
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.02, 48),
    cyanMat
  );
  cap.position.y = 0.71;
  group.add(cap);

  return group;
}
```

- [ ] **Step 2: Wire it into `createObjects`**

In `createObjects`, after the `coffeeMachine` declaration line, add:

```js
  const centralPedestal = buildCentralPedestal();
```

Add `centralPedestal` to the `scene.add(...)` list (between `coffeeMachine` and `pedestal`):

```js
  scene.add(
    arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, coffeeMachine, centralPedestal,
    pedestal, rabbitHole, tv, globe, ...posters,
    portal
  );
```

- [ ] **Step 3: Run build + spot-check**

```bash
npx vite build
```

Expected: build green; in-browser, a short white cylindrical pedestal stands in the middle of the AI room with a cyan ring and glowing cap.

- [ ] **Step 4: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat(ai-room): central white pedestal in room center

Two-tier pedestal (1.2 m ring base + 0.6 m pillar) at (0, 0, 0)
with a cyan seam and glowing emissive cap. Placeholder for the
holo-sphere that will hover above it.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Holo-sphere

**Files:**
- Modify: `src/scene/objects.js` — add `buildHoloSphere` function; wire in `createObjects`; add to `sceneUpdate` animation

- [ ] **Step 1: Add `buildHoloSphere`**

Immediately after `buildCentralPedestal`, add:

```js
function buildHoloSphere() {
  const group = new THREE.Group();
  // Sphere floats at eye-level above the pedestal
  group.position.set(0, 1.8, 0);

  // Layer 1: wireframe sphere
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.0,
    wireframe: true, transparent: true, opacity: 0.85
  });
  const wireframe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), wireMat);
  group.add(wireframe);

  // Layer 2: inner particle cloud
  const particleCount = 240;
  const ppos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    // Random point inside a sphere of radius 0.4
    const r = 0.4 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    ppos[i * 3    ] = r * Math.sin(phi) * Math.cos(theta);
    ppos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    ppos[i * 3 + 2] = r * Math.cos(phi);
  }
  const pGeom = new THREE.BufferGeometry();
  pGeom.setAttribute('position', new THREE.Float32BufferAttribute(ppos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x9ce0ff, size: 0.02, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const particles = new THREE.Points(pGeom, pMat);
  group.add(particles);

  // Layer 3a: orbiting dot-ring (tilt 1)
  const ringA = new THREE.Group();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
      })
    );
    dot.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6);
    ringA.add(dot);
  }
  ringA.rotation.x = 0.4;
  group.add(ringA);

  // Layer 3b: orbiting dot-ring (tilt 2, counter-rotating)
  const ringB = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0x9ce0ff, emissive: 0x9ce0ff, emissiveIntensity: 1.5
      })
    );
    dot.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7);
    ringB.add(dot);
  }
  ringB.rotation.x = -0.6;
  ringB.rotation.z = 0.3;
  group.add(ringB);

  // Projection beam — transparent cone from pedestal top to sphere
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x00d4ff, transparent: true, opacity: 0.15,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.05, 48, 1, true),
    beamMat
  );
  beam.position.y = -0.55; // cone tip down to pedestal top
  beam.rotation.x = Math.PI;
  group.add(beam);

  // Sphere's own point light
  const light = new THREE.PointLight(0x00d4ff, 1.0, 4);
  group.add(light);

  // Expose inner groups for the animation loop
  group.userData.wireframe = wireframe;
  group.userData.particles = particles;
  group.userData.ringA = ringA;
  group.userData.ringB = ringB;

  return group;
}
```

- [ ] **Step 2: Wire it into `createObjects`**

Right after `centralPedestal`:

```js
  const holoSphere = buildHoloSphere();
```

Add to `scene.add(...)` between `centralPedestal` and `pedestal`:

```js
  scene.add(
    arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, coffeeMachine, centralPedestal, holoSphere,
    pedestal, rabbitHole, tv, globe, ...posters,
    portal
  );
```

Add to `extras`:

```js
    extras: [table, beanBag1, beanBag2, chair, bookshelf, coffeeMachine, holoSphere, tv, rabbitHole, globe, aiPoster, portal]
```

- [ ] **Step 3: Animate in `sceneUpdate`**

Inside `sceneUpdate(delta)` in `createObjects`, after the existing `musicNotes.update` branch, add:

```js
    if (holoSphere) {
      holoSphere.userData.wireframe.rotation.y += delta * 0.35;
      holoSphere.userData.wireframe.rotation.x += delta * 0.12;
      holoSphere.userData.particles.rotation.y -= delta * 0.2;
      holoSphere.userData.ringA.rotation.y += delta * 0.6;
      holoSphere.userData.ringB.rotation.y -= delta * 0.9;
      const pulse = 1 + Math.sin(elapsed * 1.4) * 0.03;
      holoSphere.scale.setScalar(pulse);
    }
```

- [ ] **Step 4: Build + spot-check**

```bash
npx vite build
```

Expected: a glowing cyan wireframe sphere with particles and rings rotates above the white pedestal. A faint cone of light connects pedestal to sphere.

- [ ] **Step 5: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat(ai-room): holographic data-sphere centerpiece

Cyan wireframe icosahedron (radius 0.45) floats 1.8 m above the
pedestal, wrapped in a 240-point inner particle cloud and two
orbiting dot-rings (24 + 18 dots). A transparent cone simulates
the projection beam from the pedestal. Everything rotates and
breathes subtly in the sceneUpdate loop.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Sphere interaction — click → zoom → panel

**Files:**
- Modify: `src/scene/objects.js` — `holoSphere.userData` for click
- Modify: `src/navigation.js` — add `'holo-sphere'` hotspot
- Modify: `src/ui.js` — add `'floating-motifs'` panel case
- Modify: `src/tests/navigation.test.js` — add coverage for the new hotspot

- [ ] **Step 1: Add userData to the sphere**

In `createObjects`, after `const holoSphere = buildHoloSphere();`, add:

```js
  holoSphere.userData.clickable = true;
  holoSphere.userData.hotspot = 'holo-sphere';
  holoSphere.userData.action = 'openPanel';
  holoSphere.userData.panelId = 'floating-motifs';
  holoSphere.userData.panelTitle = 'Floating Motifs';
```

(Preserves the wireframe/particles/rings references set in `buildHoloSphere`.)

- [ ] **Step 2: Add hotspot to `navigation.js`**

In `src/navigation.js`, inside `HOTSPOTS`, add after the `pedestal` line:

```js
  'holo-sphere':  { position: { x: 0,    y: 1.7, z: 2.5  }, target: { x: 0,    y: 1.8, z: 0    }, label: 'Floating Motifs' },
```

- [ ] **Step 3: Add panel content in `ui.js`**

In `openPanelDrawer`, add a new branch before the `else if (panelId === 'portal')` branch:

```js
    } else if (panelId === 'floating-motifs') {
      content = `
        <h2>${safeTitle}</h2>
        <p style="font-size:15px;color:#9ce0ff;margin-bottom:14px;font-style:italic">The holographic heart of the AI room.</p>
        <p>Folklorist Lauri Honko called the shared reservoir of oral tradition the <strong>pool of tradition</strong>. When a large language model retells a folktale, it swims in that pool — but without knowing which drops belong to which story.</p>
        <p>A trail of breadcrumbs from <em>Hansel &amp; Gretel</em> shows up in <em>The Sweetheart in the Forest</em>. A forbidden locked room from <em>Bluebeard</em> drifts into <em>East of the Sun</em>. A helper animal from one tale appears in another. These recurring images are <strong>floating motifs</strong> — pieces that travel between tales.</p>
        <p>CDN researcher Anne Sigrid Refsum's work examines what happens when AI treats the pool of tradition as one big soup, remixing motifs without cultural context.</p>
        <div style="background:rgba(13,33,55,0.5);border:1px solid #a8d8ea;border-radius:8px;padding:14px;margin-top:16px">
          <p style="font-size:13px;margin:0"><strong>Read the full research</strong> in the magical book on the pedestal.</p>
        </div>
      `;
```

- [ ] **Step 4: Write the failing test**

In `src/tests/navigation.test.js`, inside the `describe('HOTSPOTS', …)` block, add:

```js
  it('includes holo-sphere hotspot', () => {
    expect(HOTSPOTS['holo-sphere']).toBeDefined();
    expect(HOTSPOTS['holo-sphere'].label).toBe('Floating Motifs');
  });
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: `18 passed` (was 17, +1 new test).

- [ ] **Step 6: Manual test in browser**

```bash
npx vite
```

Walk to the AI room, click the sphere. Expected:
1. Camera tweens to (0, 1.7, 2.5) looking at (0, 1.8, 0).
2. Step-back button appears.
3. Panel drawer slides in with "Floating Motifs" title and explanatory copy.
4. Closing the panel (X or Esc) returns to view.

- [ ] **Step 7: Commit**

```bash
git add src/scene/objects.js src/navigation.js src/ui.js src/tests/navigation.test.js
git commit -m "feat(ai-room): sphere click opens Floating Motifs panel

Adds userData to the holo-sphere so it zooms the camera to the
'holo-sphere' hotspot and opens a new 'floating-motifs' drawer
panel explaining the pool-of-tradition concept.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Alcove frame helper

**Files:**
- Modify: `src/scene/objects.js` — add reusable `buildAlcoveFrame(width, height, depth)`

- [ ] **Step 1: Add the helper near other builders (just above `buildCentralPedestal`)**

```js
function buildAlcoveFrame(width = 1.5, height = 2.3, depth = 0.15) {
  const group = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8, metalness: 0.1, roughness: 0.6
  });
  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.2
  });

  // Back panel (matte white, slightly recessed)
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    whiteMat
  );
  back.position.set(0, height / 2, -depth);
  group.add(back);

  // Two vertical posts (left + right)
  const postGeom = new THREE.BoxGeometry(0.05, height, depth + 0.02);
  const postMat  = whiteMat;
  const postL = new THREE.Mesh(postGeom, postMat);
  postL.position.set(-width / 2, height / 2, -depth / 2 + 0.01);
  group.add(postL);
  const postR = new THREE.Mesh(postGeom, postMat);
  postR.position.set(width / 2, height / 2, -depth / 2 + 0.01);
  group.add(postR);

  // Arch cap — half-torus across the top
  const cap = new THREE.Mesh(
    new THREE.TorusGeometry(width / 2, 0.04, 8, 24, Math.PI),
    whiteMat
  );
  cap.position.set(0, height, -depth / 2 + 0.01);
  cap.rotation.x = Math.PI / 2;
  group.add(cap);

  // Cyan LED trim along the inside edges — left, right, top arch
  const ledStripGeom = new THREE.BoxGeometry(0.015, height - 0.05, 0.01);
  const ledL = new THREE.Mesh(ledStripGeom, cyanMat);
  ledL.position.set(-width / 2 + 0.03, height / 2 - 0.02, -depth / 2 + 0.05);
  group.add(ledL);
  const ledR = new THREE.Mesh(ledStripGeom, cyanMat);
  ledR.position.set(width / 2 - 0.03, height / 2 - 0.02, -depth / 2 + 0.05);
  group.add(ledR);
  const ledArch = new THREE.Mesh(
    new THREE.TorusGeometry(width / 2 - 0.03, 0.012, 6, 24, Math.PI),
    cyanMat
  );
  ledArch.position.set(0, height - 0.02, -depth / 2 + 0.05);
  ledArch.rotation.x = Math.PI / 2;
  group.add(ledArch);

  // Small cyan point light inside the alcove
  const alcoveLight = new THREE.PointLight(0x9ce0ff, 0.3, 1.5);
  alcoveLight.position.set(0, height / 2, -depth + 0.05);
  group.add(alcoveLight);

  return group;
}
```

- [ ] **Step 2: Build**

```bash
npx vite build
```

Expected: `✓ built`, no errors. (Nothing visible yet — helper isn't called.)

- [ ] **Step 3: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat(ai-room): reusable alcove-frame helper

buildAlcoveFrame(width, height, depth) returns a white arch-topped
frame with vertical posts, cyan LED trim around the edge, and a
soft internal light. Will be used to frame each re-homed object.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Left wall — arcade + bookshelf in alcoves

**Files:**
- Modify: `src/scene/objects.js` — add alcove frames around arcade and bookshelf; restyle both
- Modify: `src/navigation.js` — update `'arcade-right'` hotspot (position is unchanged but the label stays)

- [ ] **Step 1: Lighten the arcade cabinet colours**

In `src/scene/objects.js`, find `buildArcadeCabinet`. Its main body uses dark materials — locate the material for the main cabinet body (likely a MeshLambertMaterial with a dark color like `0x111828` or `0x0a0f1a`). Replace the cabinet body's material with:

```js
new THREE.MeshStandardMaterial({
  color: 0xe8eaed, metalness: 0.2, roughness: 0.55,
  emissive: 0x1a2028, emissiveIntensity: 0.2
})
```

And change any black trim to cyan-emissive:

```js
new THREE.MeshStandardMaterial({
  color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.1
})
```

Keep the screen's cyan emissive as-is.

- [ ] **Step 2: Lighten the bookshelf colours**

Find `buildBookshelf` (around line 497). Replace the main frame material (the dark one) with:

```js
new THREE.MeshStandardMaterial({
  color: 0xe8eaed, metalness: 0.15, roughness: 0.6
})
```

Ensure the book-spine meshes use cyan-emissive variants — if they already do, leave them; if they use pink/teal/purple, make them all cyan:

```js
new THREE.MeshStandardMaterial({
  color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.9
})
```

- [ ] **Step 3: Add alcove frames around both**

In `createObjects`, after `const bookshelf = buildBookshelf();`, add:

```js
  // Alcoves for left-wall objects
  const arcadeAlcove = buildAlcoveFrame(1.4, 2.3, 0.12);
  arcadeAlcove.position.set(-3.4, 0, -0.5);
  arcadeAlcove.rotation.y = Math.PI / 2;

  const bookshelfAlcove = buildAlcoveFrame(1.3, 2.3, 0.12);
  bookshelfAlcove.position.set(-3.4, 0, 1.5);
  bookshelfAlcove.rotation.y = Math.PI / 2;
```

- [ ] **Step 4: Reposition bookshelf**

Find the `const bookshelf = buildBookshelf();` line. After it, add:

```js
  bookshelf.position.set(-3.25, 0, 1.5);
  bookshelf.rotation.y = Math.PI / 2;
```

(Existing back-left position is no longer appropriate — the back-left slot goes to the coffee machine in the new layout.)

- [ ] **Step 5: Add alcoves to `scene.add`**

Update `scene.add(...)` to include the two new alcove groups:

```js
  scene.add(
    arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, coffeeMachine, centralPedestal, holoSphere,
    arcadeAlcove, bookshelfAlcove,
    pedestal, rabbitHole, tv, globe, ...posters,
    portal
  );
```

- [ ] **Step 6: Build + spot-check**

```bash
npx vite build
```

Expected: entering the AI room, the left wall has two white alcove frames with cyan trim — one containing the newly-lightened arcade (white + cyan), the other containing the bookshelf.

- [ ] **Step 7: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat(ai-room): left-wall alcoves for arcade + bookshelf

Arcade cabinet and bookshelf each get a white alcove frame with
cyan LED trim. Both objects are restyled from dark gaming-room
colours to white + cyan accents. Bookshelf moved from back-left
to the left-wall slot.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Right wall — TV + AI-cinema poster + nature portal in alcoves

**Files:**
- Modify: `src/scene/objects.js` — add alcove frames; restyle portal

- [ ] **Step 1: Restyle the nature portal — white frame + cyan glow**

Find `buildPortal` in `objects.js`. The existing portal uses warm/pink ring colors. Replace its ring material with:

```js
new THREE.MeshStandardMaterial({
  color: 0xf4f6f8, metalness: 0.2, roughness: 0.5,
  emissive: 0x00d4ff, emissiveIntensity: 0.6
})
```

and the inner glow material to:

```js
new THREE.MeshStandardMaterial({
  color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.3,
  transparent: true, opacity: 0.7
})
```

Leave all interaction/animation logic unchanged.

- [ ] **Step 2: Add alcove frames for right-wall objects**

In `createObjects`, after the left-wall alcoves, add:

```js
  const tvAlcove = buildAlcoveFrame(2.1, 1.6, 0.12);
  tvAlcove.position.set(3.4, 1.8, 0);
  tvAlcove.rotation.y = -Math.PI / 2;

  const posterAlcove = buildAlcoveFrame(1.2, 1.6, 0.12);
  posterAlcove.position.set(3.4, 0.8, 2.2);
  posterAlcove.rotation.y = -Math.PI / 2;

  const portalAlcove = buildAlcoveFrame(1.6, 2.5, 0.12);
  portalAlcove.position.set(3.4, 0, -2.0);
  portalAlcove.rotation.y = -Math.PI / 2;
```

- [ ] **Step 3: Add to `scene.add`**

```js
  scene.add(
    arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, coffeeMachine, centralPedestal, holoSphere,
    arcadeAlcove, bookshelfAlcove,
    tvAlcove, posterAlcove, portalAlcove,
    pedestal, rabbitHole, tv, globe, ...posters,
    portal
  );
```

- [ ] **Step 4: Reposition portal**

Find where `portal.position.set(...)` is called (it's inside `buildPortal`). If the portal is already at a right-wall position, note its coordinates; otherwise set:

```js
  portal.position.set(3.3, 0, -2.0);
  portal.rotation.y = -Math.PI / 2;
```

(Adjust after build step if portal ends up mis-framed.)

- [ ] **Step 5: Build + spot-check**

```bash
npx vite build
```

Expected: three alcoves on the right wall. TV still shows the YouTube video. AI-cinema poster sits in its alcove. Nature portal now white + cyan in its tall alcove.

- [ ] **Step 6: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat(ai-room): right-wall alcoves for TV, AI poster, nature portal

Each of the right-wall objects is framed in a white alcove with
cyan LED trim. The nature portal is restyled from warm pink/teal
to white + cyan.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Back wall — coffee machine + holographic posters + desk

**Files:**
- Modify: `src/scene/objects.js` — back-wall alcoves; holographic reskin of the 3 small posters; restyle desk + chair
- Modify: `src/ui.js` — no changes; panel content for `poster-0/1/2` stays

- [ ] **Step 1: Add back-wall alcove frames**

In `createObjects`, after the right-wall alcoves:

```js
  const coffeeAlcove = buildAlcoveFrame(1.4, 2.4, 0.12);
  coffeeAlcove.position.set(-2.8, 0, -2.95);

  const postersAlcove = buildAlcoveFrame(3.5, 1.8, 0.12);
  postersAlcove.position.set(-0.8, 0.8, -2.95);

  const deskAlcove = buildAlcoveFrame(2.4, 2.4, 0.12);
  deskAlcove.position.set(2.2, 0, -2.95);
```

Add each of these to `scene.add(...)` list.

- [ ] **Step 2: Retheme the 3 small AI posters to holograms**

Find `buildAIPoster` in `objects.js`. It builds a `PlaneGeometry` with a `CanvasTexture`-generated illustration. Replace the background fill with:

```js
actx.fillStyle = 'rgba(13, 33, 55, 0.75)';   // dark translucent blue
```

Replace all `#5a3a18`, `#8a5a28`, `#ff6a4a` (or whatever warm palette is present) with `#00d4ff` (cyan) and `#9ce0ff` (light cyan). Add wireframe-style line art. If the existing art uses emoji/illustrations (`brain`, `eye`, `circuit` symbols), convert each symbol's drawing to cyan outlines only — no fills.

After creation, set the material to emissive cyan so the poster glows:

```js
const posterMat = new THREE.MeshStandardMaterial({
  map: tex, emissive: 0x00d4ff, emissiveIntensity: 0.4,
  transparent: true
});
```

- [ ] **Step 3: Lighten the desk + chair**

In `buildDesk`, locate the main desktop/legs materials. Replace the dark ones with:

```js
new THREE.MeshStandardMaterial({
  color: 0xe8eaed, metalness: 0.15, roughness: 0.55
})
```

Keep the monitor bezels dark so the screens stand out. Keep the globe and iframe-target meshes unchanged.

In `buildGamingChair`, replace the dark upholstery material with:

```js
new THREE.MeshStandardMaterial({
  color: 0xf0f2f5, metalness: 0.1, roughness: 0.7
})
```

Replace the cyan/red accent trim with pure cyan:

```js
new THREE.MeshStandardMaterial({
  color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.0
})
```

- [ ] **Step 4: Build + spot-check**

```bash
npx vite build
```

Expected: the back wall now has three alcoves. Coffee machine in left alcove (unchanged dark gray), 3 glowing cyan hologram posters in the center alcove, white desk + white chair + working monitors in the right alcove.

- [ ] **Step 5: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat(ai-room): back-wall alcoves + hologram posters + white desk

Three back-wall alcoves: coffee machine (left), three hologram
posters (center, reskinned to cyan wireframes on dark-blue plate),
desk + chair (right, restyled to white + cyan accents).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Front wall — rabbit hole + magical book + white benches

**Files:**
- Modify: `src/scene/objects.js` — front-wall alcoves; move magical book pedestal to front-right; replace bean bags with benches; restyle table

- [ ] **Step 1: Add front-wall alcoves + benches**

In `createObjects`:

```js
  const rabbitAlcove = buildAlcoveFrame(1.4, 1.1, 0.12);
  rabbitAlcove.position.set(-2.0, 0, 2.95);
  rabbitAlcove.rotation.y = Math.PI;

  const bookAlcove = buildAlcoveFrame(1.4, 2.3, 0.12);
  bookAlcove.position.set(2.0, 0, 2.95);
  bookAlcove.rotation.y = Math.PI;
```

- [ ] **Step 2: Move the magical book pedestal to the front-right alcove**

Find the existing `buildPedestal` function (the one that holds the magical book). After `const pedestal = buildPedestal();` in `createObjects`, add:

```js
  pedestal.position.set(2.0, 0, 2.6);
```

The book's bobbing animation is unchanged.

- [ ] **Step 3: Reposition the rabbit hole**

Find where `rabbitHole` is positioned. In `createObjects` after `const rabbitHole = buildRabbitHole();` add:

```js
  rabbitHole.position.set(-2.0, 0, 2.6);
```

- [ ] **Step 4: Replace bean bags with white sci-fi benches**

Find `buildBeanBag` in `objects.js`. Replace the function body with:

```js
function buildBeanBag(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf0f2f5, metalness: 0.1, roughness: 0.65
  });
  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.0
  });

  // Bench seat — low rounded slab
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.14, 0.55),
    whiteMat
  );
  seat.position.y = 0.3;
  seat.castShadow = true;
  seat.receiveShadow = true;
  group.add(seat);

  // Low backrest
  const backrest = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.35, 0.08),
    whiteMat
  );
  backrest.position.set(0, 0.52, -0.24);
  group.add(backrest);

  // Cyan LED trim along the front lower edge
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.02, 0.015),
    cyanMat
  );
  trim.position.set(0, 0.23, 0.27);
  group.add(trim);

  return group;
}
```

Rename remaining references? No — the existing call sites still use `buildBeanBag(x, z)`. Just reposition them. Update:

```js
  const beanBag1 = buildBeanBag(-2.5, 0.5);
  const beanBag2 = buildBeanBag(2.5, 0.5);
```

(Both benches sit flanking the center pedestal, a bit forward so the room reads as "observation lounge".)

- [ ] **Step 5: Restyle the table (report)**

Find `buildTable`. Replace the top + legs material with white:

```js
new THREE.MeshStandardMaterial({
  color: 0xe8eaed, metalness: 0.15, roughness: 0.5
})
```

Reposition:

```js
  const table = buildTable();
  table.position.set(0, 0, 1.3);
```

(Right in front of the pedestal — a low "console" where the annual-report object sits.)

- [ ] **Step 6: Add front-wall alcoves to `scene.add`**

```js
  scene.add(
    arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, coffeeMachine, centralPedestal, holoSphere,
    arcadeAlcove, bookshelfAlcove,
    tvAlcove, posterAlcove, portalAlcove,
    coffeeAlcove, postersAlcove, deskAlcove,
    rabbitAlcove, bookAlcove,
    pedestal, rabbitHole, tv, globe, ...posters,
    portal
  );
```

- [ ] **Step 7: Build + spot-check**

```bash
npx vite build
```

Expected: front wall has two alcoves — left frames the rabbit hole, right frames the magical book pedestal. Two white benches flank the center. The small white table sits just forward of the pedestal with the report icon on it.

- [ ] **Step 8: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat(ai-room): front-wall alcoves + benches + new layout

Rabbit hole moves to front-left alcove; magical book pedestal to
front-right alcove. Bean bags become white sci-fi benches with
cyan LED trim flanking the center pedestal. Report table moved
forward of center, restyled white.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Update all hotspot camera positions + final polish

**Files:**
- Modify: `src/navigation.js` — update hotspot `position`/`target` values to match new object positions
- Modify: `src/tests/navigation.test.js` — update any hotspot assertions whose coordinates changed

- [ ] **Step 1: Update the hotspot table**

In `src/navigation.js`, update each hotspot to match the new AI-room layout. Replace these existing entries:

```js
  overview:       { position: { x: 0, y: 1.6, z: 2 }, target: { x: 0, y: 1.6, z: 0 }, label: 'Overview' },
  'arcade-right': { position: { x: -1.8, y: 1.5, z: -0.5 }, target: { x: -3.15, y: 1.4, z: -0.5 }, label: 'Arcade' },
  'wall-left':    { position: { x: -1,   y: 2,   z: 0  }, target: { x: -3.5, y: 1.5, z: 0 }, label: 'Left Wall' },
  'wall-right':   { position: { x: 1,    y: 2,   z: 0  }, target: { x: 3.5,  y: 1.5, z: 0 }, label: 'Right Wall' },
  desk:           { position: { x: 1.8,  y: 1.5, z: -0.6 }, target: { x: 1.8,  y: 1.2, z: -2.6 }, label: 'Gaming Desk' },
  globe:          { position: { x: 0.6,  y: 1.2, z: -1.5 }, target: { x: 0.2,  y: 0.85, z: -2.4 }, label: 'Globe' },
  pedestal:       { position: { x: -2.0, y: 1.4, z: 1.6  }, target: { x: -2.8, y: 1.2, z: 2.6  }, label: 'Magic Tome' },
  'rabbit-hole':  { position: { x: -0.2, y: 1.2, z: -1.5 }, target: { x: -0.8, y: 0.2, z: -2.4 }, label: 'Rabbit Hole' },
```

with:

```js
  overview:       { position: { x: 0,    y: 1.6, z: 2   }, target: { x: 0,    y: 1.6, z: 0   }, label: 'Overview' },
  'arcade-right': { position: { x: -1.8, y: 1.5, z: -0.5 }, target: { x: -3.2, y: 1.4, z: -0.5 }, label: 'Arcade' },
  'wall-left':    { position: { x: -1,   y: 2,   z: 0   }, target: { x: -3.2, y: 1.5, z: 0   }, label: 'Left Wall' },
  'wall-right':   { position: { x: 1,    y: 2,   z: 0   }, target: { x: 3.2,  y: 1.5, z: 0   }, label: 'Right Wall' },
  desk:           { position: { x: 2.2,  y: 1.5, z: -1.0 }, target: { x: 2.2,  y: 1.2, z: -2.6 }, label: 'Gaming Desk' },
  globe:          { position: { x: 1.0,  y: 1.2, z: -1.5 }, target: { x: 0.2,  y: 0.85, z: -2.4 }, label: 'Globe' },
  pedestal:       { position: { x: 1.0,  y: 1.4, z: 1.5  }, target: { x: 2.0,  y: 1.2, z: 2.6  }, label: 'Magic Tome' },
  'rabbit-hole':  { position: { x: -1.0, y: 1.2, z: 1.5  }, target: { x: -2.0, y: 0.2, z: 2.6  }, label: 'Rabbit Hole' },
```

Leave all other hotspot entries (table, desk-left-monitor, desk-right-monitor, seat-*, poster-0/1/2, tv, poster-ai-cinema, exit, holo-sphere, coffee-machine, nature-room ones) with their existing values unless they obviously need adjustment.

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: `18 passed` (includes the holo-sphere assertion). Any failures here mean an assertion depended on a coordinate we changed — fix by updating the assertion to match.

- [ ] **Step 3: Manual test — walk through every hotspot in the AI room**

Start `npx vite`, walk around and click each object:
- Arcade cabinet → should zoom to face it head-on in its alcove
- Bookshelf → zooms to it
- Coffee machine → zooms, opens panel
- Desk/monitors/globe → zoom zone flows
- Rabbit hole → zooms, opens scrollytelling
- Magical book pedestal → zooms, opens book overlay
- TV → zooms (CSS3D still shows)
- AI-cinema poster → zooms, panel
- Nature portal → zooms, can transition to nature room
- Holo-sphere → zooms, opens Floating Motifs panel

Every transition should end with the camera not inside walls or alcove frames.

- [ ] **Step 4: Build**

```bash
npx vite build
```

Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/navigation.js src/tests/navigation.test.js
git commit -m "fix(ai-room): update hotspot coordinates for new observatory layout

Adjusts zoom positions for arcade, walls, desk, globe, pedestal,
and rabbit-hole hotspots so each lands the camera in front of
its object in the new alcove layout.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Summary

**Spec coverage** — every requirement from the design doc maps to at least one task:

| Spec item | Task |
|---|---|
| Remove neonSign, rug, floorLamp, wallTagging, 3D radio | Task 1 |
| Curved white walls + vertical LED seams | Task 2 |
| Dome ceiling + 10 inset light panels | Task 3 |
| Hex-tile floor + glowing seams + halo ring | Task 4 |
| Central 2-tier pedestal | Task 5 |
| Holo-sphere (wireframe + particles + rings + beam) | Task 6 |
| Sphere clickable → Floating Motifs panel | Task 7 |
| Alcove frame helper | Task 8 |
| Arcade + bookshelf restyled + homed in left-wall alcoves | Task 9 |
| TV + AI-cinema poster + nature portal in right-wall alcoves (portal restyled white+cyan) | Task 10 |
| Coffee machine + 3 hologram posters + desk in back-wall alcoves | Task 11 |
| Rabbit hole + magical book pedestal in front-wall alcoves; benches replace bean bags; table restyled | Task 12 |
| Hotspot camera positions updated | Task 13 |
| Ambient + hemi light tuned to observatory palette | Task 2 |
| Alcove accent lights | Task 8 (via `buildAlcoveFrame`) |

No gaps.

**Placeholder scan** — no "TBD", "add validation", etc. Every step either shows code or is a concrete action (run command, commit).

**Type consistency** — function names used consistently: `buildAlcoveFrame`, `buildCentralPedestal`, `buildHoloSphere`, `holoSphere.userData.{wireframe,particles,ringA,ringB}`. Hotspot id `'holo-sphere'` and panelId `'floating-motifs'` match between tasks 7 and the design doc.
