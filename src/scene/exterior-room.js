// src/scene/exterior-room.js
import * as THREE from 'three';

const OFFSET = new THREE.Vector3(-20, 0, 0);

export function createExteriorRoom(scene) {
  const ox = OFFSET.x;

  // ── Sky dome — overcast Bergen sky ──
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 256;
  skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  const skyGrad = sctx.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0,   '#7a8899');
  skyGrad.addColorStop(0.4, '#9aaabb');
  skyGrad.addColorStop(0.7, '#b8c8d4');
  skyGrad.addColorStop(1,   '#ccd8e0');
  sctx.fillStyle = skyGrad;
  sctx.fillRect(0, 0, 256, 256);
  // Overcast cloud ellipses — soft, diffuse
  sctx.fillStyle = 'rgba(255,255,255,0.25)';
  sctx.beginPath(); sctx.ellipse(50,  40, 55, 22, 0, 0, Math.PI * 2); sctx.fill();
  sctx.fillStyle = 'rgba(255,255,255,0.18)';
  sctx.beginPath(); sctx.ellipse(160, 60, 65, 20, 0, 0, Math.PI * 2); sctx.fill();
  sctx.fillStyle = 'rgba(255,255,255,0.20)';
  sctx.beginPath(); sctx.ellipse(210, 30, 40, 14, 0, 0, Math.PI * 2); sctx.fill();
  sctx.fillStyle = 'rgba(255,255,255,0.15)';
  sctx.beginPath(); sctx.ellipse(95,  90, 50, 18, 0, 0, Math.PI * 2); sctx.fill();
  sctx.fillStyle = 'rgba(200,210,220,0.20)';
  sctx.beginPath(); sctx.ellipse(130, 120, 80, 25, 0, 0, Math.PI * 2); sctx.fill();

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(28, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
  );
  sky.position.set(ox, 2, 0);
  scene.add(sky);

  // ── Ground — green grass, 30x30 ──
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256;
  grassCanvas.height = 256;
  const gctx = grassCanvas.getContext('2d');
  gctx.fillStyle = '#3a7a30';
  gctx.fillRect(0, 0, 256, 256);
  // Grass blade strokes
  for (let i = 0; i < 600; i++) {
    const bx = Math.random() * 256;
    const by = Math.random() * 256;
    gctx.strokeStyle = Math.random() > 0.5 ? '#4a8a3a' : '#2a6020';
    gctx.lineWidth = 1;
    gctx.beginPath();
    gctx.moveTo(bx, by);
    gctx.lineTo(bx + (Math.random() - 0.5) * 4, by - 3 - Math.random() * 7);
    gctx.stroke();
  }
  const grassTex = new THREE.CanvasTexture(grassCanvas);
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(8, 8);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(ox, -0.01, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Paved stone path — 2.5 wide, runs from spawn toward glasshus ──
  const pathCanvas = document.createElement('canvas');
  pathCanvas.width = 256;
  pathCanvas.height = 256;
  const pctx = pathCanvas.getContext('2d');
  pctx.fillStyle = '#b0a898';
  pctx.fillRect(0, 0, 256, 256);
  // Stone slab grid lines
  pctx.strokeStyle = '#8a8070';
  pctx.lineWidth = 2;
  for (let py = 0; py < 256; py += 32) {
    pctx.beginPath(); pctx.moveTo(0, py); pctx.lineTo(256, py); pctx.stroke();
  }
  for (let px = 0; px < 256; px += 48) {
    pctx.beginPath(); pctx.moveTo(px, 0); pctx.lineTo(px, 256); pctx.stroke();
  }
  // Subtle stone colour variation
  for (let i = 0; i < 40; i++) {
    pctx.fillStyle = `rgba(${(120 + Math.random() * 30) | 0},${(110 + Math.random() * 20) | 0},${(95 + Math.random() * 15) | 0},0.18)`;
    pctx.fillRect(Math.random() * 230, Math.random() * 230, 20 + Math.random() * 20, 20 + Math.random() * 12);
  }
  const pathTex = new THREE.CanvasTexture(pathCanvas);
  pathTex.wrapS = THREE.RepeatWrapping;
  pathTex.wrapT = THREE.RepeatWrapping;
  pathTex.repeat.set(1, 3);
  const stonePath = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 12),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.8 })
  );
  stonePath.rotation.x = -Math.PI / 2;
  stonePath.position.set(ox, 0.002, 4);  // centred at z=4, stretches z≈-2 to z≈10
  stonePath.receiveShadow = true;
  scene.add(stonePath);

  // ── Lighting — flat overcast Bergen day ──
  const ambient = new THREE.AmbientLight(0xb0b8c0, 0.7);
  scene.add(ambient);

  // Subtle directional (diffuse sun behind clouds, from NW — typical Bergen)
  const dirLight = new THREE.DirectionalLight(0xc8d0d8, 0.4);
  dirLight.position.set(ox - 4, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near   = 0.5;
  dirLight.shadow.camera.far    = 30;
  dirLight.shadow.camera.left   = -12;
  dirLight.shadow.camera.right  =  12;
  dirLight.shadow.camera.top    =  12;
  dirLight.shadow.camera.bottom = -12;
  scene.add(dirLight);

  // Warm interior glow — warm light spilling through glass from inside the glasshus
  const interiorGlow = new THREE.PointLight(0xffddaa, 1.2, 7);
  interiorGlow.position.set(ox, 1.5, -2);  // centred inside glasshus
  scene.add(interiorGlow);

  return { offset: OFFSET, clickables: [] };
}
