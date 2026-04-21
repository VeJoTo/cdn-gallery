// src/scene/room.js
import * as THREE from 'three';

// Gallery dimensions — museum-hall scale, white cube.
export const ROOM_WIDTH  = 22;  // X
export const ROOM_DEPTH  = 30;  // Z
export const ROOM_HEIGHT = 7;   // Y

export function createRoom(scene) {
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 0.0, roughness: 0.95, side: THREE.DoubleSide
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f6, metalness: 0.05, roughness: 0.85
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 0.0, roughness: 0.9
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    ceilMat
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = ROOM_HEIGHT;
  scene.add(ceil);

  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT),
    wallMat
  );
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT),
    wallMat
  );
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT),
    wallMat
  );
  backWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const frontWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT),
    wallMat
  );
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
  frontWall.receiveShadow = true;
  scene.add(frontWall);

  // ── Lighting ──
  // Bright, flat, gallery-style. Strong ambient + hemi so walls don't go grey,
  // plus a grid of soft overhead point lights for subtle falloff.
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const hemi = new THREE.HemisphereLight(0xffffff, 0xeeeeee, 0.6);
  hemi.position.set(0, ROOM_HEIGHT, 0);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(0, ROOM_HEIGHT + 4, 0);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = ROOM_HEIGHT * 3;
  dirLight.shadow.camera.left = -ROOM_WIDTH / 2;
  dirLight.shadow.camera.right = ROOM_WIDTH / 2;
  dirLight.shadow.camera.top = ROOM_DEPTH / 2;
  dirLight.shadow.camera.bottom = -ROOM_DEPTH / 2;
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);

  // Ceiling point lights — 3×4 grid, soft falloff.
  const rows = 4, cols = 3;
  const xStep = ROOM_WIDTH / (cols + 1);
  const zStep = ROOM_DEPTH / (rows + 1);
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const px = -ROOM_WIDTH / 2 + c * xStep;
      const pz = -ROOM_DEPTH / 2 + r * zStep;
      const lamp = new THREE.PointLight(0xffffff, 0.25, ROOM_HEIGHT * 2.2);
      lamp.position.set(px, ROOM_HEIGHT - 0.3, pz);
      scene.add(lamp);
    }
  }
}
