// src/scene/room.js
import * as THREE from 'three';

export function createRoom(scene) {
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a4a,
    emissive: 0x3a1a5e,
    emissiveIntensity: 0.35,
    roughness: 0.7,
    side: THREE.FrontSide
  });
  const wallMat  = new THREE.MeshStandardMaterial({
    color: 0x2a1a3e,
    emissive: 0x3a1a5e,
    emissiveIntensity: 0.45,
    roughness: 0.85,
    side: THREE.FrontSide
  });
  const ceilMat  = new THREE.MeshStandardMaterial({
    color: 0x1a0a2e,
    emissive: 0x2a1a4a,
    emissiveIntensity: 0.25,
    side: THREE.FrontSide
  });

  // Floor 7×6
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-3.5, 1.75, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(3.5, 1.75, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Back wall
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), wallMat);
  backWall.position.set(0, 1.75, -3);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.5, 0);
  ceil.receiveShadow = true;
  scene.add(ceil);

  // ── Lighting ────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x7a3acc, 0.8);
  scene.add(ambient);

  // Hemisphere light: pink from above, deep purple from below
  const hemi = new THREE.HemisphereLight(0xff66cc, 0x4a2a8c, 1.0);
  hemi.position.set(0, 4, 0);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffd166, 0.6);
  dirLight.position.set(2, 8, 6);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -8;
  dirLight.shadow.camera.right = 8;
  dirLight.shadow.camera.top = 8;
  dirLight.shadow.camera.bottom = -8;
  scene.add(dirLight);

  const neonPink = new THREE.PointLight(0xff006e, 1.5, 8);
  neonPink.position.set(-2.5, 1.5, 0.5);
  scene.add(neonPink);

  const neonTeal = new THREE.PointLight(0x00e5ff, 1.5, 8);
  neonTeal.position.set(2.5, 1.5, 0.5);
  scene.add(neonTeal);

  const neonPurple = new THREE.PointLight(0x9b00ff, 0.8, 12);
  neonPurple.position.set(0, 2.5, 1.5);
  scene.add(neonPurple);

  // Neon floor strips along the base of left & right walls
  const stripGeom = new THREE.BoxGeometry(7, 0.02, 0.06);

  const leftStripMat = new THREE.MeshStandardMaterial({
    color: 0xff006e, emissive: 0xff006e, emissiveIntensity: 1.0
  });
  const leftStrip = new THREE.Mesh(stripGeom, leftStripMat);
  leftStrip.rotation.y = Math.PI / 2;
  leftStrip.position.set(-3.45, 0.01, 0);
  scene.add(leftStrip);

  const rightStripMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.0
  });
  const rightStrip = new THREE.Mesh(stripGeom, rightStripMat);
  rightStrip.rotation.y = -Math.PI / 2;
  rightStrip.position.set(3.45, 0.01, 0);
  scene.add(rightStrip);

  // ── Ceiling-edge neon strips (LED tape along top of walls) ──
  const ceilingY = 3.45;

  // Left wall top edge — cyan, runs along z (room depth = 6)
  const sideStripGeom = new THREE.BoxGeometry(6, 0.04, 0.08);

  const leftCeilMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.6
  });
  const leftCeilStrip = new THREE.Mesh(sideStripGeom, leftCeilMat);
  leftCeilStrip.rotation.y = Math.PI / 2;
  leftCeilStrip.position.set(-3.45, ceilingY, 0);
  scene.add(leftCeilStrip);

  // Right wall top edge — purple, runs along z
  const rightCeilMat = new THREE.MeshStandardMaterial({
    color: 0x9b00ff, emissive: 0x9b00ff, emissiveIntensity: 1.6
  });
  const rightCeilStrip = new THREE.Mesh(sideStripGeom, rightCeilMat);
  rightCeilStrip.rotation.y = -Math.PI / 2;
  rightCeilStrip.position.set(3.45, ceilingY, 0);
  scene.add(rightCeilStrip);

  // Back wall top edge — pink, runs along x (room width = 7)
  const backStripGeom = new THREE.BoxGeometry(7, 0.04, 0.08);
  const backCeilMat = new THREE.MeshStandardMaterial({
    color: 0xff006e, emissive: 0xff006e, emissiveIntensity: 1.6
  });
  const backCeilStrip = new THREE.Mesh(backStripGeom, backCeilMat);
  backCeilStrip.position.set(0, ceilingY, -2.96);
  scene.add(backCeilStrip);

  // Back wall floor strip — gold, runs along x at the base
  const backFloorMat = new THREE.MeshStandardMaterial({
    color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 1.4
  });
  const backFloorStrip = new THREE.Mesh(backStripGeom, backFloorMat);
  backFloorStrip.position.set(0, 0.01, -2.96);
  scene.add(backFloorStrip);

  // ── Vertical corner strips (gold) at back-left and back-right ──
  const cornerStripGeom = new THREE.BoxGeometry(0.06, 3.45, 0.06);
  const cornerMat = new THREE.MeshStandardMaterial({
    color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 1.5
  });

  const backLeftCorner = new THREE.Mesh(cornerStripGeom, cornerMat);
  backLeftCorner.position.set(-3.45, 1.725, -2.96);
  scene.add(backLeftCorner);

  const backRightCorner = new THREE.Mesh(cornerStripGeom, cornerMat);
  backRightCorner.position.set(3.45, 1.725, -2.96);
  scene.add(backRightCorner);

  // ── Coloured fill lights near each ceiling strip ──
  const cyanFill = new THREE.PointLight(0x00e5ff, 2.5, 14);
  cyanFill.position.set(-3.0, 3.2, 0);
  scene.add(cyanFill);

  const purpleFill = new THREE.PointLight(0x9b00ff, 2.5, 14);
  purpleFill.position.set(3.0, 3.2, 0);
  scene.add(purpleFill);

  const pinkFill = new THREE.PointLight(0xff006e, 2.5, 14);
  pinkFill.position.set(0, 3.2, -2.5);
  scene.add(pinkFill);

  // Extra centre fill — soft white-purple to brighten everything
  const centerFill = new THREE.PointLight(0xc080ff, 1.8, 16);
  centerFill.position.set(0, 2.8, 1.0);
  scene.add(centerFill);
}
