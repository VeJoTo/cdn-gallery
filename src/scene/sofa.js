// src/scene/sofa.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';

// ø = %C3%B8, space = %20
const SOFA_URL = '/cdn-gallery/models/SketchFab/sofa.glb';

export function createSofa(scene) {
  const group = new THREE.Group();
  group.position.set(-4.0, -0.18, 0);
  group.rotation.y = Math.PI / 2 + Math.PI;
  group.userData.clickable = true;
  group.userData.hotspot   = 'tv';
  scene.add(group);

  // Gentle bob
  const baseY = -0.18;
  gsap.to(group.position, {
    y: baseY + 0.005,
    duration: 4.0,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });

  const neonMat = new THREE.MeshPhysicalMaterial({
    color: 0xaaffff,
    emissive: 0x00ffee,
    emissiveIntensity: 10.0,
    roughness: 0.0,
    metalness: 0.0,
    transmission: 0.98,
    thickness: 1.0,
    transparent: true,
    opacity: 0.12,
  });

  const loader = new GLTFLoader();
  loader.load(
    SOFA_URL,
    (gltf) => {
      const model = gltf.scene;

      // Scale to ~3.0 units wide
      const box0 = new THREE.Box3().setFromObject(model);
      const size0 = box0.getSize(new THREE.Vector3());
      model.scale.setScalar(3.8 / size0.x);
      model.updateMatrixWorld(true);

      // Centre XZ, compute footprint before applying sink
      const box1  = new THREE.Box3().setFromObject(model);
      const c1    = box1.getCenter(new THREE.Vector3());
      const fSize = box1.getSize(new THREE.Vector3());

      const baseH  = 0.45;
      const sofaSink = 0.50;
      model.position.set(-c1.x, -box1.min.y + baseH - sofaSink, -c1.z);
      model.updateMatrixWorld(true);

      const holoMat = new THREE.MeshPhysicalMaterial({
        color: 0xf8f8f8,
        roughness: 0.80,
        metalness: 0.0,
        sheen: 1.0,
        sheenColor: new THREE.Color(0xddddff),
        sheenRoughness: 0.45,
        clearcoat: 0.1,
        clearcoatRoughness: 0.4,
      });

      model.traverse(child => {
        if (!child.isMesh) return;
        child.material    = holoMat;
        child.castShadow    = true;
        child.receiveShadow = true;
      });

      group.add(model);

      // Neon base — flat long sides, curved top corners only on short ends
      const baseL = fSize.x * 0.92;
      const baseD = fSize.z * 0.80;
      const r     = 0.14;

      // Cross-section shape (short-side profile): rect with curved top corners
      const baseShape = new THREE.Shape();
      baseShape.moveTo(-baseD / 2, 0);
      baseShape.lineTo( baseD / 2, 0);
      baseShape.lineTo( baseD / 2, baseH - r);
      baseShape.quadraticCurveTo( baseD / 2, baseH,  baseD / 2 - r, baseH);
      baseShape.lineTo(-baseD / 2 + r, baseH);
      baseShape.quadraticCurveTo(-baseD / 2, baseH, -baseD / 2, baseH - r);
      baseShape.closePath();

      // Extrude along the long axis (X), then rotate into place
      const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
        depth: baseL,
        bevelEnabled: false,
        steps: 1,
      });

      const base = new THREE.Mesh(baseGeo, neonMat);
      base.rotation.y = Math.PI / 2;
      base.position.set(-baseL / 2, -0.10, 0);
      group.add(base);

      // Point light inside the base — casts cyan glow onto sofa and floor
      const glow = new THREE.PointLight(0x00ffee, 8.0, 8.0);
      glow.position.set(0, baseH / 2, 0);
      group.add(glow);

    },
    undefined,
    (err) => console.error('[sofa] GLB load failed:', err)
  );

  return group;
}
