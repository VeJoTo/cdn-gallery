// src/sky.js
import * as THREE from 'three';

const STORAGE_KEY = 'cdn-gallery-sky-mode';
const VALID_MODES = new Set(['day', 'night']);

export function getSkyMode() {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return VALID_MODES.has(stored) ? stored : 'day';
  } catch {
    return 'day';
  }
}

export function setSkyMode(mode) {
  if (!VALID_MODES.has(mode)) return;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage unavailable — choice won't persist, but don't crash.
  }
}

export const DAY_COLOR = 0x88bbf0;
export const NIGHT_COLOR = 0x0a1128;

const STAR_COUNT = 800;
const SKY_RADIUS = 500;

function createStarfield() {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    // Upper hemisphere, with a little overhang so stars wrap past the horizon
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.9);
    const r = SKY_RADIUS;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.6,
    sizeAttenuation: true,
    depthWrite: false,
    transparent: true,
  });
  const points = new THREE.Points(geom, mat);
  points.name = 'sky-stars';
  points.frustumCulled = false;
  return points;
}

function createMoon() {
  const geom = new THREE.SphereGeometry(14, 24, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff4d6 });
  const moon = new THREE.Mesh(geom, mat);
  moon.position.set(260, 180, -240);
  moon.name = 'sky-moon';
  moon.frustumCulled = false;
  return moon;
}

function removeSkyObjects(scene) {
  for (const name of ['sky-stars', 'sky-moon']) {
    const existing = scene.getObjectByName(name);
    if (existing) {
      existing.geometry.dispose();
      existing.material.dispose();
      scene.remove(existing);
    }
  }
}

export function applySkyMode(scene, mode) {
  const resolved = VALID_MODES.has(mode) ? mode : 'day';
  removeSkyObjects(scene);
  if (resolved === 'night') {
    scene.background = new THREE.Color(NIGHT_COLOR);
    scene.add(createStarfield());
    scene.add(createMoon());
  } else {
    scene.background = new THREE.Color(DAY_COLOR);
  }
}
