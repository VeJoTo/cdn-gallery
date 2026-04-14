// src/scene/nature-room.js
import * as THREE from 'three';

const OFFSET = new THREE.Vector3(20, 0, 0); // Nature room is 20 units to the right

export function createNatureRoom(scene) {
  const ox = OFFSET.x;

  // ── Floor — grass-like green ──
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 256;
  floorCanvas.height = 256;
  const fctx = floorCanvas.getContext('2d');
  fctx.fillStyle = '#1a3a1a';
  fctx.fillRect(0, 0, 256, 256);
  // Grass texture strokes
  fctx.strokeStyle = '#2a5a2a';
  fctx.lineWidth = 1;
  for (let i = 0; i < 200; i++) {
    const gx = Math.random() * 256;
    const gy = Math.random() * 256;
    fctx.beginPath();
    fctx.moveTo(gx, gy);
    fctx.lineTo(gx + (Math.random() - 0.5) * 6, gy - 4 - Math.random() * 8);
    fctx.stroke();
  }
  const floorTex = new THREE.CanvasTexture(floorCanvas);
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(4, 3);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 6),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(ox, 0, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Walls — earthy dark brown with vine pattern ──
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a1a,
    emissive: 0x0a1a0a,
    emissiveIntensity: 0.3,
    roughness: 0.85
  });

  const walls = [
    { w: 6, pos: [ox - 3.5, 1.75, 0], rotY: Math.PI / 2 },    // left
    { w: 6, pos: [ox + 3.5, 1.75, 0], rotY: -Math.PI / 2 },   // right
    { w: 7, pos: [ox, 1.75, -3], rotY: 0 },                     // back
    { w: 7, pos: [ox, 1.75, 3], rotY: Math.PI },                 // front
  ];
  for (const w of walls) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w.w, 3.5), wallMat);
    wall.position.set(...w.pos);
    wall.rotation.y = w.rotY;
    wall.receiveShadow = true;
    scene.add(wall);
  }

  // Ceiling — dark canopy
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 6),
    new THREE.MeshStandardMaterial({ color: 0x0a1a0a, emissive: 0x050d05, emissiveIntensity: 0.2 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(ox, 3.5, 0);
  scene.add(ceil);

  // ── Lighting — warm natural ──
  const ambient = new THREE.AmbientLight(0x3a5a2a, 0.6);
  ambient.position.set(ox, 0, 0);
  scene.add(ambient);

  const sunLight = new THREE.DirectionalLight(0xffeeaa, 0.8);
  sunLight.position.set(ox + 2, 6, 3);
  scene.add(sunLight);

  const warmFill = new THREE.PointLight(0x88cc44, 1.5, 10);
  warmFill.position.set(ox, 2.5, 0);
  scene.add(warmFill);

  // Green neon strips
  const stripMat = new THREE.MeshStandardMaterial({
    color: 0x44ff88, emissive: 0x44ff88, emissiveIntensity: 1.5
  });
  const stripGeom = new THREE.BoxGeometry(6, 0.03, 0.06);

  // Floor strips
  for (const sx of [-3.45, 3.45]) {
    const strip = new THREE.Mesh(stripGeom, stripMat);
    strip.rotation.y = Math.PI / 2;
    strip.position.set(ox + sx, 0.01, 0);
    scene.add(strip);
  }

  // ── Trees (simple cylinders + spheres) ──
  function makeTree(x, z, height, leafR) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, height, 8),
      new THREE.MeshLambertMaterial({ color: 0x4a3020 })
    );
    trunk.position.set(ox + x, height / 2, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(leafR, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x2a8a2a })
    );
    leaves.position.set(ox + x, height + leafR * 0.5, z);
    leaves.castShadow = true;
    scene.add(leaves);
  }

  makeTree(-2.5, -2, 1.8, 0.6);
  makeTree(2.0, -2.2, 2.2, 0.7);
  makeTree(-1.5, 2.0, 1.5, 0.5);
  makeTree(2.8, 1.5, 1.6, 0.45);
  makeTree(-3.0, 0, 2.0, 0.55);

  // ── Flowers (small colored spheres on stems) ──
  const flowerColors = [0xff6688, 0xffaa44, 0xcc66ff, 0xff4466, 0x66ccff];
  for (let i = 0; i < 15; i++) {
    const fx = (Math.random() - 0.5) * 5;
    const fz = (Math.random() - 0.5) * 4;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4),
      new THREE.MeshLambertMaterial({ color: 0x2a6a2a })
    );
    stem.position.set(ox + fx, 0.1, fz);
    scene.add(stem);

    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 4),
      new THREE.MeshStandardMaterial({
        color: flowerColors[i % flowerColors.length],
        emissive: flowerColors[i % flowerColors.length],
        emissiveIntensity: 0.3
      })
    );
    flower.position.set(ox + fx, 0.22, fz);
    scene.add(flower);
  }

  // ── A pond (flat blue circle on the floor) ──
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 24),
    new THREE.MeshStandardMaterial({
      color: 0x1a4a6a, emissive: 0x0a2a4a, emissiveIntensity: 0.3,
      roughness: 0.1, metalness: 0.5
    })
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(ox + 0.5, 0.005, 0.5);
  scene.add(pond);

  // ── Return portal ──
  const returnPortal = new THREE.Group();
  returnPortal.position.set(ox, 1.7, 2.95);

  const returnVortex = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x000808 })
  );
  returnPortal.add(returnVortex);

  const returnGlow = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.025, 8, 48),
    new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x44ff88, emissiveIntensity: 1.5 })
  );
  returnPortal.add(returnGlow);

  const returnGlow2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.65, 0.015, 8, 48),
    new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x44ff88, emissiveIntensity: 0.8 })
  );
  returnPortal.add(returnGlow2);

  // Label
  const rlCanvas = document.createElement('canvas');
  rlCanvas.width = 256;
  rlCanvas.height = 48;
  const rlctx = rlCanvas.getContext('2d');
  rlctx.clearRect(0, 0, 256, 48);
  rlctx.shadowColor = '#44ff88';
  rlctx.shadowBlur = 8;
  rlctx.font = 'bold 22px sans-serif';
  rlctx.fillStyle = '#44ff88';
  rlctx.textAlign = 'center';
  rlctx.fillText('▸ RETURN TO AI ROOM ◂', 128, 32);
  const rlTex = new THREE.CanvasTexture(rlCanvas);
  const rlLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.15),
    new THREE.MeshBasicMaterial({ map: rlTex, transparent: true })
  );
  rlLabel.position.set(0, 0.85, 0.01);
  returnPortal.add(rlLabel);

  const returnLight = new THREE.PointLight(0x44ff88, 1.0, 3);
  returnLight.position.z = 0.3;
  returnPortal.add(returnLight);

  returnPortal.userData = {
    clickable: true,
    action: 'returnToAIRoom'
  };

  scene.add(returnPortal);

  return {
    offset: OFFSET,
    returnPortal,
    returnGlow,
    returnGlow2,
    clickables: [returnPortal]
  };
}
