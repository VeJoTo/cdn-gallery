// src/scene/do-not-press.js
import * as THREE from 'three';

export function createDoNotPressButton(scene) {
  const group = new THREE.Group();
  group.position.set(7.92, 1.4, 7.5);
  group.rotation.y = Math.PI / 2; // face into room
  scene.add(group);

  // ── Dark circular wall plate ─────────────────────────────────────────
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.04, 32),
    new THREE.MeshStandardMaterial({ color: 0x111820, metalness: 0.8, roughness: 0.3 })
  );
  plate.rotation.x = Math.PI / 2;
  plate.position.z = -0.02;
  group.add(plate);

  // Dark metal collar ring
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.23, 0.025, 10, 48),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.95, roughness: 0.15 })
  );
  group.add(collar); // sits at z=0

  // ── Red dome — full sphere half-embedded so it protrudes like a button ──
  // MeshBasicMaterial guarantees the red is visible regardless of scene lighting
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.20, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xcc0000 })
  );
  dome.position.z = 0.10; // half the sphere (0.20 radius) sticks out
  group.add(dome);

  // Small specular highlight on dome top to sell the 3D roundness
  const highlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.5 })
  );
  highlight.position.set(-0.05, 0.08, 0.22);
  group.add(highlight);


  // ── Red glow light ───────────────────────────────────────────────────
  const light = new THREE.PointLight(0xcc0000, 2.0, 2.5);
  light.position.set(0, 0, 0.4);
  group.add(light);

  // ── Interaction ──────────────────────────────────────────────────────
  group.userData = {
    clickable:  true,
    action:     'rickRoll',
    hoverLabel: '⚠ DO NOT PRESS',
  };

  return group;
}
