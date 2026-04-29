// src/scene/room.js
import * as THREE from 'three';

// Gallery dimensions — museum-hall scale, white cube.
export const ROOM_WIDTH  = 16;  // X
export const ROOM_DEPTH  = 22;  // Z
export const ROOM_HEIGHT = 7;   // Y

export function createRoom(scene) {
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0d1f33, metalness: 0.05, roughness: 0.85, side: THREE.DoubleSide
  });
  // Tiled floor — one tile per canvas, repeated across the floor
  const TILE_SIZE = 4; // 4 m per tile
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 512; tileCanvas.height = 512;
  const tctx = tileCanvas.getContext('2d');
  tctx.fillStyle = '#252830';           // dark grey tile
  tctx.fillRect(0, 0, 512, 512);
  tctx.strokeStyle = '#0e1018';         // near-black grout
  tctx.lineWidth = 6;
  tctx.strokeRect(3, 3, 506, 506);
  const tileTex = new THREE.CanvasTexture(tileCanvas);
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
  tileTex.repeat.set(ROOM_WIDTH / TILE_SIZE, ROOM_DEPTH / TILE_SIZE);
  tileTex.anisotropy = 8;
  const floorMat = new THREE.MeshStandardMaterial({
    map: tileTex, metalness: 0.1, roughness: 0.9
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x0a1420, metalness: 0.05, roughness: 0.9
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
  dirLight.shadow.mapSize.set(1024, 1024);
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
}
