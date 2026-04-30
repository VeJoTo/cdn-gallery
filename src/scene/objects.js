// src/scene/objects.js
import * as THREE from "three";
import { ROOM_WIDTH } from "./room.js";
import { buildTV } from "./tv.js";
import { createSofa } from "./sofa.js";
import { createArcade } from "./arcade.js";
import { createChessTable } from "./chess-table.js";
import { createRadio } from "./radio.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

function buildPortal() {
  const group = new THREE.Group();
  group.position.set(0, 1.7, 2.95);

  // Dark vortex center
  const vortex = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 32),
    new THREE.MeshBasicMaterial({ color: 0x000008 }),
  );
  group.add(vortex);

  // Inner glow disc
  const innerGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 32),
    new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.4,
    }),
  );
  innerGlow.position.z = 0.001;
  group.add(innerGlow);

  // Concentric rings (different sizes, will spin at different speeds)
  const ringDefs = [
    { radius: 0.65, tube: 0.015, speed: 0.3 },
    { radius: 0.75, tube: 0.01, speed: -0.5 },
    { radius: 0.85, tube: 0.02, speed: 0.2 },
    { radius: 0.95, tube: 0.008, speed: -0.4 },
    { radius: 1.05, tube: 0.025, speed: 0.15 },
  ];

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 1.2,
  });

  const rings = [];
  for (const def of ringDefs) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(def.radius, def.tube, 8, 32),
      ringMat.clone(),
    );
    ring.userData.spinSpeed = def.speed;
    group.add(ring);
    rings.push(ring);
  }

  // Segmented outer ring (like panels/segments)
  const segmentCount = 16;
  const segMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 0.8,
  });
  for (let i = 0; i < segmentCount; i++) {
    const angle = (i / segmentCount) * Math.PI * 2;
    const gap = 0.04;
    const segAngle = (Math.PI * 2) / segmentCount - gap;
    const seg = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.04, 4, 8, segAngle),
      segMat,
    );
    seg.rotation.z = angle;
    group.add(seg);
  }

  // Corner accent nodes (4 diamonds around the portal)
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 1.5,
  });
  const nodePositions = [
    [0, 1.3],
    [0, -1.3],
    [1.3, 0],
    [-1.3, 0],
  ];
  for (const [nx, ny] of nodePositions) {
    const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), nodeMat);
    node.position.set(nx, ny, 0.01);
    node.rotation.z = Math.PI / 4;
    group.add(node);
  }

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

  // Point light from the portal center
  const portalLight = new THREE.PointLight(0x00d4ff, 1.5, 4);
  portalLight.position.z = 0.5;
  group.add(portalLight);

  // Large transparent click target covering the entire portal area
  const clickTarget = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 32),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
  );
  clickTarget.position.z = 0.05;
  group.add(clickTarget);

  group.userData = {
    clickable: true,
    action: "enterNatureRoom",
    rings,
    innerGlow,
    label,
  };

  return group;
}

function buildPedestal() {
  const group = new THREE.Group();
  group.position.set(-7.0, -0.9, -2.75);
  group.scale.set(2.4, 2.16, 2.4); // Y = 2.4 * 0.9 → 10% shorter

  // ── Pointed oval arc bookstand ───────────────────────────────────────────

  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8eef6,
    metalness: 0.08,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const mkGlow = (color, opacity) => new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Canvas texture for column: grey panel seams + LED dots
  function makeColTex() {
    const W = 256, H = 512;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#e8eef6';
    ctx.fillRect(0, 0, W, H);

    // Vertical seam lines (6 panels)
    ctx.strokeStyle = 'rgba(125, 140, 168, 0.65)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i <= 6; i++) {
      const x = (i / 6) * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Horizontal groove rings at 28 %, 54 %, 76 %
    ctx.strokeStyle = 'rgba(140, 155, 182, 0.45)';
    ctx.lineWidth = 2;
    for (const v of [0.28, 0.54, 0.76]) {
      const y = (1 - v) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // LED indicator dots — 6 around the column at 54 % height
    for (let i = 0; i < 6; i++) {
      const x = ((i + 0.5) / 6) * W;
      const y = (1 - 0.54) * H;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
      g.addColorStop(0,   'rgba(130, 200, 255, 1.0)');
      g.addColorStop(0.4, 'rgba(100, 175, 255, 0.7)');
      g.addColorStop(1,   'rgba(100, 175, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 6, y - 6, 12, 12);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  // ── Base — three stepped rings sitting on the floor ──
  // group.position.y = -0.9, scale = 2.4  →  local floor level = 0.9/2.4 = 0.375
  const FLOOR = 0.375;

  const baseDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.15, 0.05, 48),
    pearlMat.clone(),
  );
  baseDisc.position.y = FLOOR + 0.025;
  baseDisc.castShadow = true;
  baseDisc.receiveShadow = true;
  baseDisc.userData = { clickable: true, hotspot: "pedestal" };
  group.add(baseDisc);

  const baseRimGlow = new THREE.Mesh(
    new THREE.TorusGeometry(0.135, 0.007, 6, 48),
    mkGlow(0x99ccff, 0.5),
  );
  baseRimGlow.rotation.x = Math.PI / 2;
  baseRimGlow.position.y = FLOOR + 0.051;
  baseRimGlow.raycast = () => {};
  group.add(baseRimGlow);

  // ── Column — shorter, platform clears book bottom ──
  const colPts = [
    new THREE.Vector2(0.00, 0.09),
    new THREE.Vector2(0.09, 0.12),
    new THREE.Vector2(0.052, 0.24),
    new THREE.Vector2(0.036, 0.48),
    new THREE.Vector2(0.032, 0.68),
    new THREE.Vector2(0.040, 0.78),
    new THREE.Vector2(0.09,  0.83),
    new THREE.Vector2(0.14,  0.87),
    new THREE.Vector2(0.14,  0.90),
    new THREE.Vector2(0.00,  0.91),
  ];

  const colMat = pearlMat.clone();
  colMat.map = makeColTex();

  const column = new THREE.Mesh(new THREE.LatheGeometry(colPts, 32), colMat);
  column.castShadow = true;
  column.userData = { clickable: true, hotspot: "pedestal" };
  group.add(column);

  // ── Platform disc ──
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.145, 0.025, 32),
    pearlMat.clone(),
  );
  platform.position.y = 0.923;
  platform.castShadow = true;
  platform.userData = { clickable: true, hotspot: "pedestal" };
  group.add(platform);

  const platRimGlow = new THREE.Mesh(
    new THREE.TorusGeometry(0.145, 0.007, 6, 32),
    mkGlow(0xaaddff, 0.65),
  );
  platRimGlow.rotation.x = Math.PI / 2;
  platRimGlow.position.y = 0.937;
  platRimGlow.raycast = () => {};
  group.add(platRimGlow);


  // ── Directional spotlight beam — wide cone, bright at base, fades to nothing at top ──
  const BEAM_BOT = 0.95;
  const BEAM_TOP = 1.32;
  const BEAM_H   = BEAM_TOP - BEAM_BOT;
  const BEAM_CY  = BEAM_BOT + BEAM_H / 2;

  // Gradient texture: white at bottom (V=0) → black at top (V=1) for alphaMap
  const beamFadeTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = 1; cv.height = 64;
    const ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 64, 0, 0); // canvas bottom → top
    g.addColorStop(0,   'white');
    g.addColorStop(0.5, 'black');
    g.addColorStop(1,   'black');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1, 64);
    return new THREE.CanvasTexture(cv);
  })();

  for (const [rTop, rBot, op, col] of [
    [0.55, 0.018, 0.07, 0xaad8ff],  // wide soft outer halo
    [0.38, 0.012, 0.14, 0x88c8ff],  // mid layer
    [0.18, 0.006, 0.28, 0x66b8ff],  // bright inner core
  ]) {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, BEAM_H, 48, 1, true),
      new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: op,
        alphaMap: beamFadeTex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    beam.position.y = BEAM_CY;
    beam.raycast = () => {};
    group.add(beam);
  }

  // Bright source disc at the emitter (platform top)
  const srcDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.07, 32),
    new THREE.MeshBasicMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  srcDisc.rotation.x = -Math.PI / 2;
  srcDisc.position.y = BEAM_BOT;
  srcDisc.raycast = () => {};
  group.add(srcDisc);

  // Accent light sitting at platform level, casts upward onto the book
  const pedestalLight = new THREE.PointLight(0x00d4ff, 2.5, 4);
  pedestalLight.position.set(0, 0.94, 0);
  group.add(pedestalLight);

  // Book group (will bob — referenced via userData for the update loop)
  const bookGroup = new THREE.Group();
  bookGroup.position.y = 1.28;
  // Cover faces -X in local space after the Z tilt, so rotate PI/2 more than the GLB did
  bookGroup.rotation.y = 0.9 - Math.PI;

  // ── Three.js book (no external model needed) ─────────────────────────────────
  // Axes: X = height (becomes vertical after Z rotation), Z = width, Y = thickness
  const BH = 0.38, BW = 0.28, BT = 0.055; // height (X), width (Z), thickness (Y)
  const CT = 0.010, SW = 0.022;            // cover thickness, spine width (along Z)
  const coverZ = BW - SW;                  // cover depth along Z (non-spine area)

  const mkCoverMat = () =>
    new THREE.MeshStandardMaterial({
      color: 0x12082a,
      emissive: new THREE.Color(0x00cfff),
      emissiveIntensity: 1.4,
      roughness: 0.7,
      metalness: 0.15,
    });

  // bookModel is the object the animation tilts (plays the role of `model`)
  const bookModel = new THREE.Group();
  bookModel.rotation.z = Math.PI / 2 - 0.4;

  // Back cover — full width including spine
  const backCover = new THREE.Mesh(
    new RoundedBoxGeometry(BH, CT, BW, 4, CT * 0.38),
    mkCoverMat(),
  );
  backCover.position.set(0, -BT / 2 + CT / 2, 0);
  backCover.name = "cover_back";
  backCover.castShadow = true;
  backCover.userData = { clickable: true, hotspot: "pedestal", action: "openBook" };
  bookModel.add(backCover);

  // Spine — at the -Z edge, runs the full height (X axis)
  const spineMesh = new THREE.Mesh(
    new RoundedBoxGeometry(BH, BT, SW, 4, SW * 0.22),
    mkCoverMat(),
  );
  spineMesh.position.set(0, 0, -BW / 2 + SW / 2);
  spineMesh.name = "cover_spine";
  spineMesh.castShadow = true;
  spineMesh.userData = { clickable: true, hotspot: "pedestal", action: "openBook" };
  bookModel.add(spineMesh);

  // ── Holographic spine details (outer face + user-facing top face only) ────

  // Spine bounds in bookModel space
  const sX0 = -BH / 2, sX1 = BH / 2;
  const sY0 = -BT / 2, sY1 =  BT / 2;
  const sZ0 = -BW / 2, sZ1 = -BW / 2 + SW;
  const eps = 0.0005; // tiny offset to avoid z-fighting

  const spineVerts = [];

  // Outline of the outer face (z = sZ0, faces away from pages)
  spineVerts.push(sX0, sY0, sZ0-eps,  sX1, sY0, sZ0-eps); // bottom
  spineVerts.push(sX1, sY0, sZ0-eps,  sX1, sY1, sZ0-eps); // right
  spineVerts.push(sX1, sY1, sZ0-eps,  sX0, sY1, sZ0-eps); // top
  spineVerts.push(sX0, sY1, sZ0-eps,  sX0, sY0, sZ0-eps); // left

  // Outline of the top face (y = sY1, faces user / flush with front cover)
  spineVerts.push(sX0, sY1+eps, sZ0,  sX1, sY1+eps, sZ0); // front
  spineVerts.push(sX1, sY1+eps, sZ0,  sX1, sY1+eps, sZ1); // right
  spineVerts.push(sX1, sY1+eps, sZ1,  sX0, sY1+eps, sZ1); // back
  spineVerts.push(sX0, sY1+eps, sZ1,  sX0, sY1+eps, sZ0); // left

  // Divider lines on outer face (along Y at equal X steps)
  const DIV = 4;
  for (let i = 1; i < DIV; i++) {
    const x = sX0 + (i / DIV) * (sX1 - sX0);
    spineVerts.push(x, sY0, sZ0-eps,  x, sY1, sZ0-eps);
  }

  // Divider lines on top face (along Z at same X steps)
  for (let i = 1; i < DIV; i++) {
    const x = sX0 + (i / DIV) * (sX1 - sX0);
    spineVerts.push(x, sY1+eps, sZ0,  x, sY1+eps, sZ1);
  }

  const spineLineGeo = new LineSegmentsGeometry();
  spineLineGeo.setPositions(spineVerts);
  const spineLineMat = new LineMaterial({
    color: 0x00eeff,
    transparent: true,
    opacity: 0.85,
    linewidth: 2.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
  });
  const spineLines = new LineSegments2(spineLineGeo, spineLineMat);
  spineLines.raycast = () => {};
  bookModel.add(spineLines);

  // Octahedron nodes at the divider intersections on the shared corner edge
  const spineHoloObjects = [spineLines];
  {
    const nodeGeo = new THREE.OctahedronGeometry(0.004, 0);
    const nodeMat = new THREE.MeshBasicMaterial({
      color: 0x00eeff,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i <= DIV; i++) {
      const x = sX0 + (i / DIV) * (sX1 - sX0);
      const n = new THREE.Mesh(nodeGeo, nodeMat.clone());
      n.position.set(x, sY1 + eps, sZ0 - eps);
      n.rotation.z = Math.PI / 4;
      n.raycast = () => {};
      bookModel.add(n);
      spineHoloObjects.push(n);
    }
  }

  // Page stack — fills the non-spine area
  const pageStack = new THREE.Mesh(
    new RoundedBoxGeometry(BH - 0.002, BT - CT * 2 - 0.002, coverZ - 0.002, 3, 0.004),
    new THREE.MeshStandardMaterial({
      color: 0xf0e8d8,
      emissive: new THREE.Color(0x88ddff),
      emissiveIntensity: 3.5,
      roughness: 0.6,
    }),
  );
  pageStack.position.set(0, 0, -BW / 2 + SW + coverZ / 2);
  pageStack.name = "pages";
  pageStack.castShadow = true;
  pageStack.userData = { clickable: true, hotspot: "pedestal", action: "openBook" };
  bookModel.add(pageStack);

  // ── Stacked page edge lines ───────────────────────────────────────────────
  {
    const psHX   = (BH - 0.002) / 2;
    const psHY   = (BT - CT * 2 - 0.002) / 2;
    const psCZ   = -BW / 2 + SW + coverZ / 2;
    const psHZ   = (coverZ - 0.002) / 2;
    const pe     = 0.0006;
    const inset  = 0.007;
    const N      = 32; // total page lines

    const baseVerts = [], accentVerts = [];

    for (let i = 0; i <= N; i++) {
      const y  = -psHY + (i / N) * psHY * 2;
      const isAccent = (i % 4 === 0); // every 4th line is a brighter accent
      const target = isAccent ? accentVerts : baseVerts;

      // Fore-edge (+Z face)
      target.push(
        -psHX + inset, y, psCZ + psHZ + pe,
         psHX - inset, y, psCZ + psHZ + pe,
      );
      // Top face (+Y)
      target.push(
        -psHX + inset, psHY + pe, psCZ - psHZ + inset,
         psHX - inset, psHY + pe, psCZ - psHZ + inset,
      );
      // Bottom face (-Y) - subtler
      baseVerts.push(
        -psHX + inset, -psHY - pe, psCZ - psHZ + inset,
         psHX - inset, -psHY - pe, psCZ - psHZ + inset,
      );
    }

    const mkPageMat = (opacity, linewidth) => new LineMaterial({
      color: 0xfff0d8,
      transparent: true,
      opacity,
      linewidth,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    // Base lines — faint, showing all individual pages
    const baseGeo = new LineSegmentsGeometry();
    baseGeo.setPositions(baseVerts);
    const baseLines = new LineSegments2(baseGeo, mkPageMat(0.35, 1.0));
    baseLines.raycast = () => {};
    bookModel.add(baseLines);

    // Accent lines — slightly brighter every 4th line (page signature divisions)
    const accentGeo = new LineSegmentsGeometry();
    accentGeo.setPositions(accentVerts);
    const accentLines = new LineSegments2(accentGeo, mkPageMat(0.75, 1.4));
    accentLines.raycast = () => {};
    bookModel.add(accentLines);
  }

  // Front cover — hinge at the spine Z-edge, rotates around X axis to open
  const frontCoverPivot = new THREE.Group();
  frontCoverPivot.position.set(0, BT / 2 - CT / 2, -BW / 2 + SW);

  const frontCoverMesh = new THREE.Mesh(
    new RoundedBoxGeometry(BH, CT, coverZ, 4, CT * 0.38),
    mkCoverMat(),
  );
  frontCoverMesh.position.set(0, 0, coverZ / 2);
  frontCoverMesh.name = "cover_front";
  frontCoverMesh.castShadow = true;
  frontCoverMesh.userData = { clickable: true, hotspot: "pedestal", action: "openBook" };
  frontCoverPivot.add(frontCoverMesh);
  bookModel.add(frontCoverPivot);

  // Open spread — two blank cream pages revealed after the page-flip animation
  const openPagesGroup = new THREE.Group();
  openPagesGroup.visible = false;
  openPagesGroup.position.set(0, CT / 2 + 0.001, -BW / 2 + SW);
  const openPageZ = (coverZ - 0.008) / 2;
  [0, 1].forEach((i) => {
    const pg = new THREE.Mesh(
      new THREE.PlaneGeometry(BH - 0.01, openPageZ),
      new THREE.MeshStandardMaterial({
        color: 0xf5eed8,
        emissive: new THREE.Color(0x88ddff),
        emissiveIntensity: 1.5,
        roughness: 0.6,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    );
    pg.position.set(0, 0, openPageZ / 2 + i * openPageZ);
    pg.rotation.x = -Math.PI / 2;
    openPagesGroup.add(pg);
  });
  bookModel.add(openPagesGroup);

  // Page-flip pivots — 4 pages that flip over the spine before the spread appears
  const pageMat = new THREE.MeshStandardMaterial({
    color: 0xf0e8d8,
    emissive: new THREE.Color(0x88ddff),
    emissiveIntensity: 0.8,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const PAGE_SEGS = 14; // subdivisions along the depth (hinge → outer edge)
  const pageDepth = coverZ - 0.004;
  const halfPageDepth = pageDepth / 2;

  const pageFlipPivots = [];
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(0, BT / 2 - CT / 2 - (i + 1) * 0.001, -BW / 2 + SW);

    // Subdivided plane — segments along Y (which becomes Z after -PI/2 rotation)
    const pageGeo = new THREE.PlaneGeometry(BH - 0.01, pageDepth, 1, PAGE_SEGS);
    // Store original vertex positions for bend animation
    pageGeo.userData.origPos = Float32Array.from(pageGeo.attributes.position.array);

    const page = new THREE.Mesh(pageGeo, pageMat.clone());
    page.position.set(0, 0, halfPageDepth);
    page.rotation.x = -Math.PI / 2;
    pivot.add(page);
    bookModel.add(pivot);
    pageFlipPivots.push(pivot);
  }

  // Bend function — called every frame while the animation is running.
  // Plane local Y (+halfPageDepth) = hinge edge, Y (-halfPageDepth) = outer edge.
  // Bend is applied along plane local Z (the normal), which lifts/drops the outer
  // edge creating a paper-curl curve as the page sweeps over the spine.
  const updatePageBend = () => {
    for (const pivot of pageFlipPivots) {
      const page = pivot.children[0];
      if (!page) continue;
      const geo = page.geometry;
      const orig = geo.userData.origPos;
      const pos = geo.attributes.position;
      const angle = pivot.rotation.x;                  // 0 → -PI
      const bendStrength = Math.sin(-angle);            // 0 → 1 → 0
      const maxBend = 0.038;

      for (let vi = 0; vi < pos.count; vi++) {
        const origY = orig[vi * 3 + 1];
        // t = 0 at hinge (+halfPageDepth), t = 1 at outer edge (-halfPageDepth)
        const t = (-origY + halfPageDepth) / pageDepth;
        const curl = maxBend * bendStrength * Math.sin(t * Math.PI * 0.55);
        pos.setZ(vi, orig[vi * 3 + 2] - curl);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
  };

  bookGroup.add(bookModel);
  bookGroup.updateWorldMatrix(true, true);
  bookGroup.userData.clickable = true;
  bookGroup.userData.hotspot = "pedestal";
  bookGroup.userData.action = "openBook";
  bookGroup.userData.bookMeshes = [backCover, spineMesh, pageStack, frontCoverMesh];
  bookGroup.userData.model = bookModel;
  bookGroup.userData.frontCoverPivot = frontCoverPivot;
  bookGroup.userData.openPagesGroup = openPagesGroup;
  bookGroup.userData.pageFlipPivots = pageFlipPivots;
  bookGroup.userData.spineHoloObjects = spineHoloObjects;
  bookGroup.userData.updatePageBend = updatePageBend;

  // Cover image — flat plane on the top face of the front cover, moves with the hinge
  // PlaneGeometry(w, h): w → X (visual height when standing), h → Z after rotation.x=-PI/2 (visual width when standing)
  new THREE.TextureLoader().load("/cdn-gallery/Forside_bok.png", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    tex.rotation = -Math.PI / 2;
    tex.center.set(0.5, 0.5);
    // Inset by the cover's corner radius so the plane stays within the rounded edges
    const CR = CT * 0.38;
    const imgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(BH - 2 * CR, coverZ - 2 * CR),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        side: THREE.DoubleSide,
      }),
    );
    // Lie flat on the top face of the front cover (XZ plane, facing +Y)
    imgPlane.rotation.x = -Math.PI / 2;
    imgPlane.position.set(0, CT / 2 + 0.002, coverZ / 2);
    frontCoverPivot.add(imgPlane);
  });
  // ── Neon "AI Storytelling" sign above the book — THREE.Sprite auto-faces the camera ──
  // Canvas width matches sprite aspect ratio (0.72 / 0.12 = 6:1 → 768×128)
  const neonCanvas = document.createElement("canvas");
  neonCanvas.width = 768;
  neonCanvas.height = 128;
  const nctx = neonCanvas.getContext("2d");

  const neonTex = new THREE.CanvasTexture(neonCanvas);
  neonTex.colorSpace = THREE.SRGBColorSpace;

  function drawNeonSign() {
    const NEON = "#0066ff";
    const cx = 384, cy = 66;
    nctx.clearRect(0, 0, 768, 128);
    nctx.font = "68px 'Octosquares', sans-serif";
    nctx.textAlign = "center";
    nctx.textBaseline = "middle";
    nctx.shadowColor = NEON;
    nctx.shadowBlur = 48; nctx.fillStyle = "rgba(0,102,255,0.18)"; nctx.fillText("AI Storytelling", cx, cy);
    nctx.shadowBlur = 28; nctx.fillStyle = "rgba(0,102,255,0.45)"; nctx.fillText("AI Storytelling", cx, cy);
    nctx.shadowBlur = 10; nctx.fillStyle = "rgba(0,102,255,0.85)"; nctx.fillText("AI Storytelling", cx, cy);
    nctx.shadowBlur =  4; nctx.fillStyle = "#eef0ff";               nctx.fillText("AI Storytelling", cx, cy);
    neonTex.needsUpdate = true;
  }
  drawNeonSign();
  document.fonts.load("68px 'Octosquares'").then(() => drawNeonSign());

  // Sprite always faces the camera — no manual billboard needed
  const signSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: neonTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );
  signSprite.scale.set(0.72, 0.12, 1);
  signSprite.position.set(0, 1.62, 0);
  signSprite.renderOrder = 999;
  signSprite.raycast = () => {};
  group.userData.signGroup = signSprite;

  // Neon point light blooming around the sign
  const neonLight = new THREE.PointLight(0x0066ff, 1.4, 0.7);
  neonLight.position.set(0, 1.62, 0.05);
  group.userData.signLight = neonLight;

  group.add(bookGroup);
  group.add(signSprite);
  group.add(neonLight);

  // ── Smoke rising from the book ────────────────────────────────────────────
  const SMOKE_COUNT = 70;
  const smokeGeo = new THREE.BufferGeometry();
  const smokePos = new Float32Array(SMOKE_COUNT * 3);
  const smokeCol = new Float32Array(SMOKE_COUNT * 3);
  smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3));
  smokeGeo.setAttribute("color", new THREE.BufferAttribute(smokeCol, 3));
  const smokeMat = new THREE.PointsMaterial({
    size: 0.003,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const smokePoints = new THREE.Points(smokeGeo, smokeMat);

  const smokePalette = [
    [0.0, 0.2, 0.8],
    [0.0, 0.8, 1.0],
    [0.0, 0.3, 0.9],
    [0.0, 1.0, 0.7],
  ];
  const smokeParticles = Array.from({ length: SMOKE_COUNT }, () => ({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: Math.random() * 3,
    maxLife: 1.8 + Math.random() * 1.4,
    r: 0,
    g: 0,
    b: 0,
  }));

  function resetSmokeParticle(p) {
    const wp = new THREE.Vector3();
    bookGroup.getWorldPosition(wp);
    p.x = wp.x + (Math.random() - 0.5) * 0.1;
    p.y = wp.y + 0.04 + Math.random() * 0.06;
    p.z = wp.z + (Math.random() - 0.5) * 0.1;
    p.vx = (Math.random() - 0.5) * 0.03;
    p.vy = 0.04 + Math.random() * 0.07;
    p.vz = (Math.random() - 0.5) * 0.03;
    p.life = 0;
    p.maxLife = 1.8 + Math.random() * 1.4;
    const c = smokePalette[Math.floor(Math.random() * smokePalette.length)];
    [p.r, p.g, p.b] = c;
  }
  smokeParticles.forEach((p) => {
    resetSmokeParticle(p);
    p.life = Math.random() * p.maxLife;
  });

  function updateSmoke(delta) {
    const pa = smokeGeo.getAttribute("position");
    const ca = smokeGeo.getAttribute("color");
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const p = smokeParticles[i];
      p.life += delta;
      if (p.life >= p.maxLife) resetSmokeParticle(p);
      const t = p.life / p.maxLife;
      const fade = t < 0.15 ? t / 0.15 : t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1.0;
      const brightness = Math.max(0, fade) * 0.55;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      p.vx += (Math.random() - 0.5) * 0.008;
      p.vz += (Math.random() - 0.5) * 0.008;
      pa.array[i * 3] = p.x;
      pa.array[i * 3 + 1] = p.y;
      pa.array[i * 3 + 2] = p.z;
      ca.array[i * 3] = p.r * brightness;
      ca.array[i * 3 + 1] = p.g * brightness;
      ca.array[i * 3 + 2] = p.b * brightness;
    }
    pa.needsUpdate = true;
    ca.needsUpdate = true;
  }

  // ── Cube side smoke ───────────────────────────────────────────────────────
  const CUBE_SMOKE_COUNT = 50;
  const cubeSmokeGeo = new THREE.BufferGeometry();
  const cubeSmokePos = new Float32Array(CUBE_SMOKE_COUNT * 3);
  const cubeSmokeCol = new Float32Array(CUBE_SMOKE_COUNT * 3);
  cubeSmokeGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(cubeSmokePos, 3),
  );
  cubeSmokeGeo.setAttribute(
    "color",
    new THREE.BufferAttribute(cubeSmokeCol, 3),
  );
  const cubeSmokeMat = new THREE.PointsMaterial({
    size: 0.022,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const cubeSmokePoints = new THREE.Points(cubeSmokeGeo, cubeSmokeMat);

  const CUBE_WX = -7.0,
    CUBE_WZ = -2.75;
  const CUBE_HALF = 0.21;
  const CUBE_BOTTOM = 1.32,
    CUBE_TOP = 1.74;
  const cubeSmokePalette = [
    [0.0, 1.0, 0.8],
    [0.0, 0.8, 1.0],
    [0.0, 0.2, 0.8],
    [0.0, 0.3, 0.9],
  ];
  const cubeSmokeParticles = Array.from({ length: CUBE_SMOKE_COUNT }, () => ({
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    life: 0, maxLife: 1.0,
    r: 0, g: 0, b: 0,
    opacity: 1.0,
  }));

  function resetCubeSmokeParticle(p) {
    const side = Math.floor(Math.random() * 5);
    const along = (Math.random() - 0.5) * CUBE_HALF * 2;
    const h = CUBE_BOTTOM + Math.random() * (CUBE_TOP - CUBE_BOTTOM);
    const offset = 0.03;
    if (side === 0) {
      p.x = CUBE_WX - CUBE_HALF - offset;
      p.z = CUBE_WZ + along;
      p.y = h;
    } else if (side === 1) {
      p.x = CUBE_WX + CUBE_HALF + offset;
      p.z = CUBE_WZ + along;
      p.y = h;
    } else if (side === 2) {
      p.x = CUBE_WX + along;
      p.z = CUBE_WZ - CUBE_HALF - offset;
      p.y = h;
    } else if (side === 3) {
      p.x = CUBE_WX + along;
      p.z = CUBE_WZ + CUBE_HALF + offset;
      p.y = h;
    } else {
      p.x = CUBE_WX + (Math.random() - 0.5) * CUBE_HALF * 2;
      p.z = CUBE_WZ + (Math.random() - 0.5) * CUBE_HALF * 2;
      p.y = CUBE_TOP + 0.01;
    }
    p.vx = (Math.random() - 0.5) * 0.01;
    p.vy = 0.02 + Math.random() * 0.03;
    p.vz = (Math.random() - 0.5) * 0.01;
    p.life = 0;
    p.maxLife = 0.8 + Math.random() * 0.8;
    p.opacity = 0.35 + Math.random() * 0.65;
    const c =
      cubeSmokePalette[Math.floor(Math.random() * cubeSmokePalette.length)];
    [p.r, p.g, p.b] = c;
  }
  cubeSmokeParticles.forEach((p) => {
    resetCubeSmokeParticle(p);
    p.life = Math.random() * p.maxLife;
  });

  function updateCubeSmoke(delta) {
    const pa = cubeSmokeGeo.getAttribute("position");
    const ca = cubeSmokeGeo.getAttribute("color");
    for (let i = 0; i < CUBE_SMOKE_COUNT; i++) {
      const p = cubeSmokeParticles[i];
      p.life += delta;
      if (p.life >= p.maxLife) resetCubeSmokeParticle(p);
      const t = p.life / p.maxLife;
      const fade = t < 0.15 ? t / 0.15 : t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1.0;
      const brightness = Math.max(0, fade) * p.opacity;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      p.vx += (Math.random() - 0.5) * 0.005;
      p.vz += (Math.random() - 0.5) * 0.005;
      pa.array[i * 3] = p.x;
      pa.array[i * 3 + 1] = p.y;
      pa.array[i * 3 + 2] = p.z;
      ca.array[i * 3] = p.r * brightness;
      ca.array[i * 3 + 1] = p.g * brightness;
      ca.array[i * 3 + 2] = p.b * brightness;
    }
    pa.needsUpdate = true;
    ca.needsUpdate = true;
  }

  group.userData = {
    bookGroup,
    smokePoints,
    updateSmoke,
    cubeSmokePoints,
    updateCubeSmoke,
  };

  return group;
}

function buildCentralPedestal() {
  const group = new THREE.Group();
  group.position.set(0, 0, 0);

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8,
    metalness: 0.15,
    roughness: 0.55,
  });
  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 1.2,
  });

  // Outer base ring — 1.2 m diameter, 0.1 m tall
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.65, 0.1, 48),
    whiteMat,
  );
  base.position.y = 0.05;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

  // Inner pillar — 0.6 m diameter, 0.6 m tall
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.6, 48),
    whiteMat,
  );
  pillar.position.y = 0.4;
  pillar.castShadow = true;
  group.add(pillar);

  // Cyan seam around the pillar at mid-height
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.012, 8, 48),
    cyanMat,
  );
  seam.rotation.x = Math.PI / 2;
  seam.position.y = 0.4;
  group.add(seam);

  // Flat emissive cap on top where the projection beam emerges
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.02, 48),
    cyanMat,
  );
  cap.position.y = 0.71;
  group.add(cap);

  return group;
}

function buildHoloSphere() {
  const group = new THREE.Group();
  // Sphere floats at eye-level above the pedestal
  group.position.set(0, 1.8, 0);

  // Layer 1: wireframe sphere
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 1.0,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
  });
  const wireframe = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.45, 2),
    wireMat,
  );
  group.add(wireframe);

  // Layer 2: inner particle cloud
  const particleCount = 240;
  const ppos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    // Random point inside a sphere of radius 0.4
    const r = 0.4 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    ppos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    ppos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    ppos[i * 3 + 2] = r * Math.cos(phi);
  }
  const pGeom = new THREE.BufferGeometry();
  pGeom.setAttribute("position", new THREE.Float32BufferAttribute(ppos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x9ce0ff,
    size: 0.02,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
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
        color: 0x00d4ff,
        emissive: 0x00d4ff,
        emissiveIntensity: 1.5,
      }),
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
        color: 0x9ce0ff,
        emissive: 0x9ce0ff,
        emissiveIntensity: 1.5,
      }),
    );
    dot.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7);
    ringB.add(dot);
  }
  ringB.rotation.x = -0.6;
  ringB.rotation.z = 0.3;
  group.add(ringB);

  // Projection beam — transparent cone from pedestal top to sphere
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.05, 48, 1, true),
    beamMat,
  );
  beam.position.y = -0.55; // cone extends downward to pedestal top
  beam.rotation.x = Math.PI;
  group.add(beam);

  // Sphere's own point light
  const light = new THREE.PointLight(0x00d4ff, 1.0, 4);
  group.add(light);

  // Expose inner groups so createObjects can animate them in sceneUpdate
  group.userData.wireframe = wireframe;
  group.userData.particles = particles;
  group.userData.ringA = ringA;
  group.userData.ringB = ringB;

  return group;
}

export function createObjects(scene) {
  // Portal on the right wall — click to enter the garden room.
  const portal = buildPortal();
  portal.scale.setScalar(1.5);
  portal.position.set(ROOM_WIDTH / 2 - 0.1, 2.4, -2.75);
  portal.rotation.y = -Math.PI / 2;

  const tv = buildTV();

  // Sofa in front of the TV wall — clickable to sit down
  const sofa = createSofa(scene);

  // Easter egg: coffee table + chess board in mid-game
  // (CDN's actual building has a chess board in the entrance)
  const chessTable = createChessTable(scene);

  // Physical radio next to the sofa group — pointer-locked controls so
  // the buttons live on the radio body itself (not an HTML overlay).
  const radio = createRadio(scene);

  // Pac-Man arcade cabinet — entry wall, user's left
  const arcade = createArcade(scene);

  // Magical book pedestal — positioned at (-2.8, 0, 2.6), nav hotspot 'pedestal'
  const pedestal = buildPedestal();
  scene.add(pedestal);
  scene.add(pedestal.userData.smokePoints);
  scene.add(pedestal.userData.cubeSmokePoints);

  scene.add(portal, tv);

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

  return {
    pedestal,
    tv,
    sceneUpdate,
    extras: [pedestal, portal, tv, sofa, arcade, chessTable, radio],
  };
}
