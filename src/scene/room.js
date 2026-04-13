// src/scene/room.js
import * as THREE from 'three';

export function createRoom(scene) {
  // Chess board floor
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const fctx = floorCanvas.getContext('2d');
  const tileSize = 64;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      fctx.fillStyle = (row + col) % 2 === 0 ? '#1e1230' : '#2d1f3d';
      fctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
    }
  }
  const floorTex = new THREE.CanvasTexture(floorCanvas);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.25,
    metalness: 0.3,
    side: THREE.FrontSide
  });
  // Brick-textured walls
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 256;
  wallCanvas.height = 256;
  const wctx = wallCanvas.getContext('2d');
  // Base wall color
  wctx.fillStyle = '#2d1f3d';
  wctx.fillRect(0, 0, 256, 256);
  // Mortar lines (slightly lighter)
  wctx.strokeStyle = '#3a2850';
  wctx.lineWidth = 2;
  const brickH = 20;
  const brickW = 50;
  for (let row = 0; row < 256 / brickH; row++) {
    const y = row * brickH;
    wctx.beginPath();
    wctx.moveTo(0, y);
    wctx.lineTo(256, y);
    wctx.stroke();
    const offset = (row % 2) * (brickW / 2);
    for (let x = offset; x < 256; x += brickW) {
      wctx.beginPath();
      wctx.moveTo(x, y);
      wctx.lineTo(x, y + brickH);
      wctx.stroke();
    }
  }
  const wallTex = new THREE.CanvasTexture(wallCanvas);
  wallTex.wrapS = THREE.RepeatWrapping;
  wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(3, 2);
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x0a0018,
    emissive: 0x3a2050,
    emissiveIntensity: 0.5,
    roughness: 0.85,
    side: THREE.FrontSide
  });
  const ceilMat  = new THREE.MeshStandardMaterial({
    color: 0x1a1028,
    emissive: 0x2a1838,
    emissiveIntensity: 0.35,
    side: THREE.FrontSide
  });

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
  const ambient = new THREE.AmbientLight(0x6a3070, 0.9);
  scene.add(ambient);

  // Hemisphere light: hot pink from above, dark navy from below
  const hemi = new THREE.HemisphereLight(0xff66cc, 0x2a1838, 0.8);
  hemi.position.set(0, 4, 0);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffaa66, 0.6);
  dirLight.position.set(2, 8, 6);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -8;
  dirLight.shadow.camera.right = 8;
  dirLight.shadow.camera.top = 8;
  dirLight.shadow.camera.bottom = -8;
  scene.add(dirLight);

  const neonPink = new THREE.PointLight(0xff00ff, 2.5, 8);
  neonPink.position.set(-2.5, 1.5, 0.5);
  scene.add(neonPink);

  const neonTeal = new THREE.PointLight(0x00ffff, 2.5, 8);
  neonTeal.position.set(2.5, 1.5, 0.5);
  scene.add(neonTeal);

  const neonPurple = new THREE.PointLight(0xaa00ff, 1.5, 12);
  neonPurple.position.set(0, 2.5, 1.5);
  scene.add(neonPurple);

  // Neon floor strips along the base of left & right walls
  const stripGeom = new THREE.BoxGeometry(7, 0.02, 0.06);

  const leftStripMat = new THREE.MeshStandardMaterial({
    color: 0xff44aa, emissive: 0xff44aa, emissiveIntensity: 2.0
  });
  const leftStrip = new THREE.Mesh(stripGeom, leftStripMat);
  leftStrip.rotation.y = Math.PI / 2;
  leftStrip.position.set(-3.45, 0.01, 0);
  scene.add(leftStrip);

  const rightStripMat = new THREE.MeshStandardMaterial({
    color: 0xa8d8ea, emissive: 0xa8d8ea, emissiveIntensity: 2.0
  });
  const rightStrip = new THREE.Mesh(stripGeom, rightStripMat);
  rightStrip.rotation.y = -Math.PI / 2;
  rightStrip.position.set(3.45, 0.01, 0);
  scene.add(rightStrip);

  // ── Ceiling-edge neon strips (LED tape along top of walls) ──
  const ceilingY = 3.45;

  // Left wall top edge — cyan, runs along z (room depth = 6)
  const sideStripGeom = new THREE.BoxGeometry(6, 0.04, 0.08);

  const leftCeilMat = new THREE.MeshStandardMaterial({
    color: 0xa8d8ea, emissive: 0xa8d8ea, emissiveIntensity: 2.5
  });
  const leftCeilStrip = new THREE.Mesh(sideStripGeom, leftCeilMat);
  leftCeilStrip.rotation.y = Math.PI / 2;
  leftCeilStrip.position.set(-3.45, ceilingY, 0);
  scene.add(leftCeilStrip);

  // Right wall top edge — soft pink, runs along z
  const rightCeilMat = new THREE.MeshStandardMaterial({
    color: 0xf2a6c1, emissive: 0xf2a6c1, emissiveIntensity: 2.5
  });
  const rightCeilStrip = new THREE.Mesh(sideStripGeom, rightCeilMat);
  rightCeilStrip.rotation.y = -Math.PI / 2;
  rightCeilStrip.position.set(3.45, ceilingY, 0);
  scene.add(rightCeilStrip);

  // Back wall top edge — hot pink, runs along x (room width = 7)
  const backStripGeom = new THREE.BoxGeometry(7, 0.04, 0.08);
  const backCeilMat = new THREE.MeshStandardMaterial({
    color: 0xe84393, emissive: 0xe84393, emissiveIntensity: 2.5
  });
  const backCeilStrip = new THREE.Mesh(backStripGeom, backCeilMat);
  backCeilStrip.position.set(0, ceilingY, -2.96);
  scene.add(backCeilStrip);

  // Warm amber ceiling accent strip (parallel to back wall, offset)
  const amberCeilMat = new THREE.MeshStandardMaterial({
    color: 0xffaa44, emissive: 0xffaa44, emissiveIntensity: 2.0
  });
  const amberCeilStrip = new THREE.Mesh(new THREE.BoxGeometry(7, 0.04, 0.08), amberCeilMat);
  amberCeilStrip.position.set(0, ceilingY, -1.5);
  scene.add(amberCeilStrip);

  const amberFill = new THREE.PointLight(0xffaa44, 1.5, 10);
  amberFill.position.set(0, 3.2, -1.5);
  scene.add(amberFill);

  // Back wall floor strip — cream, runs along x at the base
  const backFloorMat = new THREE.MeshStandardMaterial({
    color: 0xf8f1e0, emissive: 0xf8f1e0, emissiveIntensity: 2.0
  });
  const backFloorStrip = new THREE.Mesh(backStripGeom, backFloorMat);
  backFloorStrip.position.set(0, 0.01, -2.96);
  scene.add(backFloorStrip);

  // ── Vertical corner strips (cream) at back-left and back-right ──
  const cornerStripGeom = new THREE.BoxGeometry(0.06, 3.45, 0.06);
  const cornerMat = new THREE.MeshStandardMaterial({
    color: 0xf8f1e0, emissive: 0xf8f1e0, emissiveIntensity: 1.5
  });

  const backLeftCorner = new THREE.Mesh(cornerStripGeom, cornerMat);
  backLeftCorner.position.set(-3.45, 1.725, -2.96);
  scene.add(backLeftCorner);

  const backRightCorner = new THREE.Mesh(cornerStripGeom, cornerMat);
  backRightCorner.position.set(3.45, 1.725, -2.96);
  scene.add(backRightCorner);

  // ── Exposed cables running along walls (cyberpunk detail) ──
  const cableMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2a });
  const cableGlowMat = new THREE.MeshStandardMaterial({
    color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.6
  });

  // Horizontal cable bundles along left wall at mid-height
  for (let i = 0; i < 3; i++) {
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 6, 6),
      cableMat
    );
    cable.rotation.x = Math.PI / 2;
    cable.position.set(-3.44, 1.0 + i * 0.08, 0);
    cable.rotation.y = Math.PI / 2;
    scene.add(cable);
  }

  // Horizontal cable bundles along right wall
  for (let i = 0; i < 3; i++) {
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 6, 6),
      cableMat
    );
    cable.rotation.x = Math.PI / 2;
    cable.position.set(3.44, 1.2 + i * 0.08, 0);
    cable.rotation.y = Math.PI / 2;
    scene.add(cable);
  }

  // Vertical cable drops from ceiling (3 spots)
  const dropPositions = [
    { x: -2.0, z: -2.5 },
    { x: 1.0, z: -2.8 },
    { x: 3.0, z: 1.0 }
  ];
  for (const { x, z } of dropPositions) {
    const drop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1.5, 6),
      cableMat
    );
    drop.position.set(x, 2.75, z);
    scene.add(drop);

    // Small glowing connector node at the bottom
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      cableGlowMat
    );
    node.position.set(x, 2.0, z);
    scene.add(node);
  }

  // Diagonal cable across back wall
  const diagCable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 4, 6),
    cableMat
  );
  diagCable.position.set(0, 2.2, -2.95);
  diagCable.rotation.z = 0.3;
  scene.add(diagCable);

  // ── Coloured fill lights near each ceiling strip ──
  const cyanFill = new THREE.PointLight(0xa8d8ea, 3.0, 14);
  cyanFill.position.set(-3.0, 3.2, 0);
  scene.add(cyanFill);

  const purpleFill = new THREE.PointLight(0xf2a6c1, 3.0, 14);
  purpleFill.position.set(3.0, 3.2, 0);
  scene.add(purpleFill);

  const pinkFill = new THREE.PointLight(0xe84393, 3.0, 14);
  pinkFill.position.set(0, 3.2, -2.5);
  scene.add(pinkFill);

  // Extra centre fill — cream to brighten everything
  const centerFill = new THREE.PointLight(0xff00ff, 2.0, 16);
  centerFill.position.set(0, 2.8, 1.0);
  scene.add(centerFill);
}
