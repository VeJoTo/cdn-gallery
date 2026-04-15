// src/scene/nature-room.js
import * as THREE from 'three';

const OFFSET = new THREE.Vector3(20, 0, 0);

export function createNatureRoom(scene) {
  const ox = OFFSET.x;

  // ── Sky dome (large sphere around the nature room) ──
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 256;
  skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  const skyGrad = sctx.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0, '#4a90d9');
  skyGrad.addColorStop(0.4, '#7ab8e8');
  skyGrad.addColorStop(0.7, '#b8daf0');
  skyGrad.addColorStop(1, '#d4eacc');
  sctx.fillStyle = skyGrad;
  sctx.fillRect(0, 0, 256, 256);
  // Clouds
  sctx.fillStyle = 'rgba(255,255,255,0.4)';
  sctx.beginPath(); sctx.ellipse(60, 50, 40, 15, 0, 0, Math.PI * 2); sctx.fill();
  sctx.beginPath(); sctx.ellipse(160, 70, 50, 18, 0, 0, Math.PI * 2); sctx.fill();
  sctx.beginPath(); sctx.ellipse(200, 40, 35, 12, 0, 0, Math.PI * 2); sctx.fill();
  sctx.beginPath(); sctx.ellipse(100, 90, 45, 14, 0, 0, Math.PI * 2); sctx.fill();

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(15, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
  );
  sky.position.set(ox, 2, 0);
  scene.add(sky);

  // ── Ground — lush grass ──
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256;
  grassCanvas.height = 256;
  const gctx = grassCanvas.getContext('2d');
  gctx.fillStyle = '#2a7a2a';
  gctx.fillRect(0, 0, 256, 256);
  // Grass blade texture
  for (let i = 0; i < 500; i++) {
    const bx = Math.random() * 256;
    const by = Math.random() * 256;
    gctx.strokeStyle = Math.random() > 0.5 ? '#3a9a3a' : '#1a6a1a';
    gctx.lineWidth = 1;
    gctx.beginPath();
    gctx.moveTo(bx, by);
    gctx.lineTo(bx + (Math.random() - 0.5) * 4, by - 3 - Math.random() * 6);
    gctx.stroke();
  }
  const grassTex = new THREE.CanvasTexture(grassCanvas);
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(6, 5);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 10),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(ox, -0.01, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Lighting — warm sunlight ──
  const ambient = new THREE.AmbientLight(0x8aaa6a, 0.8);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffeebb, 1.2);
  sun.position.set(ox + 3, 8, 4);
  sun.castShadow = true;
  scene.add(sun);

  const warmFill = new THREE.PointLight(0xffcc66, 0.8, 15);
  warmFill.position.set(ox, 3, 0);
  scene.add(warmFill);

  // Greenish fill from below
  const groundBounce = new THREE.HemisphereLight(0x88bbff, 0x44aa44, 0.5);
  groundBounce.position.set(ox, 0, 0);
  scene.add(groundBounce);

  // ── Trees (realistic multi-cluster canopy) ──
  function makeTree(x, z, trunkH, canopyR, lean) {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 + canopyR * 0.08, 0.08 + canopyR * 0.1, trunkH, 8),
      trunkMat
    );
    trunk.position.set(ox + x, trunkH / 2, z);
    trunk.rotation.z = lean || 0;
    trunk.castShadow = true;
    scene.add(trunk);

    // Multiple leaf clusters for a fuller canopy
    const leafColors = [0x2a7a2a, 0x3a8a3a, 0x1a6a1a, 0x4a9a3a, 0x2a6a1a];
    const clusterCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < clusterCount; i++) {
      const cr = canopyR * (0.5 + Math.random() * 0.6);
      const cx = (Math.random() - 0.5) * canopyR * 0.8;
      const cy = canopyR * 0.3 + Math.random() * canopyR * 0.5;
      const cz = (Math.random() - 0.5) * canopyR * 0.8;
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(cr, 8, 6),
        new THREE.MeshLambertMaterial({ color: leafColors[i % leafColors.length] })
      );
      leaf.position.set(ox + x + cx, trunkH + cy, z + cz);
      leaf.castShadow = true;
      scene.add(leaf);
    }
  }

  // Lots of trees around the perimeter and scattered
  makeTree(-4.5, -3.5, 2.5, 0.9, 0.05);
  makeTree(-3.5, -4, 3.0, 1.1, -0.03);
  makeTree(4.0, -3.8, 2.8, 1.0, 0);
  makeTree(5.0, -2.5, 2.2, 0.8, 0.08);
  makeTree(-5.0, 0, 3.2, 1.2, -0.04);
  makeTree(-4.0, 2.5, 2.0, 0.7, 0);
  makeTree(4.5, 2.0, 2.6, 0.9, 0.06);
  makeTree(5.0, 4.0, 2.4, 0.85, -0.05);
  makeTree(-3.0, 4.5, 2.8, 1.0, 0);
  makeTree(3.5, -4.0, 3.5, 1.3, 0);
  makeTree(-2.0, -3.0, 1.8, 0.6, 0.1);
  makeTree(2.5, -3.5, 2.0, 0.7, -0.06);
  makeTree(3.0, 4.5, 2.5, 0.9, 0);

  // ── Flowers — lots of colorful clusters ──
  const flowerColors = [0xff6688, 0xffaa44, 0xcc66ff, 0xff4466, 0x66ccff, 0xff88aa, 0xffdd44, 0xee55cc, 0xff7744, 0xaaddff];

  for (let i = 0; i < 60; i++) {
    const fx = (Math.random() - 0.5) * 8;
    const fz = (Math.random() - 0.5) * 7;

    // Skip if too close to pond
    if (Math.sqrt((fx - 0.5) ** 2 + (fz - 0.5) ** 2) < 1.2) continue;

    // Stem
    const stemH = 0.12 + Math.random() * 0.15;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, stemH, 4),
      new THREE.MeshLambertMaterial({ color: 0x2a7a2a })
    );
    stem.position.set(ox + fx, stemH / 2, fz);
    scene.add(stem);

    // Flower head
    const fColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 6, 4),
      new THREE.MeshStandardMaterial({
        color: fColor, emissive: fColor, emissiveIntensity: 0.15
      })
    );
    flower.position.set(ox + fx, stemH + 0.02, fz);
    scene.add(flower);
  }

  // ── Rocks scattered around ──
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x7a7a6a });
  for (let i = 0; i < 12; i++) {
    const rx = (Math.random() - 0.5) * 7;
    const rz = (Math.random() - 0.5) * 6;
    const rScale = 0.08 + Math.random() * 0.15;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(rScale, 0),
      rockMat
    );
    rock.position.set(ox + rx, rScale * 0.5, rz);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(rock);
  }

  // ── Pond / stream ──
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 32),
    new THREE.MeshStandardMaterial({
      color: 0x3a8abf,
      emissive: 0x1a4a6a,
      emissiveIntensity: 0.2,
      roughness: 0.05,
      metalness: 0.6,
      transparent: true,
      opacity: 0.8
    })
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(ox + 0.5, 0.005, 0.5);
  scene.add(pond);

  // Pond edge rocks
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const pr = 1.0 + (Math.random() - 0.5) * 0.3;
    const prock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.06, 0),
      rockMat
    );
    prock.position.set(
      ox + 0.5 + Math.cos(angle) * pr,
      0.04,
      0.5 + Math.sin(angle) * pr
    );
    prock.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(prock);
  }

  // ── Butterflies (small rotating colored planes) ──
  const butterflies = [];
  const butterflyColors = [0xff88aa, 0xffcc44, 0x88ddff, 0xcc88ff];
  for (let i = 0; i < 6; i++) {
    const bGroup = new THREE.Group();
    bGroup.position.set(
      ox + (Math.random() - 0.5) * 6,
      1.0 + Math.random() * 1.5,
      (Math.random() - 0.5) * 5
    );
    const wing = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.06),
      new THREE.MeshStandardMaterial({
        color: butterflyColors[i % butterflyColors.length],
        emissive: butterflyColors[i % butterflyColors.length],
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
      })
    );
    bGroup.add(wing);
    bGroup.userData = {
      baseX: bGroup.position.x,
      baseZ: bGroup.position.z,
      speed: 0.5 + Math.random() * 0.8,
      radius: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2
    };
    scene.add(bGroup);
    butterflies.push(bGroup);
  }

  // ── Return portal (green themed) ──
  const returnPortal = new THREE.Group();
  returnPortal.position.set(ox, 1.5, -4.5);

  const returnVortex = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x001808 })
  );
  returnPortal.add(returnVortex);

  // Transparent click target
  const returnClickTarget = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 32),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  returnClickTarget.position.z = 0.05;
  returnPortal.add(returnClickTarget);

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

  const returnGlow3 = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.02, 8, 48),
    new THREE.MeshStandardMaterial({ color: 0x88ffaa, emissive: 0x88ffaa, emissiveIntensity: 0.5 })
  );
  returnPortal.add(returnGlow3);

  // Vine-like decorations around the portal
  const vineMat = new THREE.MeshLambertMaterial({ color: 0x2a6a2a });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const vine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4),
      vineMat
    );
    vine.position.set(
      Math.cos(angle) * 0.8,
      Math.sin(angle) * 0.8,
      0
    );
    vine.rotation.z = angle;
    returnPortal.add(vine);
  }

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
    new THREE.MeshBasicMaterial({ map: rlTex, transparent: true, side: THREE.DoubleSide })
  );
  rlLabel.position.set(0, 0.9, 0.01);
  returnPortal.add(rlLabel);

  const returnLight = new THREE.PointLight(0x44ff88, 1.5, 5);
  returnLight.position.z = 0.5;
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
    returnGlow3,
    butterflies,
    clickables: [returnPortal]
  };
}
