// src/scene/gatekeeper.js
import * as THREE from 'three';

export function createGatekeeper(scene) {
  const group = new THREE.Group();
  group.position.set(0, 2.0, -2.2);

  // ── Head (slightly wider/oval) ──
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xf0c8a0 })
  );
  head.scale.set(1.15, 1.0, 1.0); // wider face
  group.add(head);

  // Jaw / chin area (extends the face downward for a stronger jaw)
  const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0xf0c8a0 })
  );
  jaw.scale.set(1.1, 0.6, 0.85);
  jaw.position.set(0, -0.18, 0.04);
  group.add(jaw);

  // Stubble (covers chin and jawline — slightly darker skin tone)
  const stubbleMat = new THREE.MeshLambertMaterial({ color: 0xc8a070 });
  const stubbleChin = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    stubbleMat
  );
  stubbleChin.scale.set(1.0, 0.45, 0.7);
  stubbleChin.position.set(0, -0.18, 0.12);
  group.add(stubbleChin);

  // Stubble sides (jawline)
  for (const sx of [-0.18, 0.18]) {
    const sideStubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 6),
      stubbleMat
    );
    sideStubble.scale.set(0.7, 0.8, 0.5);
    sideStubble.position.set(sx, -0.12, 0.14);
    group.add(sideStubble);
  }

  // ── Nose ──
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xe8b888 })
  );
  nose.scale.set(0.8, 0.9, 1.2);
  nose.position.set(0, -0.02, 0.3);
  group.add(nose);

  // ── Eyes ──
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  for (const ex of [-0.12, 0.12]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eyeMat);
    eye.position.set(ex, 0.06, 0.28);
    group.add(eye);
  }

  // ── Thick eyebrows ──
  const browMat = new THREE.MeshLambertMaterial({ color: 0x3a2518 });
  for (const bx of [-0.12, 0.12]) {
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.025, 0.04),
      browMat
    );
    brow.position.set(bx, 0.13, 0.28);
    brow.rotation.z = bx < 0 ? 0.12 : -0.12; // slightly angled
    group.add(brow);
  }

  // ── Mouth (slight smirk) ──
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.015, 0.02),
    new THREE.MeshLambertMaterial({ color: 0xc47860 })
  );
  mouth.position.set(0.02, -0.1, 0.3); // offset slightly right for smirk
  mouth.rotation.z = -0.08; // slight tilt for asymmetric smile
  group.add(mouth);

  // ── Voluminous dark wavy hair ──
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x3a2518 });

  const hairLocks = [
    // Top volume (big, covers crown)
    { x: 0, y: 0.22, z: -0.02, sx: 2.2, sy: 0.7, sz: 1.8, r: 0.14 },

    // Left side — 5 locks cascading down, getting curlier
    { x: -0.34, y: 0.05, z: 0.04, sx: 0.55, sy: 1.4, sz: 0.6, r: 0.14 },
    { x: -0.38, y: -0.1, z: -0.02, sx: 0.5, sy: 1.5, sz: 0.55, r: 0.14 },
    { x: -0.35, y: -0.25, z: -0.1, sx: 0.55, sy: 1.2, sz: 0.6, r: 0.14 },
    { x: -0.3, y: -0.08, z: -0.2, sx: 0.5, sy: 1.4, sz: 0.5, r: 0.14 },
    { x: -0.28, y: -0.35, z: 0.02, sx: 0.6, sy: 0.8, sz: 0.65, r: 0.16 }, // curly end

    // Right side — 5 locks cascading down
    { x: 0.34, y: 0.05, z: 0.04, sx: 0.55, sy: 1.4, sz: 0.6, r: 0.14 },
    { x: 0.38, y: -0.1, z: -0.02, sx: 0.5, sy: 1.5, sz: 0.55, r: 0.14 },
    { x: 0.35, y: -0.25, z: -0.1, sx: 0.55, sy: 1.2, sz: 0.6, r: 0.14 },
    { x: 0.3, y: -0.08, z: -0.2, sx: 0.5, sy: 1.4, sz: 0.5, r: 0.14 },
    { x: 0.28, y: -0.35, z: 0.02, sx: 0.6, sy: 0.8, sz: 0.65, r: 0.16 }, // curly end

    // Back hair (fills behind the head, reaches shoulders)
    { x: 0, y: -0.08, z: -0.25, sx: 1.6, sy: 1.6, sz: 0.6, r: 0.14 },
    { x: -0.15, y: -0.25, z: -0.22, sx: 0.6, sy: 1.3, sz: 0.55, r: 0.14 },
    { x: 0.15, y: -0.25, z: -0.22, sx: 0.6, sy: 1.3, sz: 0.55, r: 0.14 },
    { x: 0, y: -0.35, z: -0.2, sx: 1.2, sy: 0.7, sz: 0.6, r: 0.15 }, // back curl

    // Front hair framing the face (parted slightly)
    { x: -0.18, y: 0.18, z: 0.18, sx: 0.6, sy: 0.9, sz: 0.4, r: 0.12 },
    { x: 0.18, y: 0.18, z: 0.18, sx: 0.6, sy: 0.9, sz: 0.4, r: 0.12 },
  ];

  for (const h of hairLocks) {
    const lock = new THREE.Mesh(
      new THREE.SphereGeometry(h.r, 8, 6),
      hairMat
    );
    lock.position.set(h.x, h.y, h.z);
    lock.scale.set(h.sx, h.sy, h.sz);
    group.add(lock);
  }

  // ── Wizard hat ──
  const hatMat = new THREE.MeshLambertMaterial({ color: 0x050d14 });

  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.06, 12),
    hatMat
  );
  brim.position.y = 0.32;
  group.add(brim);

  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.85, 12),
    hatMat
  );
  hat.position.y = 0.78;
  hat.rotation.z = 0.06; // slight tilt for personality
  group.add(hat);

  // Gold stars on hat (magical detail)
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xffd166,
    emissiveIntensity: 1.0
  });
  const starPositions = [
    [0.1, 0.62, 0.2], [-0.12, 0.78, 0.16], [0.05, 0.98, 0.1]
  ];
  for (const [sx, sy, sz] of starPositions) {
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 4), starMat);
    star.position.set(sx, sy, sz);
    group.add(star);
  }

  // ── Body — dark charcoal shirt with broader shoulders ──
  // Use a truncated cone (wider top) for broader shoulders
  const shirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.45, 0.9, 12),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2e })
  );
  shirt.position.y = -0.7;
  group.add(shirt);

  // Collar (two small angled flaps)
  const collarMat = new THREE.MeshLambertMaterial({ color: 0x333338 });
  for (const cx of [-0.1, 0.1]) {
    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.06, 0.06),
      collarMat
    );
    collar.position.set(cx, -0.28, 0.22);
    collar.rotation.z = cx < 0 ? -0.4 : 0.4;
    collar.rotation.x = -0.2;
    group.add(collar);
  }

  // Light blue tie
  const tieMat = new THREE.MeshLambertMaterial({ color: 0x7aaed4 });
  const tie = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.5, 0.03),
    tieMat
  );
  tie.position.set(0, -0.55, 0.22);
  group.add(tie);

  // Tie knot
  const tieKnot = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.055, 0.04),
    tieMat
  );
  tieKnot.position.set(0, -0.3, 0.24);
  group.add(tieKnot);

  // ── Clickable ──
  group.userData = { clickable: true, action: 'openGatekeeper' };
  scene.add(group);

  // ── Bobbing animation ──
  let time = 0;
  const baseY = group.position.y;

  function update(delta) {
    time += delta;
    group.position.y = baseY + Math.sin(time * 1.4) * 0.08;
    group.rotation.y = Math.sin(time * 0.7) * 0.12;
  }

  return { group, update };
}
