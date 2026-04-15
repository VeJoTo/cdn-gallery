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

  // ── Greenhouse structure — glass walls + metal frame ──
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xaaddee,
    transparent: true,
    opacity: 0.15,
    roughness: 0.05,
    metalness: 0.3,
    side: THREE.DoubleSide
  });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x3a4a3a });

  // Glass walls
  const wallDefs = [
    { w: 10, h: 4, pos: [ox - 5.5, 2, 0], rotY: Math.PI / 2 },   // left
    { w: 10, h: 4, pos: [ox + 5.5, 2, 0], rotY: -Math.PI / 2 },  // right
    { w: 11, h: 4, pos: [ox, 2, -5], rotY: 0 },                    // back
    { w: 11, h: 4, pos: [ox, 2, 5], rotY: Math.PI },                // front
  ];
  for (const wd of wallDefs) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(wd.w, wd.h), glassMat);
    glass.position.set(...wd.pos);
    glass.rotation.y = wd.rotY;
    glass.raycast = () => {}; // Don't block clicks
    scene.add(glass);
  }

  // Pitched glass roof — two tilted planes meeting at a ridge
  const wallHalfW = 5.5;
  const ridgeY = 5.5;
  const roofDepthHalf = 5;
  const roofRise = ridgeY - 4; // 1.5
  const roofSlope = Math.sqrt(wallHalfW * wallHalfW + roofRise * roofRise);
  const roofAngle = Math.atan2(roofRise, wallHalfW);

  // Left panel: bottom edge at (ox-5.5, 4), tilts up toward center
  const roofLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(roofSlope, roofDepthHalf * 2),
    glassMat
  );
  // Position at midpoint of the slope
  roofLeft.position.set(ox - wallHalfW / 2, 4 + roofRise / 2, 0);
  // Rotate: first lay flat (face up), then tilt
  roofLeft.rotation.set(0, 0, 0);
  roofLeft.rotation.x = -Math.PI / 2; // lay flat facing up
  roofLeft.rotation.z = roofAngle;     // tilt left side up toward ridge
  roofLeft.raycast = () => {};
  scene.add(roofLeft);

  // Right panel: mirrors left
  const roofRight = new THREE.Mesh(
    new THREE.PlaneGeometry(roofSlope, roofDepthHalf * 2),
    glassMat
  );
  roofRight.position.set(ox + wallHalfW / 2, 4 + roofRise / 2, 0);
  roofRight.rotation.set(0, 0, 0);
  roofRight.rotation.x = -Math.PI / 2;
  roofRight.rotation.z = -roofAngle;
  roofRight.raycast = () => {};
  scene.add(roofRight);

  // Ridge beam at the peak
  const ridgeBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.06, roofDepthHalf * 2),
    frameMat
  );
  ridgeBeam.position.set(ox, ridgeY, 0);
  scene.add(ridgeBeam);

  // Metal frame ribs — horizontal along the top edges
  const ribGeom = new THREE.BoxGeometry(11, 0.04, 0.04);
  const ribGeomSide = new THREE.BoxGeometry(10, 0.04, 0.04);

  // Top edge ribs
  for (const rz of [-5, 5]) {
    const rib = new THREE.Mesh(ribGeom, frameMat);
    rib.position.set(ox, 4, rz);
    scene.add(rib);
  }
  for (const rx of [-5.5, 5.5]) {
    const rib = new THREE.Mesh(ribGeomSide, frameMat);
    rib.position.set(ox + rx, 4, 0);
    rib.rotation.y = Math.PI / 2;
    scene.add(rib);
  }

  // Vertical corner posts
  const postGeom = new THREE.BoxGeometry(0.06, 4, 0.06);
  const corners = [[-5.5, -5], [-5.5, 5], [5.5, -5], [5.5, 5]];
  for (const [cx, cz] of corners) {
    const post = new THREE.Mesh(postGeom, frameMat);
    post.position.set(ox + cx, 2, cz);
    scene.add(post);
  }

  // Vertical mullion ribs on walls (dividing glass into panes)
  for (const side of [-5.5, 5.5]) {
    for (let mz = -3; mz <= 3; mz += 2) {
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 4, 0.03),
        frameMat
      );
      mullion.position.set(ox + side, 2, mz);
      scene.add(mullion);
    }
  }
  for (const fz of [-5, 5]) {
    for (let mx = -4; mx <= 4; mx += 2) {
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 4, 0.03),
        frameMat
      );
      mullion.position.set(ox + mx, 2, fz);
      scene.add(mullion);
    }
  }

  // Horizontal mid-rail on all walls
  for (const wd of wallDefs) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(wd.w, 0.03, 0.03),
      frameMat
    );
    rail.position.set(wd.pos[0], 2, wd.pos[2]);
    rail.rotation.y = wd.rotY;
    scene.add(rail);
  }

  // Roof rafter beams — straight lines from wall top to ridge
  for (let cz = -4; cz <= 4; cz += 2) {
    for (const side of [-1, 1]) {
      const startX = ox + side * wallHalfW;
      const endX = ox;
      const dx = endX - startX;
      const dy = ridgeY - 4;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, Math.abs(dx));

      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.04, 0.04),
        frameMat
      );
      beam.position.set(startX + dx / 2, 4 + dy / 2, cz);
      beam.rotation.z = side > 0 ? angle : -angle;
      scene.add(beam);
    }
  }

  // ── Lighting — soft cozy sunlight from the corner ──
  // Warm ambient fills everything softly
  const ambient = new THREE.AmbientLight(0xaa9060, 0.9);
  scene.add(ambient);

  // Sky-to-ground hemisphere — warm golden sky, soft green ground bounce
  const hemi = new THREE.HemisphereLight(0xffeedd, 0x558844, 0.7);
  hemi.position.set(ox, 0, 0);
  scene.add(hemi);

  // Main sun — positioned in the corner like a cozy game, warm golden
  const sun = new THREE.DirectionalLight(0xffdd88, 1.0);
  sun.position.set(ox + 5, 6, 4);
  sun.castShadow = true;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 20;
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  scene.add(sun);

  // Sun glow orb in the corner (visible warm sphere representing the sun)
  const sunOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffeeaa })
  );
  sunOrb.position.set(ox + 5.5, 7, 4.5);
  scene.add(sunOrb);

  // Warm point light at the sun orb for volumetric feel
  const sunGlow = new THREE.PointLight(0xffdd88, 2.0, 18);
  sunGlow.position.set(ox + 5.5, 7, 4.5);
  scene.add(sunGlow);

  // Soft warm fill closer to the ground (golden hour bounce)
  const warmBounce = new THREE.PointLight(0xffaa55, 0.6, 12);
  warmBounce.position.set(ox + 3, 1, 3);
  scene.add(warmBounce);

  // Second warm fill on the opposite side for soft shadows
  const warmFill2 = new THREE.PointLight(0xeebb66, 0.4, 10);
  warmFill2.position.set(ox - 3, 2, -2);
  scene.add(warmFill2);

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

  // ── Flowers — dense colorful clusters ──
  const flowerColors = [0xff6688, 0xffaa44, 0xcc66ff, 0xff4466, 0x66ccff, 0xff88aa, 0xffdd44, 0xee55cc, 0xff7744, 0xaaddff, 0xff99cc, 0xffbb66, 0xaa88ff, 0xff6655, 0x88eebb];

  // Flower clusters — groups of 3-6 flowers near each other
  const clusterCenters = [];
  for (let c = 0; c < 25; c++) {
    clusterCenters.push({
      x: (Math.random() - 0.5) * 9,
      z: (Math.random() - 0.5) * 8
    });
  }

  for (const center of clusterCenters) {
    const clusterSize = 3 + Math.floor(Math.random() * 5);
    const clusterColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];

    for (let f = 0; f < clusterSize; f++) {
      const fx = center.x + (Math.random() - 0.5) * 0.6;
      const fz = center.z + (Math.random() - 0.5) * 0.6;

      // Skip if too close to fountain
      if (Math.sqrt(fx * fx + fz * fz) < 1.3) continue;

      const stemH = 0.1 + Math.random() * 0.18;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, stemH, 4),
        new THREE.MeshLambertMaterial({ color: 0x2a7a2a })
      );
      stem.position.set(ox + fx, stemH / 2, fz);
      scene.add(stem);

      // Vary the color slightly within the cluster
      const colorVariant = Math.random() > 0.3 ? clusterColor : flowerColors[Math.floor(Math.random() * flowerColors.length)];
      const petalSize = 0.025 + Math.random() * 0.035;
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(petalSize, 6, 4),
        new THREE.MeshStandardMaterial({
          color: colorVariant, emissive: colorVariant, emissiveIntensity: 0.15
        })
      );
      flower.position.set(ox + fx, stemH + 0.015, fz);
      scene.add(flower);

      // Some flowers get a second petal ring (larger flowers)
      if (Math.random() > 0.6) {
        const outerPetal = new THREE.Mesh(
          new THREE.SphereGeometry(petalSize * 1.3, 6, 4),
          new THREE.MeshStandardMaterial({
            color: colorVariant, transparent: true, opacity: 0.5
          })
        );
        outerPetal.position.set(ox + fx, stemH + 0.01, fz);
        scene.add(outerPetal);
      }
    }
  }

  // Extra scattered individual flowers for fullness
  for (let i = 0; i < 40; i++) {
    const fx = (Math.random() - 0.5) * 9;
    const fz = (Math.random() - 0.5) * 8;
    if (Math.sqrt(fx * fx + fz * fz) < 1.3) continue;

    const stemH = 0.08 + Math.random() * 0.12;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, stemH, 4),
      new THREE.MeshLambertMaterial({ color: 0x2a7a2a })
    );
    stem.position.set(ox + fx, stemH / 2, fz);
    scene.add(stem);

    const fColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 6, 4),
      new THREE.MeshStandardMaterial({
        color: fColor, emissive: fColor, emissiveIntensity: 0.1
      })
    );
    flower.position.set(ox + fx, stemH + 0.01, fz);
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

  // ── Fountain ──
  // Base pool (circular)
  const poolMat = new THREE.MeshStandardMaterial({
    color: 0x4a6a7a, roughness: 0.3, metalness: 0.2
  });
  const pool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.0, 0.2, 24),
    poolMat
  );
  pool.position.set(ox, 0.1, 0);
  scene.add(pool);

  // Water surface
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 24),
    new THREE.MeshStandardMaterial({
      color: 0x4a9ac0,
      emissive: 0x1a4a6a,
      emissiveIntensity: 0.15,
      roughness: 0.05,
      metalness: 0.5,
      transparent: true,
      opacity: 0.7
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(ox, 0.21, 0);
  scene.add(water);

  // Central pillar
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x6a7a6a });
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8),
    pillarMat
  );
  pillar.position.set(ox, 0.6, 0);
  scene.add(pillar);

  // Top bowl
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.15, 0.1, 12),
    pillarMat
  );
  bowl.position.set(ox, 1.05, 0);
  scene.add(bowl);

  // Water spout (small sphere on top)
  const spout = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    new THREE.MeshStandardMaterial({
      color: 0x6abaee, emissive: 0x3a8abb, emissiveIntensity: 0.3
    })
  );
  spout.position.set(ox, 1.15, 0);
  scene.add(spout);

  // Water droplet particles falling from the bowl
  const dropMat = new THREE.MeshStandardMaterial({
    color: 0x6abaee, emissive: 0x3a8abb, emissiveIntensity: 0.2,
    transparent: true, opacity: 0.6
  });
  const drops = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 4, 3),
      dropMat
    );
    drop.position.set(
      ox + Math.cos(angle) * 0.2,
      0.9,
      Math.sin(angle) * 0.2
    );
    drop.userData.angle = angle;
    drop.userData.speed = 0.8 + Math.random() * 0.4;
    scene.add(drop);
    drops.push(drop);
  }

  // ── Tropical plants ──
  // Large fern-like plants (flattened scaled spheres in clusters)
  function makeTropicalPlant(x, z, size) {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(ox + x, 0, z);

    // Central stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, size * 0.5, 6),
      new THREE.MeshLambertMaterial({ color: 0x2a5a1a })
    );
    stem.position.y = size * 0.25;
    plantGroup.add(stem);

    // Large drooping leaves
    const leafColors = [0x1a7a2a, 0x2a8a1a, 0x3a9a2a, 0x1a6a1a];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(size * 0.4, 6, 4),
        new THREE.MeshLambertMaterial({ color: leafColors[i % leafColors.length] })
      );
      leaf.scale.set(0.3, 0.15, 1.0);
      leaf.position.set(
        Math.cos(angle) * size * 0.3,
        size * 0.4 + Math.random() * 0.1,
        Math.sin(angle) * size * 0.3
      );
      leaf.rotation.z = Math.cos(angle) * 0.5;
      leaf.rotation.x = Math.sin(angle) * 0.3;
      leaf.rotation.y = angle;
      plantGroup.add(leaf);
    }

    scene.add(plantGroup);
  }

  // Place tropical plants around the greenhouse
  makeTropicalPlant(-4.5, -1, 1.2);
  makeTropicalPlant(-4.0, 3, 1.0);
  makeTropicalPlant(4.5, -2, 1.3);
  makeTropicalPlant(4.0, 3.5, 0.9);
  makeTropicalPlant(-3.5, -4, 1.1);
  makeTropicalPlant(3.0, -3.5, 1.0);
  makeTropicalPlant(-2.0, 4, 0.8);
  makeTropicalPlant(5.0, 0, 1.4);

  // Tall palm-like plants
  function makePalm(x, z, height) {
    // Slightly curved trunk (multiple segments)
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6a5030 });
    const segments = 6;
    const segH = height / segments;
    let curveX = 0;
    for (let s = 0; s < segments; s++) {
      const radius = 0.06 - s * 0.006;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(Math.max(radius - 0.005, 0.02), radius, segH, 8),
        trunkMat
      );
      curveX += Math.sin(s * 0.15) * 0.03;
      seg.position.set(ox + x + curveX, segH / 2 + s * segH, z);
      seg.rotation.z = Math.sin(s * 0.2) * 0.05;
      scene.add(seg);
    }

    // Organic drooping fronds — elongated scaled spheres
    const frondColors = [0x2a7a1a, 0x3a8a2a, 0x1a6a15, 0x2a8a1a];
    const frondCount = 7 + Math.floor(Math.random() * 4);
    for (let i = 0; i < frondCount; i++) {
      const angle = (i / frondCount) * Math.PI * 2 + Math.random() * 0.3;
      const droop = 0.4 + Math.random() * 0.4;
      const length = 0.6 + Math.random() * 0.4;

      const frond = new THREE.Mesh(
        new THREE.SphereGeometry(length, 6, 4),
        new THREE.MeshLambertMaterial({ color: frondColors[i % frondColors.length] })
      );
      frond.scale.set(0.15, 0.08, 1.0);
      frond.position.set(
        ox + x + curveX + Math.cos(angle) * 0.15,
        height - droop * 0.3,
        z + Math.sin(angle) * 0.15
      );
      frond.rotation.y = angle;
      frond.rotation.x = droop;
      frond.rotation.z = (Math.random() - 0.5) * 0.2;
      scene.add(frond);
    }

    // Crown cluster at the top (organic bushy top)
    const crownColors = [0x2a8a2a, 0x3a9a3a, 0x1a7a1a];
    for (let c = 0; c < 4; c++) {
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 8, 6),
        new THREE.MeshLambertMaterial({ color: crownColors[c % crownColors.length] })
      );
      crown.position.set(
        ox + x + curveX + (Math.random() - 0.5) * 0.12,
        height + 0.05 + Math.random() * 0.1,
        z + (Math.random() - 0.5) * 0.12
      );
      scene.add(crown);
    }
  }

  makePalm(-4.8, 0, 2.8);
  makePalm(4.8, -1, 2.5);
  makePalm(0, 4.2, 3.0);
  makePalm(-3.5, 3.5, 2.3);
  makePalm(3.5, 3.8, 2.6);

  // ── Butterflies (small rotating colored planes) ──
  const butterflies = [];
  const butterflyColors = [0xff88aa, 0xffcc44, 0x88ddff, 0xcc88ff, 0xff6688, 0xaaffaa, 0xffaa88, 0xff66cc, 0x88ffdd];
  for (let i = 0; i < 15; i++) {
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

  // ── Wooden sign ──
  const signGroup = new THREE.Group();
  signGroup.position.set(ox - 1.5, 0, 1.5);

  // Posts
  const postMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
  for (const px of [-0.45, 0.45]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 1.0, 6),
      postMat
    );
    post.position.set(px, 0.5, 0);
    signGroup.add(post);
  }

  // Board
  const boardMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.5, 0.04),
    boardMat
  );
  board.position.set(0, 0.85, 0);
  signGroup.add(board);

  // Text on the sign
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 256;
  const sgnctx = signCanvas.getContext('2d');
  sgnctx.fillStyle = '#8a6a3a';
  sgnctx.fillRect(0, 0, 512, 256);
  // Wood grain lines
  sgnctx.strokeStyle = 'rgba(60,40,15,0.3)';
  sgnctx.lineWidth = 1;
  for (let wy = 0; wy < 256; wy += 12) {
    sgnctx.beginPath();
    sgnctx.moveTo(0, wy);
    for (let wx = 0; wx < 512; wx += 15) {
      sgnctx.lineTo(wx, wy + Math.sin(wx * 0.03) * 2);
    }
    sgnctx.stroke();
  }
  // Text
  sgnctx.fillStyle = '#2a1a08';
  sgnctx.font = '18px Georgia, serif';
  sgnctx.textAlign = 'center';

  const signText = 'This garden is just an example of how this 3D gallery can expand in the future. With several rooms highlighting different research in a visual and engaging way.';
  const words = signText.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (sgnctx.measureText(test).width > 440) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineHeight = 28;
  const startY = 128 - (lines.length * lineHeight) / 2 + 14;
  for (let i = 0; i < lines.length; i++) {
    sgnctx.fillText(lines[i], 256, startY + i * lineHeight);
  }

  const signTex = new THREE.CanvasTexture(signCanvas);
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.48),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signFace.position.set(0, 0.85, -0.025);
  signFace.rotation.y = Math.PI;
  signGroup.add(signFace);

  // Sign is decorative — walk up to read it

  scene.add(signGroup);

  // ── Wooden bench ──
  const benchGroup = new THREE.Group();
  benchGroup.position.set(ox + 2.0, 0, 1.5);
  benchGroup.rotation.y = -0.3;

  const benchWood = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const benchDark = new THREE.MeshLambertMaterial({ color: 0x4a3018 });

  // Seat plank
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.04, 0.35),
    benchWood
  );
  seat.position.y = 0.42;
  seat.castShadow = true;
  benchGroup.add(seat);

  // Back rest
  const backrest = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.35, 0.03),
    benchWood
  );
  backrest.position.set(0, 0.65, -0.16);
  benchGroup.add(backrest);

  // Legs (4)
  for (const [lx, lz] of [[-0.42, 0.1], [0.42, 0.1], [-0.42, -0.1], [0.42, -0.1]]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.42, 0.04),
      benchDark
    );
    leg.position.set(lx, 0.21, lz);
    benchGroup.add(leg);
  }

  // Armrests
  for (const ax of [-0.48, 0.48]) {
    const armrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.3),
      benchDark
    );
    armrest.position.set(ax, 0.55, -0.02);
    benchGroup.add(armrest);
  }

  // Invisible click target over the whole bench
  const benchClick = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 0.5),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  benchClick.position.y = 0.5;
  benchGroup.add(benchClick);

  // Bench is decorative

  scene.add(benchGroup);

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
    drops,
    clickables: [returnPortal]
  };
}
