# Enter Portal Label Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the faint floating "▸ ENTER PORTAL ◂" label with a high-contrast glowing pill (dark backdrop, cyan border, white text) that pulses subtly so it stays readable against any scene background.

**Architecture:** Single-file change to `src/scene/objects.js`. Redraw the label canvas at 4× resolution with a rounded-rect backdrop drawn first, then white text on top. Expose the label mesh on `portal.userData.label` so the existing `sceneUpdate()` animation loop can pulse its opacity using the already-tracked `elapsed` timer.

**Tech Stack:** Three.js (CanvasTexture, MeshBasicMaterial, PlaneGeometry), Canvas 2D API (`roundRect`, shadow blur, fillText/strokeRect).

**Spec:** `docs/superpowers/specs/2026-04-30-enter-portal-label-visibility-design.md`

**GitHub issue:** [#88](https://github.com/VeJoTo/cdn-gallery/issues/88)

**Branch:** `fix/enter-portal-visibility` (already created off master, contains the spec commit)

---

### Task 1: Redraw the label as a glowing pill

**Files:**
- Modify: `src/scene/objects.js:103-121` (the `// "PORTAL" label above` block inside `buildPortal()`)

- [ ] **Step 1: Replace the label block**

Find the existing block (lines 103-121):

```js
  // "PORTAL" label above
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256;
  labelCanvas.height = 48;
  const lctx = labelCanvas.getContext("2d");
  lctx.clearRect(0, 0, 256, 48);
  lctx.shadowColor = "#00d4ff";
  lctx.shadowBlur = 8;
  lctx.font = "bold 24px 'Octosquares', sans-serif";
  lctx.fillStyle = "#00d4ff";
  lctx.textAlign = "center";
  lctx.fillText("▸ ENTER PORTAL ◂", 128, 32);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.15),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }),
  );
  label.position.set(0, 1.35, 0.01);
  group.add(label);
```

Replace it with:

```js
  // "ENTER PORTAL" label — glowing pill above the portal
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const lctx = labelCanvas.getContext("2d");
  lctx.clearRect(0, 0, 512, 128);

  // Pill backdrop (drawn first so text sits on top)
  const pillInset = 8;
  lctx.shadowColor = "#00d4ff";
  lctx.shadowBlur = 20;
  lctx.fillStyle = "rgba(5, 10, 20, 0.85)";
  lctx.strokeStyle = "#00d4ff";
  lctx.lineWidth = 3;
  lctx.beginPath();
  lctx.roundRect(
    pillInset,
    pillInset,
    512 - pillInset * 2,
    128 - pillInset * 2,
    16,
  );
  lctx.fill();
  lctx.stroke();

  // Text on top
  lctx.shadowColor = "#00d4ff";
  lctx.shadowBlur = 16;
  lctx.font = "bold 44px 'Octosquares', sans-serif";
  lctx.fillStyle = "#ffffff";
  lctx.textAlign = "center";
  lctx.textBaseline = "middle";
  lctx.fillText("▸ ENTER PORTAL ◂", 256, 64);

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.3),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }),
  );
  label.position.set(0, 1.45, 0.01);
  group.add(label);
```

- [ ] **Step 2: Expose the label on `userData` so the animation loop can reach it**

Find the `group.userData = { ... }` block a few lines below (currently around line 140-145):

```js
  group.userData = {
    clickable: true,
    action: "enterNatureRoom",
    rings,
    innerGlow,
  };
```

Change it to include `label`:

```js
  group.userData = {
    clickable: true,
    action: "enterNatureRoom",
    rings,
    innerGlow,
    label,
  };
```

- [ ] **Step 3: Verify the dev build still loads**

Run: `npm run dev` (Vite dev server).
Open the gallery in a browser, navigate to where the portal is visible.
Expected: portal renders with the new pill-shaped label above it. White text "▸ ENTER PORTAL ◂" inside a dark rounded rectangle with a cyan border and glow. **Label is static (no pulse yet).** No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat(portal): redraw ENTER PORTAL label as glowing pill (#88)"
```

---

### Task 2: Add the breathing-opacity pulse

**Files:**
- Modify: `src/scene/objects.js` — `sceneUpdate()` inside the exported `addExtraObjects` function (currently around lines 1120-1133)

- [ ] **Step 1: Add the opacity pulse line**

Find the existing `sceneUpdate` block:

```js
  let elapsed = 0;
  function sceneUpdate(delta) {
    elapsed += delta;
    for (const ring of portal.userData.rings) {
      ring.rotation.z += ring.userData.spinSpeed * delta;
    }
    portal.userData.innerGlow.material.emissiveIntensity =
      0.15 + Math.sin(elapsed * 2) * 0.1;

    pedestal.userData.updateSmoke(delta);
    pedestal.userData.updateCubeSmoke(delta);

    arcade.userData.mixer?.update(delta);
  }
```

Add one line right after the `innerGlow` pulse so the label breathes on the same `elapsed` clock:

```js
  let elapsed = 0;
  function sceneUpdate(delta) {
    elapsed += delta;
    for (const ring of portal.userData.rings) {
      ring.rotation.z += ring.userData.spinSpeed * delta;
    }
    portal.userData.innerGlow.material.emissiveIntensity =
      0.15 + Math.sin(elapsed * 2) * 0.1;
    portal.userData.label.material.opacity =
      0.85 + Math.sin(elapsed * 1.5) * 0.15;

    pedestal.userData.updateSmoke(delta);
    pedestal.userData.updateCubeSmoke(delta);

    arcade.userData.mixer?.update(delta);
  }
```

- [ ] **Step 2: Verify the pulse in the browser**

Run: `npm run dev` if not already running — Vite hot-reloads otherwise.
Watch the label for ~10 seconds.
Expected: opacity breathes smoothly between roughly 0.70 and 1.00 over a ~4-second cycle. No flicker, no jump, the pill stays legible at every point in the cycle.

- [ ] **Step 3: Run the spec's manual test pass**

From `docs/superpowers/specs/2026-04-30-enter-portal-label-visibility-design.md` — verify all five points:

1. Walk to portal area: label clearly readable.
2. Stand close, partially overlapping the portal glow: label still legible.
3. View from across the room: pill silhouette and text remain visible.
4. ~5 seconds of watching: opacity breathes smoothly.
5. Click the portal: existing `enterNatureRoom` action still fires (clickTarget unchanged).

If any point fails, stop and report back before committing.

- [ ] **Step 4: Commit**

```bash
git add src/scene/objects.js
git commit -m "feat(portal): pulse ENTER PORTAL label opacity (#88)"
```

---

### Task 3: Push branch and open PR

- [ ] **Step 1: Push the branch**

```bash
git push -u origin fix/enter-portal-visibility
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "Fix: Enter portal label visibility (#88)" --body "$(cat <<'EOF'
## Summary
- Redraws the "▸ ENTER PORTAL ◂" label as a high-contrast glowing pill (dark backdrop + cyan border, white text) at 4× canvas resolution
- Adds a subtle opacity breathe (~0.70–1.00 over ~4s) hooked into the existing portal animation loop

Closes #88.

## Test plan
- [ ] Label is clearly readable approaching the portal
- [ ] Label stays legible when standing close to (and partially over) the portal glow
- [ ] Label readable from across the room
- [ ] Opacity breathes smoothly with no flicker
- [ ] Clicking the portal still triggers `enterNatureRoom`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Report the PR URL back**

Print the PR URL output by `gh pr create` so the user can review.

---

## Notes for the implementing engineer

- **Why redraw the canvas instead of restyling the existing one?** The current canvas is 256×48 — too small to draw a clean rounded-rect backdrop *and* large readable text without it looking blurry on the upscaled plane. Bumping to 512×128 and redrawing in a single block is simpler than patching the existing draw calls.
- **Why pulse opacity rather than scale or color?** The material is already `transparent: true`, so changing `material.opacity` is one assignment per frame and reuses the existing animation timer. No new flags, no geometry updates.
- **Don't touch the clickTarget mesh** (the invisible CircleGeometry below the label). It's what receives the actual click — leaving it unchanged keeps the click area the same as the rest of the portal.
- **Don't reposition the portal group itself** (`group.position.set(0, 1.7, 2.95)`). Only the label's local y changed (1.35 → 1.45).
