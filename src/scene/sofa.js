// src/scene/sofa.js
// Futuristic sofa — clear sofa silhouette (seat, back, arms) with dark
// metallic upholstery, chrome legs, and neon cyan LED trim strips.
// Placed in front of the TV wall (TV at world x ≈ -10.95, z = 0, facing +x).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createSofa(scene) {
  const group = new THREE.Group();
  // x = -8: a comfortable distance from the TV wall
  // rotation.y = π/2 → local -z = world -x, so the seated viewer faces the TV
  group.position.set(-8, 0, 0);
  group.rotation.y = Math.PI / 2;

  // ── Materials ───────────────────────────────────────────────────────────
  const upholsteryMat = new THREE.MeshPhysicalMaterial({
    color: 0x12202e,
    roughness: 0.35,
    metalness: 0.2,
    clearcoat: 0.7,
    clearcoatRoughness: 0.08,
  });

  const chromeMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8dded,
    roughness: 0.04,
    metalness: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
  });

  const neonMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });

  // ── Seat cushion ─────────────────────────────────────────────────────────
  const seat = new THREE.Mesh(
    new RoundedBoxGeometry(2.3, 0.25, 0.9, 4, 0.07),
    upholsteryMat
  );
  seat.position.set(0, 0.37, 0);
  seat.castShadow = true;
  group.add(seat);

  // ── Backrest ──────────────────────────────────────────────────────────────
  const back = new THREE.Mesh(
    new RoundedBoxGeometry(2.3, 0.62, 0.2, 4, 0.07),
    upholsteryMat
  );
  back.position.set(0, 0.85, 0.38);
  back.rotation.x = 0.12; // subtle recline
  back.castShadow = true;
  group.add(back);

  // ── Left armrest ──────────────────────────────────────────────────────────
  const armGeo = new RoundedBoxGeometry(0.18, 0.48, 0.9, 4, 0.05);
  const armL = new THREE.Mesh(armGeo, upholsteryMat);
  armL.position.set(-1.15, 0.49, 0);
  armL.castShadow = true;
  group.add(armL);

  // ── Right armrest ─────────────────────────────────────────────────────────
  const armR = new THREE.Mesh(armGeo, upholsteryMat);
  armR.position.set(1.15, 0.49, 0);
  armR.castShadow = true;
  group.add(armR);

  // ── Chrome legs ───────────────────────────────────────────────────────────
  const legGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.24, 10);
  for (const [lx, lz] of [[-0.95, -0.38], [0.95, -0.38], [-0.95, 0.38], [0.95, 0.38]]) {
    const leg = new THREE.Mesh(legGeo, chromeMat);
    leg.position.set(lx, 0.12, lz);
    group.add(leg);
  }

  // ── Chrome side rails connecting legs ─────────────────────────────────────
  const railGeo = new THREE.BoxGeometry(2.0, 0.025, 0.025);
  for (const rz of [-0.38, 0.38]) {
    const rail = new THREE.Mesh(railGeo, chromeMat);
    rail.position.set(0, 0.04, rz);
    group.add(rail);
  }

  // ── Neon LED strips ───────────────────────────────────────────────────────
  const ledGeo = new THREE.BoxGeometry(2.18, 0.022, 0.022);

  // Front and back base strips
  for (const lz of [-0.46, 0.46]) {
    const led = new THREE.Mesh(ledGeo, neonMat);
    led.position.set(0, 0.24, lz);
    group.add(led);
  }

  // Top of backrest strip
  const ledTop = new THREE.Mesh(ledGeo, neonMat);
  ledTop.position.set(0, 1.18, 0.28);
  group.add(ledTop);

  // ── Glow lights ───────────────────────────────────────────────────────────
  const glowBase = new THREE.PointLight(0x00d4ff, 0.55, 2.2);
  glowBase.position.set(0, 0.08, 0);
  group.add(glowBase);

  const glowBack = new THREE.PointLight(0x00d4ff, 0.28, 1.4);
  glowBack.position.set(0, 1.25, 0.25);
  group.add(glowBack);

  scene.add(group);
  return group;
}
