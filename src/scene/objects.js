// src/scene/objects.js
import * as THREE from 'three';
import { ROOM_WIDTH } from './room.js';

function buildPortal() {
  const group = new THREE.Group();
  group.position.set(0, 1.7, 2.95);

  // Dark vortex center
  const vortex = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 32),
    new THREE.MeshBasicMaterial({ color: 0x000008 })
  );
  group.add(vortex);

  // Inner glow disc
  const innerGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 32),
    new THREE.MeshStandardMaterial({
      color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.15,
      transparent: true, opacity: 0.4
    })
  );
  innerGlow.position.z = 0.001;
  group.add(innerGlow);

  // Concentric rings (different sizes, will spin at different speeds)
  const ringDefs = [
    { radius: 0.65, tube: 0.015, speed: 0.3 },
    { radius: 0.75, tube: 0.01,  speed: -0.5 },
    { radius: 0.85, tube: 0.02,  speed: 0.2 },
    { radius: 0.95, tube: 0.008, speed: -0.4 },
    { radius: 1.05, tube: 0.025, speed: 0.15 },
  ];

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.2
  });

  const rings = [];
  for (const def of ringDefs) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(def.radius, def.tube, 8, 64),
      ringMat.clone()
    );
    ring.userData.spinSpeed = def.speed;
    group.add(ring);
    rings.push(ring);
  }

  // Segmented outer ring (like panels/segments)
  const segmentCount = 16;
  const segMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.8
  });
  for (let i = 0; i < segmentCount; i++) {
    const angle = (i / segmentCount) * Math.PI * 2;
    const gap = 0.04;
    const segAngle = (Math.PI * 2 / segmentCount) - gap;
    const seg = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.04, 4, 8, segAngle),
      segMat
    );
    seg.rotation.z = angle;
    group.add(seg);
  }

  // Corner accent nodes (4 diamonds around the portal)
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
  });
  const nodePositions = [
    [0, 1.3], [0, -1.3], [1.3, 0], [-1.3, 0]
  ];
  for (const [nx, ny] of nodePositions) {
    const node = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.04, 0),
      nodeMat
    );
    node.position.set(nx, ny, 0.01);
    node.rotation.z = Math.PI / 4;
    group.add(node);
  }

  // "PORTAL" label above
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 256;
  labelCanvas.height = 48;
  const lctx = labelCanvas.getContext('2d');
  lctx.clearRect(0, 0, 256, 48);
  lctx.shadowColor = '#00d4ff';
  lctx.shadowBlur = 8;
  lctx.font = 'bold 24px sans-serif';
  lctx.fillStyle = '#00d4ff';
  lctx.textAlign = 'center';
  lctx.fillText('▸ ENTER PORTAL ◂', 128, 32);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.15),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
  );
  label.position.set(0, 1.35, 0.01);
  group.add(label);

  // Point light from the portal center
  const portalLight = new THREE.PointLight(0x00d4ff, 1.5, 4);
  portalLight.position.z = 0.5;
  group.add(portalLight);

  // Large transparent click target covering the entire portal area
  const clickTarget = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 32),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  clickTarget.position.z = 0.05;
  group.add(clickTarget);

  group.userData = {
    clickable: true,
    action: 'enterNatureRoom',
    rings,
    innerGlow
  };

  return group;
}

function buildCentralPedestal() {
  const group = new THREE.Group();
  group.position.set(0, 0, 0);

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8, metalness: 0.15, roughness: 0.55
  });
  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.2
  });

  // Outer base ring — 1.2 m diameter, 0.1 m tall
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.65, 0.1, 48),
    whiteMat
  );
  base.position.y = 0.05;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

  // Inner pillar — 0.6 m diameter, 0.6 m tall
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.6, 48),
    whiteMat
  );
  pillar.position.y = 0.4;
  pillar.castShadow = true;
  group.add(pillar);

  // Cyan seam around the pillar at mid-height
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.012, 8, 48),
    cyanMat
  );
  seam.rotation.x = Math.PI / 2;
  seam.position.y = 0.4;
  group.add(seam);

  // Flat emissive cap on top where the projection beam emerges
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.02, 48),
    cyanMat
  );
  cap.position.y = 0.71;
  group.add(cap);

  return group;
}

function buildHoloSphere() {
  const group = new THREE.Group();
  // Sphere floats at eye-level above the pedestal
  group.position.set(0, 1.8, 0);

  // Layer 1: wireframe sphere
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.0,
    wireframe: true, transparent: true, opacity: 0.85
  });
  const wireframe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), wireMat);
  group.add(wireframe);

  // Layer 2: inner particle cloud
  const particleCount = 240;
  const ppos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    // Random point inside a sphere of radius 0.4
    const r = 0.4 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    ppos[i * 3    ] = r * Math.sin(phi) * Math.cos(theta);
    ppos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    ppos[i * 3 + 2] = r * Math.cos(phi);
  }
  const pGeom = new THREE.BufferGeometry();
  pGeom.setAttribute('position', new THREE.Float32BufferAttribute(ppos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x9ce0ff, size: 0.02, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const particles = new THREE.Points(pGeom, pMat);
  group.add(particles);

  // Layer 3a: orbiting dot-ring (tilt 1)
  const ringA = new THREE.Group();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5
      })
    );
    dot.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6);
    ringA.add(dot);
  }
  ringA.rotation.x = 0.4;
  group.add(ringA);

  // Layer 3b: orbiting dot-ring (tilt 2, counter-rotating)
  const ringB = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0x9ce0ff, emissive: 0x9ce0ff, emissiveIntensity: 1.5
      })
    );
    dot.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7);
    ringB.add(dot);
  }
  ringB.rotation.x = -0.6;
  ringB.rotation.z = 0.3;
  group.add(ringB);

  // Projection beam — transparent cone from pedestal top to sphere
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x00d4ff, transparent: true, opacity: 0.15,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.05, 48, 1, true),
    beamMat
  );
  beam.position.y = -0.55; // cone extends downward to pedestal top
  beam.rotation.x = Math.PI;
  group.add(beam);

  // Sphere's own point light
  const light = new THREE.PointLight(0x00d4ff, 1.0, 4);
  group.add(light);

  // Expose inner groups so createObjects can animate them in sceneUpdate
  group.userData.wireframe = wireframe;
  group.userData.particles = particles;
  group.userData.ringA = ringA;
  group.userData.ringB = ringB;

  return group;
}

export function createObjects(scene) {
  const centralPedestal = buildCentralPedestal();

  const holoSphere = buildHoloSphere();
  holoSphere.userData.clickable = true;
  holoSphere.userData.hotspot = 'holo-sphere';
  holoSphere.userData.action = 'openPanel';
  holoSphere.userData.panelId = 'floating-motifs';
  holoSphere.userData.panelTitle = 'Floating Motifs';

  // Portal on the right wall — click to enter the garden room.
  const portal = buildPortal();
  portal.scale.setScalar(1.5);
  portal.position.set(ROOM_WIDTH / 2 - 0.1, 2.4, 0);
  portal.rotation.y = -Math.PI / 2;

  scene.add(centralPedestal, holoSphere, portal);

  let elapsed = 0;
  function sceneUpdate(delta) {
    elapsed += delta;
    holoSphere.userData.wireframe.rotation.y += delta * 0.35;
    holoSphere.userData.wireframe.rotation.x += delta * 0.12;
    holoSphere.userData.particles.rotation.y -= delta * 0.2;
    holoSphere.userData.ringA.rotation.y += delta * 0.6;
    holoSphere.userData.ringB.rotation.y -= delta * 0.9;
    const pulse = 1 + Math.sin(elapsed * 1.4) * 0.03;
    holoSphere.scale.setScalar(pulse);

    for (const ring of portal.userData.rings) {
      ring.rotation.z += ring.userData.spinSpeed * delta;
    }
    portal.userData.innerGlow.material.emissiveIntensity =
      0.15 + Math.sin(elapsed * 2) * 0.1;
  }

  return {
    pedestal: holoSphere,
    sceneUpdate,
    extras: [holoSphere, portal]
  };
}
