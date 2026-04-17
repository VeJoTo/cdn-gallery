// src/scene/exterior-room.js
import * as THREE from 'three';

const OFFSET = new THREE.Vector3(-20, 0, 0);

export function createExteriorRoom(scene) {
  const ox = OFFSET.x;

  // ── Sky dome — overcast Bergen sky ──
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 256;
  skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  const skyGrad = sctx.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0,   '#7a8899');
  skyGrad.addColorStop(0.4, '#9aaabb');
  skyGrad.addColorStop(0.7, '#b8c8d4');
  skyGrad.addColorStop(1,   '#ccd8e0');
  sctx.fillStyle = skyGrad;
  sctx.fillRect(0, 0, 256, 256);
  // Overcast cloud ellipses — soft, diffuse
  sctx.fillStyle = 'rgba(255,255,255,0.25)';
  sctx.beginPath(); sctx.ellipse(50,  40, 55, 22, 0, 0, Math.PI * 2); sctx.fill();
  sctx.fillStyle = 'rgba(255,255,255,0.18)';
  sctx.beginPath(); sctx.ellipse(160, 60, 65, 20, 0, 0, Math.PI * 2); sctx.fill();
  sctx.fillStyle = 'rgba(255,255,255,0.20)';
  sctx.beginPath(); sctx.ellipse(210, 30, 40, 14, 0, 0, Math.PI * 2); sctx.fill();
  sctx.fillStyle = 'rgba(255,255,255,0.15)';
  sctx.beginPath(); sctx.ellipse(95,  90, 50, 18, 0, 0, Math.PI * 2); sctx.fill();
  sctx.fillStyle = 'rgba(200,210,220,0.20)';
  sctx.beginPath(); sctx.ellipse(130, 120, 80, 25, 0, 0, Math.PI * 2); sctx.fill();

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(28, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
  );
  sky.position.set(ox, 2, 0);
  scene.add(sky);

  // ── Ground — green grass, 30x30 ──
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256;
  grassCanvas.height = 256;
  const gctx = grassCanvas.getContext('2d');
  gctx.fillStyle = '#3a7a30';
  gctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 600; i++) {
    const bx = Math.random() * 256;
    const by = Math.random() * 256;
    gctx.strokeStyle = Math.random() > 0.5 ? '#4a8a3a' : '#2a6020';
    gctx.lineWidth = 1;
    gctx.beginPath();
    gctx.moveTo(bx, by);
    gctx.lineTo(bx + (Math.random() - 0.5) * 4, by - 3 - Math.random() * 7);
    gctx.stroke();
  }
  const grassTex = new THREE.CanvasTexture(grassCanvas);
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(8, 8);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(ox, -0.01, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Paved stone path — 2.5 wide, runs from spawn toward glasshus ──
  const pathCanvas = document.createElement('canvas');
  pathCanvas.width = 256;
  pathCanvas.height = 256;
  const pctx = pathCanvas.getContext('2d');
  pctx.fillStyle = '#b0a898';
  pctx.fillRect(0, 0, 256, 256);
  pctx.strokeStyle = '#8a8070';
  pctx.lineWidth = 2;
  for (let py = 0; py < 256; py += 32) {
    pctx.beginPath(); pctx.moveTo(0, py); pctx.lineTo(256, py); pctx.stroke();
  }
  for (let px = 0; px < 256; px += 48) {
    pctx.beginPath(); pctx.moveTo(px, 0); pctx.lineTo(px, 256); pctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    pctx.fillStyle = `rgba(${(120 + Math.random() * 30) | 0},${(110 + Math.random() * 20) | 0},${(95 + Math.random() * 15) | 0},0.18)`;
    pctx.fillRect(Math.random() * 230, Math.random() * 230, 20 + Math.random() * 20, 20 + Math.random() * 12);
  }
  const pathTex = new THREE.CanvasTexture(pathCanvas);
  pathTex.wrapS = THREE.RepeatWrapping;
  pathTex.wrapT = THREE.RepeatWrapping;
  pathTex.repeat.set(1, 3);
  const stonePath = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 12),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.8 })
  );
  stonePath.rotation.x = -Math.PI / 2;
  stonePath.position.set(ox, 0.002, 4);
  stonePath.receiveShadow = true;
  scene.add(stonePath);

  // ── Lighting — flat overcast Bergen day ──
  const ambient = new THREE.AmbientLight(0xb0b8c0, 0.7);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xc8d0d8, 0.4);
  dirLight.position.set(ox - 4, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near   = 0.5;
  dirLight.shadow.camera.far    = 30;
  dirLight.shadow.camera.left   = -12;
  dirLight.shadow.camera.right  =  12;
  dirLight.shadow.camera.top    =  12;
  dirLight.shadow.camera.bottom = -12;
  scene.add(dirLight);

  const interiorGlow = new THREE.PointLight(0xffddaa, 1.2, 7);
  interiorGlow.position.set(ox, 1.5, -2);
  scene.add(interiorGlow);

  // ────────────────────────────────────────────────────────────────
  // ── Glasshus group — CDN glass pavilion ──
  // ────────────────────────────────────────────────────────────────
  const glasshus = new THREE.Group();
  glasshus.position.set(ox, 0, -2);
  scene.add(glasshus);

  const WALL_H = 3.0;
  const WALL_W = 4.0;
  const WALL_D = 3.5;

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xddeeff,
    transparent: true,
    opacity: 0.3,
    roughness: 0.05,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.3,
    metalness: 0.6
  });

  const backWallMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.8,
    metalness: 0.0
  });

  // ── Front wall: 3 glass panels with vertical mullions ──
  // Front face is at local z = +WALL_D/2 (facing +Z, toward player spawn)
  const panelW = WALL_W / 3;
  for (let p = 0; p < 3; p++) {
    const panelX = -WALL_W / 2 + panelW * p + panelW / 2;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(panelW - 0.06, WALL_H),
      glassMat
    );
    panel.position.set(panelX, WALL_H / 2, WALL_D / 2);
    panel.raycast = () => {};
    glasshus.add(panel);
  }
  // Vertical mullions between front panels
  for (let m = 1; m <= 2; m++) {
    const mullion = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, WALL_H, 0.05),
      frameMat
    );
    mullion.position.set(-WALL_W / 2 + panelW * m, WALL_H / 2, WALL_D / 2);
    glasshus.add(mullion);
  }

  // ── Side walls ──
  for (const sx of [-WALL_W / 2, WALL_W / 2]) {
    const sidePanel = new THREE.Mesh(
      new THREE.PlaneGeometry(WALL_D, WALL_H),
      glassMat
    );
    sidePanel.position.set(sx, WALL_H / 2, 0);
    sidePanel.rotation.y = Math.PI / 2;
    sidePanel.raycast = () => {};
    glasshus.add(sidePanel);

    // Centre mullion on each side wall
    const sideMullion = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, WALL_H, 0.05),
      frameMat
    );
    sideMullion.position.set(sx, WALL_H / 2, 0);
    glasshus.add(sideMullion);
  }

  // ── Back wall — opaque grey (transitions to AI room) ──
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_W, WALL_H),
    backWallMat
  );
  backWall.position.set(0, WALL_H / 2, -WALL_D / 2);
  backWall.rotation.y = Math.PI;
  glasshus.add(backWall);

  // ── Frame: horizontal beams (top + bottom), vertical corner posts ──
  const beamGeomFront = new THREE.BoxGeometry(WALL_W, 0.06, 0.06);
  const beamGeomSide  = new THREE.BoxGeometry(0.06, 0.06, WALL_D);
  for (const bz of [-WALL_D / 2, WALL_D / 2]) {
    for (const by of [0, WALL_H]) {
      const beam = new THREE.Mesh(beamGeomFront, frameMat);
      beam.position.set(0, by, bz);
      glasshus.add(beam);
    }
  }
  for (const sx of [-WALL_W / 2, WALL_W / 2]) {
    for (const by of [0, WALL_H]) {
      const beam = new THREE.Mesh(beamGeomSide, frameMat);
      beam.position.set(sx, by, 0);
      glasshus.add(beam);
    }
  }
  // Vertical corner posts
  const postGeom = new THREE.BoxGeometry(0.06, WALL_H, 0.06);
  const cornerDefs = [
    [-WALL_W / 2, -WALL_D / 2],
    [-WALL_W / 2,  WALL_D / 2],
    [ WALL_W / 2, -WALL_D / 2],
    [ WALL_W / 2,  WALL_D / 2],
  ];
  for (const [cx, cz] of cornerDefs) {
    const post = new THREE.Mesh(postGeom, frameMat);
    post.position.set(cx, WALL_H / 2, cz);
    glasshus.add(post);
  }

  // ── Pyramid roof — 4-sided cone, glass ──
  // Radius large enough to reach all four corners
  const roofRadius = Math.sqrt((WALL_W / 2) * (WALL_W / 2) + (WALL_D / 2) * (WALL_D / 2)) + 0.12;
  const roofHeight = 1.6;
  const roofGeom = new THREE.ConeGeometry(roofRadius, roofHeight, 4);
  const roof = new THREE.Mesh(roofGeom, glassMat);
  roof.position.set(0, WALL_H + roofHeight / 2, 0);
  roof.rotation.y = Math.PI / 4;  // align faces to building axes
  roof.raycast = () => {};
  glasshus.add(roof);

  // Ridge frame edges (apex to each corner — thin box per edge)
  const apexY  = WALL_H + roofHeight;
  const baseY  = WALL_H;
  for (const [rcx, rcz] of cornerDefs) {
    const dx  = -rcx;  // direction from corner to apex (apex is at 0,0 in XZ)
    const dz  = -rcz;
    const len = Math.sqrt(rcx * rcx + rcz * rcz + roofHeight * roofHeight);
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, len, 0.04),
      frameMat
    );
    // Place midpoint between corner base and apex
    ridge.position.set(rcx / 2, (baseY + apexY) / 2, rcz / 2);
    // Point toward apex: compute pitch and yaw
    const horizDist = Math.sqrt(rcx * rcx + rcz * rcz);
    const pitch = Math.atan2(roofHeight, horizDist);  // angle up from horizontal
    const yaw   = Math.atan2(rcx, rcz);               // rotation around Y
    ridge.rotation.order = 'YXZ';
    ridge.rotation.y = yaw;
    ridge.rotation.x = -pitch;
    glasshus.add(ridge);
  }

  // ── Glass double doors — front face, centred ──
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, WALL_D / 2);
  glasshus.add(doorGroup);

  const doorFrameMat = new THREE.MeshStandardMaterial({
    color: 0xbbbbbb,
    roughness: 0.3,
    metalness: 0.7
  });

  // Door frame: top beam + two side posts
  const doorFrameTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.07, 0.07),
    doorFrameMat
  );
  doorFrameTop.position.set(0, 2.2, 0);
  doorGroup.add(doorFrameTop);

  for (const fx of [-0.55, 0.55]) {
    const sidePost = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 2.2, 0.07),
      doorFrameMat
    );
    sidePost.position.set(fx, 1.1, 0);
    doorGroup.add(sidePost);
  }

  // Two door panels — glass
  const doorPanelMat = new THREE.MeshPhysicalMaterial({
    color: 0xddeeff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.04,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  for (const dpx of [-0.265, 0.265]) {
    const doorPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.47, 2.1),
      doorPanelMat
    );
    doorPanel.position.set(dpx, 1.1, 0.01);
    doorPanel.raycast = () => {};
    doorGroup.add(doorPanel);

    // Door handle bar
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.4, 0.03),
      doorFrameMat
    );
    handle.position.set(dpx > 0 ? dpx - 0.13 : dpx + 0.13, 1.05, 0.05);
    doorGroup.add(handle);
  }

  // INVISIBLE click target — this is what the raycaster hits
  const doorClickTarget = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 2.2, 0.2),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  doorClickTarget.position.set(0, 1.1, 0);
  doorClickTarget.userData = {
    clickable: true,
    action: 'enterAIRoom',
    label: 'Enter CDN'
  };
  doorGroup.add(doorClickTarget);

  const clickables = [doorClickTarget];

  return { offset: OFFSET, clickables };
}
