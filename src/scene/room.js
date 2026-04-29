// src/scene/room.js
import * as THREE from 'three';

// Gallery dimensions — museum-hall scale, white cube.
export const ROOM_WIDTH  = 16;  // X
export const ROOM_DEPTH  = 22;  // Z
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

  // ── Door on front wall — matches exterior glass double door exactly ──
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, ROOM_DEPTH / 2 - 0.05);
  doorGroup.scale.setScalar(1.1);
  scene.add(doorGroup);

  const doorFrameMat = new THREE.MeshStandardMaterial({
    color: 0xa8a090, roughness: 0.3, metalness: 0.7
  });

  // Top header
  const doorFrameTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.07, 0.07), doorFrameMat
  );
  doorFrameTop.position.set(0, 2.2, 0);
  doorGroup.add(doorFrameTop);

  // Side posts
  for (const fx of [-0.55, 0.55]) {
    const sidePost = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 2.2, 0.07), doorFrameMat
    );
    sidePost.position.set(fx, 1.1, 0);
    doorGroup.add(sidePost);
  }

  // Glass panels + handles
  const doorPanelMat = new THREE.MeshPhysicalMaterial({
    color: 0xddeeff, transparent: true, opacity: 0.35,
    roughness: 0.04, metalness: 0.1, side: THREE.DoubleSide
  });

  for (const dpx of [-0.265, 0.265]) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.53, 2.1), doorPanelMat
    );
    panel.position.set(dpx, 1.1, 0.01);
    panel.raycast = () => {};
    doorGroup.add(panel);

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.4, 0.03), doorFrameMat
    );
    handle.position.set(dpx > 0 ? dpx - 0.13 : dpx + 0.13, 1.05, 0.05);
    doorGroup.add(handle);
  }

  // Invisible click target covering the full door opening
  const doorClickTarget = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 2.2, 0.2),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  doorClickTarget.position.set(0, 1.1, 0);
  doorClickTarget.userData = { clickable: true, action: 'exitToExterior', label: 'Exit' };
  doorGroup.add(doorClickTarget);

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

  // Ceiling point lights — reduced from 12 to 4, higher intensity to maintain brightness.
  const rows = 2, cols = 2;
  const xStep = ROOM_WIDTH / (cols + 1);
  const zStep = ROOM_DEPTH / (rows + 1);
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const px = -ROOM_WIDTH / 2 + c * xStep;
      const pz = -ROOM_DEPTH / 2 + r * zStep;
      const lamp = new THREE.PointLight(0xffffff, 0.7, ROOM_HEIGHT * 3.5);
      lamp.position.set(px, ROOM_HEIGHT - 0.3, pz);
      scene.add(lamp);
    }
  }

  return { clickables: [doorClickTarget] };
}
