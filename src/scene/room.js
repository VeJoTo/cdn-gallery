// src/scene/room.js
import * as THREE from 'three';

export function createRoom(scene) {
  // ── Observatory shell materials ──
  const shellWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8, metalness: 0.1, roughness: 0.7, side: THREE.DoubleSide
  });
  const ledCyanMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.2
  });

  // ── Hidden box walls/ceiling/floor ──
  // Kept as invisible meshes so the scene graph retains the room's nominal
  // dimensions; the observatory skin (curved panels, dome, hex floor) sits
  // on top of this box. Shared shellWhiteMat is used because these meshes
  // never render — the material is just a placeholder.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), shellWhiteMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.visible = false;
  scene.add(floor);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5), shellWhiteMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-3.5, 1.75, 0);
  leftWall.receiveShadow = true;
  leftWall.visible = false;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5), shellWhiteMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(3.5, 1.75, 0);
  rightWall.receiveShadow = true;
  rightWall.visible = false;
  scene.add(rightWall);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), shellWhiteMat);
  backWall.position.set(0, 1.75, -3);
  backWall.receiveShadow = true;
  backWall.visible = false;
  scene.add(backWall);

  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), shellWhiteMat);
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, 1.75, 3);
  frontWall.receiveShadow = true;
  frontWall.raycast = () => {}; // Don't block raycasts to portal
  frontWall.visible = false;
  scene.add(frontWall);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), shellWhiteMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.5, 0);
  ceil.receiveShadow = true;
  ceil.visible = false;
  scene.add(ceil);

  // ── Curved inner wall panels (observatory skin) ──
  // Each wall is a shallow cylinder-segment arched inward. The outer box
  // stays hidden for dimension/collision; this is the visible skin.
  const WALL_ARC = Math.PI / 3;    // 60°
  const WALL_RADIUS = 3.3;
  const WALL_HEIGHT = 3.4;

  // Left wall (concave facing +x)
  const leftCurved = new THREE.Mesh(
    new THREE.CylinderGeometry(
      WALL_RADIUS, WALL_RADIUS, WALL_HEIGHT, 48, 1, true,
      -WALL_ARC / 2, WALL_ARC
    ),
    shellWhiteMat
  );
  leftCurved.rotation.z = Math.PI / 2;
  leftCurved.position.set(
    -3.4 - WALL_RADIUS * (1 - Math.cos(WALL_ARC / 2)),
    WALL_HEIGHT / 2,
    0
  );
  scene.add(leftCurved);

  // Right wall (mirror of left)
  const rightCurved = new THREE.Mesh(
    new THREE.CylinderGeometry(
      WALL_RADIUS, WALL_RADIUS, WALL_HEIGHT, 48, 1, true,
      -WALL_ARC / 2, WALL_ARC
    ),
    shellWhiteMat
  );
  rightCurved.rotation.z = -Math.PI / 2;
  rightCurved.position.set(
    3.4 + WALL_RADIUS * (1 - Math.cos(WALL_ARC / 2)),
    WALL_HEIGHT / 2,
    0
  );
  scene.add(rightCurved);

  // Back wall (concave facing +z)
  const backCurved = new THREE.Mesh(
    new THREE.CylinderGeometry(
      WALL_RADIUS, WALL_RADIUS, WALL_HEIGHT, 48, 1, true,
      -Math.PI / 2 - WALL_ARC / 2, WALL_ARC
    ),
    shellWhiteMat
  );
  backCurved.position.set(
    0,
    WALL_HEIGHT / 2,
    -3.0 - WALL_RADIUS * (1 - Math.cos(WALL_ARC / 2))
  );
  scene.add(backCurved);

  // Front wall (concave facing -z) — doesn't block clicks to the portal
  const frontCurved = new THREE.Mesh(
    new THREE.CylinderGeometry(
      WALL_RADIUS, WALL_RADIUS, WALL_HEIGHT, 48, 1, true,
      Math.PI / 2 - WALL_ARC / 2, WALL_ARC
    ),
    shellWhiteMat
  );
  frontCurved.position.set(
    0,
    WALL_HEIGHT / 2,
    2.95 + WALL_RADIUS * (1 - Math.cos(WALL_ARC / 2))
  );
  frontCurved.raycast = () => {};
  scene.add(frontCurved);

  // ── Vertical LED seam strips at corners ──
  const ledSeamGeom = new THREE.BoxGeometry(0.04, WALL_HEIGHT, 0.015);
  const ledCorners = [
    [-3.4, -2.95],
    [ 3.4, -2.95],
    [-3.4,  2.95],
    [ 3.4,  2.95]
  ];
  for (const [cx, cz] of ledCorners) {
    const seam = new THREE.Mesh(ledSeamGeom, ledCyanMat);
    seam.position.set(cx, WALL_HEIGHT / 2, cz);
    scene.add(seam);
  }

  // ── Dome ceiling ──
  const domeGeom = new THREE.SphereGeometry(3.6, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeom, shellWhiteMat);
  dome.rotation.x = Math.PI;   // flip to face downward
  dome.position.set(0, 3.4, 0);
  scene.add(dome);

  // ── Ceiling inset light panels (10 discs dotted across the dome) ──
  const panelDiscMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8, metalness: 0.1, roughness: 0.5
  });
  const panelCoreMat = new THREE.MeshStandardMaterial({
    color: 0xa8e8ff, emissive: 0x9ce0ff, emissiveIntensity: 1.3
  });
  // Panel placements as (radius-from-center, angle-around-Y) pairs.
  // One at apex (r=0), three inner at r=1.2, six outer at r=2.4.
  const panelSpots = [
    { r: 0,   a: 0 },
    { r: 1.2, a: 0 },
    { r: 1.2, a: (2 * Math.PI) / 3 },
    { r: 1.2, a: (4 * Math.PI) / 3 },
    { r: 2.4, a: Math.PI / 6 },
    { r: 2.4, a: Math.PI / 2 },
    { r: 2.4, a: (5 * Math.PI) / 6 },
    { r: 2.4, a: (7 * Math.PI) / 6 },
    { r: 2.4, a: (3 * Math.PI) / 2 },
    { r: 2.4, a: (11 * Math.PI) / 6 }
  ];
  const panelDiscGeom = new THREE.CircleGeometry(0.3, 24);
  const panelCoreGeom = new THREE.CircleGeometry(0.15, 24);
  for (const { r, a } of panelSpots) {
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;

    const disc = new THREE.Mesh(panelDiscGeom, panelDiscMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(px, 3.38, pz);
    scene.add(disc);

    const core = new THREE.Mesh(panelCoreGeom, panelCoreMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(px, 3.381, pz);
    scene.add(core);

    const panelLight = new THREE.PointLight(0xb8e0ff, 0.4, 5);
    panelLight.position.set(px, 3.2, pz);
    scene.add(panelLight);
  }

  // ── Lighting ────────────────────────────────────
  const ambient = new THREE.AmbientLight(0xc8d8e8, 0.35);
  scene.add(ambient);

  // Hemisphere light: warm sky from above, neutral ground from below
  const hemi = new THREE.HemisphereLight(0xb8d8ec, 0x6a6e78, 0.8);
  hemi.position.set(0, 4, 0);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xe0e8f0, 0.4);
  dirLight.position.set(2, 8, 6);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -8;
  dirLight.shadow.camera.right = 8;
  dirLight.shadow.camera.top = 8;
  dirLight.shadow.camera.bottom = -8;
  scene.add(dirLight);
}
