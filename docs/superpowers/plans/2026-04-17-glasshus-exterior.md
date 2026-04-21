# Glasshus Exterior Entrance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an exterior scene of the CDN glasshus building that serves as the starting point of the gallery experience, with a door transition into the existing AI room.

**Architecture:** New `exterior-room.js` file following the `nature-room.js` pattern. The exterior scene uses a world-space offset (x = -20) to avoid geometry overlap. The player spawns outside, walks up to the glass doors, clicks to enter, and a fade transition takes them into the AI room. Main.js is updated to spawn in the exterior by default and handle the new room transition.

**Tech Stack:** Three.js (existing), canvas textures for sky/grass/sign

---

### File Structure

- **Create:** `src/scene/exterior-room.js` — all glasshus geometry, landscaping, sky, sign, door clickable
- **Modify:** `src/main.js` — import exterior room, change default spawn to exterior, add `'exterior'` to room transition system, add movement bounds for exterior, register clickables
- **Modify:** `src/navigation.js` — add `'enterAIRoom'` action handler (line 169, alongside existing actions)

---

### Task 1: Exterior Room Scaffold — Sky, Ground, and Spawn

**Files:**
- Create: `src/scene/exterior-room.js`

- [ ] **Step 1: Create exterior-room.js with sky dome, ground plane, and paved path**

```js
// src/scene/exterior-room.js
import * as THREE from 'three';

const OFFSET = new THREE.Vector3(-20, 0, 0);

export function createExteriorRoom(scene) {
  const ox = OFFSET.x;

  // ── Overcast Bergen sky dome ──
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 256;
  skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  const skyGrad = sctx.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0, '#7a8899');
  skyGrad.addColorStop(0.3, '#8899aa');
  skyGrad.addColorStop(0.6, '#aabbcc');
  skyGrad.addColorStop(1, '#ccd8e0');
  sctx.fillStyle = skyGrad;
  sctx.fillRect(0, 0, 256, 256);
  // Overcast clouds
  sctx.fillStyle = 'rgba(200,210,220,0.5)';
  sctx.beginPath(); sctx.ellipse(60, 40, 50, 20, 0, 0, Math.PI * 2); sctx.fill();
  sctx.beginPath(); sctx.ellipse(150, 60, 60, 22, 0, 0, Math.PI * 2); sctx.fill();
  sctx.beginPath(); sctx.ellipse(200, 35, 45, 18, 0, 0, Math.PI * 2); sctx.fill();
  sctx.beginPath(); sctx.ellipse(100, 80, 55, 20, 0, 0, Math.PI * 2); sctx.fill();

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(25, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
  );
  sky.position.set(ox, 2, 0);
  scene.add(sky);

  // ── Ground — green grass ──
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256;
  grassCanvas.height = 256;
  const gctx = grassCanvas.getContext('2d');
  gctx.fillStyle = '#3a6a2a';
  gctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 600; i++) {
    const bx = Math.random() * 256;
    const by = Math.random() * 256;
    gctx.strokeStyle = Math.random() > 0.5 ? '#4a8a3a' : '#2a5a1a';
    gctx.lineWidth = 1;
    gctx.beginPath();
    gctx.moveTo(bx, by);
    gctx.lineTo(bx + (Math.random() - 0.5) * 4, by - 3 - Math.random() * 5);
    gctx.stroke();
  }
  const grassTex = new THREE.CanvasTexture(grassCanvas);
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(8, 8);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(ox, 0, 0);
  scene.add(ground);

  // ── Paved path leading to the door ──
  const pathCanvas = document.createElement('canvas');
  pathCanvas.width = 128;
  pathCanvas.height = 128;
  const pctx = pathCanvas.getContext('2d');
  pctx.fillStyle = '#999088';
  pctx.fillRect(0, 0, 128, 128);
  // Stone texture
  for (let i = 0; i < 40; i++) {
    pctx.fillStyle = Math.random() > 0.5 ? '#a09888' : '#8a8278';
    pctx.fillRect(Math.random() * 128, Math.random() * 128, 10 + Math.random() * 20, 10 + Math.random() * 20);
  }
  const pathTex = new THREE.CanvasTexture(pathCanvas);
  pathTex.wrapS = THREE.RepeatWrapping;
  pathTex.wrapT = THREE.RepeatWrapping;
  pathTex.repeat.set(1, 4);
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 10),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.85 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(ox, 0.01, 3);
  scene.add(path);

  // ── Lighting — overcast ambient ──
  const ambientLight = new THREE.AmbientLight(0xb0b8c0, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xcccccc, 0.4);
  dirLight.position.set(ox + 5, 10, 5);
  scene.add(dirLight);

  // Warm interior glow visible through glass
  const interiorGlow = new THREE.PointLight(0xffddaa, 0.8, 8);
  interiorGlow.position.set(ox, 2, -1);
  scene.add(interiorGlow);

  // ── Clickables and return values ──
  const clickables = [];

  return {
    offset: OFFSET,
    clickables
  };
}
```

- [ ] **Step 2: Verify file has no syntax errors**

Run: `cd /Users/vera/Documents/cdn-gallery && node -c src/scene/exterior-room.js`

Expected: No output (syntax OK)

- [ ] **Step 3: Commit**

```bash
git add src/scene/exterior-room.js
git commit -m "feat: exterior room scaffold with sky, ground, path, and lighting"
```

---

### Task 2: Glasshus Structure — Glass Walls, Roof, and Doors

**Files:**
- Modify: `src/scene/exterior-room.js`

- [ ] **Step 1: Add glasshus geometry before the return statement**

Insert before `// ── Clickables and return values ──` in `exterior-room.js`:

```js
  // ── Glasshus structure ──
  const glasshus = new THREE.Group();
  glasshus.position.set(ox, 0, -2);

  // Glass material — transparent with slight tint
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xddeeff,
    transparent: true,
    opacity: 0.3,
    roughness: 0.05,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  // Metal frame material
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.3,
    metalness: 0.6
  });

  const wallHeight = 3.0;
  const wallWidth = 4.0;
  const wallDepth = 3.5;

  // ── Front glass wall (3 panels with mullions) ──
  const panelWidth = wallWidth / 3;
  for (let i = 0; i < 3; i++) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(panelWidth - 0.08, wallHeight - 0.1),
      glassMat
    );
    panel.position.set(-wallWidth / 2 + panelWidth * (i + 0.5), wallHeight / 2, wallDepth / 2);
    glasshus.add(panel);

    // Vertical mullion (skip after last panel)
    if (i < 2) {
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, wallHeight, 0.06),
        frameMat
      );
      mullion.position.set(-wallWidth / 2 + panelWidth * (i + 1), wallHeight / 2, wallDepth / 2);
      glasshus.add(mullion);
    }
  }

  // ── Side glass walls ──
  for (const side of [-1, 1]) {
    const sideWall = new THREE.Mesh(
      new THREE.PlaneGeometry(wallDepth - 0.08, wallHeight - 0.1),
      glassMat
    );
    sideWall.rotation.y = Math.PI / 2;
    sideWall.position.set(side * wallWidth / 2, wallHeight / 2, 0);
    glasshus.add(sideWall);
  }

  // ── Back wall (opaque — this is where AI room connects) ──
  const backWallMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.7
  });
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(wallWidth, wallHeight),
    backWallMat
  );
  backWall.position.set(0, wallHeight / 2, -wallDepth / 2);
  backWall.rotation.y = Math.PI;
  glasshus.add(backWall);

  // ── Frame edges — horizontal beams top and bottom ──
  const beamGeo = new THREE.BoxGeometry(wallWidth + 0.1, 0.08, 0.08);
  const topBeamFront = new THREE.Mesh(beamGeo, frameMat);
  topBeamFront.position.set(0, wallHeight, wallDepth / 2);
  glasshus.add(topBeamFront);

  const bottomBeamFront = new THREE.Mesh(beamGeo, frameMat);
  bottomBeamFront.position.set(0, 0, wallDepth / 2);
  glasshus.add(bottomBeamFront);

  // Side horizontal beams
  const sideBeamGeo = new THREE.BoxGeometry(0.08, 0.08, wallDepth + 0.1);
  for (const side of [-1, 1]) {
    const topBeam = new THREE.Mesh(sideBeamGeo, frameMat);
    topBeam.position.set(side * wallWidth / 2, wallHeight, 0);
    glasshus.add(topBeam);

    const bottomBeam = new THREE.Mesh(sideBeamGeo, frameMat);
    bottomBeam.position.set(side * wallWidth / 2, 0, 0);
    glasshus.add(bottomBeam);
  }

  // ── Corner posts ──
  const postGeo = new THREE.BoxGeometry(0.08, wallHeight, 0.08);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(sx * wallWidth / 2, wallHeight / 2, sz * wallDepth / 2);
      glasshus.add(post);
    }
  }

  // ── Pyramid roof ──
  const roofGeo = new THREE.ConeGeometry(wallWidth * 0.75, 1.5, 4);
  const roofMat = new THREE.MeshPhysicalMaterial({
    color: 0xddeeff,
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, wallHeight + 0.75, 0);
  glasshus.add(roof);

  // Roof frame edges (4 ridge lines from corners to apex)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const ridgeLen = Math.sqrt((wallWidth / 2) ** 2 + 1.5 ** 2);
    const ridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, ridgeLen, 4),
      frameMat
    );
    ridge.position.set(
      Math.cos(angle) * wallWidth * 0.25,
      wallHeight + 0.75,
      Math.sin(angle) * wallWidth * 0.25
    );
    const ridgeAngle = Math.atan2(1.5, wallWidth / 2);
    ridge.rotation.z = ridgeAngle;
    ridge.rotation.y = -angle;
    glasshus.add(ridge);
  }

  scene.add(glasshus);

  // ── Glass doors (clickable) ──
  const doorGroup = new THREE.Group();
  doorGroup.position.set(ox, 0, -2 + wallDepth / 2 + 0.01);

  // Door frame
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 2.4, 0.08),
    frameMat
  );
  doorFrame.position.set(0, 1.2, 0);
  doorGroup.add(doorFrame);

  // Glass door panels (left and right)
  for (const side of [-0.32, 0.32]) {
    const doorPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.58, 2.2),
      new THREE.MeshPhysicalMaterial({
        color: 0xccddee,
        transparent: true,
        opacity: 0.35,
        roughness: 0.05,
        side: THREE.DoubleSide
      })
    );
    doorPanel.position.set(side, 1.1, 0.05);
    doorGroup.add(doorPanel);
  }

  // Invisible click target covering the full door
  const doorClickTarget = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 2.4),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  doorClickTarget.position.set(0, 1.2, 0.06);
  doorClickTarget.userData = {
    clickable: true,
    action: 'enterAIRoom',
    label: 'Enter CDN'
  };
  doorGroup.add(doorClickTarget);

  scene.add(doorGroup);
```

Also update the clickables array and return:

```js
  // ── Clickables and return values ──
  const clickables = [doorClickTarget];

  return {
    offset: OFFSET,
    clickables
  };
```

- [ ] **Step 2: Verify no syntax errors**

Run: `cd /Users/vera/Documents/cdn-gallery && node -c src/scene/exterior-room.js`

Expected: No output (syntax OK)

- [ ] **Step 3: Commit**

```bash
git add src/scene/exterior-room.js
git commit -m "feat: glasshus structure with glass walls, pyramid roof, and clickable doors"
```

---

### Task 3: Flanking Stone Walls, Hedge, and Background Buildings

**Files:**
- Modify: `src/scene/exterior-room.js`

- [ ] **Step 1: Add stone walls, hedge, and background buildings**

Insert after `scene.add(doorGroup);` and before `// ── Clickables and return values ──`:

```js
  // ── Flanking stone walls ──
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x8a8a7a,
    roughness: 0.85
  });

  for (const side of [-1, 1]) {
    const stoneWall = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 3.5, 0.5),
      stoneMat
    );
    stoneWall.position.set(ox + side * 3.2, 1.75, -2);
    scene.add(stoneWall);

    // Side return walls
    const sideReturn = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 3.5, 2),
      stoneMat
    );
    sideReturn.position.set(ox + side * 4.4, 1.75, -3);
    scene.add(sideReturn);
  }

  // ── Hedge in front of the building ──
  const hedgeMat = new THREE.MeshLambertMaterial({ color: 0x5a3a20 });
  for (const side of [-1, 1]) {
    const hedge = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.6, 0.5),
      hedgeMat
    );
    hedge.position.set(ox + side * 2.5, 0.3, 0);
    scene.add(hedge);

    // Some green top growth
    const hedgeTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.2, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x4a6a30 })
    );
    hedgeTop.position.set(ox + side * 2.5, 0.65, 0);
    scene.add(hedgeTop);
  }

  // ── Background white wooden houses ──
  const houseMat = new THREE.MeshStandardMaterial({
    color: 0xf0ece0,
    roughness: 0.7
  });
  const roofHouseMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a,
    roughness: 0.6
  });

  // House 1 — behind left
  const house1 = new THREE.Group();
  const h1body = new THREE.Mesh(new THREE.BoxGeometry(3, 3.5, 3), houseMat);
  h1body.position.y = 1.75;
  house1.add(h1body);
  const h1roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 1.5, 4),
    roofHouseMat
  );
  h1roof.rotation.y = Math.PI / 4;
  h1roof.position.y = 4.25;
  house1.add(h1roof);
  house1.position.set(ox - 6, 0, -6);
  scene.add(house1);

  // House 2 — behind right
  const house2 = new THREE.Group();
  const h2body = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 3.5), houseMat);
  h2body.position.y = 2;
  house2.add(h2body);
  const h2roof = new THREE.Mesh(
    new THREE.ConeGeometry(3, 1.8, 4),
    roofHouseMat
  );
  h2roof.rotation.y = Math.PI / 4;
  h2roof.position.y = 4.9;
  house2.add(h2roof);
  house2.position.set(ox + 5, 0, -7);
  scene.add(house2);

  // House 3 — far behind center
  const house3 = new THREE.Group();
  const h3body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3, 2.5), houseMat);
  h3body.position.y = 1.5;
  house3.add(h3body);
  const h3roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.8, 1.3, 4),
    roofHouseMat
  );
  h3roof.rotation.y = Math.PI / 4;
  h3roof.position.y = 3.65;
  house3.add(h3roof);
  house3.position.set(ox + 0.5, 0, -9);
  scene.add(house3);

  // ── CDN signpost ──
  const signGroup = new THREE.Group();
  signGroup.position.set(ox + 1.5, 0, 2);

  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 2, 8),
    new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5, roughness: 0.4 })
  );
  pole.position.y = 1;
  signGroup.add(pole);

  // Sign panel
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const signCtx = signCanvas.getContext('2d');
  signCtx.fillStyle = '#ffffff';
  signCtx.fillRect(0, 0, 512, 128);
  signCtx.fillStyle = '#1a1a1a';
  signCtx.font = 'bold 28px Arial, sans-serif';
  signCtx.textAlign = 'center';
  signCtx.fillText('Center for Digital Narrative', 256, 55);
  signCtx.font = '20px Arial, sans-serif';
  signCtx.fillStyle = '#555555';
  signCtx.fillText('University of Bergen', 256, 90);
  const signTex = new THREE.CanvasTexture(signCanvas);
  const signPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.3),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signPanel.position.y = 1.8;
  signGroup.add(signPanel);

  scene.add(signGroup);
```

- [ ] **Step 2: Verify no syntax errors**

Run: `cd /Users/vera/Documents/cdn-gallery && node -c src/scene/exterior-room.js`

Expected: No output (syntax OK)

- [ ] **Step 3: Commit**

```bash
git add src/scene/exterior-room.js
git commit -m "feat: add stone walls, hedge, background houses, and CDN signpost"
```

---

### Task 4: Integrate Exterior Room into Main.js

**Files:**
- Modify: `src/main.js`
- Modify: `src/navigation.js`

- [ ] **Step 1: Import exterior room in main.js**

At line 6 (after the nature-room import), add:

```js
import { createExteriorRoom } from './scene/exterior-room.js';
```

- [ ] **Step 2: Create the exterior room and register clickables**

After line 226 (`const natureRoom = createNatureRoom(scene);`) and line 227, add:

```js
// ── Exterior room ──
const exteriorRoom = createExteriorRoom(scene);
clickableObjects.push(...exteriorRoom.clickables);
```

- [ ] **Step 3: Change default spawn to exterior room**

Change line 39 from:
```js
camera.position.set(0, 1.6, 2);
```
to:
```js
camera.position.set(-20, 1.6, 6);
```

Change line 40 from:
```js
camera.lookAt(0, 1.6, 0);
```
to:
```js
camera.lookAt(-20, 1.6, -2);
```

Change line 60 (controls.target) from:
```js
controls.target.set(0, 1.6, 0);
```
to:
```js
controls.target.set(-20, 1.6, -2);
```

- [ ] **Step 4: Change default currentRoom to 'exterior'**

Change line 266 from:
```js
let currentRoom = 'ai'; // 'ai' or 'nature'
```
to:
```js
let currentRoom = 'exterior'; // 'exterior', 'ai', or 'nature'
```

- [ ] **Step 5: Add 'exterior' case to transitionToRoom function**

Replace the `transitionToRoom` function (lines 268-291) with:

```js
function transitionToRoom(targetRoom) {
  // Clear saved zoom position without moving the camera
  nav.clearSaved();
  fadeOverlay.classList.add('active');

  setTimeout(() => {
    if (targetRoom === 'nature') {
      camera.position.set(20, 1.6, -3);
      controls.target.set(20, 1.6, 0);
      currentRoom = 'nature';
      cssRenderer.domElement.style.display = 'none';
    } else if (targetRoom === 'exterior') {
      camera.position.set(-20, 1.6, 6);
      controls.target.set(-20, 1.6, -2);
      currentRoom = 'exterior';
      cssRenderer.domElement.style.display = 'none';
    } else {
      camera.position.set(0, 1.6, 2);
      controls.target.set(0, 1.6, 0);
      currentRoom = 'ai';
      cssRenderer.domElement.style.display = '';
    }
    controls.update();

    setTimeout(() => {
      fadeOverlay.classList.remove('active');
    }, 300);
  }, 600);
}
```

- [ ] **Step 6: Add movement bounds for exterior room**

In the `updateRotation` function, update the movement clamping. Change line 108 from:
```js
    const roomX0 = currentRoom === 'nature' ? 20 : 0;
```
to:
```js
    const roomX0 = currentRoom === 'nature' ? 20 : currentRoom === 'exterior' ? -20 : 0;
```

And change line 127 from:
```js
    const roomX1 = currentRoom === 'nature' ? 20 : 0;
```
to:
```js
    const roomX1 = currentRoom === 'nature' ? 20 : currentRoom === 'exterior' ? -20 : 0;
```

Also update the Z bounds for the exterior room to allow more forward/backward movement. Change lines 110 and 112 (forward/backward clamping) to use room-specific Z bounds:

```js
    const zMin = currentRoom === 'exterior' ? -4 : -2.5;
    const zMax = currentRoom === 'exterior' ? 8 : 2.5;
    camera.position.z = Math.max(zMin, Math.min(zMax, camera.position.z));
    controls.target.z = Math.max(zMin, Math.min(zMax, controls.target.z));
```

Apply the same Z bound changes to the strafe section (lines 129-131):

```js
    const zMin2 = currentRoom === 'exterior' ? -4 : -2.5;
    const zMax2 = currentRoom === 'exterior' ? 8 : 2.5;
    camera.position.z = Math.max(zMin2, Math.min(zMax2, camera.position.z));
    controls.target.z = Math.max(zMin2, Math.min(zMax2, controls.target.z));
```

- [ ] **Step 7: Add 'enterAIRoom' action to navigation.js**

In `src/navigation.js`, after line 170 (`if (action === 'returnToAIRoom')  window.__transitionToRoom('ai');`), add:

```js
    if (action === 'enterAIRoom')    window.__transitionToRoom('ai');
```

- [ ] **Step 8: Update CSS3D visibility logic for exterior room**

In the animate function, change line 161 from:
```js
  const showCSS3D = currentRoom === 'ai' && !facingAway;
```
to:
```js
  const showCSS3D = currentRoom === 'ai' && !facingAway;
```

This line is already correct — CSS3D only shows in the AI room. No change needed.

- [ ] **Step 9: Verify the dev server runs without errors**

Run: `cd /Users/vera/Documents/cdn-gallery && npx vite build 2>&1 | tail -5`

Expected: Build succeeds without errors.

- [ ] **Step 10: Commit**

```bash
git add src/main.js src/navigation.js
git commit -m "feat: integrate exterior room as default spawn with room transitions"
```

---

### Task 5: Visual Testing and Polish

**Files:**
- Possibly modify: `src/scene/exterior-room.js`, `src/main.js`

- [ ] **Step 1: Start dev server and test in browser**

Run: `cd /Users/vera/Documents/cdn-gallery && npx vite --port 5173`

Open `http://localhost:5173/cdn-gallery/` in browser. Verify:
1. Player spawns outside facing the glasshus
2. Sky dome shows overcast grey Bergen sky
3. Green grass ground with stone path visible
4. Glasshus glass walls and pyramid roof are visible
5. Stone walls flank the glasshus
6. White houses visible in background
7. CDN signpost visible near the path
8. Hedge visible in front
9. WASD movement works within exterior bounds
10. Clicking the glass doors triggers fade transition to AI room
11. Inside AI room, everything works as before
12. Portal to nature room still works
13. From nature room, return to AI room still works

- [ ] **Step 2: Adjust positions/sizes if needed based on visual testing**

Make any necessary tweaks to positions, scales, or materials based on how it looks in browser.

- [ ] **Step 3: Commit any adjustments**

```bash
git add src/scene/exterior-room.js src/main.js
git commit -m "fix: polish exterior scene positions and materials after visual testing"
```
