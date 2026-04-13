// src/scene/objects.js
import * as THREE from 'three';

function buildArcadeCabinet(xPos, screenColor) {
  const group = new THREE.Group();
  group.position.set(xPos, 0, 0.2);

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 2.0, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x080f18 })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  // Monitor bezel
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.52, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x030810 })
  );
  bezel.position.set(0, 1.45, 0.31);
  group.add(bezel);

  // Screen (neon emissive)
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.42, 0.02),
    new THREE.MeshStandardMaterial({
      color: screenColor,
      emissive: screenColor,
      emissiveIntensity: 1.2
    })
  );
  screen.position.set(0, 1.45, 0.35);
  group.add(screen);

  // Control panel
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.08, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x0d1a28 })
  );
  panel.position.set(0, 0.92, 0.22);
  panel.rotation.x = 0.25;
  group.add(panel);

  // Joystick base
  const jBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  jBase.position.set(-0.15, 0.97, 0.3);
  group.add(jBase);

  // Joystick stick
  const jStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  jStick.position.set(-0.15, 1.03, 0.3);
  group.add(jStick);

  // Buttons (3): pink, teal, gold
  const buttonColors = [0xff006e, 0x00e5ff, 0xffd166];
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8),
      new THREE.MeshStandardMaterial({
        color: buttonColors[i],
        emissive: buttonColors[i],
        emissiveIntensity: 0.8
      })
    );
    btn.position.set(0.05 + i * 0.13, 0.97, 0.32);
    btn.rotation.x = -0.25;
    group.add(btn);
  }

  return group;
}

function buildTable() {
  const group = new THREE.Group();
  group.position.set(0, 0, 1.5);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.08, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  top.position.y = 0.44;
  top.castShadow = true;
  group.add(top);

  const legMat = new THREE.MeshLambertMaterial({ color: 0x0d1b2a });
  const legPositions = [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]];
  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.06), legMat);
    leg.position.set(lx, 0.22, lz);
    group.add(leg);
  }

  const cardMat = new THREE.MeshLambertMaterial({ color: 0xe0f7ff, side: THREE.DoubleSide });
  for (let i = 0; i < 2; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), cardMat);
    card.rotation.x = -Math.PI / 2;
    card.position.set(-0.25 + i * 0.55, 0.49, 0);
    group.add(card);
  }

  return group;
}

function buildBeanBag(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const base = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  base.scale.y = 0.55;
  base.position.y = 0.24;
  base.castShadow = true;
  group.add(base);

  const cushion = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x9b00ff })
  );
  cushion.scale.y = 0.45;
  cushion.position.y = 0.46;
  cushion.castShadow = true;
  group.add(cushion);

  return group;
}

function buildDesk() {
  const group = new THREE.Group();
  group.position.set(1.8, 0, -2.6);

  // Desk top
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.06, 0.9),
    new THREE.MeshLambertMaterial({ color: 0x0d1b2a })
  );
  top.position.y = 0.85;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Desk legs
  const legMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const legXs = [-1.15, 1.15];
  const legZs = [-0.4, 0.4];
  for (const lx of legXs) {
    for (const lz of legZs) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), legMat);
      leg.position.set(lx, 0.425, lz);
      group.add(leg);
    }
  }

  // CRT monitors — chunky beige boxes
  const beigeMat = new THREE.MeshLambertMaterial({ color: 0xd4c8a8 });
  const innerBezelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  const monitorDefs = [
    { x: -0.55, rotY:  0.15, color: 0x9b00ff },
    { x:  0.55, rotY: -0.15, color: 0x00e5ff }
  ];
  const leftMonitorRefs = [];
  for (const { x, rotY, color } of monitorDefs) {
    // Beige outer body — chunky CRT cube
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.5, 0.5),
      beigeMat
    );
    body.position.set(x, 1.18, -0.4);
    body.rotation.y = rotY;
    group.add(body);

    // Inner black bezel
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.42, 0.04),
      innerBezelMat
    );
    bezel.position.set(
      x + Math.sin(rotY) * 0.23,
      1.18,
      -0.4 + Math.cos(rotY) * 0.23
    );
    bezel.rotation.y = rotY;
    group.add(bezel);

    // Glowing CRT screen
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.38, 0.02),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 1.0
      })
    );
    screen.position.set(
      x + Math.sin(rotY) * 0.245,
      1.18,
      -0.4 + Math.cos(rotY) * 0.245
    );
    screen.rotation.y = rotY;
    group.add(screen);

    if (x < 0) leftMonitorRefs.push(screen);
  }

  // The left monitor opens a panel
  leftMonitorRefs[0].userData = {
    clickable: true,
    action: 'openPanel',
    panelId: 'desk-research',
    panelTitle: 'Digital Storytelling Research'
  };

  // Beige keyboard
  const keyboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.025, 0.18),
    new THREE.MeshLambertMaterial({ color: 0xe8dcc4 })
  );
  keyboard.position.set(0, 0.895, 0.05);
  group.add(keyboard);

  // Tiny neon power LED on the keyboard (cyan)
  const kbLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.005, 0.015),
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.0
    })
  );
  kbLed.position.set(0.25, 0.91, 0.02);
  group.add(kbLed);

  // Beige mouse with cord
  const mouse = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.025, 0.09),
    new THREE.MeshLambertMaterial({ color: 0xe8dcc4 })
  );
  mouse.position.set(0.4, 0.895, 0.05);
  group.add(mouse);

  // Mouse cord stub
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.18, 6),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  cord.position.set(0.4, 0.9, -0.04);
  cord.rotation.x = Math.PI / 2;
  group.add(cord);

  // Stack of two VHS tapes on the right edge of the desk
  const vhsMat1 = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const vhsMat2 = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  const vhs1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.13), vhsMat1);
  vhs1.position.set(0.95, 0.905, -0.1);
  group.add(vhs1);
  const vhs2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.13), vhsMat2);
  vhs2.position.set(0.95, 0.945, -0.1);
  group.add(vhs2);

  // A floppy disk leaning against the keyboard
  const floppy = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.005, 0.13),
    new THREE.MeshLambertMaterial({ color: 0x222222 })
  );
  floppy.position.set(-0.4, 0.895, 0.18);
  group.add(floppy);

  const floppyLabel = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.006, 0.05),
    new THREE.MeshLambertMaterial({ color: 0xe8dcc4 })
  );
  floppyLabel.position.set(-0.4, 0.898, 0.155);
  group.add(floppyLabel);

  group.userData = { clickable: true, hotspot: 'desk' };

  return group;
}

function buildGamingChair() {
  const group = new THREE.Group();
  group.position.set(1.8, 0, -1.7);
  group.rotation.y = Math.PI;

  const frameMat = new THREE.MeshLambertMaterial({ color: 0x1b3a4b });
  const blackMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), frameMat);
  seat.position.y = 0.45;
  seat.castShadow = true;
  group.add(seat);

  // Backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.08), frameMat);
  back.position.set(0, 0.92, -0.21);
  back.castShadow = true;
  group.add(back);

  // Headrest neon stripe (pink)
  const headrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, 0.085),
    new THREE.MeshStandardMaterial({
      color: 0xff006e, emissive: 0xff006e, emissiveIntensity: 0.7
    })
  );
  headrest.position.set(0, 1.28, -0.205);
  group.add(headrest);

  // Vertical teal accent strip down the centre of the back
  const accent = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.85, 0.085),
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.7
    })
  );
  accent.position.set(0, 0.92, -0.205);
  group.add(accent);

  // Armrests
  for (const ax of [-0.29, 0.29]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.4), blackMat);
    arm.position.set(ax, 0.6, 0);
    group.add(arm);
  }

  // Centre pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6),
    blackMat
  );
  pole.position.y = 0.2;
  group.add(pole);

  // 5-arm wheel star
  for (let i = 0; i < 5; i++) {
    const armStar = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.04), blackMat);
    armStar.position.y = 0.02;
    armStar.rotation.y = (i / 5) * Math.PI * 2;
    armStar.position.x = Math.cos((i / 5) * Math.PI * 2) * 0.1;
    armStar.position.z = Math.sin((i / 5) * Math.PI * 2) * 0.1;
    group.add(armStar);
  }

  return group;
}

function buildBookshelf() {
  const group = new THREE.Group();
  group.position.set(-3.4, 0, -2.5);
  group.rotation.y = Math.PI / 2;

  const frameMat = new THREE.MeshLambertMaterial({ color: 0x1b3a4b });
  const shelfMat = new THREE.MeshLambertMaterial({ color: 0x0a1a28 });

  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.3), frameMat);
  frame.position.y = 0.9;
  frame.castShadow = true;
  group.add(frame);

  // Shelves
  const shelfYs = [0.5, 0.95, 1.4];
  for (const sy of shelfYs) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 0.28), shelfMat);
    shelf.position.y = sy;
    shelf.position.z = 0.001;
    group.add(shelf);
  }

  // Books — 4 colours rotated through, ~10 per shelf
  const bookColours = [0xff006e, 0x00e5ff, 0x9b00ff, 0xffd166, 0x1b3a4b];
  for (const sy of shelfYs) {
    let xOffset = -0.5;
    for (let i = 0; i < 10; i++) {
      const colour = bookColours[i % bookColours.length];
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.085, 0.22, 0.18),
        new THREE.MeshLambertMaterial({ color: colour })
      );
      book.position.set(xOffset + 0.04, sy + 0.13, 0);
      group.add(book);
      xOffset += 0.095 + (i % 3) * 0.005;
    }
  }

  return group;
}

function buildMiniFridge() {
  const group = new THREE.Group();
  group.position.set(-3.0, 0, -2.8);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.0, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x0a1a28 })
  );
  body.position.y = 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Door split trim
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.01, 0.605),
    new THREE.MeshLambertMaterial({ color: 0x030810 })
  );
  trim.position.y = 0.65;
  group.add(trim);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.2, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.6
    })
  );
  handle.position.set(0.3, 0.7, 0.31);
  group.add(handle);

  // Top emissive strip
  const topStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.02, 0.6),
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.0
    })
  );
  topStrip.position.y = 1.01;
  group.add(topStrip);

  return group;
}

function buildFloorLamp() {
  const group = new THREE.Group();
  group.position.set(2.6, 0, 1.8);

  const blackMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12),
    blackMat
  );
  base.position.y = 0.02;
  group.add(base);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8),
    blackMat
  );
  pole.position.y = 0.84;
  group.add(pole);

  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12),
    new THREE.MeshStandardMaterial({
      color: 0x9b00ff, emissive: 0x9b00ff, emissiveIntensity: 1.2
    })
  );
  tube.position.y = 1.7;
  group.add(tube);

  const halo = new THREE.PointLight(0x9b00ff, 0.5, 4);
  halo.position.y = 1.7;
  group.add(halo);

  return group;
}

function buildPoster(x, y, z, frameColor, accentColor, title, idx) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 440;
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#050d14';
  ctx.fillRect(0, 0, 320, 440);

  // Neon frame
  ctx.strokeStyle = '#' + frameColor.toString(16).padStart(6, '0');
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 304, 424);

  // Title
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 160, 50);

  // Geometric placeholder art
  ctx.fillStyle = '#' + accentColor.toString(16).padStart(6, '0');
  ctx.beginPath();
  ctx.arc(160, 200, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(80, 320);
  ctx.lineTo(240, 320);
  ctx.lineTo(160, 200);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = '#90e0ef';
  ctx.font = '14px sans-serif';
  ctx.fillText('PLACEHOLDER', 160, 400);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), mat);
  plane.position.set(x, y, z);
  plane.userData = {
    clickable: true,
    action: 'openPanel',
    panelId: 'poster-' + idx,
    panelTitle: title
  };
  return plane;
}

function buildNeonSign() {
  const group = new THREE.Group();
  group.position.set(1.8, 2.85, -2.97);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, 512, 192);

  // Neon pink glow text
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow layers (multiple strokes for neon effect)
  ctx.shadowColor = '#ff006e';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ff006e';
  ctx.fillText('GAME', 256, 60);
  ctx.fillText('ROOM', 256, 140);

  // Bright core
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ff8ab5';
  ctx.fillText('GAME', 256, 60);
  ctx.fillText('ROOM', 256, 140);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide
  });

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.56), mat);
  group.add(plane);

  return group;
}

function buildRug() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b3a4b';
  ctx.fillRect(0, 0, 256, 256);

  const rings = [
    { r: 110, color: '#ff006e' },
    { r: 85,  color: '#00e5ff' },
    { r: 60,  color: '#9b00ff' },
    { r: 35,  color: '#ffd166' }
  ];
  for (const { r, color } of rings) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.5), mat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.005, 0.5);
  rug.receiveShadow = true;
  return rug;
}

function buildPedestal() {
  const group = new THREE.Group();
  group.position.set(-2.8, 0, 2.6);

  // Column
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 1.0, 12),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  column.position.y = 0.5;
  column.castShadow = true;
  group.add(column);

  // Top plate
  const topPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.04, 12),
    new THREE.MeshLambertMaterial({ color: 0x0a1a28 })
  );
  topPlate.position.y = 1.02;
  group.add(topPlate);

  // Glow ring
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.012, 8, 24),
    new THREE.MeshStandardMaterial({
      color: 0x9b00ff, emissive: 0x9b00ff, emissiveIntensity: 1.4
    })
  );
  glowRing.position.y = 1.04;
  glowRing.rotation.x = -Math.PI / 2;
  group.add(glowRing);

  // Pedestal point light
  const halo = new THREE.PointLight(0x9b00ff, 0.6, 2.5);
  halo.position.y = 1.2;
  group.add(halo);

  // Book group (will bob — referenced via userData for the update loop)
  const bookGroup = new THREE.Group();
  bookGroup.position.y = 1.18;

  const pageMat = new THREE.MeshStandardMaterial({
    color: 0xf5d0a9, emissive: 0xffd166, emissiveIntensity: 0.4
  });

  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.22), pageMat);
  leftPage.position.set(-0.095, 0.04, 0);
  leftPage.rotation.z = -0.08;
  bookGroup.add(leftPage);

  const rightPage = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.22), pageMat);
  rightPage.position.set(0.095, 0.04, 0);
  rightPage.rotation.z = 0.08;
  bookGroup.add(rightPage);

  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.012, 0.22),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  spine.position.set(0, 0.035, 0);
  bookGroup.add(spine);

  group.add(bookGroup);

  group.userData = {
    clickable: true,
    hotspot: 'pedestal',
    action: 'openBook',
    bookGroup
  };

  return group;
}

function buildRabbitHole() {
  const group = new THREE.Group();
  // On the floor, left of centre — near the table area
  group.position.set(0.4, 0, -2.2);

  // Dark hole (recessed cylinder going down)
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.35, 0.3, 24),
    holeMat
  );
  hole.position.y = -0.15;
  group.add(hole);

  // Glowing purple ring around the hole
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.03, 8, 32),
    new THREE.MeshStandardMaterial({
      color: 0x9b00ff, emissive: 0x9b00ff, emissiveIntensity: 1.8
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  group.add(ring);

  // Second inner ring (gold)
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.015, 8, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 1.4
    })
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.01;
  group.add(innerRing);

  // Point light from within the hole (eerie purple glow)
  const glow = new THREE.PointLight(0x9b00ff, 1.0, 3);
  glow.position.y = -0.2;
  group.add(glow);

  group.userData = {
    clickable: true,
    action: 'enterRabbitHole'
  };

  return group;
}

function buildTV() {
  const group = new THREE.Group();
  // Right wall, mounted high up
  group.position.set(3.49, 2.85, 0);
  group.rotation.y = -Math.PI / 2; // facing into the room (toward -x)

  // CRT body — much deeper than a flat panel, with chunky beige plastic
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.55, 0.55),
    new THREE.MeshLambertMaterial({ color: 0xd4c8a8 })
  );
  body.position.z = -0.25;
  body.castShadow = true;
  group.add(body);

  // Wood-grain trim along the bottom
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.12, 0.56),
    new THREE.MeshLambertMaterial({ color: 0x6b4423 })
  );
  trim.position.set(0, -0.65, -0.25);
  group.add(trim);

  // Inner black bezel surrounding the screen
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 1.25, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  bezel.position.z = 0.04;
  group.add(bezel);

  // Plain dark screen — the YouTube iframe is overlaid in screen space by ui.js.
  // Keep this mesh's local geometry (1.92, 1.08) and position so iframe corners still match.
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.92, 1.08),
    new THREE.MeshBasicMaterial({ color: 0x050d14 })
  );
  screen.position.z = 0.071;
  group.add(screen);

  // Neon emissive border strips (kept for the arcade vibe)
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.0
  });
  const stripT = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.02, 0.01), glowMat);
  stripT.position.set(0,  0.585, 0.072);
  group.add(stripT);
  const stripB = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.02, 0.01), glowMat);
  stripB.position.set(0, -0.585, 0.072);
  group.add(stripB);
  const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.15, 0.01), glowMat);
  stripL.position.set(-0.99, 0, 0.072);
  group.add(stripL);
  const stripR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.15, 0.01), glowMat);
  stripR.position.set(0.99, 0, 0.072);
  group.add(stripR);

  // Two chunky control knobs on the right side
  const knobMat = new THREE.MeshLambertMaterial({ color: 0x9a9a92 });
  for (const ky of [-0.2, -0.45]) {
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12),
      knobMat
    );
    knob.position.set(1.04, ky, 0.05);
    knob.rotation.x = Math.PI / 2;
    group.add(knob);
  }

  // Click action: opens a panel describing the video
  group.userData = {
    clickable: true,
    action: 'openPanel',
    panelId: 'tv',
    panelTitle: 'CDN Video Archive',
    screenMesh: screen
  };

  return group;
}

function buildGlobe() {
  const group = new THREE.Group();
  // Standalone position: on the floor to the left of the desk
  group.position.set(0.2, 0, -2.4);

  // Pedestal base
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x1b3a4b });
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.24, 0.06, 12),
    baseMat
  );
  base.position.y = 0.03;
  group.add(base);

  // Vertical pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8),
    baseMat
  );
  pole.position.y = 0.43;
  group.add(pole);

  // Arc cradle
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.012, 8, 24, Math.PI),
    baseMat
  );
  arc.position.y = 0.85;
  arc.rotation.x = Math.PI / 2;
  arc.rotation.z = Math.PI / 2;
  group.add(arc);

  // Globe sphere with painted continents — bigger radius
  const globeCanvas = document.createElement('canvas');
  globeCanvas.width = 512;
  globeCanvas.height = 256;
  const gctx = globeCanvas.getContext('2d');
  gctx.fillStyle = '#1b3a4b';
  gctx.fillRect(0, 0, 512, 256);
  gctx.fillStyle = '#ffd166';
  // Crude continent blobs (bigger canvas for more detail)
  gctx.beginPath(); gctx.ellipse(120, 100, 44, 28, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(180, 160, 32, 36, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(280, 110, 56, 32, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(360, 180, 40, 24, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(420, 100, 28, 20, 0, 0, Math.PI * 2); gctx.fill();

  const globeTex = new THREE.CanvasTexture(globeCanvas);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 32, 24),
    new THREE.MeshStandardMaterial({ map: globeTex, roughness: 0.6, metalness: 0.1 })
  );
  sphere.position.y = 0.85;
  group.add(sphere);

  group.userData = {
    clickable: true,
    hotspot: 'globe',
    action: 'openPanel',
    panelId: 'globe',
    panelTitle: 'CDN International Reach',
    globeMesh: sphere
  };

  return group;
}

export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(-2.5, 0xff006e);
  const arcadeRight = buildArcadeCabinet(2.5,  0x00e5ff);
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);
  const desk        = buildDesk();
  const chair       = buildGamingChair();
  const bookshelf   = buildBookshelf();
  const fridge      = buildMiniFridge();
  const floorLamp   = buildFloorLamp();
  const neonSign    = buildNeonSign();
  const rug         = buildRug();
  const pedestal    = buildPedestal();
  const rabbitHole  = buildRabbitHole();
  const tv          = buildTV();
  const globe       = buildGlobe();

  const posters = [
    buildPoster(-2.5, 2.0, -2.99, 0xff006e, 0x9b00ff, 'NEON RUNNER',  0),
    buildPoster(-1.4, 2.0, -2.99, 0x00e5ff, 0xff006e, 'PIXEL QUEST',  1),
    buildPoster(-0.3, 2.0, -2.99, 0x9b00ff, 0x00e5ff, 'STAR ARCADE',  2)
  ];

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  // Make decorative objects clickable — each opens the panel drawer with placeholder content
  table.userData     = { clickable: true, action: 'openPanel', panelId: 'table',     panelTitle: 'Card Games & Social Play' };
  beanBag1.userData  = { clickable: true, action: 'openPanel', panelId: 'beanbag-1', panelTitle: 'Casual Seating' };
  beanBag2.userData  = { clickable: true, action: 'openPanel', panelId: 'beanbag-2', panelTitle: 'Casual Seating' };
  chair.userData     = { clickable: true, action: 'openPanel', panelId: 'chair',     panelTitle: 'Pro Gaming Station' };
  bookshelf.userData = { clickable: true, action: 'openPanel', panelId: 'bookshelf', panelTitle: 'Game Library' };
  fridge.userData    = { clickable: true, action: 'openPanel', panelId: 'fridge',    panelTitle: 'Refreshments' };
  floorLamp.userData = { clickable: true, action: 'openPanel', panelId: 'lamp',      panelTitle: 'Mood Lighting' };
  neonSign.userData  = { clickable: true, action: 'openPanel', panelId: 'sign',      panelTitle: 'Welcome to the Game Room' };

  scene.add(
    arcadeLeft, arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, fridge, floorLamp,
    neonSign, rug, pedestal, rabbitHole, tv, globe, ...posters
  );

  // ── Animation: spin globe + bob book ──
  const globeMesh = globe.userData.globeMesh;
  const bookGroup = pedestal.userData.bookGroup;
  let elapsed = 0;
  function sceneUpdate(delta) {
    elapsed += delta;
    if (globeMesh) globeMesh.rotation.y += delta * 0.3;
    if (bookGroup) {
      bookGroup.position.y = 1.18 + Math.sin(elapsed * 1.5) * 0.04;
      bookGroup.rotation.y += delta * 0.2;
    }
  }

  return {
    arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate,
    tv, globe,
    extras: [table, beanBag1, beanBag2, chair, bookshelf, fridge, floorLamp, neonSign, tv, rabbitHole, globe]
  };
}
