// src/scene/room.js
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

// Gallery dimensions — museum-hall scale, white cube.
export const ROOM_WIDTH  = 16;  // X
export const ROOM_DEPTH  = 22;  // Z
export const ROOM_HEIGHT = 7;   // Y

export function createRoom(scene) {
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0d1f33, metalness: 0.05, roughness: 0.85, side: THREE.DoubleSide
  });
  // Glossy marble floor — procedural gray marble with veining
  const marbleCanvas = document.createElement('canvas');
  marbleCanvas.width = 1024; marbleCanvas.height = 1024;
  const mctx = marbleCanvas.getContext('2d');

  // Base: brighter warm-gray marble
  mctx.fillStyle = '#cdd2d8';
  mctx.fillRect(0, 0, 1024, 1024);

  // Subtle tonal gradient for depth
  const mgrad = mctx.createLinearGradient(0, 0, 1024, 1024);
  mgrad.addColorStop(0,   'rgba(230, 234, 240, 0.45)');
  mgrad.addColorStop(0.4, 'rgba(175, 182, 192, 0.30)');
  mgrad.addColorStop(1,   'rgba(210, 215, 222, 0.40)');
  mctx.fillStyle = mgrad;
  mctx.fillRect(0, 0, 1024, 1024);

  // Dark veins — diagonal bezier curves
  const veins = [
    { x1: -20, y1: 180, cpx1: 280, cpy1:  80, cpx2: 700, cpy2: 300, x2: 1044, y2: 420, w: 2.8, a: 0.20 },
    { x1: -20, y1: 480, cpx1: 180, cpy1: 560, cpx2: 600, cpy2: 380, x2: 1044, y2: 260, w: 1.6, a: 0.14 },
    { x1: 120, y1: -20, cpx1: 360, cpy1: 280, cpx2: 480, cpy2: 640, x2: 680,  y2: 1044, w: 2.2, a: 0.16 },
    { x1: 380, y1: -20, cpx1: 580, cpy1: 360, cpx2: 700, cpy2: 700, x2: 920,  y2: 1044, w: 1.4, a: 0.11 },
    { x1: -20, y1: 720, cpx1: 400, cpy1: 820, cpx2: 700, cpy2: 680, x2: 1044, y2: 580, w: 3.2, a: 0.09 },
    { x1:  60, y1: -20, cpx1: 200, cpy1: 400, cpx2: 300, cpy2: 700, x2: 200,  y2: 1044, w: 1.0, a: 0.13 },
  ];
  for (const v of veins) {
    mctx.beginPath();
    mctx.moveTo(v.x1, v.y1);
    mctx.bezierCurveTo(v.cpx1, v.cpy1, v.cpx2, v.cpy2, v.x2, v.y2);
    mctx.strokeStyle = `rgba(72, 82, 98, ${v.a})`;
    mctx.lineWidth = v.w;
    mctx.stroke();
  }

  // Light highlight veins
  const lightVeins = [
    { x1: -20, y1: 300, cpx1: 320, cpy1: 180, cpx2: 680, cpy2: 400, x2: 1044, y2: 500, w: 1.2, a: 0.28 },
    { x1: 250, y1: -20, cpx1: 460, cpy1: 320, cpx2: 560, cpy2: 680, x2: 760,  y2: 1044, w: 0.9, a: 0.22 },
  ];
  for (const v of lightVeins) {
    mctx.beginPath();
    mctx.moveTo(v.x1, v.y1);
    mctx.bezierCurveTo(v.cpx1, v.cpy1, v.cpx2, v.cpy2, v.x2, v.y2);
    mctx.strokeStyle = `rgba(225, 232, 245, ${v.a})`;
    mctx.lineWidth = v.w;
    mctx.stroke();
  }

  // Large tile grout lines — 2×2 grid per texture repeat
  mctx.strokeStyle = 'rgba(88, 98, 115, 0.30)';
  mctx.lineWidth = 1.8;
  mctx.beginPath(); mctx.moveTo(512, 0); mctx.lineTo(512, 1024); mctx.stroke();
  mctx.beginPath(); mctx.moveTo(0, 512); mctx.lineTo(1024, 512); mctx.stroke();

  const marbleTex = new THREE.CanvasTexture(marbleCanvas);
  marbleTex.wrapS = marbleTex.wrapT = THREE.RepeatWrapping;
  marbleTex.repeat.set(2, 3); // large slabs — ~8m × 7.3m per tile
  marbleTex.anisotropy = 16;

  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x0a1420, metalness: 0.05, roughness: 0.9
  });

  const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);

  // Layer 1: Reflector — mirrors the scene so neon strips appear in the floor
  const floorReflector = new Reflector(floorGeo, {
    clipBias: 0.003,
    textureWidth:  512,
    textureHeight: 512,
    color: new THREE.Color(0x8899aa),
  });
  floorReflector.rotation.x = -Math.PI / 2;
  scene.add(floorReflector);

  // Layer 2: marble texture overlay — blends over the reflection so the floor still looks like stone
  const marbleOverlay = new THREE.Mesh(
    floorGeo.clone(),
    new THREE.MeshPhysicalMaterial({
      map: marbleTex,
      transparent: true,
      opacity: 0.65,
      roughness: 0.35,
      metalness: 0.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      depthWrite: false,
    })
  );
  marbleOverlay.rotation.x = -Math.PI / 2;
  marbleOverlay.position.y = 0.001;
  marbleOverlay.receiveShadow = true;
  scene.add(marbleOverlay);

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

  // ── Door on front wall — matches exterior glass double door exactly ──
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, ROOM_DEPTH / 2 - 0.05);
  doorGroup.scale.setScalar(1.1);
  scene.add(doorGroup);

  const doorFrameMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 2.5,
    roughness: 0.3, metalness: 0.5
  });

  // Top header
  const doorFrameTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.07, 0.07), doorFrameMat
  );
  doorFrameTop.position.set(0, 2.2, 0);
  doorGroup.add(doorFrameTop);

  // Side posts
  for (const fx of [-0.55, 0.55]) {
    const sidePost = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 2.2, 0.07), doorFrameMat
    );
    sidePost.position.set(fx, 1.1, 0);
    doorGroup.add(sidePost);
  }

  const doorHandleMat = new THREE.MeshStandardMaterial({
    color: 0x111111, roughness: 0.4, metalness: 0.8
  });

  // Glass panels + handles
  const doorPanelMat = new THREE.MeshStandardMaterial({
    color: 0xc8d8e0, emissive: 0x8ab0c0, emissiveIntensity: 0.6,
    roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide
  });

  for (const dpx of [-0.265, 0.265]) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.53, 2.1), doorPanelMat
    );
    panel.position.set(dpx, 1.1, 0.01);
    panel.raycast = () => {};
    doorGroup.add(panel);

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.4, 0.03), doorHandleMat
    );
    handle.position.set(dpx > 0 ? dpx - 0.13 : dpx + 0.13, 1.05, -0.05);
    doorGroup.add(handle);
  }

  // Invisible click target covering the full door opening
  const doorClickTarget = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 2.2, 0.2),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  doorClickTarget.position.set(0, 1.1, 0);
  doorClickTarget.userData = { clickable: true, action: 'exitToExterior', label: 'Exit' };
  doorGroup.add(doorClickTarget);

  // ── Neon edge strips ──────────────────────────────────────────────────────
  const neonMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 3.0,
  });
  const SW = 0.06; // strip width

  // Ceiling edge strips (all 4 walls, at y = ROOM_HEIGHT)
  const ceilStrips = [
    { w: ROOM_WIDTH,  d: SW, x: 0,               z: -ROOM_DEPTH / 2, },  // back
    { w: ROOM_WIDTH,  d: SW, x: 0,               z:  ROOM_DEPTH / 2, },  // front
    { w: SW, d: ROOM_DEPTH,  x: -ROOM_WIDTH / 2, z: 0,               },  // left
    { w: SW, d: ROOM_DEPTH,  x:  ROOM_WIDTH / 2, z: 0,               },  // right
  ];
  for (const { w, d, x, z } of ceilStrips) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, SW, d), neonMat);
    strip.position.set(x, ROOM_HEIGHT, z);
    scene.add(strip);
  }

  // Floor edge strips (dimmer — ambient glow, not full brightness)
  const floorNeonMat = neonMat.clone();
  floorNeonMat.emissiveIntensity = 1.2;
  for (const { w, d, x, z } of ceilStrips) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, SW, d), floorNeonMat);
    strip.position.set(x, 0, z);
    scene.add(strip);
  }

  // ── Wall pilasters ───────────────────────────────────────────────────────
  const pilasterMat = new THREE.MeshStandardMaterial({
    color: 0x0a1628, metalness: 0.3, roughness: 0.6,
  });
  const pilasterNeonMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 2.5,
  });
  const PW = 0.25; // face width
  const PD = 0.08; // protrusion depth
  const PH = ROOM_HEIGHT;

  // Side walls — 3 pilasters per wall at z = ±ROOM_DEPTH/4 and 0
  for (const z of [-ROOM_DEPTH / 4, 0, ROOM_DEPTH / 4]) {
    const lp = new THREE.Mesh(new THREE.BoxGeometry(PD, PH, PW), pilasterMat);
    lp.position.set(-ROOM_WIDTH / 2 + PD / 2, PH / 2, z);
    scene.add(lp);
    const lpn = new THREE.Mesh(new THREE.BoxGeometry(0.01, PH, 0.04), pilasterNeonMat);
    lpn.position.set(-ROOM_WIDTH / 2 + PD + 0.006, PH / 2, z);
    scene.add(lpn);

    const rp = new THREE.Mesh(new THREE.BoxGeometry(PD, PH, PW), pilasterMat);
    rp.position.set(ROOM_WIDTH / 2 - PD / 2, PH / 2, z);
    scene.add(rp);
    const rpn = new THREE.Mesh(new THREE.BoxGeometry(0.01, PH, 0.04), pilasterNeonMat);
    rpn.position.set(ROOM_WIDTH / 2 - PD - 0.006, PH / 2, z);
    scene.add(rpn);
  }

  // End walls — 2 pilasters per wall at x = ±ROOM_WIDTH/4
  for (const x of [-ROOM_WIDTH / 4, ROOM_WIDTH / 4]) {
    const bp = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, PD), pilasterMat);
    bp.position.set(x, PH / 2, -ROOM_DEPTH / 2 + PD / 2);
    scene.add(bp);
    const bpn = new THREE.Mesh(new THREE.BoxGeometry(0.04, PH, 0.01), pilasterNeonMat);
    bpn.position.set(x, PH / 2, -ROOM_DEPTH / 2 + PD + 0.006);
    scene.add(bpn);

    const fp = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, PD), pilasterMat);
    fp.position.set(x, PH / 2, ROOM_DEPTH / 2 - PD / 2);
    scene.add(fp);
    const fpn = new THREE.Mesh(new THREE.BoxGeometry(0.04, PH, 0.01), pilasterNeonMat);
    fpn.position.set(x, PH / 2, ROOM_DEPTH / 2 - PD - 0.006);
    scene.add(fpn);
  }

  // ── Lighting ──────────────────────────────────────────────────────────────
  // Darker ambient to suit the navy walls; cyan-tinted hemi for sci-fi tone.
  scene.add(new THREE.AmbientLight(0x0a1828, 1.2));

  const hemi = new THREE.HemisphereLight(0x1a3a5c, 0x050c14, 0.8);
  hemi.position.set(0, ROOM_HEIGHT, 0);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(0, ROOM_HEIGHT + 4, 0);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = ROOM_HEIGHT * 3;
  dirLight.shadow.camera.left = -ROOM_WIDTH / 2;
  dirLight.shadow.camera.right = ROOM_WIDTH / 2;
  dirLight.shadow.camera.top = ROOM_DEPTH / 2;
  dirLight.shadow.camera.bottom = -ROOM_DEPTH / 2;
  dirLight.shadow.mapSize.set(512, 512);
  scene.add(dirLight);

  // Ceiling point lights — warmer white to illuminate objects against dark walls.
  const rows = 2, cols = 2;
  const xStep = ROOM_WIDTH / (cols + 1);
  const zStep = ROOM_DEPTH / (rows + 1);
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const px = -ROOM_WIDTH / 2 + c * xStep;
      const pz = -ROOM_DEPTH / 2 + r * zStep;
      const lamp = new THREE.PointLight(0xddeeff, 1.2, ROOM_HEIGHT * 4);
      lamp.position.set(px, ROOM_HEIGHT - 0.3, pz);
      scene.add(lamp);
    }
  }

  // Cyan neon point lights from the edge strips — subtle bloom along walls
  const edgeLights = [
    { x: 0,              z: -ROOM_DEPTH / 2 },
    { x: 0,              z:  ROOM_DEPTH / 2 },
    { x: -ROOM_WIDTH / 2, z: 0              },
    { x:  ROOM_WIDTH / 2, z: 0              },
  ];
  for (const { x, z } of edgeLights) {
    const el = new THREE.PointLight(0x00d4ff, 0.4, ROOM_HEIGHT * 2);
    el.position.set(x, ROOM_HEIGHT - 0.2, z);
    scene.add(el);
  }

  // ── CDN Logo floor decal ─────────────────────────────────────────────────
  // Central hub circle with lines connecting to satellite circles placed in
  // front of each interactive exhibit (door and portal excluded).
  const logoMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 2.5,
    roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide,
  });
  const LOGO_Y = 0.005;

  // Central ring — larger hub
  const CENTER_R = 1.6;
  const centRing = new THREE.Mesh(new THREE.RingGeometry(CENTER_R - 0.10, CENTER_R, 64), logoMat);
  centRing.rotation.x = -Math.PI / 2;
  centRing.position.y = LOGO_Y;
  scene.add(centRing);

  // Satellite circles — one in front of each interactive exhibit
  const SAT_R = 0.90;
  const SAT_W = 0.08;
  const logoSats = [
    { x: -5.5, z: -2.75 }, // Bookstand pedestal (left wall, back)
    { x: -6.0, z:  2.75 }, // TV (left wall, front)
    { x:  5.5, z:  8.0  }, // Arcade cabinet (front-right)
    { x:  0.0, z: -8.0  }, // Fin du Monde — midpoint between screen (-1.75) and globe (1.75)
    { x:  6.0, z:  3.0  }, // Culture map / Kultur-kartet (right wall)
  ];

  for (const { x, z } of logoSats) {
    // Satellite ring
    const ring = new THREE.Mesh(new THREE.RingGeometry(SAT_R - SAT_W, SAT_R, 48), logoMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, LOGO_Y, z);
    scene.add(ring);

    // Connector strip: runs from the edge of the central circle to the edge of the satellite
    const dist = Math.sqrt(x * x + z * z);
    const len  = dist - CENTER_R - SAT_R;
    const nx = x / dist, nz = z / dist;
    const midX = nx * (CENTER_R + len / 2);
    const midZ = nz * (CENTER_R + len / 2);

    const connector = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.01, Math.max(len, 0.01)),
      logoMat,
    );
    connector.position.set(midX, LOGO_Y, midZ);
    connector.rotation.y = Math.atan2(nx, nz);
    scene.add(connector);
  }

  return { clickables: [doorClickTarget] };
}
