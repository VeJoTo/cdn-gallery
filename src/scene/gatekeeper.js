// src/scene/gatekeeper.js
import * as THREE from 'three';

export function createGatekeeper(scene) {
  const group = new THREE.Group();
  group.position.set(0, 2.0, -2.2);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xf5d0a9 })
  );
  group.add(head);

  // Stubble (flattened dark sphere on chin area)
  const stubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0xc4a882 })
  );
  stubble.scale.set(1, 0.5, 0.8);
  stubble.position.set(0, -0.14, 0.12);
  group.add(stubble);

  // ── Long dark wavy hair ──
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x3a2518 });

  // Left hair locks — elongated spheres hanging down
  const hairPositions = [
    // Left side locks
    { x: -0.28, y: -0.1, z: 0.05, sx: 0.6, sy: 1.8, sz: 0.5 },
    { x: -0.32, y: -0.15, z: -0.08, sx: 0.5, sy: 1.6, sz: 0.5 },
    { x: -0.25, y: -0.05, z: -0.18, sx: 0.5, sy: 1.5, sz: 0.5 },
    // Right side locks
    { x: 0.28, y: -0.1, z: 0.05, sx: 0.6, sy: 1.8, sz: 0.5 },
    { x: 0.32, y: -0.15, z: -0.08, sx: 0.5, sy: 1.6, sz: 0.5 },
    { x: 0.25, y: -0.05, z: -0.18, sx: 0.5, sy: 1.5, sz: 0.5 },
    // Back hair
    { x: 0, y: -0.12, z: -0.22, sx: 1.2, sy: 1.7, sz: 0.5 },
    { x: -0.15, y: -0.18, z: -0.2, sx: 0.5, sy: 1.4, sz: 0.5 },
    { x: 0.15, y: -0.18, z: -0.2, sx: 0.5, sy: 1.4, sz: 0.5 },
    // Top of head hair volume
    { x: 0, y: 0.18, z: -0.05, sx: 1.8, sy: 0.6, sz: 1.5 },
  ];

  for (const h of hairPositions) {
    const lock = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 6),
      hairMat
    );
    lock.position.set(h.x, h.y, h.z);
    lock.scale.set(h.sx, h.sy, h.sz);
    group.add(lock);
  }

  // Hat brim (kept — wizard hat)
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.06, 12),
    new THREE.MeshLambertMaterial({ color: 0x050d14 })
  );
  brim.position.y = 0.3;
  group.add(brim);

  // Hat cone (kept — wizard hat, slightly taller for dramatic effect)
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.8, 12),
    new THREE.MeshLambertMaterial({ color: 0x050d14 })
  );
  hat.position.y = 0.73;
  group.add(hat);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  for (const ex of [-0.11, 0.11]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eyeMat);
    eye.position.set(ex, 0.06, 0.28);
    group.add(eye);
  }

  // Dark charcoal shirt / body
  const shirt = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.9, 12),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2e })
  );
  shirt.position.y = -0.7;
  group.add(shirt);

  // Blue tie
  const tie = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.55, 0.04),
    new THREE.MeshLambertMaterial({ color: 0x5a8ac4 })
  );
  tie.position.set(0, -0.55, 0.2);
  group.add(tie);

  // Tie knot
  const tieKnot = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.06, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x5a8ac4 })
  );
  tieKnot.position.set(0, -0.28, 0.22);
  group.add(tieKnot);

  // Stars on hat (3 small emissive spheres — kept for magic)
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xffd166,
    emissiveIntensity: 1.0
  });
  const starPositions = [
    [0.08, 0.58, 0.18], [-0.1, 0.72, 0.15], [0.04, 0.9, 0.12]
  ];
  for (const [sx, sy, sz] of starPositions) {
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), starMat);
    star.position.set(sx, sy, sz);
    group.add(star);
  }

  group.userData = { clickable: true, action: 'openGatekeeper' };
  scene.add(group);

  // Bobbing animation
  let time = 0;
  const baseY = group.position.y;

  function update(delta) {
    time += delta;
    group.position.y = baseY + Math.sin(time * 1.4) * 0.08;
    group.rotation.y = Math.sin(time * 0.7) * 0.12;
  }

  return { group, update };
}
