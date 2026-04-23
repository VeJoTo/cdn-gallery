// src/scene/sofa.js
// Futuristic organic sofa — translucent blue glass form, placed in front of the TV wall.
// TV is at world x ≈ -10.95, z = 0 facing +x.  Sofa sits at x = -8, z = 0,
// rotated so the seated viewer looks toward -x (toward the TV).
import * as THREE from 'three';

export function createSofa(scene) {
  const group = new THREE.Group();
  group.position.set(-8, 0, 0);
  // rotation.y = π/2 → local -z becomes world -x (face direction toward TV)
  group.rotation.y = Math.PI / 2;

  // ── Materials ──────────────────────────────────────────────────────────
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x4fc3e8,
    transparent: true,
    opacity: 0.68,
    roughness: 0.04,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    side: THREE.DoubleSide,
  });

  const innerMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a90b8,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.0,
    clearcoat: 0.5,
    side: THREE.FrontSide,
  });

  // ── Helper: organic blob from a scaled sphere ───────────────────────────
  function blob(sx, sy, sz, px, py, pz, rx = 0, ry = 0, mat = glassMat) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    m.rotation.set(rx, ry, 0);
    return m;
  }

  // ── Seat cushion — wide, low, organic ──────────────────────────────────
  group.add(blob(1.55, 0.28, 0.72, 0, 0.28, 0));
  // Inner volume gives the hollow-glass depth
  group.add(blob(1.40, 0.20, 0.60, 0, 0.28, 0, 0, 0, innerMat));

  // ── Backrest — tall, tilted back slightly ──────────────────────────────
  group.add(blob(1.42, 0.72, 0.28, 0, 0.80, 0.52, 0.28));
  group.add(blob(1.28, 0.62, 0.20, 0, 0.80, 0.52, 0.28, 0, innerMat));

  // ── Left armrest ───────────────────────────────────────────────────────
  group.add(blob(0.26, 0.46, 0.68, -1.38, 0.54, 0.08));
  // ── Right armrest ──────────────────────────────────────────────────────
  group.add(blob(0.26, 0.46, 0.68,  1.38, 0.54, 0.08));

  // ── Base — very flat, grounds the form ────────────────────────────────
  const baseMat = new THREE.MeshPhysicalMaterial({
    color: 0x38a8cc,
    transparent: true,
    opacity: 0.55,
    roughness: 0.08,
    metalness: 0.0,
    clearcoat: 0.8,
    side: THREE.FrontSide,
  });
  group.add(blob(1.52, 0.11, 0.70, 0, 0.11, 0, 0, 0, baseMat));

  // ── Neon underglow strip ────────────────────────────────────────────────
  const glowLight = new THREE.PointLight(0x00d4ff, 0.6, 2.5);
  glowLight.position.set(0, 0.04, 0);
  group.add(glowLight);

  // Thin emissive strip mesh to make the glow visible
  const stripMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
  const strip = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.02, 32), stripMat);
  strip.scale.z = 0.45;
  strip.position.y = 0.03;
  group.add(strip);

  scene.add(group);
  return group;
}
