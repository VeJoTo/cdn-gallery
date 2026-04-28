import * as THREE from 'three';

const TEAL = 0x00d4aa;

function makePod(scene, x, z, rotY = 0) {
  const group = new THREE.Group();

  // ── Body ──────────────────────────────────────────────────────────────────
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xedf0f3, metalness: 0.18, roughness: 0.55,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.44, 0.72), bodyMat);
  body.position.y = 0.22;
  body.castShadow = true;
  group.add(body);

  // Slim top rim (slightly darker)
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd0d4d8, metalness: 0.2, roughness: 0.5 });
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.04, 0.64), rimMat);
  rim.position.y = 0.42;
  group.add(rim);

  // Soil surface
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(1.86, 0.03, 0.58),
    new THREE.MeshStandardMaterial({ color: 0x211508, roughness: 1.0 })
  );
  soil.position.y = 0.455;
  group.add(soil);

  // ── Plants ────────────────────────────────────────────────────────────────
  const greens = [0x3a8c2a, 0x4da83a, 0x2d7020, 0x56b840, 0x3d9430];
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2a6018, roughness: 0.9 });

  const xs = [-0.72, -0.38, 0.0, 0.38, 0.72];
  xs.forEach((px, i) => {
    const h = 0.38 + (i % 3) * 0.12;

    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.024, h, 5),
      stemMat
    );
    stem.position.set(px, 0.455 + h / 2, 0);
    group.add(stem);

    // Main leaf cluster
    const lh = 0.22 + (i % 2) * 0.1;
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, lh, 6),
      new THREE.MeshStandardMaterial({ color: greens[i % greens.length], roughness: 0.85 })
    );
    leaf.position.set(px, 0.455 + h + lh / 2 - 0.04, 0);
    group.add(leaf);

    // Side leaf (angled out)
    const sl = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, lh * 0.65, 5),
      new THREE.MeshStandardMaterial({ color: greens[(i + 2) % greens.length], roughness: 0.85 })
    );
    sl.rotation.z = (i % 2 === 0 ? 1 : -1) * (0.45 + 0.15 * (i % 3));
    sl.position.set(px + (i % 2 === 0 ? 0.1 : -0.1), 0.455 + h * 0.68, 0.06);
    group.add(sl);
  });

  // ── Front LED strip ───────────────────────────────────────────────────────
  const ledMat = new THREE.MeshBasicMaterial({ color: TEAL });
  const ledStrip = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.035), ledMat);
  ledStrip.position.set(0, 0.18, 0.362);
  group.add(ledStrip);

  // Teal glow from the pod
  const glow = new THREE.PointLight(TEAL, 0.7, 3.0);
  glow.position.set(0, 0.1, 0.4);
  group.add(glow);

  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  scene.add(group);
}

export function createPlants(scene) {
  // Front-left and front-right corners
  makePod(scene, -5.5,  9.0);
  makePod(scene,  5.5,  9.0, Math.PI);
  // Back wall, centred
  makePod(scene,  0.0, -9.8, Math.PI);
}
