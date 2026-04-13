// src/scene/gatekeeper.js
import * as THREE from 'three';

export function createGatekeeper(scene) {
  const group = new THREE.Group();
  group.position.set(0, 2.0, -2.2);

  // ── Load portrait and remove white background ──
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = (import.meta.env.BASE_URL || '/') + 'gatekeeper.jpg';

  const portraitPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 1.3),
    // Temporary transparent material until image loads
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  portraitPlane.position.y = -0.1;
  group.add(portraitPlane);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Remove near-white background pixels
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 235 && g > 235 && b > 235) {
        data[i + 3] = 0; // set alpha to 0
      } else if (r > 220 && g > 220 && b > 220) {
        // Semi-transparent for near-white edge pixels (anti-aliasing)
        data[i + 3] = Math.round(255 * (1 - (r + g + b - 660) / (765 - 660)));
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    portraitPlane.material = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide
    });
  };

  // ── Wizard hat (3D geometry, sits on top of the portrait) ──
  const hatMat = new THREE.MeshLambertMaterial({ color: 0x050d14 });

  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.05, 12),
    hatMat
  );
  brim.position.y = 0.52;
  group.add(brim);

  const hatCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.7, 12),
    hatMat
  );
  hatCone.position.y = 0.9;
  hatCone.rotation.z = 0.06; // slight tilt
  group.add(hatCone);

  // Gold stars on hat
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xffd166,
    emissiveIntensity: 1.0
  });
  const starPositions = [
    [0.08, 0.72, 0.16], [-0.1, 0.86, 0.14], [0.04, 1.05, 0.08]
  ];
  for (const [sx, sy, sz] of starPositions) {
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), starMat);
    star.position.set(sx, sy, sz);
    group.add(star);
  }

  // ── Clickable ──
  group.userData = { clickable: true, action: 'openGatekeeper' };
  scene.add(group);

  // ── Bobbing animation ──
  let time = 0;
  const baseY = group.position.y;

  function update(delta) {
    time += delta;
    group.position.y = baseY + Math.sin(time * 1.4) * 0.08;
    group.rotation.y = Math.sin(time * 0.7) * 0.12;
  }

  return { group, update };
}
