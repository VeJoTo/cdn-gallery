// src/scene/objects.js
import * as THREE from 'three';

function buildArcadeCabinet(xPos) {
  const group = new THREE.Group();
  group.position.set(xPos, 0, 0.2);

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 2.0, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x1a1a2e })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  // Monitor bezel
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.52, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x0d0d1a })
  );
  bezel.position.set(0, 1.45, 0.31);
  group.add(bezel);

  // Screen (emissive glow)
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.42, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.6
    })
  );
  screen.position.set(0, 1.45, 0.35);
  group.add(screen);

  // Control panel (angled surface)
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.08, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x2a2a40 })
  );
  panel.position.set(0, 0.92, 0.22);
  panel.rotation.x = 0.25;
  group.add(panel);

  // Joystick base
  const jBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8),
    new THREE.MeshLambertMaterial({ color: 0x333355 })
  );
  jBase.position.set(-0.15, 0.97, 0.3);
  group.add(jBase);

  // Joystick stick
  const jStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8),
    new THREE.MeshLambertMaterial({ color: 0x111111 })
  );
  jStick.position.set(-0.15, 1.03, 0.3);
  group.add(jStick);

  // Buttons (3)
  const buttonColors = [0xff3333, 0x3399ff, 0xffcc00];
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8),
      new THREE.MeshStandardMaterial({
        color: buttonColors[i],
        emissive: buttonColors[i],
        emissiveIntensity: 0.3
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
    new THREE.MeshLambertMaterial({ color: 0x8b6914 })
  );
  top.position.y = 0.44;
  top.castShadow = true;
  group.add(top);

  const legMat = new THREE.MeshLambertMaterial({ color: 0x6b5010 });
  const legPositions = [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]];
  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.06), legMat);
    leg.position.set(lx, 0.22, lz);
    group.add(leg);
  }

  const cardMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e8, side: THREE.DoubleSide });
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
    new THREE.MeshLambertMaterial({ color: 0x5a3e8a })
  );
  base.scale.y = 0.55;
  base.position.y = 0.24;
  base.castShadow = true;
  group.add(base);

  const cushion = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x7a5eaa })
  );
  cushion.scale.y = 0.45;
  cushion.position.y = 0.46;
  cushion.castShadow = true;
  group.add(cushion);

  return group;
}

function buildLockedDoor(wall) {
  const group = new THREE.Group();
  const isLeft = wall === 'left';
  group.position.set(isLeft ? -3.49 : 3.49, 0, -1);
  if (isLeft)  group.rotation.y = Math.PI / 2;
  if (!isLeft) group.rotation.y = -Math.PI / 2;

  // Door frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 2.2, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x3a3a50 })
  );
  frame.position.y = 1.1;
  group.add(frame);

  // Door surface
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 2.04, 0.04),
    new THREE.MeshLambertMaterial({ color: 0x2a2a40 })
  );
  door.position.y = 1.1;
  group.add(door);

  // Padlock body
  const lockBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.12, 0.06),
    new THREE.MeshLambertMaterial({ color: 0xccaa00 })
  );
  lockBody.position.set(0, 1.1, 0.06);
  group.add(lockBody);

  // Padlock shackle
  const lockShackle = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.02, 6, 8, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0xccaa00 })
  );
  lockShackle.rotation.z = Math.PI;
  lockShackle.position.set(0, 1.22, 0.06);
  group.add(lockShackle);

  return group;
}

export function createObjects(scene) {
  const arcadeLeft  = buildArcadeCabinet(-2.5);
  const arcadeRight = buildArcadeCabinet(2.5);
  const table       = buildTable();
  const beanBag1    = buildBeanBag(-0.8, 2.2);
  const beanBag2    = buildBeanBag(0.8, 2.2);
  const doorLeft    = buildLockedDoor('left');
  const doorRight   = buildLockedDoor('right');

  arcadeLeft.userData  = { clickable: true, hotspot: 'arcade-left' };
  arcadeRight.userData = { clickable: true, hotspot: 'arcade-right' };

  scene.add(arcadeLeft, arcadeRight, table, beanBag1, beanBag2, doorLeft, doorRight);

  return { arcadeLeft, arcadeRight };
}
