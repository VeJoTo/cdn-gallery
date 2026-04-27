// src/scene/sofa.js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createSofa(scene) {
  const group = new THREE.Group();
  group.position.set(-8, 0, 0);
  group.rotation.y = Math.PI / 2;

  // Clickable — navigates to the 'seat-sofa' hotspot
  group.userData.clickable = true;
  group.userData.hotspot   = 'tv';

  // ── Materials — medium slate gray, clearly lighter than the room ──────────
  const frameMat = new THREE.MeshPhysicalMaterial({
    color: 0x6b6f7e,
    roughness: 0.75,
    metalness: 0.0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.5,
  });

  const cushionMat = new THREE.MeshPhysicalMaterial({
    color: 0x7e8292,
    roughness: 0.82,
    metalness: 0.0,
  });

  // ── Platform base — full slab, no legs ────────────────────────────────────
  const platform = new THREE.Mesh(
    new RoundedBoxGeometry(2.72, 0.40, 1.04, 4, 0.025),
    frameMat
  );
  platform.position.set(0, 0.20, 0);
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);

  // ── Slab armrests — lower than backrest top ───────────────────────────────
  // Arm top at y = 0.40 + 0.40 = 0.80
  const armH = 0.40;
  const armGeo = new RoundedBoxGeometry(0.22, armH, 1.04, 4, 0.05);
  for (const ax of [-1.25, 1.25]) {
    const arm = new THREE.Mesh(armGeo, frameMat);
    arm.position.set(ax, 0.40 + armH / 2, 0);
    arm.castShadow = true;
    group.add(arm);
  }

  // ── Backrest slab — taller than arms, top at y = 0.40 + 0.62 = 1.02 ─────
  const backrestH = 0.62;
  const backrestW = 2.72 - 2 * 0.22; // 2.28, between inner arm faces
  const backrest = new THREE.Mesh(
    new RoundedBoxGeometry(backrestW, backrestH, 0.20, 4, 0.04),
    frameMat
  );
  backrest.position.set(0, 0.40 + backrestH / 2, 0.42);
  backrest.castShadow = true;
  group.add(backrest);

  // ── Two seat cushions — run arm to arm ────────────────────────────────────
  const seatCushionGeo = new RoundedBoxGeometry(1.08, 0.19, 0.96, 5, 0.07);
  for (const cx of [-0.56, 0.56]) {
    const sc = new THREE.Mesh(seatCushionGeo, cushionMat);
    sc.position.set(cx, 0.495, -0.02);
    sc.castShadow = true;
    group.add(sc);
  }

  // ── Three back cushions — tall, leaning against backrest ─────────────────
  const backCushionGeo = new RoundedBoxGeometry(0.65, 0.54, 0.14, 5, 0.07);
  for (const cx of [-0.73, 0, 0.73]) {
    const bc = new THREE.Mesh(backCushionGeo, cushionMat);
    bc.position.set(cx, 0.62, 0.31);
    bc.rotation.x = 0.08;
    bc.castShadow = true;
    group.add(bc);
  }

  scene.add(group);
  return group;
}
