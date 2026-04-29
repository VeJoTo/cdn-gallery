// src/scene/do-not-press.js
// Easter egg: a big red button on the right wall. What could go wrong?

import * as THREE from 'three';

const CORAL  = 0xe05a4e;
const CORAL_H = '#e05a4e';

export function createDoNotPressButton(scene) {
  const group = new THREE.Group();
  // Right wall inner face, mid-room depth, eye level
  group.position.set(7.92, 1.3, -3.5);
  group.rotation.y = Math.PI / 2; // face into room (-X world direction)
  scene.add(group);

  // ── Backing panel ────────────────────────────────────────────────────
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x0a1628, metalness: 0.4, roughness: 0.6,
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.05), panelMat);
  panel.position.z = -0.025;
  group.add(panel);

  // Coral neon border strips around the panel
  const borderMat = new THREE.MeshStandardMaterial({
    color: CORAL, emissive: CORAL, emissiveIntensity: 2.0,
  });
  for (const [w, h, x, y] of [
    [0.38, 0.016, 0,      0.19],
    [0.38, 0.016, 0,     -0.19],
    [0.016, 0.38, -0.19,  0],
    [0.016, 0.38,  0.19,  0],
  ]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), borderMat);
    strip.position.set(x, y, 0.001);
    group.add(strip);
  }

  // ── The button ───────────────────────────────────────────────────────
  // Dark metal rim
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.2 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.025, 32), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 0, 0.012);
  group.add(rim);

  // The red glowing cap
  const capMat = new THREE.MeshStandardMaterial({
    color: CORAL, emissive: CORAL, emissiveIntensity: 2.5,
    roughness: 0.25, metalness: 0.1,
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.035, 32), capMat);
  cap.rotation.x = Math.PI / 2;
  cap.position.set(0, 0, 0.035);
  group.add(cap);

  // ── "DO NOT PRESS" sign above the panel ─────────────────────────────
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 768; signCanvas.height = 160;
  const ctx = signCanvas.getContext('2d');

  ctx.font = "bold 80px 'Octosquares', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CORAL_H;
  ctx.shadowColor = CORAL_H;
  ctx.shadowBlur = 28;
  ctx.fillText('DO NOT PRESS', 384, 80);
  ctx.shadowBlur = 0;
  // White core pass
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('DO NOT PRESS', 384, 80);
  ctx.globalAlpha = 1;

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.65, 0.14),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas), transparent: true, depthWrite: false })
  );
  sign.position.set(0, 0.30, 0.01);
  group.add(sign);

  // ── Accent light ─────────────────────────────────────────────────────
  const light = new THREE.PointLight(CORAL, 1.2, 1.8);
  light.position.set(0, 0, 0.3);
  group.add(light);

  // ── Interaction ──────────────────────────────────────────────────────
  group.userData = {
    clickable:  true,
    action:     'rickRoll',
    hoverLabel: '⚠ DO NOT PRESS',
  };

  return group;
}
