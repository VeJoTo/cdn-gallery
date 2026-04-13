# Neon Arcade Gaming Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the CDN 3D gallery to a neon-arcade-on-ocean-night theme, populate it with full gaming-room decor (desk, chair, posters, neon sign, rug, bookshelf, fridge, lamp, magical book pedestal, desk globe), and rework the wizard into a speech-bubble chatbot with a free-form text input.

**Architecture:** Pure additive changes to existing modules — no new files. Each `src/scene/objects.js` builder is a small `THREE.Group` factory with explicit colours. The pedestal book and desk globe expose update callbacks merged into a single `sceneUpdate` registered with the existing render loop. The book overlay and chat rework are JS additions in `src/ui.js` plus markup in `index.html` plus styles in `styles/main.css`.

**Tech Stack:** Vanilla Three.js, GSAP, Vite, Vitest. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-04-10-neon-arcade-style-design.md`

---

## File Map

| File | Tasks | Responsibility |
|---|---|---|
| `src/scene/room.js` | 1 | Floor/walls/ceiling colours, lighting, neon floor strips |
| `src/scene/objects.js` | 2, 5–11 | All 3D objects: arcades, table, bean bags, desk+monitors+globe, chair, bookshelf, posters, neon sign, rug, fridge, lamp, pedestal+book; `sceneUpdate` callback |
| `src/scene/gatekeeper.js` | 3 | Wizard colour palette |
| `src/scene/panels.js` | 4 | Wall panel canvas texture colours |
| `src/navigation.js` | 11 | New `desk` and `pedestal` hotspots, `openBook` action routing |
| `src/main.js` | 11 | Wire `sceneUpdate`, push new clickables, wire chat-anchor update |
| `index.html` | 13, 14 | `#book-overlay`, `#chat-input-row` markup |
| `src/ui.js` | 13, 14 | Book overlay open/close/page-nav, chat keyword answers, chat speech-bubble positioning |
| `styles/main.css` | 12, 13, 14 | Full neon repaint, book overlay, chat speech-bubble + input |
| `src/tests/navigation.test.js` | 11 | Tests for new hotspots |
| `src/tests/ui.test.js` (NEW) | 13, 14 | Tests for `answer()` keyword matching and book page navigation |

---

## Task 1: Restyle room (colours, lights, neon floor strips)

**Files:**
- Modify: `src/scene/room.js` (full rewrite)

- [ ] **Step 1: Replace `src/scene/room.js` with the neon ocean-night version**

```js
// src/scene/room.js
import * as THREE from 'three';

export function createRoom(scene) {
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x0d1b2a, side: THREE.FrontSide });
  const wallMat  = new THREE.MeshLambertMaterial({ color: 0x0a1a28, side: THREE.FrontSide });
  const ceilMat  = new THREE.MeshLambertMaterial({ color: 0x050d14, side: THREE.FrontSide });

  // Floor 7×6
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-3.5, 1.75, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(3.5, 1.75, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Back wall
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), wallMat);
  backWall.position.set(0, 1.75, -3);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.5, 0);
  ceil.receiveShadow = true;
  scene.add(ceil);

  // ── Lighting ────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x1a3a5c, 0.2);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffd166, 0.6);
  dirLight.position.set(2, 8, 6);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -8;
  dirLight.shadow.camera.right = 8;
  dirLight.shadow.camera.top = 8;
  dirLight.shadow.camera.bottom = -8;
  scene.add(dirLight);

  const neonPink = new THREE.PointLight(0xff006e, 1.5, 8);
  neonPink.position.set(-2.5, 1.5, 0.5);
  scene.add(neonPink);

  const neonTeal = new THREE.PointLight(0x00e5ff, 1.5, 8);
  neonTeal.position.set(2.5, 1.5, 0.5);
  scene.add(neonTeal);

  const neonPurple = new THREE.PointLight(0x9b00ff, 0.8, 12);
  neonPurple.position.set(0, 2.5, 1.5);
  scene.add(neonPurple);

  // Neon floor strips along the base of left & right walls
  const stripGeom = new THREE.BoxGeometry(7, 0.02, 0.06);

  const leftStripMat = new THREE.MeshStandardMaterial({
    color: 0xff006e, emissive: 0xff006e, emissiveIntensity: 1.0
  });
  const leftStrip = new THREE.Mesh(stripGeom, leftStripMat);
  leftStrip.rotation.y = Math.PI / 2;
  leftStrip.position.set(-3.45, 0.01, 0);
  scene.add(leftStrip);

  const rightStripMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.0
  });
  const rightStrip = new THREE.Mesh(stripGeom, rightStripMat);
  rightStrip.rotation.y = -Math.PI / 2;
  rightStrip.position.set(3.45, 0.01, 0);
  scene.add(rightStrip);
}
```

- [ ] **Step 2: Update scene background and fog in `src/main.js`**

Find these lines (around line 20–21):
```js
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.Fog(0x0a0a0f, 15, 30);
```

Replace with:
```js
scene.background = new THREE.Color(0x050d14);
scene.fog = new THREE.Fog(0x050d14, 15, 30);
```

- [ ] **Step 3: Run dev server and visually verify**

Run: `npm run dev`
Open `http://localhost:5173`. Expected: dark navy room, two coloured neon point lights cast pink/teal pools on the back wall, glowing strips along the base of each side wall, gold-tinted directional light still casts shadows.

- [ ] **Step 4: Commit**

```bash
git add src/scene/room.js src/main.js
git commit -m "feat: restyle room to neon ocean-night with floor strips"
```

---

## Task 2: Restyle existing objects + add `screenColor` param

**Files:**
- Modify: `src/scene/objects.js` (functions `buildArcadeCabinet`, `buildTable`, `buildBeanBag`, `createObjects`)

- [ ] **Step 1: Update `buildArcadeCabinet` to accept `screenColor` and apply neon palette**

Replace the existing `buildArcadeCabinet` function in `src/scene/objects.js` with:

```js
function buildArcadeCabinet(xPos, screenColor) {
  const group = new THREE.Group();
  group.position.set(xPos, 0, 0.2);

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 2.0, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x080f18 })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  // Monitor bezel
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.52, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x030810 })
  );
  bezel.position.set(0, 1.45, 0.31);
  group.add(bezel);

  // Screen (neon emissive)
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.42, 0.02),
    new THREE.MeshStandardMaterial({
      color: screenColor,
      emissive: screenColor,
      emissiveIntensity: 1.2
    })
  );
  screen.position.set(0, 1.45, 0.35);
  group.add(screen);

  // Control panel
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.08, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x0d1a28 })
  );
  panel.position.set(0, 0.92, 0.22);
  panel.rotation.x = 0.25;
  group.add(panel);

  // Joystick base
  const jBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  jBase.position.set(-0.15, 0.97, 0.3);
  group.add(jBase);

  // Joystick stick
  const jStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  jStick.position.set(-0.15, 1.03, 0.3);
  group.add(jStick);

  // Buttons (3): pink, teal, gold
  const buttonColors = [0xff006e, 0x00e5ff, 0xffd166];
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8),
      new THREE.MeshStandardMaterial({
        color: buttonColors[i],
        emissive: buttonColors[i],
        emissiveIntensity: 0.8
      })
    );
    btn.position.set(0.05 + i * 0.13, 0.97, 0.32);
    btn.rotation.x = -0.25;
    group.add(btn);
  }

  return group;
}
```

- [ ] **Step 2: Update `buildTable` colours**

Replace `buildTable` with:

```js
function buildTable() {
  const group = new THREE.Group();
  group.position.set(0, 0, 1.5);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.08, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  top.position.y = 0.44;
  top.castShadow = true;
  group.add(top);

  const legMat = new THREE.MeshLambertMaterial({ color: 0x0d1b2a });
  const legPositions = [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]];
  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.06), legMat);
    leg.position.set(lx, 0.22, lz);
    group.add(leg);
  }

  const cardMat = new THREE.MeshLambertMaterial({ color: 0xe0f7ff, side: THREE.DoubleSide });
  for (let i = 0; i < 2; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), cardMat);
    card.rotation.x = -Math.PI / 2;
    card.position.set(-0.25 + i * 0.55, 0.49, 0);
    group.add(card);
  }

  return group;
}
```

- [ ] **Step 3: Update `buildBeanBag` colours**

Replace `buildBeanBag` with:

```js
function buildBeanBag(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const base = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  base.scale.y = 0.55;
  base.position.y = 0.24;
  base.castShadow = true;
  group.add(base);

  const cushion = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x9b00ff })
  );
  cushion.scale.y = 0.45;
  cushion.position.y = 0.46;
  cushion.castShadow = true;
  group.add(cushion);

  return group;
}
```

- [ ] **Step 4: Update `createObjects` to pass screen colours**

Find the existing `createObjects` function. Replace the two `buildArcadeCabinet(...)` calls so the function reads:

```js
export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(-2.5, 0xff006e);
  const arcadeRight = buildArcadeCabinet(2.5,  0x00e5ff);
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  scene.add(arcadeLeft, arcadeRight, table, beanBag1, beanBag2);

  return { arcadeLeft, arcadeRight };
}
```

(This is the same structure as today, only with the new arcade colour args. Subsequent tasks will expand the return shape and add more objects.)

- [ ] **Step 5: Run tests and dev server**

Run: `npm test`
Expected: 6 tests pass (no regressions).

Run: `npm run dev`
Expected: arcades are now near-black with pink and teal screens; bean bag cushions are bright purple; table is dark teal.

- [ ] **Step 6: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat: restyle existing objects with neon arcade palette"
```

---

## Task 3: Restyle gatekeeper

**Files:**
- Modify: `src/scene/gatekeeper.js`

- [ ] **Step 1: Update colours in `src/scene/gatekeeper.js`**

In `createGatekeeper`, change these material colours:

- Hat brim: `0x2a1a6e` → `0x050d14`
- Hat cone: `0x2a1a6e` → `0x050d14`
- Beard: `0xe8e0d0` → `0x90e0ef` (cool teal-white beard)
- Spectacles `glassMat`: replace `MeshBasicMaterial({ color: 0x888866 })` with `MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.6 })`
- Stars `starMat`: change `color`/`emissive` from `0xffdd44` to `0xffd166`, and `emissiveIntensity` from `0.8` to `1.0`
- Add a robe/body cone after the beard (new geometry, see step 2)

- [ ] **Step 2: Add the deep-teal robe cone under the head**

After the beard mesh creation block, insert:

```js
  // Robe / body cone
  const robe = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.9, 12),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  robe.position.y = -0.7;
  group.add(robe);
```

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`
Expected: wizard now has a near-black pointy hat, a deep-teal robe under the head, glowing teal spectacle rings, and brighter gold stars on the hat. The bobbing animation still works.

- [ ] **Step 4: Commit**

```bash
git add src/scene/gatekeeper.js
git commit -m "feat: restyle gatekeeper wizard with neon palette and robe"
```

---

## Task 4: Restyle wall panels

**Files:**
- Modify: `src/scene/panels.js`

- [ ] **Step 1: Update `drawTextPanel` colours**

Replace the body of `drawTextPanel` with:

```js
function drawTextPanel(ctx, title) {
  ctx.fillStyle = '#0a1a28';
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(title, 30, 52);

  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 64);
  ctx.lineTo(PANEL_W - 30, 64);
  ctx.stroke();

  const lines = [
    'Lorem ipsum dolor sit amet consectetur',
    'adipiscing elit sed do eiusmod tempor.',
    'Incididunt ut labore et dolore magna.',
    'Aliqua enim ad minim veniam quis.',
    'Nostrud exercitation ullamco laboris.'
  ];
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#90e0ef';
  lines.forEach((line, i) => ctx.fillText(line, 30, 104 + i * 34));
}
```

- [ ] **Step 2: Update `drawChartPanel` colours**

Replace the body with:

```js
function drawChartPanel(ctx, title) {
  ctx.fillStyle = '#0a1a28';
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(title, 30, 44);

  const bars = [
    { label: '2020', value: 0.55, color: '#00e5ff' },
    { label: '2021', value: 0.70, color: '#ff006e' },
    { label: '2022', value: 0.85, color: '#9b00ff' },
    { label: '2023', value: 0.65, color: '#00e5ff' },
    { label: '2024', value: 0.95, color: '#ff006e' }
  ];

  const barW = 68;
  const maxH = 220;
  const baseY = 320;
  const startX = 40;

  bars.forEach(({ label, value, color }, i) => {
    const x = startX + i * (barW + 16);
    const h = value * maxH;

    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - h, barW, h);

    ctx.fillStyle = '#90e0ef';
    ctx.font = '18px sans-serif';
    ctx.fillText(label, x + 10, baseY + 22);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(Math.round(value * 100) + '%', x + 8, baseY - h - 8);
  });

  ctx.strokeStyle = 'rgba(144,224,239,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, baseY);
  ctx.lineTo(PANEL_W - 30, baseY);
  ctx.stroke();
}
```

- [ ] **Step 3: Update `drawTimelinePanel` colours**

Replace the body with:

```js
function drawTimelinePanel(ctx, title) {
  ctx.fillStyle = '#0a1a28';
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(title, 30, 44);

  const milestones = [
    { year: '2018', label: 'CDN founded at UiB' },
    { year: '2020', label: 'First research cohort' },
    { year: '2022', label: 'Digital storytelling lab' },
    { year: '2024', label: 'Interactive gallery launch' }
  ];

  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  const lineY = 200;
  ctx.beginPath();
  ctx.moveTo(40, lineY);
  ctx.lineTo(PANEL_W - 40, lineY);
  ctx.stroke();

  const spacing = (PANEL_W - 80) / (milestones.length - 1);

  milestones.forEach(({ year, label }, i) => {
    const x = 40 + i * spacing;

    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x, lineY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#90e0ef';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(year, x, lineY - 22);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#90e0ef';
    const descY = i % 2 === 0 ? lineY + 36 : lineY + 72;
    ctx.fillText(label, x, descY);
  });

  ctx.textAlign = 'left';
}
```

- [ ] **Step 4: Run dev server and verify**

Run: `npm run dev`
Expected: all 6 wall panels now have dark navy backgrounds with gold titles, teal lines, and neon-coloured chart bars / timeline dots.

- [ ] **Step 5: Commit**

```bash
git add src/scene/panels.js
git commit -m "feat: restyle wall panels with neon canvas textures"
```

---

## Task 5: Add gaming desk + dual monitors + globe

**Files:**
- Modify: `src/scene/objects.js` (add `buildDesk` function)

- [ ] **Step 1: Add `buildDesk` to `src/scene/objects.js`**

Insert this function above `createObjects`:

```js
function buildDesk() {
  const group = new THREE.Group();
  group.position.set(1.8, 0, -2.6);

  // Desk top
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.06, 0.9),
    new THREE.MeshLambertMaterial({ color: 0x0d1b2a })
  );
  top.position.y = 0.85;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Desk legs
  const legMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const legXs = [-1.15, 1.15];
  const legZs = [-0.4, 0.4];
  for (const lx of legXs) {
    for (const lz of legZs) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), legMat);
      leg.position.set(lx, 0.425, lz);
      group.add(leg);
    }
  }

  // Monitor stands
  const standMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  for (const sx of [-0.55, 0.55]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), standMat);
    stand.position.set(sx, 0.97, -0.2);
    group.add(stand);
  }

  // Bezels and screens (left = purple, right = teal)
  const monitorDefs = [
    { x: -0.55, rotY:  0.15, color: 0x9b00ff },
    { x:  0.55, rotY: -0.15, color: 0x00e5ff }
  ];
  const leftMonitorRefs = [];
  for (const { x, rotY, color } of monitorDefs) {
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.45, 0.04),
      new THREE.MeshLambertMaterial({ color: 0x030810 })
    );
    bezel.position.set(x, 1.25, -0.2);
    bezel.rotation.y = rotY;
    group.add(bezel);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.41, 0.02),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 1.0
      })
    );
    screen.position.set(x + Math.sin(rotY) * 0.025, 1.25, -0.2 + Math.cos(rotY) * 0.025);
    screen.rotation.y = rotY;
    group.add(screen);

    if (x < 0) leftMonitorRefs.push(screen);
  }

  // The left monitor opens a panel
  leftMonitorRefs[0].userData = {
    clickable: true,
    action: 'openPanel',
    panelId: 'desk-research',
    panelTitle: 'Digital Storytelling Research'
  };

  // Keyboard
  const keyboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.02, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  keyboard.position.set(0, 0.89, 0.05);
  group.add(keyboard);

  // Keyboard neon strip
  const kbStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.005, 0.005),
    new THREE.MeshStandardMaterial({
      color: 0xff006e, emissive: 0xff006e, emissiveIntensity: 0.8
    })
  );
  kbStrip.position.set(0, 0.901, 0.14);
  group.add(kbStrip);

  // Mouse
  const mouse = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  mouse.position.set(0.4, 0.89, 0.05);
  group.add(mouse);

  // ── Globe on the left side of the desk ──
  const globeGroup = new THREE.Group();
  globeGroup.position.set(-1.0, 0.91, 0.1);

  const standBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.04, 12),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  standBase.position.y = 0.02;
  globeGroup.add(standBase);

  const standArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.008, 8, 16, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  standArc.position.y = 0.17;
  standArc.rotation.x = Math.PI / 2;
  standArc.rotation.z = Math.PI / 2;
  globeGroup.add(standArc);

  // Globe sphere with painted continents
  const globeCanvas = document.createElement('canvas');
  globeCanvas.width = 256;
  globeCanvas.height = 128;
  const gctx = globeCanvas.getContext('2d');
  gctx.fillStyle = '#1b3a4b';
  gctx.fillRect(0, 0, 256, 128);
  gctx.fillStyle = '#ffd166';
  // Crude continent blobs
  gctx.beginPath(); gctx.ellipse(60, 50, 22, 14, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(90, 80, 16, 18, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(140, 55, 28, 16, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(180, 90, 20, 12, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(210, 50, 14, 10, 0, 0, Math.PI * 2); gctx.fill();

  const globeTex = new THREE.CanvasTexture(globeCanvas);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 24, 16),
    new THREE.MeshStandardMaterial({ map: globeTex, roughness: 0.7 })
  );
  sphere.position.y = 0.17;
  sphere.userData = {
    clickable: true,
    action: 'openPanel',
    panelId: 'globe',
    panelTitle: 'CDN International Reach'
  };
  globeGroup.add(sphere);

  group.add(globeGroup);
  group.userData = { clickable: true, hotspot: 'desk', globeMesh: sphere };

  return group;
}
```

- [ ] **Step 2: Wire `buildDesk` into `createObjects` (temporary, expanded properly in Task 11)**

Replace `createObjects` with:

```js
export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(-2.5, 0xff006e);
  const arcadeRight = buildArcadeCabinet(2.5,  0x00e5ff);
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);
  const desk        = buildDesk();

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  scene.add(arcadeLeft, arcadeRight, table, beanBag1, beanBag2, desk);

  return { arcadeLeft, arcadeRight, desk };
}
```

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`
Expected: a desk against the back-right of the room with two glowing monitors (purple + teal), a small globe with gold continents on the left side, keyboard, mouse. Globe doesn't spin yet — that comes in Task 11.

- [ ] **Step 4: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat: add gaming desk with dual monitors and globe"
```

---

## Task 6: Add gaming chair

**Files:**
- Modify: `src/scene/objects.js`

- [ ] **Step 1: Add `buildGamingChair` function**

Insert above `createObjects`:

```js
function buildGamingChair() {
  const group = new THREE.Group();
  group.position.set(1.8, 0, -1.7);
  group.rotation.y = Math.PI;

  const frameMat = new THREE.MeshLambertMaterial({ color: 0x1b3a4b });
  const blackMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), frameMat);
  seat.position.y = 0.45;
  seat.castShadow = true;
  group.add(seat);

  // Backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.08), frameMat);
  back.position.set(0, 0.92, -0.21);
  back.castShadow = true;
  group.add(back);

  // Headrest neon stripe (pink)
  const headrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, 0.085),
    new THREE.MeshStandardMaterial({
      color: 0xff006e, emissive: 0xff006e, emissiveIntensity: 0.7
    })
  );
  headrest.position.set(0, 1.28, -0.205);
  group.add(headrest);

  // Vertical teal accent strip down the centre of the back
  const accent = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.85, 0.085),
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.7
    })
  );
  accent.position.set(0, 0.92, -0.205);
  group.add(accent);

  // Armrests
  for (const ax of [-0.29, 0.29]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.4), blackMat);
    arm.position.set(ax, 0.6, 0);
    group.add(arm);
  }

  // Centre pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6),
    blackMat
  );
  pole.position.y = 0.2;
  group.add(pole);

  // 5-arm wheel star
  for (let i = 0; i < 5; i++) {
    const armStar = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.04), blackMat);
    armStar.position.y = 0.02;
    armStar.rotation.y = (i / 5) * Math.PI * 2;
    armStar.position.x = Math.cos((i / 5) * Math.PI * 2) * 0.1;
    armStar.position.z = Math.sin((i / 5) * Math.PI * 2) * 0.1;
    group.add(armStar);
  }

  return group;
}
```

- [ ] **Step 2: Add chair to `createObjects`**

Update `createObjects` to:

```js
export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(-2.5, 0xff006e);
  const arcadeRight = buildArcadeCabinet(2.5,  0x00e5ff);
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);
  const desk        = buildDesk();
  const chair       = buildGamingChair();

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  scene.add(arcadeLeft, arcadeRight, table, beanBag1, beanBag2, desk, chair);

  return { arcadeLeft, arcadeRight, desk };
}
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Expected: a gaming chair facing the desk, with deep-teal frame, neon-pink headrest stripe, teal vertical accent down the back, and a 5-spoke wheel base.

- [ ] **Step 4: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat: add gaming chair in front of desk"
```

---

## Task 7: Add bookshelf, mini fridge, floor lamp

**Files:**
- Modify: `src/scene/objects.js`

- [ ] **Step 1: Add `buildBookshelf`**

Insert above `createObjects`:

```js
function buildBookshelf() {
  const group = new THREE.Group();
  group.position.set(-3.4, 0, -2.5);
  group.rotation.y = Math.PI / 2;

  const frameMat = new THREE.MeshLambertMaterial({ color: 0x1b3a4b });
  const shelfMat = new THREE.MeshLambertMaterial({ color: 0x0a1a28 });

  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.3), frameMat);
  frame.position.y = 0.9;
  frame.castShadow = true;
  group.add(frame);

  // Shelves
  const shelfYs = [0.5, 0.95, 1.4];
  for (const sy of shelfYs) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 0.28), shelfMat);
    shelf.position.y = sy;
    shelf.position.z = 0.001;
    group.add(shelf);
  }

  // Books — 4 colours rotated through, ~10 per shelf
  const bookColours = [0xff006e, 0x00e5ff, 0x9b00ff, 0xffd166, 0x1b3a4b];
  for (const sy of shelfYs) {
    let xOffset = -0.5;
    for (let i = 0; i < 10; i++) {
      const colour = bookColours[i % bookColours.length];
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.085, 0.22, 0.18),
        new THREE.MeshLambertMaterial({ color: colour })
      );
      book.position.set(xOffset + 0.04, sy + 0.13, 0);
      group.add(book);
      xOffset += 0.095 + (i % 3) * 0.005;
    }
  }

  return group;
}
```

- [ ] **Step 2: Add `buildMiniFridge`**

```js
function buildMiniFridge() {
  const group = new THREE.Group();
  group.position.set(-3.0, 0, -2.8);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.0, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x0a1a28 })
  );
  body.position.y = 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Door split trim
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.01, 0.605),
    new THREE.MeshLambertMaterial({ color: 0x030810 })
  );
  trim.position.y = 0.65;
  group.add(trim);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.2, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.6
    })
  );
  handle.position.set(0.3, 0.7, 0.31);
  group.add(handle);

  // Top emissive strip
  const topStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.02, 0.6),
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.0
    })
  );
  topStrip.position.y = 1.01;
  group.add(topStrip);

  return group;
}
```

- [ ] **Step 3: Add `buildFloorLamp`**

```js
function buildFloorLamp() {
  const group = new THREE.Group();
  group.position.set(2.6, 0, 1.8);

  const blackMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12),
    blackMat
  );
  base.position.y = 0.02;
  group.add(base);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8),
    blackMat
  );
  pole.position.y = 0.84;
  group.add(pole);

  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12),
    new THREE.MeshStandardMaterial({
      color: 0x9b00ff, emissive: 0x9b00ff, emissiveIntensity: 1.2
    })
  );
  tube.position.y = 1.7;
  group.add(tube);

  const halo = new THREE.PointLight(0x9b00ff, 0.5, 4);
  halo.position.y = 1.7;
  group.add(halo);

  return group;
}
```

- [ ] **Step 4: Add all three to `createObjects`**

```js
export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(-2.5, 0xff006e);
  const arcadeRight = buildArcadeCabinet(2.5,  0x00e5ff);
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);
  const desk        = buildDesk();
  const chair       = buildGamingChair();
  const bookshelf   = buildBookshelf();
  const fridge      = buildMiniFridge();
  const floorLamp   = buildFloorLamp();

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  scene.add(
    arcadeLeft, arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, fridge, floorLamp
  );

  return { arcadeLeft, arcadeRight, desk };
}
```

- [ ] **Step 5: Verify**

Run: `npm run dev`
Expected: bookshelf against the left wall with neon-coloured book spines, mini fridge in the back-left corner glowing teal at top, floor lamp by the bean bags casting a purple glow.

- [ ] **Step 6: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat: add bookshelf, mini fridge, floor lamp"
```

---

## Task 8: Add wall posters

**Files:**
- Modify: `src/scene/objects.js`

- [ ] **Step 1: Add `buildPoster` helper**

Insert above `createObjects`:

```js
function buildPoster(x, y, z, frameColor, accentColor, title, idx) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 440;
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#050d14';
  ctx.fillRect(0, 0, 320, 440);

  // Neon frame
  ctx.strokeStyle = '#' + frameColor.toString(16).padStart(6, '0');
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 304, 424);

  // Title
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 160, 50);

  // Geometric placeholder art
  ctx.fillStyle = '#' + accentColor.toString(16).padStart(6, '0');
  ctx.beginPath();
  ctx.arc(160, 200, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(80, 320);
  ctx.lineTo(240, 320);
  ctx.lineTo(160, 200);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = '#90e0ef';
  ctx.font = '14px sans-serif';
  ctx.fillText('PLACEHOLDER', 160, 400);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), mat);
  plane.position.set(x, y, z);
  plane.userData = {
    clickable: true,
    action: 'openPanel',
    panelId: 'poster-' + idx,
    panelTitle: title
  };
  return plane;
}
```

- [ ] **Step 2: Build 3 posters and add to `createObjects`**

Update `createObjects`:

```js
export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(-2.5, 0xff006e);
  const arcadeRight = buildArcadeCabinet(2.5,  0x00e5ff);
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);
  const desk        = buildDesk();
  const chair       = buildGamingChair();
  const bookshelf   = buildBookshelf();
  const fridge      = buildMiniFridge();
  const floorLamp   = buildFloorLamp();

  const posters = [
    buildPoster(-2.5, 2.0, -2.99, 0xff006e, 0x9b00ff, 'NEON RUNNER',  0),
    buildPoster(-1.4, 2.0, -2.99, 0x00e5ff, 0xff006e, 'PIXEL QUEST',  1),
    buildPoster(-0.3, 2.0, -2.99, 0x9b00ff, 0x00e5ff, 'STAR ARCADE',  2)
  ];

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  scene.add(
    arcadeLeft, arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, fridge, floorLamp,
    ...posters
  );

  return { arcadeLeft, arcadeRight, desk, posters };
}
```

(Note: poster `z = -2.99` is just in front of the back wall at `z = -3` so they're visible.)

- [ ] **Step 3: Verify**

Run: `npm run dev`
Expected: 3 game posters on the left half of the back wall with neon frames in pink, teal, purple. Hovering them shows pointer cursor (because they're clickable).

- [ ] **Step 4: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat: add neon wall posters"
```

---

## Task 9: Add neon GAME ROOM sign + rug

**Files:**
- Modify: `src/scene/objects.js`

- [ ] **Step 1: Add `buildNeonSign` with letter segment helper**

Insert above `createObjects`:

```js
// Stick-letter segments. Each value is a list of [x, y, w, h] rects (normalized 0-1)
// drawn into a 0.18-tall × 0.16-wide letter cell.
const LETTER_SEGMENTS = {
  G: [[0,0.5,1,0.1],[0,0,0.1,1],[0,0.9,1,0.1],[0.6,0.5,0.4,0.1],[0.9,0.5,0.1,0.5]],
  A: [[0,0,0.1,1],[0.9,0,0.1,1],[0,0.9,1,0.1],[0,0.45,1,0.1]],
  M: [[0,0,0.1,1],[0.9,0,0.1,1],[0.4,0.3,0.2,0.1],[0.3,0.15,0.1,0.2],[0.6,0.15,0.1,0.2]],
  E: [[0,0,0.1,1],[0,0,1,0.1],[0,0.45,0.7,0.1],[0,0.9,1,0.1]],
  R: [[0,0,0.1,1],[0,0,1,0.1],[0.9,0,0.1,0.5],[0,0.45,1,0.1],[0.5,0.5,0.5,0.5]],
  O: [[0,0,0.1,1],[0.9,0,0.1,1],[0,0,1,0.1],[0,0.9,1,0.1]]
};

function buildLetter(char, x, y, color) {
  const group = new THREE.Group();
  const segs = LETTER_SEGMENTS[char] || [];
  const cellW = 0.16;
  const cellH = 0.22;
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 1.4
  });
  for (const [sx, sy, sw, sh] of segs) {
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(sw * cellW, 0.015), Math.max(sh * cellH, 0.015), 0.025),
      mat
    );
    seg.position.set(
      x + sx * cellW + (sw * cellW) / 2,
      y + (1 - sy - sh) * cellH + (sh * cellH) / 2,
      0
    );
    group.add(seg);
  }
  return group;
}

function buildNeonSign() {
  const group = new THREE.Group();
  group.position.set(1.8, 2.85, -2.97);

  const word1 = 'GAME';
  const word2 = 'ROOM';
  const letterSpacing = 0.20;
  const word1Width = word1.length * letterSpacing;
  const word2Width = word2.length * letterSpacing;

  // GAME (top row)
  for (let i = 0; i < word1.length; i++) {
    const letter = buildLetter(word1[i], -word1Width / 2 + i * letterSpacing, 0.12, 0xff006e);
    group.add(letter);
  }
  // ROOM (bottom row)
  for (let i = 0; i < word2.length; i++) {
    const letter = buildLetter(word2[i], -word2Width / 2 + i * letterSpacing, -0.18, 0xff006e);
    group.add(letter);
  }

  return group;
}
```

- [ ] **Step 2: Add `buildRug`**

```js
function buildRug() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b3a4b';
  ctx.fillRect(0, 0, 256, 256);

  const rings = [
    { r: 110, color: '#ff006e' },
    { r: 85,  color: '#00e5ff' },
    { r: 60,  color: '#9b00ff' },
    { r: 35,  color: '#ffd166' }
  ];
  for (const { r, color } of rings) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.5), mat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.005, 0.5);
  rug.receiveShadow = true;
  return rug;
}
```

- [ ] **Step 3: Add both to `createObjects`**

Update `createObjects`:

```js
export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(-2.5, 0xff006e);
  const arcadeRight = buildArcadeCabinet(2.5,  0x00e5ff);
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);
  const desk        = buildDesk();
  const chair       = buildGamingChair();
  const bookshelf   = buildBookshelf();
  const fridge      = buildMiniFridge();
  const floorLamp   = buildFloorLamp();
  const neonSign    = buildNeonSign();
  const rug         = buildRug();

  const posters = [
    buildPoster(-2.5, 2.0, -2.99, 0xff006e, 0x9b00ff, 'NEON RUNNER',  0),
    buildPoster(-1.4, 2.0, -2.99, 0x00e5ff, 0xff006e, 'PIXEL QUEST',  1),
    buildPoster(-0.3, 2.0, -2.99, 0x9b00ff, 0x00e5ff, 'STAR ARCADE',  2)
  ];

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  scene.add(
    arcadeLeft, arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, fridge, floorLamp,
    neonSign, rug, ...posters
  );

  return { arcadeLeft, arcadeRight, desk, posters };
}
```

- [ ] **Step 4: Verify**

Run: `npm run dev`
Expected: glowing pink "GAME / ROOM" sign on the back wall above the desk; concentric neon ring rug centred on the floor.

- [ ] **Step 5: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat: add neon GAME ROOM sign and concentric rug"
```

---

## Task 10: Add magical pedestal + book

**Files:**
- Modify: `src/scene/objects.js`

- [ ] **Step 1: Add `buildPedestal` function**

Insert above `createObjects`:

```js
function buildPedestal() {
  const group = new THREE.Group();
  group.position.set(-2.8, 0, 2.6);

  // Column
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 1.0, 12),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  column.position.y = 0.5;
  column.castShadow = true;
  group.add(column);

  // Top plate
  const topPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.04, 12),
    new THREE.MeshLambertMaterial({ color: 0x0a1a28 })
  );
  topPlate.position.y = 1.02;
  group.add(topPlate);

  // Glow ring
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.012, 8, 24),
    new THREE.MeshStandardMaterial({
      color: 0x9b00ff, emissive: 0x9b00ff, emissiveIntensity: 1.4
    })
  );
  glowRing.position.y = 1.04;
  glowRing.rotation.x = -Math.PI / 2;
  group.add(glowRing);

  // Pedestal point light
  const halo = new THREE.PointLight(0x9b00ff, 0.6, 2.5);
  halo.position.y = 1.2;
  group.add(halo);

  // Book group (will bob)
  const bookGroup = new THREE.Group();
  bookGroup.position.y = 1.18;

  const pageMat = new THREE.MeshStandardMaterial({
    color: 0xf5d0a9, emissive: 0xffd166, emissiveIntensity: 0.4
  });

  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.22), pageMat);
  leftPage.position.set(-0.095, 0.04, 0);
  leftPage.rotation.z = -0.08;
  bookGroup.add(leftPage);

  const rightPage = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.22), pageMat);
  rightPage.position.set(0.095, 0.04, 0);
  rightPage.rotation.z = 0.08;
  bookGroup.add(rightPage);

  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.012, 0.22),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  spine.position.set(0, 0.035, 0);
  bookGroup.add(spine);

  group.add(bookGroup);

  group.userData = {
    clickable: true,
    hotspot: 'pedestal',
    action: 'openBook',
    bookGroup
  };

  return group;
}
```

- [ ] **Step 2: Add pedestal to `createObjects`**

Update `createObjects`:

```js
export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(-2.5, 0xff006e);
  const arcadeRight = buildArcadeCabinet(2.5,  0x00e5ff);
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);
  const desk        = buildDesk();
  const chair       = buildGamingChair();
  const bookshelf   = buildBookshelf();
  const fridge      = buildMiniFridge();
  const floorLamp   = buildFloorLamp();
  const neonSign    = buildNeonSign();
  const rug         = buildRug();
  const pedestal    = buildPedestal();

  const posters = [
    buildPoster(-2.5, 2.0, -2.99, 0xff006e, 0x9b00ff, 'NEON RUNNER',  0),
    buildPoster(-1.4, 2.0, -2.99, 0x00e5ff, 0xff006e, 'PIXEL QUEST',  1),
    buildPoster(-0.3, 2.0, -2.99, 0x9b00ff, 0x00e5ff, 'STAR ARCADE',  2)
  ];

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  scene.add(
    arcadeLeft, arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, fridge, floorLamp,
    neonSign, rug, pedestal, ...posters
  );

  return { arcadeLeft, arcadeRight, desk, posters, pedestal };
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`
Expected: a teal stone pedestal in the front-left corner with a purple glow ring on top and an open parchment book floating above. Book doesn't bob yet — that comes in Task 11.

- [ ] **Step 4: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat: add magical pedestal with floating parchment book"
```

---

## Task 11: Wire `sceneUpdate`, navigation hotspots, and clickable objects

**Files:**
- Modify: `src/scene/objects.js` (add `sceneUpdate`)
- Modify: `src/navigation.js` (new hotspots, `openBook` action route)
- Modify: `src/main.js` (register `sceneUpdate`, push new clickables)
- Modify: `src/tests/navigation.test.js` (test new hotspots)

- [ ] **Step 1: Write a failing test for the new hotspots**

In `src/tests/navigation.test.js`, change the existing import line at the top from:

```js
import { createNavigationState } from '../navigation.js';
```

to:

```js
import { createNavigationState, HOTSPOTS } from '../navigation.js';
```

Then append a new `describe` block at the bottom of the file (after the closing `});` of the existing block):

```js
describe('HOTSPOTS', () => {
  it('includes desk hotspot', () => {
    expect(HOTSPOTS.desk).toBeDefined();
    expect(HOTSPOTS.desk.label).toBe('Gaming Desk');
  });

  it('includes pedestal hotspot', () => {
    expect(HOTSPOTS.pedestal).toBeDefined();
    expect(HOTSPOTS.pedestal.label).toBe('Magic Tome');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: 2 new tests fail with "Cannot read properties of undefined (reading 'label')".

- [ ] **Step 3: Add `desk` and `pedestal` hotspots to `src/navigation.js`**

In `src/navigation.js`, replace the `HOTSPOTS` constant with:

```js
export const HOTSPOTS = {
  overview:       { position: { x: 0,    y: 6,   z: 10 }, target: { x: 0,    y: 1,   z: 0 }, label: 'Overview' },
  'arcade-left':  { position: { x: -2.5, y: 2.5, z: 4  }, target: { x: -2.5, y: 1.5, z: 0 }, label: 'Left Arcade' },
  'arcade-right': { position: { x: 2.5,  y: 2.5, z: 4  }, target: { x: 2.5,  y: 1.5, z: 0 }, label: 'Right Arcade' },
  'wall-left':    { position: { x: -1,   y: 2,   z: 0  }, target: { x: -3.5, y: 1.5, z: 0 }, label: 'Left Wall' },
  'wall-right':   { position: { x: 1,    y: 2,   z: 0  }, target: { x: 3.5,  y: 1.5, z: 0 }, label: 'Right Wall' },
  desk:           { position: { x: 1.8,  y: 1.5, z: -0.6 }, target: { x: 1.8,  y: 1.2, z: -2.6 }, label: 'Gaming Desk' },
  pedestal:       { position: { x: -2.0, y: 1.4, z: 1.6  }, target: { x: -2.8, y: 1.2, z: 2.6  }, label: 'Magic Tome' },
  exit:           { position: { x: 0,    y: 2,   z: 5  }, target: { x: 0,    y: 1,   z: 3 }, label: 'Exit' }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all 8 tests pass.

- [ ] **Step 5: (no-op — `openBook` action is added in Task 13 once `ui.openBook` exists)**

Skip this step. The `openBook` action handler is added in Task 13 step 7 to avoid a runtime error in the gap between this task and Task 13.

- [ ] **Step 6: Add `sceneUpdate` to `src/scene/objects.js`**

At the bottom of `createObjects`, before the `return`, add:

```js
  // ── Animation: spin globe + bob book ──
  const globeMesh = desk.userData.globeMesh;
  const bookGroup = pedestal.userData.bookGroup;
  let elapsed = 0;
  function sceneUpdate(delta) {
    elapsed += delta;
    if (globeMesh) globeMesh.rotation.y += delta * 0.3;
    if (bookGroup) {
      bookGroup.position.y = 1.18 + Math.sin(elapsed * 1.5) * 0.04;
      bookGroup.rotation.y += delta * 0.2;
    }
  }
```

And update the return:

```js
  return { arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate };
```

- [ ] **Step 7: Wire `sceneUpdate` and new clickables in `src/main.js`**

Find the section that creates objects (around lines 56–67). Replace with:

```js
createRoom(scene);
const { arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate } = createObjects(scene);
addUpdateCallback(sceneUpdate);
const gatekeeper = createGatekeeper(scene);
addUpdateCallback(gatekeeper.update);
const panels = createPanels(scene);

const clickableObjects = [
  ...arcadeLeft.children, ...arcadeRight.children,
  gatekeeper.group, ...gatekeeper.group.children,
  ...panels,
  desk, ...posters,
  pedestal
];
```

(`raycaster.intersectObjects(..., true)` already recurses into children, and the click walker walks parent chains to find the nearest `clickable` ancestor — so passing the `desk` and `pedestal` group roots is enough to make their inner clickable meshes work.)

- [ ] **Step 8: Run tests + dev server**

Run: `npm test` (8 tests pass)
Run: `npm run dev`
Expected: globe on the desk slowly rotates, book on the pedestal gently bobs and rotates. Clicking the desk flies the camera in. Clicking the left desk monitor opens the panel drawer. Clicking the globe opens its panel. Clicking the pedestal currently only flies the camera in (no overlay yet — that's wired in Task 13).

- [ ] **Step 9: Commit**

```bash
git add src/scene/objects.js src/navigation.js src/main.js src/tests/navigation.test.js
git commit -m "feat: add desk + pedestal hotspots and scene animation callback"
```

---

## Task 12: Restyle CSS UI

**Files:**
- Modify: `styles/main.css`

- [ ] **Step 1: Replace `styles/main.css` with the neon palette version**

```css
/* styles/main.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #050d14;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #90e0ef;
}

#gallery-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  cursor: default;
}

/* ── HUD ────────────────────────────────────────── */
#breadcrumb {
  position: fixed;
  top: 16px;
  left: 16px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #90e0ef;
  pointer-events: none;
}

#back-btn {
  position: fixed;
  top: 38px;
  left: 16px;
  background: rgba(5,13,20,0.6);
  border: 1px solid #00e5ff;
  color: #00e5ff;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s, color 0.2s;
}
#back-btn:hover { background: #00e5ff; color: #050d14; }

#inventory-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  background: rgba(5,13,20,0.6);
  border: 1px solid #00e5ff;
  color: #00e5ff;
  padding: 8px 18px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 0.05em;
  transition: background 0.2s, color 0.2s;
}
#inventory-btn:hover { background: #00e5ff; color: #050d14; }

/* ── Hotspot hints ──────────────────────────────── */
#hotspot-hints { position: fixed; top: 0; left: 0; pointer-events: none; }

.hotspot-hint {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255,209,102,0.4);
  border: 2px solid #ffd166;
  transform: translate(-50%, -50%);
  animation: pulse 1.8s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
  50%       { transform: translate(-50%, -50%) scale(1.4); opacity: 0.3; }
}

/* ── Panel drawer ───────────────────────────────── */
#panel-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  height: 100vh;
  background: rgba(10,26,40,0.97);
  border-left: 1px solid #00e5ff;
  box-shadow: 0 0 14px rgba(0,229,255,0.35);
  padding: 24px;
  transform: translateX(100%);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
}
#panel-drawer.open { transform: translateX(0); }

#drawer-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #90e0ef;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
}

#drawer-content h2 { font-size: 18px; margin-bottom: 12px; margin-top: 8px; color: #ffd166; }
#drawer-content p  { font-size: 14px; line-height: 1.6; color: #90e0ef; margin-bottom: 12px; }

/* ── Inventory overlay ──────────────────────────── */
#inventory-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5,13,20,0.93);
  display: flex;
  align-items: center;
  justify-content: center;
}
#inventory-overlay.hidden { display: none; }

#inventory-content {
  background: rgba(10,26,40,0.97);
  border: 1px solid #00e5ff;
  box-shadow: 0 0 20px rgba(0,229,255,0.3);
  border-radius: 12px;
  padding: 32px;
  width: 480px;
  max-width: calc(100vw - 32px);
  position: relative;
  color: #90e0ef;
}

#inventory-close {
  position: absolute;
  top: 14px;
  right: 18px;
  background: none;
  border: none;
  color: #90e0ef;
  font-size: 22px;
  cursor: pointer;
}

/* ── Utility ────────────────────────────────────── */
.hidden { display: none !important; }
```

(Note: chat styles intentionally left out — they'll be replaced wholesale in Task 14. Same for book overlay in Task 13.)

- [ ] **Step 2: Verify**

Run: `npm run dev`
Expected: HUD buttons are teal-outlined and fill in on hover, breadcrumb is teal, panel drawer has a teal glowing left border, inventory has teal accent. Chat panel will look broken (no styles) — that's fine, fixed in Task 14.

- [ ] **Step 3: Commit**

```bash
git add styles/main.css
git commit -m "feat: restyle HUD/drawer/inventory with neon palette"
```

---

## Task 13: Book overlay (HTML, JS, CSS, tests)

**Files:**
- Modify: `index.html`
- Modify: `src/ui.js`
- Modify: `styles/main.css`
- Create: `src/tests/ui.test.js`
- Modify: `src/navigation.js` (re-enable `openBook` action)

- [ ] **Step 1: Add book overlay markup to `index.html`**

Insert before `<script type="module" src="/src/main.js"></script>`:

```html
  <div id="book-overlay" class="hidden">
    <div id="book-container">
      <button id="book-close" class="book-close">×</button>
      <div id="book-page-left" class="book-page"></div>
      <div id="book-page-right" class="book-page"></div>
      <button id="book-prev" class="book-nav">‹</button>
      <button id="book-next" class="book-nav">›</button>
    </div>
  </div>
```

- [ ] **Step 2: Write a failing test for `BOOK_PAGES` and page navigation**

Create `src/tests/ui.test.js`:

```js
// src/tests/ui.test.js
import { describe, it, expect } from 'vitest';
import { BOOK_PAGES, getNextPageIndex, getPrevPageIndex } from '../ui.js';

describe('Book overlay', () => {
  it('exposes at least 3 pages', () => {
    expect(BOOK_PAGES.length).toBeGreaterThanOrEqual(3);
  });

  it('each page has left and right HTML', () => {
    for (const page of BOOK_PAGES) {
      expect(typeof page.left).toBe('string');
      expect(typeof page.right).toBe('string');
    }
  });

  it('getNextPageIndex clamps at last page', () => {
    expect(getNextPageIndex(0)).toBe(1);
    expect(getNextPageIndex(BOOK_PAGES.length - 1)).toBe(BOOK_PAGES.length - 1);
  });

  it('getPrevPageIndex clamps at zero', () => {
    expect(getPrevPageIndex(2)).toBe(1);
    expect(getPrevPageIndex(0)).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: 4 new tests fail with import errors (`BOOK_PAGES` not exported).

- [ ] **Step 4: Add book overlay logic to `src/ui.js`**

At the top of `src/ui.js` (after the `escapeHtml` function), add:

```js
export const BOOK_PAGES = [
  {
    left:  '<h2>The Codex of Digital Narratives</h2><p>In the beginning, stories were carved into stone, etched in clay, whispered around fires.</p>',
    right: '<p>Then came the printing press, and tales spread on paper wings across continents.</p>'
  },
  {
    left:  '<p>Now, narratives unfurl across screens, weaving through pixels and code.</p><p>Every link, every choice, every algorithm shapes the tale.</p>',
    right: '<p>The Centre for Digital Narrative studies these new storytelling realms — where reader becomes co-author, where stories adapt to their audience.</p>'
  },
  {
    left:  '<p>Hypertext, interactive fiction, generative AI, virtual worlds, augmented reality…</p><p>The form keeps shifting, but the human need to tell and hear stories endures.</p>',
    right: '<p>Welcome, traveller, to this gallery of digital tales.</p><p class="book-end">— Fin —</p>'
  }
];

export function getNextPageIndex(current) {
  return Math.min(current + 1, BOOK_PAGES.length - 1);
}

export function getPrevPageIndex(current) {
  return Math.max(current - 1, 0);
}
```

- [ ] **Step 5: Add book overlay open/close/render inside `createUI`**

Inside `createUI`, after the inventory section and before "Global Escape key", add:

```js
  // ── Book overlay ─────────────────────────────────
  const bookOverlay  = document.getElementById('book-overlay');
  const bookPageL    = document.getElementById('book-page-left');
  const bookPageR    = document.getElementById('book-page-right');
  const bookPrev     = document.getElementById('book-prev');
  const bookNext     = document.getElementById('book-next');
  const bookClose    = document.getElementById('book-close');

  let bookPageIndex = 0;

  function renderBookPage() {
    bookPageL.innerHTML = BOOK_PAGES[bookPageIndex].left;
    bookPageR.innerHTML = BOOK_PAGES[bookPageIndex].right;
    bookPrev.disabled = bookPageIndex === 0;
    bookNext.disabled = bookPageIndex === BOOK_PAGES.length - 1;
  }

  function openBook() {
    bookPageIndex = 0;
    renderBookPage();
    bookOverlay.classList.remove('hidden');
  }

  function closeBook() {
    bookOverlay.classList.add('hidden');
  }

  bookPrev.addEventListener('click',  () => { bookPageIndex = getPrevPageIndex(bookPageIndex); renderBookPage(); });
  bookNext.addEventListener('click',  () => { bookPageIndex = getNextPageIndex(bookPageIndex); renderBookPage(); });
  bookClose.addEventListener('click', closeBook);
  bookOverlay.addEventListener('click', (e) => { if (e.target === bookOverlay) closeBook(); });
```

Update the Escape key handler to also close the book:

```js
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanelDrawer();
      closeGatekeeperChat();
      closeInventory();
      closeBook();
    }
  });
```

Update the return statement at the bottom of `createUI`:

```js
  return {
    updateHUD,
    openPanelDrawer,
    openGatekeeperChat,
    openInventory,
    openBook,
    updateHints
  };
```

(You'll also need to import the helpers at the top of `ui.js` — but they're defined in the same file in step 4, so no import needed.)

- [ ] **Step 6: Add book overlay CSS to `styles/main.css`**

Append to the bottom of `styles/main.css`:

```css
/* ── Book overlay ───────────────────────────────── */
#book-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5,13,20,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
#book-overlay.hidden { display: none; }

#book-container {
  position: relative;
  display: flex;
  width: min(1100px, 95vw);
  height: min(700px, 85vh);
  gap: 8px;
}

.book-page {
  flex: 1;
  background: linear-gradient(180deg, #f5e6c8, #e8d4a8);
  border: 1px solid #ffd166;
  box-shadow:
    0 0 30px rgba(255,209,102,0.4),
    inset 0 0 40px rgba(255,209,102,0.2);
  padding: 48px 56px;
  font-family: 'Georgia', serif;
  color: #3a2818;
  line-height: 1.7;
  font-size: 17px;
  border-radius: 4px;
  overflow-y: auto;
}

.book-page h2 {
  font-size: 26px;
  margin-bottom: 16px;
  color: #5a3a18;
}

.book-page p { margin-bottom: 14px; }

.book-page .book-end {
  text-align: center;
  font-style: italic;
  margin-top: 32px;
  color: #8a5a28;
}

.book-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: 2px solid #ffd166;
  color: #ffd166;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.book-nav:hover:not(:disabled) { background: #ffd166; color: #050d14; }
.book-nav:disabled { opacity: 0.3; cursor: not-allowed; }

#book-prev { left: -60px; }
#book-next { right: -60px; }

.book-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: transparent;
  border: none;
  color: #ffd166;
  font-size: 32px;
  cursor: pointer;
  line-height: 1;
}
```

- [ ] **Step 7: Add the `openBook` action route to `src/navigation.js`**

In `src/navigation.js`, find `setupClickHandler`. Add the new `openBook` line so the dispatch block reads:

```js
    if (hotspot)                     nav.goTo(hotspot);
    if (action === 'openGatekeeper') ui.openGatekeeperChat();
    if (action === 'openPanel')      ui.openPanelDrawer(panelId, panelTitle);
    if (action === 'openBook')       ui.openBook();
```

- [ ] **Step 8: Run tests + dev server and verify**

Run: `npm test`
Expected: all 12 tests pass.

Run: `npm run dev`
Expected: clicking the floating book on the pedestal opens a full-screen overlay with two parchment pages. Prev/Next buttons cycle through 3 pages. Escape closes it. Clicking outside the book closes it.

- [ ] **Step 9: Commit**

```bash
git add index.html src/ui.js styles/main.css src/navigation.js src/tests/ui.test.js
git commit -m "feat: add magical book overlay with flippable pages"
```

---

## Task 14: Wizard chat rework (text input + speech bubble + keyword answers)

**Files:**
- Modify: `index.html`
- Modify: `src/ui.js`
- Modify: `styles/main.css`
- Modify: `src/tests/ui.test.js`

- [ ] **Step 1: Add chat input markup to `index.html`**

Replace the existing `#gatekeeper-chat` block:

```html
  <div id="gatekeeper-chat" class="hidden">
    <button id="chat-close">×</button>
    <div id="chat-messages"></div>
    <div id="chat-chips"></div>
  </div>
```

with:

```html
  <div id="gatekeeper-chat" class="hidden">
    <button id="chat-close">×</button>
    <div id="chat-messages"></div>
    <div id="chat-chips"></div>
    <div id="chat-input-row">
      <input id="chat-input" type="text" placeholder="Ask me anything…" autocomplete="off" />
      <button id="chat-send">Send</button>
    </div>
  </div>
```

- [ ] **Step 2: Write a failing test for `answer()` keyword matching**

Append to `src/tests/ui.test.js`:

```js
import { answer } from '../ui.js';

describe('Gatekeeper answer()', () => {
  it('returns CDN reply for "cdn" keyword', () => {
    expect(answer('Tell me about CDN')).toMatch(/Centre for Digital Narrative/);
  });

  it('returns XP reply for "xp" keyword', () => {
    expect(answer('how do I earn xp?')).toMatch(/XP/);
  });

  it('returns book reply for "book" keyword', () => {
    expect(answer('what is the book?')).toMatch(/Codex/);
  });

  it('returns fallback for unknown question', () => {
    expect(answer('what colour is the sky?')).toMatch(/still learning/);
  });

  it('is case-insensitive', () => {
    expect(answer('CDN')).toEqual(answer('cdn'));
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: 5 new tests fail (`answer` not exported).

- [ ] **Step 4: Export `answer()` from `src/ui.js`**

Add near the top of `src/ui.js` (alongside `BOOK_PAGES`):

```js
const KEYWORD_RESPONSES = [
  { keys: ['xp', 'level', 'experience'], reply: 'Earn XP by exploring rooms and reading panels. Each discovery counts!' },
  { keys: ['cdn', 'centre', 'narrative'], reply: 'CDN is the Centre for Digital Narrative at UiB — we study how digital tech shapes stories.' },
  { keys: ['arcade', 'game'],             reply: 'The arcades hold interactive CDN research. Click them to fly in!' },
  { keys: ['book', 'tome', 'lore', 'codex'], reply: 'Ah, the Codex! Visit the magical pedestal in the corner to read its secrets.' },
  { keys: ['globe', 'world', 'map'],      reply: 'The desk globe shows CDN\'s international research connections.' },
  { keys: ['hi', 'hello', 'hey'],         reply: 'Hello, curious visitor! Ask me anything about this gallery.' }
];

export function answer(question) {
  const q = question.toLowerCase();
  for (const { keys, reply } of KEYWORD_RESPONSES) {
    if (keys.some(k => q.includes(k))) return reply;
  }
  return "I'm still learning about that one. Try asking about XP, CDN, the arcades, or the magical book!";
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all 17 tests pass.

- [ ] **Step 6: Rework `openGatekeeperChat` and add `sendChatMessage` in `src/ui.js`**

Inside `createUI`, replace the existing gatekeeper chat section (`openGatekeeperChat`, the `GATEKEEPER_RESPONSES` constant, and chip handler) with:

```js
  // ── Gatekeeper chat (speech bubble + free-form input) ──
  const SUGGESTED_QUESTIONS = [
    "What's in this room?",
    "How do I earn XP?",
    "Tell me about CDN"
  ];

  const chatInput = document.getElementById('chat-input');
  const chatSend  = document.getElementById('chat-send');

  function appendChatMessage(text, role) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function sendChatMessage(text) {
    if (!text.trim()) return;
    appendChatMessage(text, 'user');
    appendChatMessage(answer(text), 'gatekeeper');
  }

  function openGatekeeperChat() {
    chatMessages.innerHTML = '';
    appendChatMessage("Hello, curious visitor! I'm your guide. Ask me anything.", 'gatekeeper');

    chatChips.innerHTML = SUGGESTED_QUESTIONS.map(q =>
      `<button class="chat-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`
    ).join('');

    chatChips.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => sendChatMessage(chip.dataset.q));
    });

    gatekeeperChat.classList.remove('hidden');
    requestAnimationFrame(() => gatekeeperChat.classList.add('open'));
  }

  function closeGatekeeperChat() {
    gatekeeperChat.classList.remove('open');
    setTimeout(() => gatekeeperChat.classList.add('hidden'), 300);
  }

  chatClose.addEventListener('click', closeGatekeeperChat);
  chatSend.addEventListener('click', () => {
    sendChatMessage(chatInput.value);
    chatInput.value = '';
  });
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage(chatInput.value);
      chatInput.value = '';
    }
  });
```

- [ ] **Step 7: Anchor the chat to the wizard's screen-space position**

The wizard hovers around `(0, 2.0, -2.2)`. Add this to `createUI`, near `updateHints`:

```js
  // Anchor gatekeeper chat to wizard screen position
  const wizardWorldPos = new THREE.Vector3(0.6, 2.4, -2.2);
  const _chatVec = new THREE.Vector3();

  function updateChatAnchor() {
    if (gatekeeperChat.classList.contains('hidden')) return;
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    _chatVec.copy(wizardWorldPos);
    _chatVec.project(camera);
    const x = (_chatVec.x + 1) / 2 * w;
    const y = (-_chatVec.y + 1) / 2 * h;
    gatekeeperChat.style.left = `${x}px`;
    gatekeeperChat.style.top  = `${y}px`;
  }
```

Update the return statement:

```js
  return {
    updateHUD,
    openPanelDrawer,
    openGatekeeperChat,
    openInventory,
    openBook,
    updateHints,
    updateChatAnchor
  };
```

In `src/main.js`, find the line:

```js
addUpdateCallback(() => ui.updateHints());
```

Replace with:

```js
addUpdateCallback(() => { ui.updateHints(); ui.updateChatAnchor(); });
```

- [ ] **Step 8: Add chat speech-bubble CSS to `styles/main.css`**

Append:

```css
/* ── Gatekeeper chat (speech bubble) ────────────── */
#gatekeeper-chat {
  position: fixed;
  width: 320px;
  background: rgba(10,26,40,0.97);
  border: 1px solid #9b00ff;
  box-shadow: 0 0 18px rgba(155,0,255,0.4);
  border-radius: 12px;
  padding: 16px;
  opacity: 0;
  transform: translate(20px, -100%);
  transition: opacity 0.25s;
  z-index: 50;
}
#gatekeeper-chat.open { opacity: 1; }
#gatekeeper-chat.hidden { display: none; }

#gatekeeper-chat::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 30px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 12px solid #9b00ff;
}
#gatekeeper-chat::after {
  content: '';
  position: absolute;
  left: -10px;
  top: 31px;
  width: 0;
  height: 0;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  border-right: 11px solid rgba(10,26,40,0.97);
}

#chat-close {
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  color: #90e0ef;
  font-size: 20px;
  cursor: pointer;
}

#chat-messages {
  min-height: 60px;
  max-height: 200px;
  margin-bottom: 12px;
  overflow-y: auto;
}

.chat-msg {
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 85%;
  word-wrap: break-word;
}
.chat-msg.gatekeeper { background: #1b3a4b; color: #90e0ef; }
.chat-msg.user       { background: #9b00ff; color: #fff; margin-left: auto; }

#chat-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }

.chat-chip {
  background: transparent;
  border: 1px solid #ff006e;
  color: #ff006e;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.chat-chip:hover { background: #ff006e; color: #050d14; }

#chat-input-row {
  display: flex;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid rgba(0,229,255,0.3);
}

#chat-input {
  flex: 1;
  background: rgba(5,13,20,0.6);
  border: 1px solid #00e5ff;
  color: #90e0ef;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

#chat-send {
  background: #00e5ff;
  border: none;
  color: #050d14;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
}
#chat-send:hover { background: #90e0ef; }
```

- [ ] **Step 9: Verify**

Run: `npm test` (17 tests pass)
Run: `npm run dev`
- Click the wizard → speech bubble appears anchored next to him with a tail pointing left toward him
- Bubble follows the wizard as the camera moves (it should also shift if you navigate)
- Click a chip → adds user message + gatekeeper reply
- Type "tell me about cdn" + Enter → gatekeeper replies with the CDN response
- Type "what's the weather?" → gets the fallback reply
- Press Escape → bubble closes

- [ ] **Step 10: Commit**

```bash
git add index.html src/ui.js src/main.js styles/main.css src/tests/ui.test.js
git commit -m "feat: rework wizard chat as speech bubble with text input"
```

---

## Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: 17 tests pass (6 original navigation + 2 new hotspot + 4 book + 5 chat).

- [ ] **Step 2: Run dev server and walk through everything**

Run: `npm run dev`
Walk-through checklist:
1. Room is dark navy with neon glows; pink/teal/purple point lights cast colored pools.
2. Both arcades restyled with pink/teal screens and neon buttons.
3. Wizard wears a black hat, teal robe, glowing teal specs, gold stars; bobs and rotates.
4. Wall panels have dark navy backgrounds with gold titles.
5. Desk against back wall with two glowing monitors and a slowly spinning globe.
6. Gaming chair in front of desk with neon stripes.
7. Bookshelf on left wall with colourful neon book spines.
8. Mini fridge in back-left corner with teal top strip.
9. Floor lamp by bean bags casting purple light.
10. Three neon-framed posters on the back wall.
11. "GAME ROOM" neon sign glowing pink above the desk.
12. Concentric ring rug centred on the floor.
13. Magical pedestal in front-left corner with floating, bobbing book and purple glow ring.
14. Click left arcade → fly in. Back to overview.
15. Click left desk monitor → fly to desk + open panel. Close drawer.
16. Click globe → opens "CDN International Reach" panel.
17. Click pedestal book → fly to pedestal + book overlay opens with parchment pages, prev/next works.
18. Click wizard → speech bubble appears beside him with text input.
19. Type "tell me about the codex" → gatekeeper replies.
20. Press Escape on each overlay → closes cleanly.

- [ ] **Step 3: Final commit if any cleanups**

```bash
git status
# if anything left over:
git add -A
git commit -m "chore: final cleanup after neon arcade restyle"
```

---

## Task 15: Brighten room with neon ceiling-edge strips and stronger ambient

**Files:**
- Modify: `src/scene/room.js`

User feedback after Task 1 landed: "the room is super dark now add a lot of neon lighting" + reference image of an isometric arcade with bright cyan/pink LED strips wrapping the ceiling perimeter and a strong purple-pink ambient glow.

This task brightens the scene by (a) adding three emissive ceiling-edge strips along the top of the left/right/back walls (one cyan, one purple, one pink), (b) adding three colored fill point lights near the strips, and (c) bumping the ambient light to a stronger purple tint.

- [ ] **Step 1: Bump the ambient light**

In `src/scene/room.js`, find:

```js
const ambient = new THREE.AmbientLight(0x1a3a5c, 0.2);
```

Replace with:

```js
const ambient = new THREE.AmbientLight(0x4a3a8c, 0.55);
```

- [ ] **Step 2: Add ceiling-edge neon strips**

After the existing floor strip block (the `rightStrip` is the last `scene.add` before the function ends), append:

```js
  // ── Ceiling-edge neon strips (LED tape along top of walls) ──
  const ceilingY = 3.45;

  // Left wall top edge — cyan, runs along z (room depth = 6)
  const sideStripGeom = new THREE.BoxGeometry(6, 0.04, 0.08);

  const leftCeilMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.6
  });
  const leftCeilStrip = new THREE.Mesh(sideStripGeom, leftCeilMat);
  leftCeilStrip.rotation.y = Math.PI / 2;
  leftCeilStrip.position.set(-3.45, ceilingY, 0);
  scene.add(leftCeilStrip);

  // Right wall top edge — purple, runs along z
  const rightCeilMat = new THREE.MeshStandardMaterial({
    color: 0x9b00ff, emissive: 0x9b00ff, emissiveIntensity: 1.6
  });
  const rightCeilStrip = new THREE.Mesh(sideStripGeom, rightCeilMat);
  rightCeilStrip.rotation.y = -Math.PI / 2;
  rightCeilStrip.position.set(3.45, ceilingY, 0);
  scene.add(rightCeilStrip);

  // Back wall top edge — pink, runs along x (room width = 7)
  const backStripGeom = new THREE.BoxGeometry(7, 0.04, 0.08);
  const backCeilMat = new THREE.MeshStandardMaterial({
    color: 0xff006e, emissive: 0xff006e, emissiveIntensity: 1.6
  });
  const backCeilStrip = new THREE.Mesh(backStripGeom, backCeilMat);
  backCeilStrip.position.set(0, ceilingY, -2.96);
  scene.add(backCeilStrip);
```

- [ ] **Step 3: Add coloured fill point lights near each ceiling strip**

After the ceiling strips, append:

```js
  // ── Coloured fill lights near each ceiling strip ──
  const cyanFill = new THREE.PointLight(0x00e5ff, 1.2, 10);
  cyanFill.position.set(-3.0, 3.2, 0);
  scene.add(cyanFill);

  const purpleFill = new THREE.PointLight(0x9b00ff, 1.2, 10);
  purpleFill.position.set(3.0, 3.2, 0);
  scene.add(purpleFill);

  const pinkFill = new THREE.PointLight(0xff006e, 1.2, 10);
  pinkFill.position.set(0, 3.2, -2.5);
  scene.add(pinkFill);
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: 6/6 navigation tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/scene/room.js
git commit -m "feat: brighten room with ceiling-edge neon strips and fill lights"
```

---

## Completion

All tasks complete. The gallery now has:
- Full neon-arcade-on-ocean-night styling
- 9 new decor objects (desk + monitors + globe, chair, bookshelf, fridge, lamp, posters, sign, rug, pedestal + book)
- 2 new clickable hotspots (`desk`, `pedestal`)
- Magical book overlay with flippable parchment pages
- Wizard chatbot reworked as a speech bubble anchored to the wizard with free-form text input and keyword-matching answers
