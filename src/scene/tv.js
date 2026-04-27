import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

function makeHoloButton(icon, action, xPos, yPos = -0.65, size = 0.10) {
  const g = new THREE.Group();
  g.position.set(xPos, yPos, 0.13); // flush with TV frame front face

  const blue = 0x00d4ff;
  function mat() {
    return new THREE.MeshPhysicalMaterial({
      color: blue,
      emissive: blue,
      emissiveIntensity: 0.25,
      metalness: 0.15,
      roughness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
    });
  }

  const S = size;
  const D = 0.008; // shallow depth — shading does the 3D work

  const extOpts = {
    depth: D, bevelEnabled: true,
    bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 5,
  };

  function extruded(shape) {
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, extOpts), mat());
    m.position.z = -D / 2;
    return m;
  }

  function extrudedTriangle(pts, cornerR = S * 0.09) {
    const n = pts.length;
    const shape = new THREE.Shape();
    for (let i = 0; i < n; i++) {
      const prev = pts[(i + n - 1) % n];
      const curr = pts[i];
      const next = pts[(i + 1) % n];
      const d1 = Math.hypot(prev[0] - curr[0], prev[1] - curr[1]);
      const d2 = Math.hypot(next[0] - curr[0], next[1] - curr[1]);
      const t1 = Math.min(cornerR / d1, 0.35);
      const t2 = Math.min(cornerR / d2, 0.35);
      // entry point — stop short of corner coming from prev
      const ex = curr[0] + (prev[0] - curr[0]) * t1;
      const ey = curr[1] + (prev[1] - curr[1]) * t1;
      // exit point — leave corner toward next
      const lx = curr[0] + (next[0] - curr[0]) * t2;
      const ly = curr[1] + (next[1] - curr[1]) * t2;
      if (i === 0) shape.moveTo(ex, ey); else shape.lineTo(ex, ey);
      shape.quadraticCurveTo(curr[0], curr[1], lx, ly);
    }
    shape.closePath();
    return extruded(shape);
  }

  function extrudedRing(cx, cy, outerR, innerR) {
    const shape = new THREE.Shape();
    shape.absarc(cx, cy, outerR, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(cx, cy, innerR, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return extruded(shape);
  }

  function box(w, h, d = D) {
    const r = Math.min(w, h, d) * 0.28;
    return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat());
  }

  // Capsule bar — pill shape with fully rounded ends, oriented along Y
  function capsule(w, h) {
    const r = w / 2;
    const m = new THREE.Mesh(
      new THREE.CapsuleGeometry(r, Math.max(h - w, 0), 8, 16),
      mat()
    );
    return m;
  }

  const H = S * 0.44;

  const iconGroup  = new THREE.Group();
  let   pauseGroup = null;

  if (icon === '▶') {
    iconGroup.add(extrudedTriangle([
      [-H * 0.65, -H], [-H * 0.65, H], [H * 0.85, 0],
    ]));

    // Pre-build pause bars (hidden until toggled on)
    pauseGroup = new THREE.Group();
    const bw = S * 0.14, bh = S * 0.82, gap = S * 0.19;
    const lb = capsule(bw, bh); lb.position.x = -gap; pauseGroup.add(lb);
    const rb = capsule(bw, bh); rb.position.x =  gap; pauseGroup.add(rb);
    pauseGroup.visible = false;
    g.add(pauseGroup);

  } else if (icon === '▶|') {
    const tri = extrudedTriangle([
      [-H * 0.70, -H * 0.85], [-H * 0.70, H * 0.85], [H * 0.18, 0],
    ]);
    const bar = capsule(S * 0.11, S * 0.85);
    bar.position.x = H * 0.60;
    iconGroup.add(tri, bar);

  } else if (icon === '|◀') {
    const tri = extrudedTriangle([
      [H * 0.70, -H * 0.85], [H * 0.70, H * 0.85], [-H * 0.18, 0],
    ]);
    const bar = capsule(S * 0.11, S * 0.85);
    bar.position.x = -H * 0.60;
    iconGroup.add(bar, tri);

  } else if (icon === 'PL') {
    // Playlist icon — small ▶ triangle + three horizontal bars
    const tri = extrudedTriangle([
      [-S * 0.18, -S * 0.28], [-S * 0.18, S * 0.28], [S * 0.10, 0],
    ]);
    tri.position.x = -S * 0.30;
    iconGroup.add(tri);
    const barH = S * 0.09, barW = S * 0.48, gap = S * 0.26;
    for (let i = -1; i <= 1; i++) {
      const bar = box(barW, barH);
      bar.position.set(S * 0.12, i * gap, 0);
      iconGroup.add(bar);
    }

  } else if (icon === 'MAG+') {
    // Large lens — slim TorusGeometry gives a proper rounded donut cross-section
    const lx = -S * 0.06, ly = S * 0.08;
    const lens = new THREE.Mesh(
      new THREE.TorusGeometry(S * 0.28, S * 0.04, 12, 48),
      mat()
    );
    lens.position.set(lx, ly, 0);

    // Handle top is placed INSIDE the ring wall (at 57% of outer radius along -45°)
    // so it overlaps the ring — no gap possible.
    // top = (lx + S*0.32*0.57*0.707, ly - S*0.32*0.57*0.707) ≈ (S*0.109, -S*0.089)
    // With h=S*0.26, top-offset from center = (-(h/2)*0.707, +(h/2)*0.707) = (-S*0.092, S*0.092)
    // → center = top - topOffset = (S*0.109+S*0.092, -S*0.089-S*0.092) = (S*0.201, -S*0.181)
    const handle = capsule(S * 0.13, S * 0.26);
    handle.position.set(S * 0.20, -S * 0.18, 0);
    handle.rotation.z = Math.PI / 4;

    // + inside the lens
    const ph = box(S * 0.06, S * 0.24); ph.position.set(lx, ly, 0);
    const pv = box(S * 0.24, S * 0.06); pv.position.set(lx, ly, 0);

    iconGroup.add(lens, handle, ph, pv);

  } else if (icon === 'ⓘ') {
    // Dot — sphere for a proper rounded 3D ball
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(S * 0.11, 16, 16),
      mat()
    );
    dot.position.set(0, S * 0.36, 0);

    // Stem — sits well below dot
    const stemShape = new THREE.Shape();
    const sw = S * 0.13, sh = S * 0.32;
    stemShape.moveTo(-sw/2, -sh/2); stemShape.lineTo(sw/2, -sh/2);
    stemShape.lineTo(sw/2, sh/2);   stemShape.lineTo(-sw/2, sh/2);
    stemShape.closePath();
    const stem = extruded(stemShape);
    stem.position.set(0, -S * 0.14, 0);

    iconGroup.add(dot, stem);

  } else if (icon === '🔊') {
    // Helper: build the speaker body (box + horn trapezoid) into a target group
    function buildSpeakerBody(target) {
      const bd = box(S * 0.18, S * 0.36);
      bd.position.set(-S * 0.25, 0, 0);
      const horn = extrudedTriangle([
        [-S * 0.15, -S * 0.18],
        [-S * 0.15,  S * 0.18],
        [ S * 0.06,  S * 0.40],
        [ S * 0.06, -S * 0.40],
      ], S * 0.09);
      target.add(bd, horn);
    }

    // Sound-ON state (iconGroup): body + horn + two arc waves
    buildSpeakerBody(iconGroup);
    const arcOpts = { tube: S * 0.04, radialSegments: 8, tubularSegments: 32, arc: Math.PI * 0.65 };
    const a1 = new THREE.Mesh(new THREE.TorusGeometry(S * 0.24, arcOpts.tube, arcOpts.radialSegments, arcOpts.tubularSegments, arcOpts.arc), mat());
    a1.position.set(S * 0.08, 0, 0); a1.rotation.z = -Math.PI * 0.325;
    const a2 = new THREE.Mesh(new THREE.TorusGeometry(S * 0.40, arcOpts.tube, arcOpts.radialSegments, arcOpts.tubularSegments, arcOpts.arc), mat());
    a2.position.set(S * 0.08, 0, 0); a2.rotation.z = -Math.PI * 0.325;
    iconGroup.add(a1, a2);

    // Sound-OFF state (pauseGroup): body + horn + mute X
    pauseGroup = new THREE.Group();
    buildSpeakerBody(pauseGroup);
    const xa = capsule(S * 0.06, S * 0.38); xa.rotation.z =  Math.PI / 4; xa.position.set(S * 0.48, 0, 0);
    const xb = capsule(S * 0.06, S * 0.38); xb.rotation.z = -Math.PI / 4; xb.position.set(S * 0.48, 0, 0);
    pauseGroup.add(xa, xb);
    pauseGroup.visible = false;
    g.add(pauseGroup);
  }

  g.add(iconGroup);

  // Invisible hit-area plane — slightly larger clickable zone without neighbour overlap
  const hitbox = new THREE.Mesh(
    new THREE.PlaneGeometry(S * 1.2, S * 1.2),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  );
  hitbox.position.z = 0.02;
  g.add(hitbox);

  // Cast shadows onto the TV face
  g.traverse(child => { if (child.isMesh && child !== hitbox) child.castShadow = true; });

  let _isActive = false;
  g.userData = {
    clickable: true,
    action,
    updateIcon: (text) => {
      if (!pauseGroup) return;
      if (text === '⏸' || text === '🔇') { iconGroup.visible = false; pauseGroup.visible = true; }
      else                               { iconGroup.visible = true;  pauseGroup.visible = false; }
    },
    setActive: (on) => {
      _isActive = on;
      const intensity = on ? 1.1 : 0.25;
      g.traverse(child => {
        if (!child.isMesh || !child.material?.emissive || child === hitbox) return;
        child.material.emissiveIntensity = intensity;
        // Keep hover-restore in sync so mouse-out doesn't reset the active state
        if (child.userData._origEmissiveI !== undefined) {
          child.userData._origEmissiveI = intensity;
        }
      });
    },
    get isActive() { return _isActive; },
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
  group.position.set(-7.95, 1.9, 0);
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
  body.receiveShadow = true;
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

  // Centred play/prev/next cluster
  const bottomBtns = [
    { icon: '|◀', action: 'prevVideo', x: -0.13, y: -0.58, size: 0.10 },
    { icon: '▶',  action: 'toggleTV',  x:  0.00, y: -0.58, size: 0.10 },
    { icon: '▶|', action: 'nextVideo', x:  0.13, y: -0.58, size: 0.10 },
  ];
  // ⓘ MAG+ — right cluster, symmetric to left
  const rightBtns = [
    { icon: 'ⓘ',    action: 'showInfo',        x:  0.72, y: -0.58, size: 0.10 },
    { icon: 'MAG+', action: 'toggleMagnifier', x:  0.85, y: -0.58, size: 0.13 },
  ];

  let playPauseBtn = null, magBtn = null, infoBtn = null, speakerBtn = null, playlistBtn = null;
  const allButtons = [];
  for (const def of bottomBtns) {
    const btn = makeHoloButton(def.icon, def.action, def.x, def.y, def.size);
    group.add(btn);
    allButtons.push(btn);
    if (def.action === 'toggleTV') playPauseBtn = btn;
  }
  for (const def of rightBtns) {
    const btn = makeHoloButton(def.icon, def.action, def.x, def.y, def.size);
    group.add(btn);
    allButtons.push(btn);
    if (def.action === 'toggleMagnifier') magBtn  = btn;
    if (def.action === 'showInfo')        infoBtn = btn;
  }

  // 🔊 PL — left cluster, symmetric to right (ⓘ MAG+)
  playlistBtn = makeHoloButton('PL', 'togglePlaylist', -0.85, -0.58, 0.09);
  group.add(playlistBtn);
  allButtons.push(playlistBtn);

  const speakerBtnLeft = makeHoloButton('🔊', 'toggleSound', -0.72, -0.58, 0.10);
  speakerBtnLeft.visible = false;
  group.add(speakerBtnLeft);
  allButtons.push(speakerBtnLeft);
  speakerBtn = speakerBtnLeft;

  // ── Neon "AI Art" sign above the TV ──
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512; signCanvas.height = 160;
  const sctx = signCanvas.getContext('2d');
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;

  function drawAIArtSign() {
    const cx = 256, cy = 82;
    sctx.clearRect(0, 0, 512, 160);
    sctx.font = "92px 'Octosquares', sans-serif";
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    // Subtle outer haze
    sctx.shadowColor = '#aaccff';
    sctx.shadowBlur = 28; sctx.fillStyle = 'rgba(200,220,255,0.18)'; sctx.fillText('Art & AI', cx, cy);
    // Tight inner glow — cyan
    sctx.shadowColor = '#00d4ff';
    sctx.shadowBlur = 10; sctx.fillStyle = 'rgba(0,180,255,0.75)';   sctx.fillText('Art & AI', cx, cy);
    // Core — deep saturated blue
    sctx.shadowBlur =  3; sctx.fillStyle = '#0099ff';                 sctx.fillText('Art & AI', cx, cy);
    signTex.needsUpdate = true;
  }
  drawAIArtSign();
  document.fonts.load("68px 'Octosquares'").then(() => drawAIArtSign());

  // Fixed plane — stays aligned with the TV face, does not billboard
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.70, 0.22),
    new THREE.MeshBasicMaterial({
      map: signTex,
      color: 0x888888,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  signMesh.position.set(0, 0.88, 0.18); // float in front of TV face
  signMesh.renderOrder = 999;
  signMesh.raycast = () => {};
  group.add(signMesh);

  // PointLight in front of TV — no target needed, casts shadows of buttons onto the body
  const tvSpot = new THREE.PointLight(0xffffff, 1.2, 5);
  tvSpot.position.set(0, 0.3, 2.5);
  tvSpot.castShadow = true;
  tvSpot.shadow.mapSize.set(1024, 1024);
  tvSpot.shadow.camera.near = 0.1;
  tvSpot.shadow.camera.far  = 5;
  tvSpot.shadow.bias = -0.001;
  group.add(tvSpot);

  group.scale.set(1.5, 1.5, 1.5);

  group.userData = {
    clickable: true,
    hotspot: 'tv',
    screenMesh: screen,
    playPauseBtn,
    magBtn,
    infoBtn,
    speakerBtn,
    playlistBtn,
    buttons: allButtons,
  };

  return group;
}
