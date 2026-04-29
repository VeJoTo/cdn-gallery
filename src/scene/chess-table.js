// src/scene/chess-table.js
//
// Easter egg: a coffee table in front of the sofa with a 3D chess board
// in mid-game position on top. Cyan high-tech aesthetic.
//
// Real-world reference: CDN's actual building has a chess board in the entrance.

import * as THREE from 'three';

// Position the whole assembly (table + board + pieces) — between the sofa
// (at -4, ?, 2.75 facing -X) and the TV wall, on the floor.
const TABLE_POS = new THREE.Vector3(-5.5, 0, 2.75);

const TABLE_W = 1.5;   // table top width  (X)
const TABLE_D = 0.95;  // table top depth  (Z)
const TABLE_H = 0.55;  // table height
const TABLE_THICK = 0.06;

const BOARD_SIZE = 0.78; // total board width = 8 squares
const SQUARE = BOARD_SIZE / 8;
const BOARD_THICK = 0.025;

// Scale piece geometry up to match the bigger board.
const P = 1.6;

const CYAN_BRIGHT = 0x5ee0ff;
const CYAN_DEEP   = 0x0d2230;

// ── Helpers ───────────────────────────────────────────────────────────

function squareToLocal(file, rank) {
  // file/rank both in 0..7. Returns (x, z) at the centre of that square,
  // in board-local coordinates (origin at board centre).
  return [
    -BOARD_SIZE / 2 + SQUARE / 2 + file * SQUARE,
    -BOARD_SIZE / 2 + SQUARE / 2 + rank * SQUARE,
  ];
}

function pieceMaterial(side) {
  if (side === 'white') {
    return new THREE.MeshStandardMaterial({
      color: 0xe8faff,
      emissive: CYAN_BRIGHT,
      emissiveIntensity: 0.45,
      metalness: 0.3,
      roughness: 0.25,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: 0x0a1828,
    emissive: 0x0a4a6a,
    emissiveIntensity: 0.35,
    metalness: 0.5,
    roughness: 0.4,
  });
}

// ── Piece geometries (tiny, stylized; built from primitives) ──────────

function makePawn(mat) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * P, 0.026 * P, 0.025 * P, 16), mat);
  base.position.y = 0.0125 * P;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.018 * P, 16, 12), mat);
  head.position.y = 0.038 * P;
  g.add(base, head);
  return g;
}

function makeRook(mat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.024 * P, 0.028 * P, 0.04 * P, 16), mat);
  body.position.y = 0.02 * P;
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.05 * P, 0.012 * P, 0.05 * P), mat);
  top.position.y = 0.046 * P;
  g.add(body, top);
  return g;
}

function makeKnight(mat) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.024 * P, 0.028 * P, 0.025 * P, 16), mat);
  base.position.y = 0.0125 * P;
  // Head: tilted box that suggests a horse profile
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.025 * P, 0.04 * P, 0.05 * P), mat);
  head.position.set(0, 0.04 * P, -0.005 * P);
  head.rotation.x = -0.3;
  g.add(base, head);
  return g;
}

function makeBishop(mat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * P, 0.028 * P, 0.04 * P, 16), mat);
  body.position.y = 0.02 * P;
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.018 * P, 0.03 * P, 16), mat);
  top.position.y = 0.055 * P;
  g.add(body, top);
  return g;
}

function makeQueen(mat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.024 * P, 0.03 * P, 0.045 * P, 16), mat);
  body.position.y = 0.0225 * P;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.02 * P, 16, 12), mat);
  ball.position.y = 0.058 * P;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.014 * P, 0.018 * P, 8), mat);
  crown.position.y = 0.078 * P;
  g.add(body, ball, crown);
  return g;
}

function makeKing(mat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.024 * P, 0.03 * P, 0.05 * P, 16), mat);
  body.position.y = 0.025 * P;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.02 * P, 16, 12), mat);
  ball.position.y = 0.064 * P;
  // Cross
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.006 * P, 0.022 * P, 0.006 * P), mat);
  crossV.position.y = 0.088 * P;
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.014 * P, 0.006 * P, 0.006 * P), mat);
  crossH.position.y = 0.084 * P;
  g.add(body, ball, crossV, crossH);
  return g;
}

const PIECE_BUILDERS = {
  P: makePawn,
  R: makeRook,
  N: makeKnight,
  B: makeBishop,
  Q: makeQueen,
  K: makeKing,
};

// ── Mid-game position ─────────────────────────────────────────────────
// Plausible 14-piece position: pieces are still on standard squares
// where they'd be after a Sicilian-flavoured opening. file (a..h) → 0..7,
// rank (1..8) → 0..7.
//
// Format: [type, file, rank, side]

const POSITION = [
  // White
  ['K', 4, 0, 'white'],   // Ke1
  ['Q', 3, 0, 'white'],   // Qd1
  ['R', 0, 0, 'white'],   // Ra1
  ['B', 2, 0, 'white'],   // Bc1
  ['N', 5, 2, 'white'],   // Nf3 — knight developed
  ['P', 4, 3, 'white'],   // e4
  ['P', 3, 3, 'white'],   // d4
  // Black
  ['K', 4, 7, 'black'],   // Ke8
  ['Q', 3, 7, 'black'],   // Qd8
  ['R', 7, 7, 'black'],   // Rh8
  ['B', 5, 7, 'black'],   // Bf8
  ['N', 2, 5, 'black'],   // Nc6 — knight developed
  ['P', 2, 4, 'black'],   // c5
  ['P', 4, 4, 'black'],   // e5
];

// ── Build everything ──────────────────────────────────────────────────

export function createChessTable(scene) {
  const root = new THREE.Group();
  root.position.copy(TABLE_POS);
  // Rotate 90° so the table's long axis runs parallel to the sofa
  // (sofa cushions run along Z; the table should follow that).
  root.rotation.y = Math.PI / 2;
  scene.add(root);

  // ── Coffee table — glassy neon material that matches the sofa ──────
  // Same recipe as the neonMat in src/scene/sofa.js.
  const neonMat = new THREE.MeshPhysicalMaterial({
    color: 0xaaffff,
    emissive: 0x00ffee,
    emissiveIntensity: 10.0,
    roughness: 0.0,
    metalness: 0.0,
    transmission: 0.98,
    thickness: 1.0,
    transparent: true,
    opacity: 0.12,
  });

  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_W, TABLE_THICK, TABLE_D),
    neonMat
  );
  tableTop.position.y = TABLE_H - TABLE_THICK / 2;
  // Translucent glass shouldn't write to depth buffer or cast solid shadows
  tableTop.castShadow = false;
  tableTop.receiveShadow = true;
  root.add(tableTop);

  // Slim glass legs at the four corners — same neon material
  const legGeom = new THREE.BoxGeometry(0.05, TABLE_H - TABLE_THICK, 0.05);
  const legInset = 0.07;
  for (const [lx, lz] of [
    [ TABLE_W / 2 - legInset,  TABLE_D / 2 - legInset],
    [-TABLE_W / 2 + legInset,  TABLE_D / 2 - legInset],
    [ TABLE_W / 2 - legInset, -TABLE_D / 2 + legInset],
    [-TABLE_W / 2 + legInset, -TABLE_D / 2 + legInset],
  ]) {
    const leg = new THREE.Mesh(legGeom, neonMat);
    leg.position.set(lx, (TABLE_H - TABLE_THICK) / 2, lz);
    root.add(leg);
  }

  // ── Chess board ─────────────────────────────────────────────────────
  const board = new THREE.Group();
  board.position.y = TABLE_H + BOARD_THICK / 2;
  root.add(board);

  // Outer board frame — dark with cyan border line
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x05101a,
    metalness: 0.6,
    roughness: 0.3,
  });
  const framePad = 0.018;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(
      BOARD_SIZE + framePad * 2,
      BOARD_THICK,
      BOARD_SIZE + framePad * 2
    ),
    frameMat
  );
  frame.castShadow = true;
  frame.receiveShadow = true;
  board.add(frame);

  // Cyan border line on top of the frame
  const borderMat = new THREE.MeshBasicMaterial({ color: CYAN_BRIGHT });
  const borderInset = framePad / 2;
  for (const [w, d, dx, dz] of [
    [BOARD_SIZE + framePad,        0.003,  0,                              BOARD_SIZE / 2 + borderInset],
    [BOARD_SIZE + framePad,        0.003,  0,                             -(BOARD_SIZE / 2 + borderInset)],
    [0.003,        BOARD_SIZE + framePad,  BOARD_SIZE / 2 + borderInset,   0],
    [0.003,        BOARD_SIZE + framePad, -(BOARD_SIZE / 2 + borderInset), 0],
  ]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.001, d), borderMat);
    line.position.set(dx, BOARD_THICK / 2 + 0.0006, dz);
    board.add(line);
  }

  // 8×8 squares — alternating dark and cyan-glow
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0a1419,
    metalness: 0.4,
    roughness: 0.3,
  });
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0x1a3a4a,
    emissive: CYAN_BRIGHT,
    emissiveIntensity: 0.18,
    metalness: 0.4,
    roughness: 0.3,
  });
  const squareGeom = new THREE.PlaneGeometry(SQUARE * 0.97, SQUARE * 0.97);
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 8; r++) {
      const isLight = (f + r) % 2 === 1;
      const sq = new THREE.Mesh(squareGeom, isLight ? lightMat : darkMat);
      sq.rotation.x = -Math.PI / 2;
      const [lx, lz] = squareToLocal(f, r);
      sq.position.set(lx, BOARD_THICK / 2 + 0.0005, lz);
      board.add(sq);
    }
  }

  // ── Pieces (mid-game) ───────────────────────────────────────────────
  const whiteMat = pieceMaterial('white');
  const blackMat = pieceMaterial('black');

  for (const [type, file, rank, side] of POSITION) {
    const mat = side === 'white' ? whiteMat : blackMat;
    const piece = PIECE_BUILDERS[type](mat);
    const [lx, lz] = squareToLocal(file, rank);
    piece.position.set(lx, BOARD_THICK / 2 + 0.001, lz);
    piece.traverse(node => { if (node.isMesh) node.castShadow = true; });
    board.add(piece);
  }

  // Faint cyan accent light just above the board for piece highlights
  const accentLight = new THREE.PointLight(CYAN_BRIGHT, 0.6, 0.9);
  accentLight.position.y = TABLE_H + 0.18;
  root.add(accentLight);

  // Make the whole assembly raycastable so a hover tooltip can surface.
  // No `action` set — clicking does nothing; we only want the label.
  root.userData = {
    clickable: true,
    hoverLabel: "A nod to the real chess board in CDN's entrance.",
  };

  return root;
}
