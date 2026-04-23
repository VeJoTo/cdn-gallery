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

const STAR_COUNT = 600;
// Skydome radius is 28 (exterior) / 15 (nature). Put stars JUST INSIDE the
// exterior dome so they're visible at a readable size without fighting
// size-attenuation at 500-unit distances.
const STAR_RADIUS = 22;

function createStarfield() {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    // Upper hemisphere, with a little overhang so stars wrap past the horizon
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.9);
    const r = STAR_RADIUS * (0.85 + Math.random() * 0.15);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.12,
    sizeAttenuation: true,
    depthWrite: false,
    transparent: true,
    opacity: 0.95,
  });
  const points = new THREE.Points(geom, mat);
  points.name = 'sky-stars';
  points.frustumCulled = false;
  points.renderOrder = -1;
  return points;
}

function createMoon() {
  const geom = new THREE.SphereGeometry(1.3, 32, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfff4d6,
    transparent: true,
    opacity: 1.0,
  });
  const moon = new THREE.Mesh(geom, mat);
  // Inside the 28-radius exterior dome, sitting high and off to one side
  moon.position.set(-20 + 14, 16, -14);
  moon.name = 'sky-moon';
  moon.frustumCulled = false;
  moon.renderOrder = -1;
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

export function clearSkyObjects(scene) {
  removeSkyObjects(scene);
}

const SKYDOME_NAMES = ['exterior-skydome', 'nature-skydome'];

export function applySkyMode(scene, mode) {
  const resolved = VALID_MODES.has(mode) ? mode : 'day';
  removeSkyObjects(scene);
  if (resolved === 'night') {
    scene.background = new THREE.Color(NIGHT_COLOR);
    scene.add(createStarfield());
    scene.add(createMoon());
    // Hide the per-room textured skydomes so scene.background (dark) shows
    // through. setRoomVisibility handles day-mode visibility; we only override
    // in night mode and only in the hiding direction.
    for (const name of SKYDOME_NAMES) {
      const dome = scene.getObjectByName(name);
      if (dome) dome.visible = false;
    }
  } else {
    scene.background = new THREE.Color(DAY_COLOR);
    // In day mode, restore the active room's skydome. setRoomVisibility has
    // already set non-active domes to .visible = false, so we just re-enable
    // any dome we previously hid.
    for (const name of SKYDOME_NAMES) {
      const dome = scene.getObjectByName(name);
      if (dome) dome.visible = true;
    }
  }
}
