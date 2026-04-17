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
    color: 0xc8d8e8,
    transparent: true,
    opacity: 0.7,
    roughness: 0.6,
    metalness: 0.05,
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

    const sideMullion = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, WALL_H, 0.05),
      frameMat
    );
    sideMullion.position.set(sx, WALL_H / 2, 0);
    glasshus.add(sideMullion);
  }

  // ── Back wall — opaque grey ──
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_W, WALL_H),
    backWallMat
  );
  backWall.position.set(0, WALL_H / 2, -WALL_D / 2);
  backWall.rotation.y = Math.PI;
  glasshus.add(backWall);

  // ── Frame: horizontal beams, vertical corner posts ──
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

  // ── Pyramid roof — 4-sided cone ──
  const roofRadius = Math.sqrt((WALL_W / 2) * (WALL_W / 2) + (WALL_D / 2) * (WALL_D / 2)) + 0.12;
  const roofHeight = 1.6;
  const roofGeom   = new THREE.ConeGeometry(roofRadius, roofHeight, 4);
  const roof = new THREE.Mesh(roofGeom, glassMat);
  roof.position.set(0, WALL_H + roofHeight / 2, 0);
  roof.rotation.y = Math.PI / 4;
  roof.raycast = () => {};
  glasshus.add(roof);


  // ── Glass double doors ──
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, WALL_D / 2);
  glasshus.add(doorGroup);

  const doorFrameMat = new THREE.MeshStandardMaterial({
    color: 0xbbbbbb,
    roughness: 0.3,
    metalness: 0.7
  });

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

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.4, 0.03),
      doorFrameMat
    );
    handle.position.set(dpx > 0 ? dpx - 0.13 : dpx + 0.13, 1.05, 0.05);
    doorGroup.add(handle);
  }

  // INVISIBLE click target
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

  // ────────────────────────────────────────────────────────────────
  // ── Surroundings ──
  // ────────────────────────────────────────────────────────────────

  // ── Grey stone walls flanking the glasshus ──
  // Reference: concrete/stone blocks on both sides of the glass volume
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x8a8878,
    roughness: 0.9,
    metalness: 0.0
  });

  // Helper: build one stone wall section as a simple box
  function addStoneWall(group, x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  }

  const wallsGroup = new THREE.Group();
  wallsGroup.position.set(ox, 0, -2);  // same world-space anchor as glasshus
  scene.add(wallsGroup);

  const sWallH = WALL_H;          // same height as glasshus
  const sWallD = WALL_D + 0.1;    // flush with glasshus depth
  const sWallW = 1.8;             // how wide the flanking wall is

  // Left flanking wall (glasshus left = -WALL_W/2, so stone wall extends further left)
  addStoneWall(wallsGroup, -(WALL_W / 2 + sWallW / 2), sWallH / 2, 0, sWallW, sWallH, sWallD);
  // Left side-return wall (perpendicular, runs back away from viewer)
  addStoneWall(wallsGroup, -(WALL_W / 2 + sWallW), sWallH / 2, -sWallD / 2 - 0.9, 0.3, sWallH, 2.0);

  // Right flanking wall
  addStoneWall(wallsGroup,  (WALL_W / 2 + sWallW / 2), sWallH / 2, 0, sWallW, sWallH, sWallD);
  // Right side-return wall
  addStoneWall(wallsGroup,  (WALL_W / 2 + sWallW), sWallH / 2, -sWallD / 2 - 0.9, 0.3, sWallH, 2.0);

  // ── Brown hedge with green top ──
  // Flanks both sides of the path, in front of the building
  const hedgeStemMat = new THREE.MeshStandardMaterial({ color: 0x4a2a0a, roughness: 0.9 });
  const hedgeTopMat  = new THREE.MeshStandardMaterial({ color: 0x2a5a18, roughness: 0.8 });

  function addHedge(x, z, w, d) {
    const hedgeGroup = new THREE.Group();
    hedgeGroup.position.set(ox + x, 0, z);
    // Brown base (dead twigs / stems)
    const stem = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), hedgeStemMat);
    stem.position.y = 0.3;
    hedgeGroup.add(stem);
    // Green leafy top
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), hedgeTopMat);
    top.position.y = 0.85;
    hedgeGroup.add(top);
    scene.add(hedgeGroup);
  }

  // Hedges left and right of the path, positioned in front of stone walls
  addHedge(-(WALL_W / 2 + sWallW / 2), 1.0, sWallW, 0.5);  // left
  addHedge( (WALL_W / 2 + sWallW / 2), 1.0, sWallW, 0.5);  // right

  // ── 3 white wooden plank houses behind the glasshus ──
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 });

  // Canvas texture for white wooden planks
  function makePlankTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f0ece4';
    ctx.fillRect(0, 0, 256, 256);
    // Horizontal plank lines
    for (let y = 0; y < 256; y += 20) {
      ctx.strokeStyle = '#d8d0c4';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      // Wood grain within plank
      ctx.strokeStyle = '#e4dcd0';
      ctx.lineWidth = 0.5;
      for (let g = 0; g < 3; g++) {
        const gy = y + 5 + Math.random() * 10;
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(256, gy + (Math.random() - 0.5) * 4); ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  const plankTex = makePlankTexture();
  const houseMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.8 });

  // Window material — dark glass
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x334455,
    roughness: 0.2,
    metalness: 0.3
  });
  const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });

  function addHouse(x, z, w, h, d, rotY) {
    const hGroup = new THREE.Group();
    hGroup.position.set(ox + x, 0, z);
    if (rotY) hGroup.rotation.y = rotY;

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), houseMat);
    body.position.y = h / 2;
    body.castShadow = true;
    hGroup.add(body);

    // Pyramid/gable roof
    const hRoofR = Math.sqrt((w / 2) ** 2 + (d / 2) ** 2) + 0.15;
    const hRoofH = h * 0.5;
    const hRoof = new THREE.Mesh(new THREE.ConeGeometry(hRoofR, hRoofH, 4), roofMat);
    hRoof.position.y = h + hRoofH / 2;
    hRoof.rotation.y = Math.PI / 4;
    hRoof.castShadow = true;
    hGroup.add(hRoof);

    // Windows on front face (z = +d/2)
    const winW = 0.5, winH = 0.7;
    const winSpacing = w / 3;
    for (let i = 0; i < 2; i++) {
      const wx = -winSpacing / 2 + i * winSpacing;
      // Window glass
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(winW, winH),
        windowMat
      );
      win.position.set(wx, h * 0.55, d / 2 + 0.01);
      hGroup.add(win);
      // Window frame (4 bars)
      const frameThick = 0.04;
      // Top
      const ft = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.06, frameThick, 0.03), windowFrameMat);
      ft.position.set(wx, h * 0.55 + winH / 2, d / 2 + 0.02);
      hGroup.add(ft);
      // Bottom
      const fb = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.06, frameThick, 0.03), windowFrameMat);
      fb.position.set(wx, h * 0.55 - winH / 2, d / 2 + 0.02);
      hGroup.add(fb);
      // Left
      const fl = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH + 0.06, 0.03), windowFrameMat);
      fl.position.set(wx - winW / 2, h * 0.55, d / 2 + 0.02);
      hGroup.add(fl);
      // Right
      const fr = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH + 0.06, 0.03), windowFrameMat);
      fr.position.set(wx + winW / 2, h * 0.55, d / 2 + 0.02);
      hGroup.add(fr);
      // Cross bar (horizontal middle)
      const fc = new THREE.Mesh(new THREE.BoxGeometry(winW, frameThick * 0.7, 0.03), windowFrameMat);
      fc.position.set(wx, h * 0.55, d / 2 + 0.02);
      hGroup.add(fc);
    }

    scene.add(hGroup);
  }

  // Three houses spread behind the glasshus — bigger, with slight rotation for depth
  addHouse(-6, -7.0, 4.5, 5.0, 4.0, 0.2);    // left house
  addHouse( 0, -9.0, 5.0, 5.5, 4.5, 0);       // centre house (largest)
  addHouse( 6, -6.5, 4.0, 4.5, 3.5, -0.15);   // right house

  // ── CDN signpost ──
  const signGroup = new THREE.Group();
  // Positioned left of path, close to the front
  signGroup.position.set(ox - 2.2, 0, 3.0);
  scene.add(signGroup);

  // Metal pole
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.4, metalness: 0.7 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 8), poleMat);
  pole.position.y = 1.1;
  signGroup.add(pole);

  // Sign panel — canvas texture with text
  const signCanvas = document.createElement('canvas');
  signCanvas.width  = 512;
  signCanvas.height = 192;
  const sgnctx = signCanvas.getContext('2d');

  // Background
  sgnctx.fillStyle = '#1a2a3a';
  sgnctx.fillRect(0, 0, 512, 192);

  // Border
  sgnctx.strokeStyle = '#cccccc';
  sgnctx.lineWidth = 4;
  sgnctx.strokeRect(6, 6, 500, 180);

  // CDN logo-ish stripe
  sgnctx.fillStyle = '#3366aa';
  sgnctx.fillRect(6, 6, 500, 40);

  // Text: CDN abbreviation in stripe
  sgnctx.fillStyle = '#ffffff';
  sgnctx.font = 'bold 26px Arial, sans-serif';
  sgnctx.textAlign = 'center';
  sgnctx.fillText('CDN', 256, 34);

  // Main line
  sgnctx.fillStyle = '#e8eef5';
  sgnctx.font = 'bold 20px Arial, sans-serif';
  sgnctx.fillText('Center for Digital Narrative', 256, 90);

  // Sub line
  sgnctx.fillStyle = '#aabbcc';
  sgnctx.font = '16px Arial, sans-serif';
  sgnctx.fillText('University of Bergen', 256, 120);

  // Small arrow hint
  sgnctx.fillStyle = '#7799bb';
  sgnctx.font = '13px Arial, sans-serif';
  sgnctx.fillText('▶  Enter to explore', 256, 158);

  const signTex  = new THREE.CanvasTexture(signCanvas);
  const signPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.52, 0.04),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 })
  );
  signPanel.position.set(0.75, 1.9, 0);
  signGroup.add(signPanel);

  // ── Trees ──
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });

  function addTree(x, z, trunkH, canopyR) {
    const tree = new THREE.Group();
    tree.position.set(ox + x, 0, z);

    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, trunkH, 8),
      trunkMat
    );
    trunk.position.y = trunkH / 2;
    tree.add(trunk);

    // Canopy — layered spheres for a full look
    const canopyColors = [0x2a6a1a, 0x3a7a2a, 0x2a5a18];
    for (let i = 0; i < 3; i++) {
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(canopyR * (1 - i * 0.15), 8, 6),
        new THREE.MeshStandardMaterial({ color: canopyColors[i], roughness: 0.85 })
      );
      canopy.position.set(
        (Math.random() - 0.5) * canopyR * 0.4,
        trunkH + canopyR * 0.4 + i * canopyR * 0.3,
        (Math.random() - 0.5) * canopyR * 0.4
      );
      tree.add(canopy);
    }

    scene.add(tree);
  }

  // Trees scattered around the scene
  addTree(-8, -3, 3.0, 1.8);    // far left
  addTree(-5, 2, 2.5, 1.5);     // left of path
  addTree(5, 3, 2.8, 1.6);      // right of path
  addTree(8, -2, 3.2, 2.0);     // far right
  addTree(-3, 7, 2.2, 1.3);     // behind spawn left
  addTree(4, 8, 2.6, 1.4);      // behind spawn right
  addTree(-7, -8, 3.5, 2.2);    // behind houses left
  addTree(8, -8, 3.0, 1.9);     // behind houses right

  // ── Flower patches ──
  const flowerColors = [0xff4466, 0xffaa22, 0xcc44ff, 0xff6699, 0xffdd44, 0x4488ff];

  function addFlowerPatch(cx, cz, count, spread) {
    for (let i = 0; i < count; i++) {
      const fx = cx + (Math.random() - 0.5) * spread;
      const fz = cz + (Math.random() - 0.5) * spread;
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];

      const flower = new THREE.Group();
      flower.position.set(ox + fx, 0, fz);

      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.25 + Math.random() * 0.15, 4),
        new THREE.MeshLambertMaterial({ color: 0x2a6a1a })
      );
      stem.position.y = 0.15;
      flower.add(stem);

      // Petals (small sphere)
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 4),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
      );
      petal.position.y = 0.3 + Math.random() * 0.1;
      flower.add(petal);

      scene.add(flower);
    }
  }

  // Flower patches around the grounds
  addFlowerPatch(-3.5, 1.5, 8, 1.5);   // left of path near hedge
  addFlowerPatch(3.5, 1.5, 8, 1.5);    // right of path near hedge
  addFlowerPatch(-6, 4, 6, 2.0);       // left garden area
  addFlowerPatch(6, 4, 6, 2.0);        // right garden area
  addFlowerPatch(-4, -4, 5, 1.5);      // near left house
  addFlowerPatch(4, -4, 5, 1.5);       // near right house

  return { offset: OFFSET, clickables };
}
