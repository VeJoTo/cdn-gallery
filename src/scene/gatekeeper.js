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

  // Beard
  const beard = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.45, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8e0d0 })
  );
  beard.position.y = -0.34;
  group.add(beard);

  // Hat brim
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.06, 12),
    new THREE.MeshLambertMaterial({ color: 0x2a1a6e })
  );
  brim.position.y = 0.3;
  group.add(brim);

  // Hat cone
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.7, 12),
    new THREE.MeshLambertMaterial({ color: 0x2a1a6e })
  );
  hat.position.y = 0.68;
  group.add(hat);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  for (const ex of [-0.11, 0.11]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eyeMat);
    eye.position.set(ex, 0.06, 0.28);
    group.add(eye);
  }

  // Spectacles (two torus rings)
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x888866 });
  for (const gx of [-0.11, 0.11]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16), glassMat);
    ring.position.set(gx, 0.06, 0.26);
    group.add(ring);
  }

  // Spectacles bridge
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.01, 0.01),
    glassMat
  );
  bridge.position.set(0, 0.06, 0.26);
  group.add(bridge);

  // Stars on hat (3 small emissive spheres)
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffdd44,
    emissive: 0xffdd44,
    emissiveIntensity: 0.8
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
