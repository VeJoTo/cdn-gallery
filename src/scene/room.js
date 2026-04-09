// src/scene/room.js
import * as THREE from 'three';

export function createRoom(scene) {
  const floorMat  = new THREE.MeshLambertMaterial({ color: 0x4a3728, side: THREE.FrontSide });
  const wallMat   = new THREE.MeshLambertMaterial({ color: 0xd4c9b0, side: THREE.FrontSide });
  const ceilMat   = new THREE.MeshLambertMaterial({ color: 0xc8bfaa, side: THREE.FrontSide });

  // Floor 7×6
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Left wall (at x = -3.5, facing +x)
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-3.5, 1.75, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Right wall (at x = +3.5, facing -x)
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(3.5, 1.75, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Back wall (at z = -3, facing +z)
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
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
  dirLight.position.set(2, 8, 6);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -8;
  dirLight.shadow.camera.right = 8;
  dirLight.shadow.camera.top = 8;
  dirLight.shadow.camera.bottom = -8;
  scene.add(dirLight);

  // Warm fill from below-front
  const fillLight = new THREE.PointLight(0xff9955, 0.4, 20);
  fillLight.position.set(0, 1, 5);
  scene.add(fillLight);
}
