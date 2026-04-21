import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const hw = w / 2,
    hh = h / 2;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hw, hh - r);
  s.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, hh);
  s.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hh + r);
  s.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

export function buildTV() {
  const group = new THREE.Group();
  group.position.set(-10.95, 2.65, 0);
  group.rotation.y = Math.PI / 2;

  const R = 0.06;

  // White glossy flatscreen body
  const glossMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(2.05, 1.21, 0.08, 4, 0.06),
    glossMat,
  );
  body.position.set(0, 0.1, 0.09);
  body.castShadow = true;
  group.add(body);

  // Screen
  const screen = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(1.93, 1.09, R)),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  screen.position.z = 0.136;
  screen.position.y = 0.1;
  group.add(screen);

  // Neon cyan glow ring
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 6.0,
  });
  const _gw = 1.94, _gh = 1.10, _gr = R;
  const _hw = _gw / 2, _hh = _gh / 2;
  const _shape = new THREE.Shape();
  _shape.moveTo(-_hw + _gr, -_hh);
  _shape.lineTo( _hw - _gr, -_hh);
  _shape.absarc( _hw - _gr, -_hh + _gr, _gr, -Math.PI / 2, 0, false);
  _shape.lineTo( _hw,  _hh - _gr);
  _shape.absarc( _hw - _gr,  _hh - _gr, _gr, 0, Math.PI / 2, false);
  _shape.lineTo(-_hw + _gr,  _hh);
  _shape.absarc(-_hw + _gr,  _hh - _gr, _gr, Math.PI / 2, Math.PI, false);
  _shape.lineTo(-_hw, -_hh + _gr);
  _shape.absarc(-_hw + _gr, -_hh + _gr, _gr, Math.PI, Math.PI * 1.5, false);
  const _pts = _shape.getPoints(256).map(p => new THREE.Vector3(p.x, p.y, 0));
  const _curve = new THREE.CatmullRomCurve3(_pts, true);
  const glowRing = new THREE.Mesh(
    new THREE.TubeGeometry(_curve, 512, 0.003, 8, true),
    glowMat,
  );
  glowRing.position.set(0, 0.1, 0.138);
  group.add(glowRing);

  group.userData = {
    clickable: true,
    hotspot: 'tv',
    screenMesh: screen,
  };

  return group;
}
