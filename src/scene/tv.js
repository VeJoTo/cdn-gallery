import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

function makeHoloButton(icon, action, xPos) {
  const g = new THREE.Group();
  g.position.set(xPos, -0.65, 0.16);

  const SIZE = 128;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  function drawIcon(text) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    // Dark rounded-rect background
    const r = 18;
    ctx.fillStyle = 'rgba(0,8,24,0.88)';
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(SIZE - r, 0);
    ctx.arcTo(SIZE, 0, SIZE, r, r);
    ctx.lineTo(SIZE, SIZE - r);
    ctx.arcTo(SIZE, SIZE, SIZE - r, SIZE, r);
    ctx.lineTo(r, SIZE);
    ctx.arcTo(0, SIZE, 0, SIZE - r, r);
    ctx.lineTo(0, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
    ctx.fill();
    // Cyan border glow
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 14;
    ctx.stroke();
    // Icon — pause drawn as two solid bars to match other geometric symbols
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00d4ff';
    if (text === '⏸') {
      // Two solid vertical bars
      const bw = 14, bh = 52, by = (SIZE - bh) / 2;
      ctx.fillRect(34, by, bw, bh);
      ctx.fillRect(80, by, bw, bh);
    } else if (text === 'MAG+') {
      // Magnifying glass with + inside
      ctx.strokeStyle = '#00d4ff';
      ctx.lineCap = 'round';
      // Handle
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(77, 77);
      ctx.lineTo(97, 97);
      ctx.stroke();
      // Lens ring
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(52, 52, 28, 0, Math.PI * 2);
      ctx.stroke();
      // + inside lens
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(40, 52); ctx.lineTo(64, 52); // horizontal
      ctx.moveTo(52, 40); ctx.lineTo(52, 64); // vertical
      ctx.stroke();
    } else {
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, SIZE / 2, SIZE / 2 + 3);
    }
  }

  drawIcon(icon);
  const tex = new THREE.CanvasTexture(canvas);

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
  );
  g.add(mesh);

  g.userData = {
    clickable: true,
    action,
    updateIcon: (text) => { drawIcon(text); tex.needsUpdate = true; },
  };

  return g;
}

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

  // Holographic control buttons below the screen
  const btnDefs = [
    { icon: '◀', action: 'prevVideo',        x: -0.64 },
    { icon: '⏸', action: 'toggleTV',         x: -0.32 },
    { icon: '▶', action: 'nextVideo',         x:  0.00 },
    { icon: 'ⓘ', action: 'showInfo',          x:  0.32 },
    { icon: 'MAG+', action: 'toggleMagnifier', x:  0.64 },
  ];

  let playPauseBtn = null;
  for (const def of btnDefs) {
    const btn = makeHoloButton(def.icon, def.action, def.x);
    group.add(btn);
    if (def.action === 'toggleTV') playPauseBtn = btn;
  }

  group.userData = {
    clickable: true,
    hotspot: 'tv',
    screenMesh: screen,
    playPauseBtn,
  };

  return group;
}
