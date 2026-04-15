// src/scene/room.js
import * as THREE from 'three';

export function createRoom(scene) {
  // Clean dark floor
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0d1520,
    roughness: 0.35,
    metalness: 0.4,
    side: THREE.FrontSide
  });
  // Dark paneled walls
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 256;
  wallCanvas.height = 256;
  const wctx = wallCanvas.getContext('2d');
  wctx.fillStyle = '#0a0f1a';
  wctx.fillRect(0, 0, 256, 256);
  // Panel lines (subtle grid)
  wctx.strokeStyle = '#1e2e40';
  wctx.lineWidth = 1;
  // Horizontal panel lines
  for (let y = 0; y < 256; y += 64) {
    wctx.beginPath();
    wctx.moveTo(0, y);
    wctx.lineTo(256, y);
    wctx.stroke();
  }
  // Vertical panel lines
  for (let x = 0; x < 256; x += 85) {
    wctx.beginPath();
    wctx.moveTo(x, 0);
    wctx.lineTo(x, 256);
    wctx.stroke();
  }
  const wallTex = new THREE.CanvasTexture(wallCanvas);
  wallTex.wrapS = THREE.RepeatWrapping;
  wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(3, 2);
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    emissive: 0x050a12,
    emissiveIntensity: 0.3,
    roughness: 0.7,
    side: THREE.FrontSide
  });
  const ceilMat  = new THREE.MeshStandardMaterial({
    color: 0x080d15,
    emissive: 0x050a12,
    emissiveIntensity: 0.2,
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

  // Front wall (at z = +3, facing -z)
  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), wallMat);
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, 1.75, 3);
  frontWall.receiveShadow = true;
  frontWall.raycast = () => {}; // Don't block raycasts to portal
  scene.add(frontWall);

  // ── AI graphics on the front wall ──
  const aiWallCanvas = document.createElement('canvas');
  aiWallCanvas.width = 1024;
  aiWallCanvas.height = 512;
  const awctx = aiWallCanvas.getContext('2d');

  // Dark transparent base
  awctx.clearRect(0, 0, 1024, 512);

  // Large neural network visualization
  awctx.strokeStyle = '#00d4ff';
  awctx.lineWidth = 1;
  awctx.shadowColor = '#00d4ff';
  awctx.shadowBlur = 6;

  // Central brain/network hub
  awctx.beginPath();
  awctx.arc(512, 256, 80, 0, Math.PI * 2);
  awctx.strokeStyle = 'rgba(0,212,255,0.4)';
  awctx.lineWidth = 2;
  awctx.stroke();

  awctx.beginPath();
  awctx.arc(512, 256, 50, 0, Math.PI * 2);
  awctx.strokeStyle = 'rgba(0,212,255,0.6)';
  awctx.stroke();

  awctx.beginPath();
  awctx.arc(512, 256, 20, 0, Math.PI * 2);
  awctx.fillStyle = 'rgba(0,212,255,0.3)';
  awctx.fill();

  // Radiating connection lines from center to nodes
  const outerNodes = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const r = 150 + (i % 3) * 40;
    const nx = 512 + Math.cos(angle) * r;
    const ny = 256 + Math.sin(angle) * r;
    outerNodes.push({ x: nx, y: ny });

    // Line from center
    awctx.strokeStyle = 'rgba(0,212,255,0.25)';
    awctx.lineWidth = 1;
    awctx.beginPath();
    awctx.moveTo(512, 256);
    awctx.lineTo(nx, ny);
    awctx.stroke();

    // Node dot
    awctx.fillStyle = '#00d4ff';
    awctx.shadowBlur = 8;
    awctx.beginPath();
    awctx.arc(nx, ny, 5, 0, Math.PI * 2);
    awctx.fill();
  }

  // Inter-node connections
  awctx.strokeStyle = 'rgba(0,212,255,0.15)';
  awctx.shadowBlur = 3;
  awctx.lineWidth = 0.5;
  for (let i = 0; i < outerNodes.length; i++) {
    for (let j = i + 2; j < outerNodes.length; j += 2) {
      awctx.beginPath();
      awctx.moveTo(outerNodes[i].x, outerNodes[i].y);
      awctx.lineTo(outerNodes[j].x, outerNodes[j].y);
      awctx.stroke();
    }
  }

  // Left side: data stream / binary
  awctx.shadowBlur = 4;
  awctx.fillStyle = 'rgba(0,212,255,0.3)';
  awctx.font = '10px monospace';
  for (let row = 0; row < 20; row++) {
    let bits = '';
    for (let b = 0; b < 18; b++) bits += Math.random() > 0.5 ? '1' : '0';
    awctx.fillText(bits, 20, 30 + row * 24);
  }

  // Right side: data stream
  for (let row = 0; row < 20; row++) {
    let bits = '';
    for (let b = 0; b < 18; b++) bits += Math.random() > 0.5 ? '1' : '0';
    awctx.fillText(bits, 830, 30 + row * 24);
  }

  // Horizontal scan lines across
  awctx.strokeStyle = 'rgba(0,212,255,0.08)';
  awctx.lineWidth = 1;
  awctx.shadowBlur = 0;
  for (let y = 0; y < 512; y += 16) {
    awctx.beginPath();
    awctx.moveTo(0, y);
    awctx.lineTo(1024, y);
    awctx.stroke();
  }

  // "AI" watermark
  awctx.shadowColor = '#00d4ff';
  awctx.shadowBlur = 15;
  awctx.font = 'bold 120px sans-serif';
  awctx.fillStyle = 'rgba(0,212,255,0.06)';
  awctx.textAlign = 'center';
  awctx.fillText('A.I.', 512, 290);

  // Small text labels near nodes
  awctx.shadowBlur = 4;
  awctx.font = '11px sans-serif';
  awctx.fillStyle = 'rgba(0,212,255,0.5)';
  const labels = ['NEURAL', 'LEARN', 'DATA', 'PREDICT', 'TRAIN', 'MODEL', 'PROCESS', 'ANALYZE', 'GENERATE', 'COMPUTE', 'ENCODE', 'DECODE'];
  for (let i = 0; i < outerNodes.length; i++) {
    awctx.fillText(labels[i], outerNodes[i].x - 15, outerNodes[i].y + 18);
  }

  // Decorative corner brackets
  awctx.strokeStyle = 'rgba(0,212,255,0.4)';
  awctx.lineWidth = 2;
  awctx.shadowBlur = 0;
  const bSize = 40;
  // Top-left
  awctx.beginPath(); awctx.moveTo(10, 10 + bSize); awctx.lineTo(10, 10); awctx.lineTo(10 + bSize, 10); awctx.stroke();
  // Top-right
  awctx.beginPath(); awctx.moveTo(1014 - bSize, 10); awctx.lineTo(1014, 10); awctx.lineTo(1014, 10 + bSize); awctx.stroke();
  // Bottom-left
  awctx.beginPath(); awctx.moveTo(10, 502 - bSize); awctx.lineTo(10, 502); awctx.lineTo(10 + bSize, 502); awctx.stroke();
  // Bottom-right
  awctx.beginPath(); awctx.moveTo(1014 - bSize, 502); awctx.lineTo(1014, 502); awctx.lineTo(1014, 502 - bSize); awctx.stroke();

  const aiWallTex = new THREE.CanvasTexture(aiWallCanvas);
  const aiWallPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 3),
    new THREE.MeshBasicMaterial({ map: aiWallTex, transparent: true, side: THREE.DoubleSide })
  );
  aiWallPlane.position.set(0, 1.75, 2.97);
  aiWallPlane.rotation.y = Math.PI;
  aiWallPlane.raycast = () => {}; // Don't block raycasts to the portal behind
  scene.add(aiWallPlane);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.5, 0);
  ceil.receiveShadow = true;
  scene.add(ceil);

  // ── Lighting ────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x1a2a3a, 0.5);
  scene.add(ambient);

  // Hemisphere light: cyan from above, near-black from below
  const hemi = new THREE.HemisphereLight(0x00d4ff, 0x0a0f1a, 0.3);
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

  const neonPink = new THREE.PointLight(0x00d4ff, 2.0, 8);
  neonPink.position.set(-2.5, 1.5, 0.5);
  scene.add(neonPink);

  const neonTeal = new THREE.PointLight(0x00d4ff, 2.0, 8);
  neonTeal.position.set(2.5, 1.5, 0.5);
  scene.add(neonTeal);

  const neonPurple = new THREE.PointLight(0x00d4ff, 1.0, 12);
  neonPurple.position.set(0, 2.5, 1.5);
  scene.add(neonPurple);

  // Neon floor strips along the base of left & right walls
  const stripGeom = new THREE.BoxGeometry(6, 0.02, 0.06);

  const leftStripMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
  });
  const leftStrip = new THREE.Mesh(stripGeom, leftStripMat);
  leftStrip.rotation.y = Math.PI / 2;
  leftStrip.position.set(-3.45, 0.01, 0);
  scene.add(leftStrip);

  const rightStripMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
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
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
  });
  const leftCeilStrip = new THREE.Mesh(sideStripGeom, leftCeilMat);
  leftCeilStrip.rotation.y = Math.PI / 2;
  leftCeilStrip.position.set(-3.45, ceilingY, 0);
  scene.add(leftCeilStrip);

  // Right wall top edge — cyan, runs along z
  const rightCeilMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
  });
  const rightCeilStrip = new THREE.Mesh(sideStripGeom, rightCeilMat);
  rightCeilStrip.rotation.y = -Math.PI / 2;
  rightCeilStrip.position.set(3.45, ceilingY, 0);
  scene.add(rightCeilStrip);

  // Back wall top edge — cyan, runs along x (room width = 7)
  const backStripGeom = new THREE.BoxGeometry(7, 0.04, 0.08);
  const backCeilMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
  });
  const backCeilStrip = new THREE.Mesh(backStripGeom, backCeilMat);
  backCeilStrip.position.set(0, ceilingY, -2.96);
  scene.add(backCeilStrip);

  // Front wall ceiling strip
  const frontCeilStrip = new THREE.Mesh(backStripGeom, new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
  }));
  frontCeilStrip.position.set(0, ceilingY, 2.96);
  scene.add(frontCeilStrip);

  // Green-teal secondary ceiling accent strip (parallel to back wall, offset)
  const amberCeilMat = new THREE.MeshStandardMaterial({
    color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.5
  });
  const amberCeilStrip = new THREE.Mesh(new THREE.BoxGeometry(7, 0.04, 0.08), amberCeilMat);
  amberCeilStrip.position.set(0, ceilingY, -1.5);
  scene.add(amberCeilStrip);

  const amberFill = new THREE.PointLight(0x00d4ff, 1.0, 10);
  amberFill.position.set(0, 3.2, -1.5);
  scene.add(amberFill);

  // Back wall floor strip — cyan, runs along x at the base
  const backFloorMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
  });
  const backFloorStrip = new THREE.Mesh(backStripGeom, backFloorMat);
  backFloorStrip.position.set(0, 0.01, -2.96);
  scene.add(backFloorStrip);

  // Front wall floor strip
  const frontFloorStrip = new THREE.Mesh(backStripGeom, new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
  }));
  frontFloorStrip.position.set(0, 0.01, 2.96);
  scene.add(frontFloorStrip);

  // ── Vertical corner strips (cyan) at back-left and back-right ──
  const cornerStripGeom = new THREE.BoxGeometry(0.06, 3.45, 0.06);
  const cornerMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
  });

  const backLeftCorner = new THREE.Mesh(cornerStripGeom, cornerMat);
  backLeftCorner.position.set(-3.45, 1.725, -2.96);
  scene.add(backLeftCorner);

  const backRightCorner = new THREE.Mesh(cornerStripGeom, cornerMat);
  backRightCorner.position.set(3.45, 1.725, -2.96);
  scene.add(backRightCorner);

  const frontLeftCorner = new THREE.Mesh(cornerStripGeom, cornerMat);
  frontLeftCorner.position.set(-3.45, 1.725, 2.96);
  scene.add(frontLeftCorner);

  const frontRightCorner = new THREE.Mesh(cornerStripGeom, cornerMat);
  frontRightCorner.position.set(3.45, 1.725, 2.96);
  scene.add(frontRightCorner);

  // ── Exposed cables running along walls (cyberpunk detail) ──
  const cableMat = new THREE.MeshLambertMaterial({ color: 0x111828 });
  const cableGlowMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.6
  });

  // Horizontal cable bundles along left wall at mid-height
  for (let i = 0; i < 3; i++) {
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 6, 6),
      cableMat
    );
    cable.rotation.x = Math.PI / 2;
    cable.position.set(-3.44, 1.0 + i * 0.08, 0);
    cable.rotation.y = Math.PI / 2;
    scene.add(cable);
  }

  // Horizontal cable bundles along right wall
  for (let i = 0; i < 3; i++) {
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 6, 6),
      cableMat
    );
    cable.rotation.x = Math.PI / 2;
    cable.position.set(3.44, 1.2 + i * 0.08, 0);
    cable.rotation.y = Math.PI / 2;
    scene.add(cable);
  }

  // Vertical cable drops from ceiling (3 spots)
  const dropPositions = [
    { x: -2.0, z: -2.5 },
    { x: 1.0, z: -2.8 },
    { x: 3.0, z: 1.0 }
  ];
  for (const { x, z } of dropPositions) {
    const drop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1.5, 6),
      cableMat
    );
    drop.position.set(x, 2.75, z);
    scene.add(drop);

    // Small glowing connector node at the bottom
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      cableGlowMat
    );
    node.position.set(x, 2.0, z);
    scene.add(node);
  }

  // Diagonal cable across back wall
  const diagCable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 4, 6),
    cableMat
  );
  diagCable.position.set(0, 2.2, -2.95);
  diagCable.rotation.z = 0.3;
  scene.add(diagCable);

  // ── AI circuit pattern on back wall ──
  const circuitCanvas = document.createElement('canvas');
  circuitCanvas.width = 512;
  circuitCanvas.height = 256;
  const cctx = circuitCanvas.getContext('2d');
  cctx.clearRect(0, 0, 512, 256);

  // Draw circuit traces
  cctx.strokeStyle = '#00d4ff';
  cctx.lineWidth = 1.5;
  cctx.shadowColor = '#00d4ff';
  cctx.shadowBlur = 4;

  // Horizontal traces
  const traceYs = [40, 80, 130, 170, 220];
  for (const ty of traceYs) {
    cctx.beginPath();
    let x = Math.random() * 100;
    cctx.moveTo(x, ty);
    while (x < 512) {
      const segLen = 30 + Math.random() * 80;
      x += segLen;
      cctx.lineTo(Math.min(x, 512), ty);
      if (Math.random() > 0.6 && x < 480) {
        const dy = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 25);
        cctx.lineTo(x, ty + dy);
        cctx.lineTo(x + 20, ty + dy);
        x += 20;
        cctx.lineTo(x, ty);
      }
    }
    cctx.stroke();
  }

  // Circuit nodes (small circles at intersections)
  cctx.fillStyle = '#00ff88';
  cctx.shadowColor = '#00ff88';
  cctx.shadowBlur = 6;
  for (let i = 0; i < 15; i++) {
    const nx = 30 + Math.random() * 452;
    const ny = traceYs[Math.floor(Math.random() * traceYs.length)];
    cctx.beginPath();
    cctx.arc(nx, ny, 4, 0, Math.PI * 2);
    cctx.fill();
  }

  // "AI" text faintly
  cctx.shadowBlur = 10;
  cctx.shadowColor = '#00d4ff';
  cctx.font = 'bold 60px sans-serif';
  cctx.fillStyle = 'rgba(0,212,255,0.15)';
  cctx.textAlign = 'center';
  cctx.fillText('A.I.', 256, 150);

  const circuitTex = new THREE.CanvasTexture(circuitCanvas);
  const circuitPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 2.5),
    new THREE.MeshBasicMaterial({ map: circuitTex, transparent: true })
  );
  circuitPlane.position.set(0, 1.5, -2.96);
  scene.add(circuitPlane);

  // ── Floating AI data particles ──
  const particleCount = 30;
  const particleGeom = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 6;  // x
    positions[i * 3 + 1] = 0.5 + Math.random() * 2.5;   // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 5;   // z
  }
  particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x00d4ff,
    size: 0.04,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeom, particleMat);
  scene.add(particles);

  // ── Coloured fill lights near each ceiling strip ──
  const cyanFill = new THREE.PointLight(0x00d4ff, 2.0, 14);
  cyanFill.position.set(-3.0, 3.2, 0);
  scene.add(cyanFill);

  const purpleFill = new THREE.PointLight(0x00d4ff, 2.0, 14);
  purpleFill.position.set(3.0, 3.2, 0);
  scene.add(purpleFill);

  const pinkFill = new THREE.PointLight(0x00d4ff, 2.0, 14);
  pinkFill.position.set(0, 3.2, -2.5);
  scene.add(pinkFill);

  // Extra centre fill — cool white to brighten everything
  const centerFill = new THREE.PointLight(0xe0e8f0, 1.0, 16);
  centerFill.position.set(0, 2.8, 1.0);
  scene.add(centerFill);
}
