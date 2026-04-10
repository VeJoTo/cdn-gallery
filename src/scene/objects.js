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

  // Monitor stands
  const standMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  for (const sx of [-0.55, 0.55]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), standMat);
    stand.position.set(sx, 0.97, -0.2);
    group.add(stand);
  }

  // Bezels and screens (left = purple, right = teal)
  const monitorDefs = [
    { x: -0.55, rotY:  0.15, color: 0x9b00ff },
    { x:  0.55, rotY: -0.15, color: 0x00e5ff }
  ];
  const leftMonitorRefs = [];
  for (const { x, rotY, color } of monitorDefs) {
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.45, 0.04),
      new THREE.MeshLambertMaterial({ color: 0x030810 })
    );
    bezel.position.set(x, 1.25, -0.2);
    bezel.rotation.y = rotY;
    group.add(bezel);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.41, 0.02),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 1.0
      })
    );
    screen.position.set(x + Math.sin(rotY) * 0.025, 1.25, -0.2 + Math.cos(rotY) * 0.025);
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

  // Keyboard
  const keyboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.02, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  keyboard.position.set(0, 0.89, 0.05);
  group.add(keyboard);

  // Keyboard neon strip
  const kbStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.005, 0.005),
    new THREE.MeshStandardMaterial({
      color: 0xff006e, emissive: 0xff006e, emissiveIntensity: 0.8
    })
  );
  kbStrip.position.set(0, 0.901, 0.14);
  group.add(kbStrip);

  // Mouse
  const mouse = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  mouse.position.set(0.4, 0.89, 0.05);
  group.add(mouse);

  // ── Globe on the left side of the desk ──
  const globeGroup = new THREE.Group();
  globeGroup.position.set(-1.0, 0.91, 0.1);

  const standBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.04, 12),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  standBase.position.y = 0.02;
  globeGroup.add(standBase);

  const standArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.008, 8, 16, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x1b3a4b })
  );
  standArc.position.y = 0.17;
  standArc.rotation.x = Math.PI / 2;
  standArc.rotation.z = Math.PI / 2;
  globeGroup.add(standArc);

  // Globe sphere with painted continents
  const globeCanvas = document.createElement('canvas');
  globeCanvas.width = 256;
  globeCanvas.height = 128;
  const gctx = globeCanvas.getContext('2d');
  gctx.fillStyle = '#1b3a4b';
  gctx.fillRect(0, 0, 256, 128);
  gctx.fillStyle = '#ffd166';
  gctx.beginPath(); gctx.ellipse(60, 50, 22, 14, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(90, 80, 16, 18, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(140, 55, 28, 16, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(180, 90, 20, 12, 0, 0, Math.PI * 2); gctx.fill();
  gctx.beginPath(); gctx.ellipse(210, 50, 14, 10, 0, 0, Math.PI * 2); gctx.fill();

  const globeTex = new THREE.CanvasTexture(globeCanvas);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 24, 16),
    new THREE.MeshStandardMaterial({ map: globeTex, roughness: 0.7 })
  );
  sphere.position.y = 0.17;
  sphere.userData = {
    clickable: true,
    action: 'openPanel',
    panelId: 'globe',
    panelTitle: 'CDN International Reach'
  };
  globeGroup.add(sphere);

  group.add(globeGroup);
  group.userData = { clickable: true, hotspot: 'desk', globeMesh: sphere };

  return group;
}

export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(-2.5, 0xff006e);
  const arcadeRight = buildArcadeCabinet(2.5,  0x00e5ff);
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);
  const desk        = buildDesk();

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  scene.add(arcadeLeft, arcadeRight, table, beanBag1, beanBag2, desk);

  return { arcadeLeft, arcadeRight, desk };
}
