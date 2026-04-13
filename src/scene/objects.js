// src/scene/objects.js
import * as THREE from 'three';

function buildArcadeCabinet(xPos, screenColor) {
  const group = new THREE.Group();
  group.position.set(xPos, 0, 0.2);

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 2.0, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x1a2540 })
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

  // Buttons (3): orchid, cyan, cream
  const buttonColors = [0xc77dba, 0x4dd4e6, 0xddd0c0];
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
    new THREE.MeshLambertMaterial({ color: 0x0d2137 })
  );
  top.position.y = 0.44;
  top.castShadow = true;
  group.add(top);

  const legMat = new THREE.MeshLambertMaterial({ color: 0x0a1530 });
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

  // CDN Annual Report book on the table
  const reportCover = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.04, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x0d2137 })
  );
  reportCover.position.set(0, 0.51, 0);
  reportCover.castShadow = true;
  group.add(reportCover);

  // White pages visible from the side
  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(0.33, 0.03, 0.48),
    new THREE.MeshLambertMaterial({ color: 0xddd0c0 })
  );
  pages.position.set(0, 0.5, 0);
  group.add(pages);

  // Title text on the cover
  const coverCanvas = document.createElement('canvas');
  coverCanvas.width = 256;
  coverCanvas.height = 128;
  const cctx = coverCanvas.getContext('2d');
  cctx.fillStyle = '#0d2137';
  cctx.fillRect(0, 0, 256, 128);
  cctx.fillStyle = '#f8f1e0';
  cctx.font = 'bold 20px sans-serif';
  cctx.textAlign = 'center';
  cctx.fillText('CDN Annual', 128, 48);
  cctx.fillText('Report 2025', 128, 76);
  const coverTex = new THREE.CanvasTexture(coverCanvas);
  const coverLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.17),
    new THREE.MeshBasicMaterial({ map: coverTex })
  );
  coverLabel.rotation.x = -Math.PI / 2;
  coverLabel.position.set(0, 0.531, 0);
  group.add(coverLabel);

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
    new THREE.MeshLambertMaterial({ color: 0xc77dba })
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
    new THREE.MeshLambertMaterial({ color: 0x0d2137 })
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
    { x: -0.55, rotY:  0.15, color: 0xf2a6c1 },
    { x:  0.55, rotY: -0.15, color: 0xa8d8ea }
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
    if (x > 0) {
      screen.userData = {
        clickable: true,
        hotspot: 'desk-right-monitor',
        action: 'openPanel',
        panelId: 'desk-code',
        panelTitle: 'Code & Development'
      };
    }
  }

  // The left monitor opens a panel
  leftMonitorRefs[0].userData = {
    clickable: true,
    hotspot: 'desk-left-monitor',
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
      color: 0x4dd4e6, emissive: 0x4dd4e6, emissiveIntensity: 1.0
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

  const frameMat = new THREE.MeshLambertMaterial({ color: 0x0d2137 });
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

  // Headrest neon stripe (orchid)
  const headrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, 0.085),
    new THREE.MeshStandardMaterial({
      color: 0xc77dba, emissive: 0xc77dba, emissiveIntensity: 0.7
    })
  );
  headrest.position.set(0, 1.28, -0.205);
  group.add(headrest);

  // Vertical cyan accent strip down the centre of the back
  const accent = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.85, 0.085),
    new THREE.MeshStandardMaterial({
      color: 0x4dd4e6, emissive: 0x4dd4e6, emissiveIntensity: 0.7
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

  const frameMat = new THREE.MeshLambertMaterial({ color: 0x0d2137 });
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
  const bookColours = [0xd65878, 0x4dd4e6, 0xc77dba, 0xddd0c0, 0x0d2137];
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

  // Small screen wedged between books (cyberpunk detail)
  const miniScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.18, 0.01),
    new THREE.MeshStandardMaterial({
      color: 0x4dd4e6, emissive: 0x4dd4e6, emissiveIntensity: 0.8
    })
  );
  miniScreen.position.set(0.4, 1.55, 0.16);
  group.add(miniScreen);

  // Pac-Man easter egg on top of bookshelf
  const pacShape = new THREE.SphereGeometry(0.08, 16, 12, 0.3, Math.PI * 2 - 0.6);
  const pacman = new THREE.Mesh(pacShape, new THREE.MeshLambertMaterial({ color: 0xddd0c0 }));
  pacman.position.set(0.3, 1.72, 0);
  pacman.rotation.y = Math.PI / 2;
  group.add(pacman);

  return group;
}

function buildMiniFridge() {
  const group = new THREE.Group();
  group.position.set(-3.0, 0, -2.8);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.0, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x1e2264 })
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
      color: 0x4dd4e6, emissive: 0x4dd4e6, emissiveIntensity: 0.6
    })
  );
  handle.position.set(0.3, 0.7, 0.31);
  group.add(handle);

  // Top emissive strip
  const topStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.02, 0.6),
    new THREE.MeshStandardMaterial({
      color: 0x4dd4e6, emissive: 0x4dd4e6, emissiveIntensity: 1.0
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
      color: 0xc77dba, emissive: 0xc77dba, emissiveIntensity: 1.2
    })
  );
  tube.position.y = 1.7;
  group.add(tube);

  const halo = new THREE.PointLight(0xc77dba, 0.5, 4);
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

function buildImagePoster(x, y, z, imageSrc, title, idx) {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 1.1),
    new THREE.MeshBasicMaterial({ color: 0x0a0018 }) // placeholder until loaded
  );
  plane.position.set(x, y, z);
  plane.userData = {
    clickable: true,
    action: 'openPanel',
    panelId: 'poster-' + idx,
    panelTitle: title
  };

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0018';
    ctx.fillRect(0, 0, 400, 550);
    // Draw the image centered and scaled to fit
    const scale = Math.min(380 / img.width, 530 / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (400 - w) / 2, (550 - h) / 2, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    plane.material = new THREE.MeshBasicMaterial({ map: tex });
  };
  img.src = imageSrc;

  return plane;
}

function buildNeonSign() {
  const group = new THREE.Group();
  group.position.set(1.8, 2.85, -2.97);

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, 640, 240);

  // Neon rose glow text
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow layers (multiple strokes for neon effect)
  ctx.shadowColor = '#d65878';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#d65878';
  ctx.fillText('GAME', 320, 75);
  ctx.fillText('ROOM', 320, 175);

  // Bright core
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#c77dba';
  ctx.fillText('GAME', 320, 75);
  ctx.fillText('ROOM', 320, 175);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide
  });

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.82), mat);
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
    new THREE.MeshLambertMaterial({ color: 0x0d2137 })
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
      color: 0x5a1d6e, emissive: 0x5a1d6e, emissiveIntensity: 1.4
    })
  );
  glowRing.position.y = 1.04;
  glowRing.rotation.x = -Math.PI / 2;
  group.add(glowRing);

  // Pedestal point light
  const halo = new THREE.PointLight(0x5a1d6e, 0.6, 2.5);
  halo.position.y = 1.2;
  group.add(halo);

  // Book group (will bob — referenced via userData for the update loop)
  const bookGroup = new THREE.Group();
  bookGroup.position.y = 1.18;

  const pageMat = new THREE.MeshStandardMaterial({
    color: 0xf5d0a9, emissive: 0xddd0c0, emissiveIntensity: 0.4
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
    new THREE.MeshLambertMaterial({ color: 0x0d2137 })
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
  group.position.set(-0.8, 0, -2.4);

  // Deep dark hole cylinder
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.3, 0.5, 24),
    holeMat
  );
  hole.position.y = -0.25;
  group.add(hole);

  // Dirt/earth ring around the hole (brown)
  const dirtRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.08, 8, 32),
    new THREE.MeshLambertMaterial({ color: 0x5a3a1e })
  );
  dirtRing.rotation.x = -Math.PI / 2;
  dirtRing.position.y = 0.02;
  group.add(dirtRing);

  // Glowing outer ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.025, 8, 32),
    new THREE.MeshStandardMaterial({
      color: 0x5a1d6e, emissive: 0x5a1d6e, emissiveIntensity: 1.8
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  group.add(ring);

  // Small grass/moss tufts around the edge
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x2a6a2a });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + (i % 2) * 0.2;
    const tuft = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.04),
      grassMat
    );
    tuft.position.set(
      Math.cos(angle) * 0.4,
      0.04,
      Math.sin(angle) * 0.4
    );
    tuft.rotation.y = angle;
    group.add(tuft);
  }

  // Point light from within
  const glow = new THREE.PointLight(0x5a1d6e, 1.0, 3);
  glow.position.y = -0.3;
  group.add(glow);

  // Floating label above the hole: "🐰 Rabbit Hole ↓"
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const lctx = labelCanvas.getContext('2d');
  lctx.clearRect(0, 0, 512, 128);
  lctx.font = 'bold 40px sans-serif';
  lctx.textAlign = 'center';
  lctx.fillStyle = '#ddd0c0';
  lctx.shadowColor = '#d65878';
  lctx.shadowBlur = 10;
  lctx.fillText('🐰 Rabbit Hole ↓', 256, 72);

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.35),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, side: THREE.DoubleSide })
  );
  label.position.y = 0.6;
  label.rotation.x = -0.3; // tilt slightly toward camera
  group.add(label);

  group.userData = {
    clickable: true,
    hotspot: 'rabbit-hole',
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
    color: 0x4dd4e6, emissive: 0x4dd4e6, emissiveIntensity: 1.0
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

  // Click action: zooms in and opens a panel describing the video
  group.userData = {
    clickable: true,
    hotspot: 'tv',
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
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x0d2137 });
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
  // Ocean
  gctx.fillStyle = '#1a3a5c';
  gctx.fillRect(0, 0, 512, 256);
  // Continents in cream color
  gctx.fillStyle = '#ddd0c0';
  // North America
  gctx.beginPath(); gctx.moveTo(100,40); gctx.quadraticCurveTo(130,35,140,60); gctx.quadraticCurveTo(150,90,130,110); gctx.quadraticCurveTo(110,120,95,100); gctx.quadraticCurveTo(80,70,100,40); gctx.fill();
  // South America
  gctx.beginPath(); gctx.moveTo(140,130); gctx.quadraticCurveTo(160,140,155,180); gctx.quadraticCurveTo(145,210,130,200); gctx.quadraticCurveTo(120,170,140,130); gctx.fill();
  // Europe
  gctx.beginPath(); gctx.moveTo(250,45); gctx.quadraticCurveTo(280,40,290,60); gctx.quadraticCurveTo(285,80,265,85); gctx.quadraticCurveTo(245,75,250,45); gctx.fill();
  // Africa
  gctx.beginPath(); gctx.moveTo(260,90); gctx.quadraticCurveTo(290,95,285,140); gctx.quadraticCurveTo(275,180,255,175); gctx.quadraticCurveTo(240,145,260,90); gctx.fill();
  // Asia
  gctx.beginPath(); gctx.moveTo(310,35); gctx.quadraticCurveTo(380,30,400,60); gctx.quadraticCurveTo(420,90,400,110); gctx.quadraticCurveTo(360,120,330,100); gctx.quadraticCurveTo(300,80,310,35); gctx.fill();
  // Australia
  gctx.beginPath(); gctx.ellipse(400, 175, 25, 18, 0, 0, Math.PI * 2); gctx.fill();
  // Greenland
  gctx.beginPath(); gctx.ellipse(170, 30, 18, 12, 0.3, 0, Math.PI * 2); gctx.fill();

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

function buildWallTagging() {
  const group = new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Transparent background (the wall shows through)
  ctx.clearRect(0, 0, 1024, 512);

  // "CDN" — large rose tag
  ctx.save();
  ctx.translate(180, 180);
  ctx.rotate(-0.08);
  ctx.font = 'bold italic 120px sans-serif';
  ctx.fillStyle = '#d65878';
  ctx.strokeStyle = '#0d2137';
  ctx.lineWidth = 4;
  ctx.strokeText('CDN', 0, 0);
  ctx.fillText('CDN', 0, 0);
  // Drip effect
  ctx.fillStyle = '#d65878';
  ctx.fillRect(45, 5, 3, 30);
  ctx.fillRect(155, 5, 3, 25);
  ctx.fillRect(265, 5, 3, 35);
  ctx.restore();

  // "DIGITAL NARRATIVE" — smaller, cyan, angular
  ctx.save();
  ctx.translate(500, 100);
  ctx.rotate(0.05);
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#4dd4e6';
  ctx.fillText('DIGITAL', 0, 0);
  ctx.fillText('NARRATIVE', 0, 36);
  ctx.restore();

  // "UiB" with circle — cream
  ctx.save();
  ctx.translate(780, 200);
  ctx.beginPath();
  ctx.arc(30, -10, 45, 0, Math.PI * 2);
  ctx.strokeStyle = '#ddd0c0';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = 'bold 40px sans-serif';
  ctx.fillStyle = '#ddd0c0';
  ctx.textAlign = 'center';
  ctx.fillText('UiB', 30, 5);
  ctx.restore();

  // "PLAY" — blocky, orchid
  ctx.save();
  ctx.translate(100, 380);
  ctx.rotate(0.12);
  ctx.font = 'bold 64px sans-serif';
  ctx.fillStyle = '#c77dba';
  ctx.strokeStyle = '#0d2137';
  ctx.lineWidth = 3;
  ctx.strokeText('PLAY', 0, 0);
  ctx.fillText('PLAY', 0, 0);
  ctx.restore();

  // Stars
  ctx.fillStyle = '#ddd0c0';
  ctx.font = '36px sans-serif';
  ctx.fillText('★', 450, 300);
  ctx.fillText('★', 700, 380);
  ctx.fillStyle = '#d65878';
  ctx.fillText('★', 620, 140);

  // Arrow
  ctx.save();
  ctx.translate(500, 400);
  ctx.rotate(-0.1);
  ctx.strokeStyle = '#4dd4e6';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(120, 0);
  ctx.lineTo(100, -15);
  ctx.moveTo(120, 0);
  ctx.lineTo(100, 15);
  ctx.stroke();
  ctx.restore();

  // Heart
  ctx.save();
  ctx.translate(830, 350);
  ctx.fillStyle = '#d65878';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-20, -35, -50, -10, 0, 20);
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(20, -35, 50, -10, 0, 20);
  ctx.fill();
  ctx.restore();

  // Squiggly underline under CDN
  ctx.save();
  ctx.strokeStyle = '#c77dba';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 100; x < 420; x += 10) {
    const y = 220 + Math.sin(x * 0.15) * 6;
    if (x === 100) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide
  });

  // Smaller plane in the lower portion of the right wall, away from the TV
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.8), mat);
  plane.position.set(3.47, 0.9, -0.5);
  plane.rotation.y = -Math.PI / 2;
  group.add(plane);

  return group;
}

function buildRadio() {
  const group = new THREE.Group();
  // On the table, slightly to the side
  group.position.set(-0.4, 0.49, 1.5);

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1e2264 });

  // Main body (retro boombox shape)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.22, 0.15),
    bodyMat
  );
  body.position.y = 0.11;
  body.castShadow = true;
  group.add(body);

  // Speaker grilles (two circles on the front)
  const grilleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });
  for (const gx of [-0.1, 0.1]) {
    const grille = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.01, 12),
      grilleMat
    );
    grille.rotation.x = Math.PI / 2;
    grille.position.set(gx, 0.11, 0.08);
    group.add(grille);

    // Speaker cone ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.005, 6, 16),
      new THREE.MeshStandardMaterial({
        color: 0x5a1d6e, emissive: 0x5a1d6e, emissiveIntensity: 0.5
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(gx, 0.11, 0.081);
    group.add(ring);
  }

  // Display screen (small glowing strip in the center)
  const display = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.04, 0.01),
    new THREE.MeshStandardMaterial({
      color: 0x4dd4e6, emissive: 0x4dd4e6, emissiveIntensity: 1.0
    })
  );
  display.position.set(0, 0.16, 0.08);
  group.add(display);

  // Antenna
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.25, 6),
    new THREE.MeshLambertMaterial({ color: 0x888888 })
  );
  antenna.position.set(0.15, 0.3, 0);
  antenna.rotation.z = -0.3;
  group.add(antenna);

  // Small glowing tip on antenna
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 6, 4),
    new THREE.MeshStandardMaterial({
      color: 0xc77dba, emissive: 0xc77dba, emissiveIntensity: 1.5
    })
  );
  tip.position.set(0.15 + Math.sin(0.3) * 0.25, 0.3 + Math.cos(0.3) * 0.25, 0);
  group.add(tip);

  return group;
}

function createMusicNotes(scene) {
  const notes = [];
  const noteChars = ['♪', '♫', '♬'];
  const noteColors = [0xc77dba, 0x4dd4e6, 0x5a1d6e, 0xddd0c0];

  for (let i = 0; i < 12; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const color = noteColors[i % noteColors.length];
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillText(noteChars[i % noteChars.length], 32, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0 })
    );
    // Start at radio position
    sprite.position.set(-0.4 + (Math.random() - 0.5) * 0.3, 0.7, 1.5);
    sprite.scale.set(0.15, 0.15, 0.15);
    sprite.userData = {
      speed: 0.3 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 0.5,
      phase: Math.random() * Math.PI * 2,
      baseX: -0.4 + (Math.random() - 0.5) * 0.3
    };
    scene.add(sprite);
    notes.push(sprite);
  }

  let active = false;

  function update(delta, elapsed) {
    for (const note of notes) {
      if (active) {
        note.material.opacity = Math.min(note.material.opacity + delta * 2, 0.8);
        note.position.y += note.userData.speed * delta;
        note.position.x = note.userData.baseX + Math.sin(elapsed * 2 + note.userData.phase) * 0.15;

        // Reset when too high
        if (note.position.y > 2.5) {
          note.position.y = 0.6 + Math.random() * 0.2;
          note.position.x = -0.4 + (Math.random() - 0.5) * 0.3;
          note.userData.baseX = note.position.x;
          note.material.opacity = 0;
        }
      } else {
        note.material.opacity = Math.max(note.material.opacity - delta * 2, 0);
      }
    }
  }

  function setActive(isActive) {
    active = isActive;
    if (isActive) {
      // Reset positions when turning on
      for (const note of notes) {
        note.position.y = 0.6 + Math.random() * 0.5;
        note.position.x = -0.4 + (Math.random() - 0.5) * 0.3;
        note.userData.baseX = note.position.x;
      }
    }
  }

  return { update, setActive };
}

export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(0, 0xc77dba);
  const arcadeRight = buildArcadeCabinet(0, 0x4dd4e6);

  // Position arcades on the left wall, side by side, facing into the room
  arcadeLeft.position.set(-3.15, 0, 0.8);
  arcadeLeft.rotation.y = Math.PI / 2;
  arcadeRight.position.set(-3.15, 0, -0.5);
  arcadeRight.rotation.y = Math.PI / 2;
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);
  // Ghost easter egg near bean bags
  const ghostGroup = new THREE.Group();
  ghostGroup.position.set(0, 0, 2.6);
  const ghostBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8),
    new THREE.MeshLambertMaterial({ color: 0xd65878 })
  );
  ghostBody.position.y = 0.06;
  ghostGroup.add(ghostBody);
  const ghostHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xd65878 })
  );
  ghostHead.position.y = 0.14;
  ghostGroup.add(ghostHead);
  const ghostEye1 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  ghostEye1.position.set(-0.03, 0.16, 0.06);
  ghostGroup.add(ghostEye1);
  const ghostEye2 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  ghostEye2.position.set(0.03, 0.16, 0.06);
  ghostGroup.add(ghostEye2);
  scene.add(ghostGroup);

  // Holographic display (cyberpunk decoration)
  const holoGroup = new THREE.Group();
  holoGroup.position.set(1.5, 0, 2.0);
  const holoPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8),
    new THREE.MeshLambertMaterial({ color: 0x1e2264 })
  );
  holoPole.position.y = 0.3;
  holoGroup.add(holoPole);
  const holoDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16),
    new THREE.MeshStandardMaterial({
      color: 0x4dd4e6, emissive: 0x4dd4e6, emissiveIntensity: 1.5
    })
  );
  holoDisc.position.y = 0.62;
  holoGroup.add(holoDisc);
  // Floating holographic diamond above the disc
  const holoDiamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.08, 0),
    new THREE.MeshStandardMaterial({
      color: 0xc77dba, emissive: 0xc77dba, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.7
    })
  );
  holoDiamond.position.y = 0.82;
  holoGroup.add(holoDiamond);
  const holoLight = new THREE.PointLight(0x4dd4e6, 0.5, 2);
  holoLight.position.y = 0.7;
  holoGroup.add(holoLight);
  scene.add(holoGroup);

  // Neural network nodes (AI decoration)
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0xc77dba, emissive: 0xc77dba, emissiveIntensity: 1.2,
    transparent: true, opacity: 0.8
  });
  const nodePositions = [
    { x: 2.5, y: 2.5, z: 1.5 },
    { x: 2.8, y: 2.2, z: 0.8 },
    { x: 2.2, y: 2.8, z: 0.5 }
  ];
  for (const np of nodePositions) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), nodeMat);
    node.position.set(np.x, np.y, np.z);
    scene.add(node);
  }
  // Connection lines between nodes
  const lineMat = new THREE.LineBasicMaterial({ color: 0x4dd4e6, transparent: true, opacity: 0.4 });
  for (let i = 0; i < nodePositions.length; i++) {
    for (let j = i + 1; j < nodePositions.length; j++) {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z),
        new THREE.Vector3(nodePositions[j].x, nodePositions[j].y, nodePositions[j].z)
      ]);
      const line = new THREE.Line(geom, lineMat);
      scene.add(line);
    }
  }

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
  const wallTagging = buildWallTagging();
  const radio       = buildRadio();
  const musicNotes  = createMusicNotes(scene);

  const posters = [
    buildImagePoster(-2.5, 2.0, -2.99, (import.meta.env.BASE_URL || '/') + 'galaga-poster.svg', 'GALAGA', 0),
    buildImagePoster(-1.4, 2.0, -2.99, (import.meta.env.BASE_URL || '/') + 'pacman-poster.svg', 'PAC-MAN', 1),
    buildImagePoster(-0.3, 2.0, -2.99, (import.meta.env.BASE_URL || '/') + 'space-invaders-poster.svg', 'SPACE INVADERS', 2)
  ];

  // AI Cinema poster on the right wall
  const aiCanvas = document.createElement('canvas');
  aiCanvas.width = 400;
  aiCanvas.height = 520;
  const actx = aiCanvas.getContext('2d');
  // Dark background
  actx.fillStyle = '#0d2137';
  actx.fillRect(0, 0, 400, 520);
  // Eye circle (simplified)
  actx.fillStyle = '#a8d8ea';
  actx.beginPath();
  actx.arc(200, 220, 100, 0, Math.PI * 2);
  actx.fill();
  // Iris
  actx.fillStyle = '#4a7a9a';
  actx.beginPath();
  actx.arc(200, 220, 50, 0, Math.PI * 2);
  actx.fill();
  // Pupil
  actx.fillStyle = '#0d2137';
  actx.beginPath();
  actx.arc(200, 220, 22, 0, Math.PI * 2);
  actx.fill();
  // Highlight
  actx.fillStyle = '#ffffff';
  actx.beginPath();
  actx.arc(215, 205, 10, 0, Math.PI * 2);
  actx.fill();
  // Text
  actx.fillStyle = '#ddd0c0';
  actx.font = 'bold 42px sans-serif';
  actx.textAlign = 'center';
  actx.fillText('AN EYE FOR', 200, 400);
  actx.fillStyle = '#d65878';
  actx.fillText('AI CINEMA', 200, 450);
  // Small subtitle
  actx.fillStyle = '#4dd4e6';
  actx.font = '16px sans-serif';
  actx.fillText('CDN Event Series', 200, 490);

  const aiTex = new THREE.CanvasTexture(aiCanvas);
  const aiPoster = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 1.3),
    new THREE.MeshBasicMaterial({ map: aiTex })
  );
  // Right wall, facing left
  aiPoster.position.set(3.48, 1.5, 2.2);
  aiPoster.rotation.y = -Math.PI / 2;
  aiPoster.userData = {
    clickable: true,
    action: 'openPanel',
    panelId: 'ai-cinema',
    panelTitle: 'An Eye for AI Cinema'
  };
  scene.add(aiPoster);

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  // Make decorative objects clickable — each opens the panel drawer with placeholder content
  table.userData     = { clickable: true, hotspot: 'table', action: 'openReport', panelTitle: 'CDN Annual Report' };
  beanBag1.userData  = { clickable: true, hotspot: 'seat-beanbag-left' };
  beanBag2.userData  = { clickable: true, hotspot: 'seat-beanbag-right' };
  chair.userData     = { clickable: true, hotspot: 'seat-chair' };
  bookshelf.userData = { clickable: true, action: 'openPanel', panelId: 'bookshelf', panelTitle: 'Game Library' };
  fridge.userData    = { clickable: true, action: 'openPanel', panelId: 'fridge',    panelTitle: 'Refreshments' };
  floorLamp.userData = { clickable: true, action: 'openPanel', panelId: 'lamp',      panelTitle: 'Mood Lighting' };
  neonSign.userData  = { clickable: true, action: 'openPanel', panelId: 'sign',      panelTitle: 'Welcome to the Game Room' };

  scene.add(
    arcadeLeft, arcadeRight, table, beanBag1, beanBag2,
    desk, chair, bookshelf, fridge, floorLamp,
    neonSign, rug, pedestal, rabbitHole, tv, globe, ...posters,
    wallTagging, radio
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
    if (holoDiamond) {
      holoDiamond.rotation.y += delta * 1.5;
      holoDiamond.position.y = 0.82 + Math.sin(elapsed * 2) * 0.03;
    }
    if (musicNotes) musicNotes.update(delta, elapsed);
  }

  return {
    arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate,
    tv, globe, musicNotes,
    extras: [table, beanBag1, beanBag2, chair, bookshelf, fridge, floorLamp, neonSign, tv, rabbitHole, globe, aiPoster]
  };
}
