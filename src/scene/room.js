// src/scene/room.js
import * as THREE from 'three';

// Gallery dimensions — museum-hall scale, white cube.
export const ROOM_WIDTH  = 16;  // X
export const ROOM_DEPTH  = 22;  // Z
export const ROOM_HEIGHT = 7;   // Y

function makeWallTexture() {
  const W = 256, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Near-white base
  ctx.fillStyle = '#f2f3f4';
  ctx.fillRect(0, 0, W, H);

  const PANEL_W = 52; // width of each ribbed panel in pixels
  const numPanels = Math.ceil(W / PANEL_W) + 1;

  for (let i = 0; i < numPanels; i++) {
    const px = i * PANEL_W;

    // Gentle gradient across each panel: bright left edge → flat face → soft shadow right
    const grad = ctx.createLinearGradient(px, 0, px + PANEL_W, 0);
    grad.addColorStop(0,    'rgba(255,255,255,0.18)'); // raised highlight
    grad.addColorStop(0.12, 'rgba(255,255,255,0.06)');
    grad.addColorStop(0.5,  'rgba(0,0,0,0)');
    grad.addColorStop(0.82, 'rgba(0,0,0,0.03)');
    grad.addColorStop(1,    'rgba(0,0,0,0.09)');       // groove shadow
    ctx.fillStyle = grad;
    ctx.fillRect(px, 0, PANEL_W, H);

    // Narrow groove — thin and soft, not harsh
    const groove = ctx.createLinearGradient(px, 0, px + 4, 0);
    groove.addColorStop(0, 'rgba(140,148,155,0.55)');
    groove.addColorStop(1, 'rgba(140,148,155,0)');
    ctx.fillStyle = groove;
    ctx.fillRect(px, 0, 4, H);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3); // ~20 visible ridges across a 22-unit wall
  tex.anisotropy = 16;
  return tex;
}

function makeCeilTexture() {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Clean white base
  ctx.fillStyle = '#f5f6f7';
  ctx.fillRect(0, 0, W, H);

  // Rectangular panel grid — subtle recessed lines
  const COLS = 2, ROWS = 2;
  const CW = W / COLS, CH = H / ROWS;
  ctx.strokeStyle = 'rgba(165,170,178,0.45)';
  ctx.lineWidth = 2;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CW, 0); ctx.lineTo(c * CW, H); ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CH); ctx.lineTo(W, r * CH); ctx.stroke();
  }

  // Very soft inner shadow per panel (slightly darker near edges)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const px = c * CW, py = r * CH;
      const g = ctx.createRadialGradient(
        px + CW / 2, py + CH / 2, CW * 0.1,
        px + CW / 2, py + CH / 2, CW * 0.72
      );
      g.addColorStop(0, 'rgba(255,255,255,0.0)');
      g.addColorStop(1, 'rgba(0,0,0,0.055)');
      ctx.fillStyle = g;
      ctx.fillRect(px, py, CW, CH);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4); // ~4-unit panels across 16×22 room
  tex.anisotropy = 16;
  return tex;
}

function makeFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base: light silver gradient across the tile
  const base = ctx.createLinearGradient(0, 0, 512, 512);
  base.addColorStop(0,   '#d4d8dc');
  base.addColorStop(0.5, '#c8cdd2');
  base.addColorStop(1,   '#d0d4d8');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle per-quadrant tint so each plate looks distinct but not noisy
  [[0,0],[256,0],[0,256],[256,256]].forEach(([x, y], i) => {
    const offsets = [3, -2, -3, 2];
    const v = 200 + offsets[i];
    ctx.fillStyle = `rgba(${v},${v+2},${v+4}, 0.18)`;
    ctx.fillRect(x + 2, y + 2, 252, 252);
  });

  // Soft radial highlight at center of each plate (light catching the surface)
  [[128,128],[384,128],[128,384],[384,384]].forEach(([cx, cy]) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 110);
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 110, cy - 110, 220, 220);
  });

  // Seam lines between plates — thin and sharp
  ctx.strokeStyle = 'rgba(70, 80, 92, 0.40)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(256, 0);   ctx.lineTo(256, 512); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,   256); ctx.lineTo(512, 256); ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 5.5); // ~4 units per plate across 16×22 room
  tex.anisotropy = 16;
  return tex;
}

export function createRoom(scene) {
  const wallMat = new THREE.MeshStandardMaterial({
    map:       makeWallTexture(),
    color:     0xf4f5f6,
    metalness: 0.22,
    roughness: 0.78,
    side:      THREE.DoubleSide,
  });
  const floorMat = new THREE.MeshPhysicalMaterial({
    map:                makeFloorTexture(),
    color:              0xdde1e5,
    metalness:          0.65,
    roughness:          0.12,
    reflectivity:       0.9,
    clearcoat:          0.6,
    clearcoatRoughness: 0.06,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    map:       makeCeilTexture(),
    color:     0xf6f7f8,
    metalness: 0.0,
    roughness: 0.88,
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    ceilMat
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = ROOM_HEIGHT;
  scene.add(ceil);

  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT),
    wallMat
  );
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT),
    wallMat
  );
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT),
    wallMat
  );
  backWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const frontWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT),
    wallMat
  );
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
  frontWall.receiveShadow = true;
  scene.add(frontWall);

  // ── Lighting ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const hemi = new THREE.HemisphereLight(0xffffff, 0xe8eaec, 0.5);
  hemi.position.set(0, ROOM_HEIGHT, 0);
  scene.add(hemi);

  // ── Flush rectangular light panels on ceiling ──
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const PANEL_POSITIONS = [
    [-3.5, -6], [-3.5, 0], [-3.5, 6],
    [ 3.5, -6], [ 3.5, 0], [ 3.5, 6],
  ];
  for (const [px, pz] of PANEL_POSITIONS) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.55),
      panelMat
    );
    panel.rotation.x = Math.PI / 2;
    panel.position.set(px, ROOM_HEIGHT - 0.02, pz);
    scene.add(panel);

    // Point light below each panel — illuminates floor for metallic reflection
    const lamp = new THREE.PointLight(0xffffff, 0.9, ROOM_HEIGHT * 3.2);
    lamp.position.set(px, ROOM_HEIGHT - 0.3, pz);
    scene.add(lamp);
  }

  // ── Perimeter edge strips (ceiling meets wall) ──
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const edgeW = 0.12;

  // Front & back edges (run along X)
  for (const ez of [-ROOM_DEPTH / 2 + 0.06, ROOM_DEPTH / 2 - 0.06]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, edgeW), edgeMat);
    strip.rotation.x = Math.PI / 2;
    strip.position.set(0, ROOM_HEIGHT - 0.02, ez);
    scene.add(strip);
  }
  // Left & right edges (run along Z)
  for (const ex of [-ROOM_WIDTH / 2 + 0.06, ROOM_WIDTH / 2 - 0.06]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DEPTH, edgeW), edgeMat);
    strip.rotation.x = Math.PI / 2;
    strip.rotation.z = Math.PI / 2;
    strip.position.set(ex, ROOM_HEIGHT - 0.02, 0);
    scene.add(strip);
  }

  // Soft fill lights along each wall edge to mimic the edge glow spilling downward
  const edgeLightIntensity = 0.35;
  const edgeLightDist = ROOM_HEIGHT * 2.5;
  for (const [ex, ez] of [
    [-ROOM_WIDTH / 2 + 0.5, 0], [ROOM_WIDTH / 2 - 0.5, 0],
    [0, -ROOM_DEPTH / 2 + 0.5], [0,  ROOM_DEPTH / 2 - 0.5],
  ]) {
    const el = new THREE.PointLight(0xffffff, edgeLightIntensity, edgeLightDist);
    el.position.set(ex, ROOM_HEIGHT - 0.5, ez);
    scene.add(el);
  }

  // ── Teal accent LED strips at wall bases ──────────────────────────────────
  const teal    = 0x00d4aa;
  const ledMat  = new THREE.MeshBasicMaterial({ color: teal });
  const LED_H   = 0.025;
  const LED_OFF = 0.01; // distance off the wall face

  // Left wall base strip
  const llStrip = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DEPTH, LED_H), ledMat);
  llStrip.rotation.y = Math.PI / 2;
  llStrip.position.set(-ROOM_WIDTH / 2 + LED_OFF, LED_H / 2, 0);
  scene.add(llStrip);

  // Right wall base strip
  const rlStrip = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DEPTH, LED_H), ledMat);
  rlStrip.rotation.y = -Math.PI / 2;
  rlStrip.position.set(ROOM_WIDTH / 2 - LED_OFF, LED_H / 2, 0);
  scene.add(rlStrip);

  // Back wall base strip
  const blStrip = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, LED_H), ledMat);
  blStrip.position.set(0, LED_H / 2, -ROOM_DEPTH / 2 + LED_OFF);
  scene.add(blStrip);

  // Front wall base strip
  const flStrip = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, LED_H), ledMat);
  flStrip.rotation.y = Math.PI;
  flStrip.position.set(0, LED_H / 2, ROOM_DEPTH / 2 - LED_OFF);
  scene.add(flStrip);

  // Teal point lights at wall bases — spill onto the floor
  for (const [lx, lz] of [
    [-ROOM_WIDTH / 2 + 0.3, 0], [ROOM_WIDTH / 2 - 0.3, 0],
    [0, -ROOM_DEPTH / 2 + 0.3], [0, ROOM_DEPTH / 2 - 0.3],
  ]) {
    const tl = new THREE.PointLight(teal, 0.5, 5.0);
    tl.position.set(lx, 0.08, lz);
    scene.add(tl);
  }
}
