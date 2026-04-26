import * as THREE from 'three';

// Vimeo video IDs for the anchor grid
const VIMEO_IDS = [890586293, 890586362, 890586558, 892423392];
const VIMEO_THUMBS = new Array(4).fill(null); // filled as images load

async function loadVimeoThumbnails(onThumbReady) {
  for (let i = 0; i < VIMEO_IDS.length; i++) {
    try {
      const res  = await fetch(`https://vimeo.com/api/v2/video/${VIMEO_IDS[i]}.json`);
      const [data] = await res.json();
      const url  = data.thumbnail_large || data.thumbnail_medium || data.thumbnail_small;
      if (!url) continue;
      const img  = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { VIMEO_THUMBS[i] = img; onThumbReady(); };
      img.onerror = () => {};
      img.src = url;
    } catch (_) {}
  }
}

// Preload country images — keyed by country name
const COUNTRY_IMAGES = {};
const IMAGE_SRCS = {
  'Hong Kong': 'hk-meteor.png',
  'France':    'france-meteor.png',
  'Greece':    'greece-meteor.png',
};
for (const [name, file] of Object.entries(IMAGE_SRCS)) {
  const img = new Image();
  img.src = import.meta.env.BASE_URL + file;
  COUNTRY_IMAGES[name] = img;
}

// CDN design system colors
const CDN = {
  navy:    0x0d1f33,
  teal:    0x3aada8,
  blue:    0x1b7ab8,
  coral:   0xe05a4e,
  cyan:    0x00d4ff,
  mint:    0x3dd6c0,
  deepTeal:0x0d7a7a,
};

const COUNTRIES = [
  { name: 'Hong Kong', lat: 22.3, lon: 114.2, color: CDN.coral,  labelRadius: 0.86 },
  { name: 'Greece',    lat: 39,   lon: 22,    color: CDN.blue,   labelRadius: 0.80 },
  { name: 'France',    lat: 46,   lon:  2,    color: CDN.teal,   labelRadius: 0.94 },
];

const COUNTRY_BG = {
  'Hong Kong': '#1a0808',
  Greece:      '#080f1a',
  France:      '#081a10',
};

const COUNTRY_ACCENT_HEX = {
  'Hong Kong': '#e05a4e',
  Greece:      '#1b7ab8',
  France:      '#3aada8',
};

function latLonToVec3(lat, lon, radius) {
  const phi   = (90 - lat) * Math.PI / 180;
  const theta = lon        * Math.PI / 180;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
}

// ── Screen canvas helpers ────────────────────────────────────────────────────

function drawStartScreen(canvas) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0d1f33';
  ctx.fillRect(0, 0, W, H);

  // Scan lines
  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, y, W, 2);
  }

  ctx.textAlign = 'center';

  // Heading
  ctx.font = 'bold 54px sans-serif';
  ctx.fillStyle = '#1b7ab8';
  ctx.shadowColor = '#1b7ab8';
  ctx.shadowBlur = 20;
  ctx.fillText('Fin du Monde', W / 2, H / 2 - 80);
  ctx.shadowBlur = 0;

  // Start button — CDN Button 1 style
  const BW = 320, BH = 80, BR = 20;
  const bx = (W - BW) / 2, by = H / 2 - 30;

  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 28;
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(bx, by, BW, BH, BR);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(10,20,38,0.88)';
  ctx.beginPath();
  ctx.roundRect(bx, by, BW, BH, BR);
  ctx.fill();

  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(bx, by, BW, BH, BR);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText('Start', W / 2, by + BH / 2);

  // Hint
  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(0,212,255,0.45)';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('click to begin', W / 2, H / 2 + 80);

  ctx.textAlign = 'left';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function drawDefaultScreen(canvas, locked = false) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');

  // Background — CDN navy
  ctx.fillStyle = '#0d1f33';
  ctx.fillRect(0, 0, W, H);

  // Scan lines
  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, y, W, 2);
  }

  const mid = W * 0.52;

  // ── Left panel ────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, mid - 4, H);
  ctx.clip();

  // Title
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#1b7ab8';
  ctx.shadowColor = '#1b7ab8';
  ctx.shadowBlur = 14;
  ctx.fillText('Fin du Monde', 28, 54);
  ctx.shadowBlur = 0;

  // Divider
  ctx.strokeStyle = 'rgba(27,122,184,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 66); ctx.lineTo(mid - 20, 66);
  ctx.stroke();

  // Body text
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#b8d8e8';
  const body = [
    '"Fin du Monde" is an AI-generated dark comedy about the apocalypse. By clicking on different parts on the globe you will be shown dramatic, AI-generated images of meteor showers striking that country or city, set to matching music.',
    'To the right of this text you can see the aftermath: confused AI news anchors still broadcasting to an empty world, searching for human survivors who never respond. They\'re not villains or geniuses — just lost, doing the only job they ever knew.',
  ];

  let ty = 96;
  for (const para of body) {
    ty = wrapText(ctx, para, 28, ty, mid - 52, 26);
    ty += 14;
  }

  // CTA
  ctx.font = 'bold 17px sans-serif';
  if (locked) {
    ctx.fillStyle = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 12;
    wrapText(ctx, '← Click the screen to unlock the globe', 28, ty + 6, mid - 52, 24);
  } else {
    ctx.fillStyle = '#3dd6c0';
    ctx.shadowColor = '#3dd6c0';
    ctx.shadowBlur = 8;
    wrapText(ctx, 'Press one of the highlighted parts on the globe to begin exploring!', 28, ty + 6, mid - 52, 24);
  }
  ctx.shadowBlur = 0;

  ctx.restore();

  // ── Divider line ──────────────────────────────────
  ctx.strokeStyle = 'rgba(0,212,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mid, 16); ctx.lineTo(mid, H - 16);
  ctx.stroke();

  // ── Right panel: anchor thumbnails / placeholders ──
  const rx   = mid + 12;
  const rw   = W - rx - 12;
  const cols = 2, rows = 2;
  const tw   = (rw - 12) / cols;
  const th   = (H - 32) / rows;

  for (let i = 0; i < 4; i++) {
    const col  = i % cols;
    const row  = Math.floor(i / cols);
    const tx   = rx + col * (tw + 8);
    const tyy  = 16 + row * (th + 8);
    const cw   = tw - 4;
    const ch   = th - 8;

    const thumb = VIMEO_THUMBS[i];
    ctx.fillStyle = '#000000';
    ctx.fillRect(tx, tyy, cw, ch);
    if (thumb) {
      // Contain-fit: full thumbnail visible, black bars fill the rest
      const scale = Math.min(cw / thumb.naturalWidth, ch / thumb.naturalHeight);
      const iw = thumb.naturalWidth  * scale;
      const ih = thumb.naturalHeight * scale;
      ctx.drawImage(thumb, tx + (cw - iw) / 2, tyy + (ch - ih) / 2, iw, ih);
    }

    // Border
    ctx.strokeStyle = 'rgba(27,122,184,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, tyy, cw, ch, 4);
    ctx.stroke();

    // Play icon
    const cx = tx + cw / 2;
    const cy = tyy + ch / 2;
    ctx.fillStyle = 'rgba(0,212,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 16);
    ctx.lineTo(cx + 18, cy);
    ctx.lineTo(cx - 14, cy + 16);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCountryScreen(canvas, country, onReady) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  const accent = COUNTRY_ACCENT_HEX[country] || '#00d4ff';

  function render(img) {
    ctx.clearRect(0, 0, W, H);

    if (img && img.complete && img.naturalWidth > 0) {
      // Fill with image, cover-fit
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const iw = img.naturalWidth  * scale;
      const ih = img.naturalHeight * scale;
      ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);

      // Dark vignette overlay so text stays readable
      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    } else {
      // Fallback gradient
      const bg   = COUNTRY_BG[country] || '#0a0a0a';
      const grad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
      grad.addColorStop(0, bg);
      grad.addColorStop(1, '#030c18');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Scan lines
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, y, W, 2);
    }

    ctx.textAlign = 'center';

    // Country name
    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24;
    ctx.fillText(country, W / 2, H - 70);

    // Back prompt
    ctx.font = '17px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.shadowBlur = 0;
    ctx.fillText('← look at screen and click to go back', W / 2, H - 30);

    ctx.textAlign = 'left';
    if (onReady) onReady();
  }

  const img = COUNTRY_IMAGES[country];
  if (img) {
    if (img.complete && img.naturalWidth > 0) {
      render(img);
    } else {
      // Draw fallback immediately, re-render once image loads
      render(null);
      img.onload = () => render(img);
    }
  } else {
    render(null);
  }
}

// ── Globe ────────────────────────────────────────────────────────────────────

function buildGlobe(screenRef) {
  const group = new THREE.Group();

  // Real Earth texture
  const loader  = new THREE.TextureLoader();
  const earthTex = loader.load(import.meta.env.BASE_URL + 'earth.jpg');

  const earthMat = new THREE.MeshStandardMaterial({
    map:       earthTex,
    roughness: 0.75,
    metalness: 0.05,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.50, 64, 48), earthMat);
  group.add(earth);

  // Atmosphere glow — slightly larger sphere, additive blending
  const atmMat = new THREE.MeshStandardMaterial({
    color:             0x4ab4d8,
    emissive:          0x0d7a7a,
    emissiveIntensity: 0.5,
    transparent:       true,
    opacity:           0.12,
    blending:          THREE.AdditiveBlending,
    depthWrite:        false,
    side:              THREE.FrontSide,
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.535, 64, 48), atmMat));

  // Outer atmosphere rim (even larger, very faint)
  const rimMat = new THREE.MeshStandardMaterial({
    color:             0x00d4ff,
    emissive:          0x00d4ff,
    emissiveIntensity: 0.3,
    transparent:       true,
    opacity:           0.05,
    blending:          THREE.AdditiveBlending,
    depthWrite:        false,
    side:              THREE.BackSide,
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.56, 48, 32), rimMat));


  // Surface dots only — stay in globe group so they rotate with the Earth
  const billboardData = [];
  const markers = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (const c of COUNTRIES) {
    const lr       = c.labelRadius;
    const dir      = latLonToVec3(c.lat, c.lon, 1).normalize();
    const dotPos   = dir.clone().multiplyScalar(0.52);
    const colorHex = '#' + c.color.toString(16).padStart(6, '0');

    // Surface dot — child of globe, rotates with it
    const dotMat = new THREE.MeshStandardMaterial({
      color: c.color, emissive: c.color, emissiveIntensity: 3.5,
    });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), dotMat);
    dot.position.copy(dotPos);
    group.add(dot);

    // Pointer line — will be added to scene, positioned in update()
    const lineLength = lr - 0.06 - 0.52;
    const lineMat    = new THREE.MeshStandardMaterial({
      color: c.color, emissive: c.color, emissiveIntensity: 2.0,
      transparent: true, opacity: 0.9,
    });
    const lineMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, lineLength, 6),
      lineMat
    );

    // Button 1 style — will be added to scene, billboarded in update()
    const BW = 420, BH = 110, R = 22;
    const lc  = document.createElement('canvas');
    lc.width  = BW;
    lc.height = BH;
    const lx  = lc.getContext('2d');

    lx.shadowColor = colorHex;
    lx.shadowBlur  = 28;
    lx.strokeStyle = colorHex;
    lx.lineWidth   = 5;
    lx.beginPath();
    lx.roundRect(10, 10, BW - 20, BH - 20, R);
    lx.stroke();

    lx.shadowBlur = 0;
    lx.fillStyle  = 'rgba(10, 20, 38, 0.88)';
    lx.beginPath();
    lx.roundRect(10, 10, BW - 20, BH - 20, R);
    lx.fill();

    lx.strokeStyle = colorHex;
    lx.lineWidth   = 2.5;
    lx.shadowColor = colorHex;
    lx.shadowBlur  = 10;
    lx.beginPath();
    lx.roundRect(10, 10, BW - 20, BH - 20, R);
    lx.stroke();
    lx.shadowBlur = 0;

    lx.font         = 'bold 44px sans-serif';
    lx.fillStyle    = '#ffffff';
    lx.textAlign    = 'center';
    lx.textBaseline = 'middle';
    lx.fillText(c.name, BW / 2, BH / 2);

    // Button mesh — MeshStandardMaterial so the existing hover system can glow it
    const btnMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.12),
      new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(lc),
        transparent: true, depthWrite: false,
        emissive: new THREE.Color(c.color), emissiveIntensity: 0.0,
        roughness: 1, metalness: 0,
      })
    );

    // Invisible hit plane slightly in front of button
    const hitMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.50, 0.16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    hitMesh.position.z = 0.001;

    // Group them so traverse in applyHoverGlow reaches btnMesh
    const markerGroup = new THREE.Group();
    markerGroup.add(btnMesh);
    markerGroup.add(hitMesh);
    markerGroup.userData = {
      clickable: true,
      action: 'selectCountry',
      country: c.name,
      screenRef,
    };
    markers.push(markerGroup);

    billboardData.push({ dir, labelRadius: lr, lineLength, lineMesh, lineMat, markerGroup, dotMat, btnMesh });
  }

  // Inner point light
  group.add(new THREE.PointLight(CDN.cyan, 0.4, 3));

  group.userData.markers       = markers;
  group.userData.billboardData = billboardData;

  return group;
}

// ── Screen ───────────────────────────────────────────────────────────────────

function makeTube(a, b, radius, mat) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), mat);
  mesh.position.copy(a.clone().lerp(b, 0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

function buildScreen() {
  const group = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0a1929, metalness: 0.65, roughness: 0.35,
  });
  const borderMat = new THREE.MeshStandardMaterial({
    color: CDN.blue, emissive: CDN.blue, emissiveIntensity: 0.7,
  });
  const standMat = new THREE.MeshStandardMaterial({
    color: 0x1a2030, metalness: 0.85, roughness: 0.25,
  });

  // ── Tilted display panel sub-group ───────────────
  const TILT = -0.38; // radians — top tilts away from player
  const FW = 2.9, FH = 1.85; // frame dimensions

  const display = new THREE.Group();
  display.rotation.x = TILT;

  // Frame body
  display.add(new THREE.Mesh(new THREE.BoxGeometry(FW, FH, 0.07), frameMat));

  // Glowing border edges
  for (const [bw, bh, bx, by] of [
    [FW,    0.022, 0,        FH / 2],
    [FW,    0.022, 0,       -FH / 2],
    [0.022, FH,   -FW / 2,  0],
    [0.022, FH,    FW / 2,  0],
  ]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.08), borderMat);
    b.position.set(bx, by, 0);
    display.add(b);
  }

  // Screen canvas surface
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width  = 1024;
  screenCanvas.height = 640;
  drawStartScreen(screenCanvas);
  const screenTex  = new THREE.CanvasTexture(screenCanvas);
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(FW - 0.16, FH - 0.16),
    new THREE.MeshBasicMaterial({ map: screenTex })
  );
  screenMesh.position.z = 0.04;
  screenMesh.userData = { clickable: true, action: 'openGlobeVideos' };
  display.add(screenMesh);

  group.add(display);

  // ── Stand — single central cylinder stem ─────────
  const stemTop = new THREE.Vector3(0, -0.65, 0.05);
  const stemBot = new THREE.Vector3(0, -1.50, 0.05);
  group.add(makeTube(stemTop, stemBot, 0.055, standMat));

  // Base plate on the floor
  const basePlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.30, 0.34, 0.03, 32),
    standMat
  );
  basePlate.position.set(0, -1.485, 0.05);
  group.add(basePlate);

  // CDN-blue accent ring where stem meets the frame
  const accentMat = new THREE.MeshStandardMaterial({
    color: CDN.blue, emissive: CDN.blue, emissiveIntensity: 0.9,
  });
  const accentRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.062, 0.010, 8, 32),
    accentMat
  );
  accentRing.position.copy(stemTop);
  accentRing.rotation.x = Math.PI / 2;
  group.add(accentRing);

  group.userData.canvas     = screenCanvas;
  group.userData.texture    = screenTex;
  group.userData.screenMesh = screenMesh;
  group.userData.state      = 'default';

  return group;
}

// ── Pedestal ─────────────────────────────────────────────────────────────────

function buildPedestal() {
  const group    = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, metalness: 0.15, roughness: 0.55 });
  const cyanMat  = new THREE.MeshStandardMaterial({ color: CDN.cyan,  emissive: CDN.cyan, emissiveIntensity: 1.2 });

  // Just the flat base ring
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.08, 48), whiteMat);
  base.position.y = 0.04;
  group.add(base);

  // Glowing top edge
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.010, 6, 64), cyanMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.08;
  group.add(rim);

  return group;
}

// ── Neon sign ────────────────────────────────────────────────────────────────

function buildNeonSign(scene, leftX, rightX, z) {
  const barY  = 4.5;
  const cx    = (leftX + rightX) / 2;
  const W = 1280, H = 200;
  const planeW = rightX - leftX - 0.6;
  const planeH = planeW * (H / W);
  const panelY = barY - planeH / 2 - 0.06;

  // Metal legs and top bar — dark charcoal grey, no reflections
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a, metalness: 0.0, roughness: 0.9,
  });
  scene.add(makeTube(new THREE.Vector3(leftX,  0,    z), new THREE.Vector3(leftX,  barY, z), 0.045, metalMat));
  scene.add(makeTube(new THREE.Vector3(rightX, 0,    z), new THREE.Vector3(rightX, barY, z), 0.045, metalMat));
  scene.add(makeTube(new THREE.Vector3(leftX,  barY, z), new THREE.Vector3(rightX, barY, z), 0.045, metalMat));

  // Metal backing plate — dark charcoal grey, no reflections
  const backingMat = new THREE.MeshStandardMaterial({
    color: 0x383838, metalness: 0.0, roughness: 0.9,
  });
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(planeW + 0.28, planeH + 0.22, 0.05),
    backingMat
  );
  backing.position.set(cx, panelY, z - 0.01);
  scene.add(backing);

  // Canvas — transparent background, neon text only
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const text = 'Fin du Monde';
  ctx.font = 'bold 120px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [blur, alpha, fill] of [
    [90, 0.20, '#00d4ff'],
    [50, 0.35, '#00d4ff'],
    [20, 0.60, '#00d4ff'],
    [ 8, 1.00, '#ffffff'],
  ]) {
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur  = blur;
    ctx.fillStyle   = fill;
    ctx.fillText(text, W / 2, H / 2);
  }
  ctx.globalAlpha = 1.0;

  const textMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW, planeH),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
    })
  );
  textMesh.position.set(cx, panelY, z + 0.04);
  scene.add(textMesh);

}

// ── Public API ───────────────────────────────────────────────────────────────

export function createGlobeScreenInstallation(scene, camera) {
  const GLOBE_SCALE = 1.8;

  const Z = -13.0;

  const screen = buildScreen();
  screen.position.set(3.5, 1.5, Z);
  scene.add(screen);

  const pedestal = buildPedestal();
  pedestal.position.set(7.0, 0, Z);
  pedestal.scale.setScalar(GLOBE_SCALE);
  scene.add(pedestal);

  const globe = buildGlobe(screen);
  // Base top is ~0.08 * GLOBE_SCALE; globe radius is 0.5 * GLOBE_SCALE — sit just above base
  globe.position.set(7.0, 0.08 * GLOBE_SCALE + 0.5 * GLOBE_SCALE + 0.05, Z);
  globe.scale.setScalar(GLOBE_SCALE);
  scene.add(globe);

  // Add billboard items directly to scene (not globe group)
  for (const { lineMesh, markerGroup } of globe.userData.billboardData) {
    scene.add(lineMesh);
    scene.add(markerGroup);
  }

  const areaLight = new THREE.PointLight(CDN.blue, 0.8, 10);
  areaLight.position.set(5.2, 3.5, Z + 0.5);
  scene.add(areaLight);

  // Neon arch sign spanning both screen and globe
  buildNeonSign(scene, 1.5, 8.8, Z);

  // ── Locked state — markers dimmed and non-clickable until screen is read ──
  let unlocked = false;
  let unlockProgress = 1; // 0 = animating unlock, 1 = done

  for (const { lineMat, markerGroup, dotMat, btnMesh } of globe.userData.billboardData) {
    markerGroup.userData.clickable = false;
    btnMesh.material.opacity = 0.25;
    btnMesh.material.color.set(0x777777);
    lineMat.opacity = 0.12;
    dotMat.emissiveIntensity = 0.4;
  }

  // Fetch Vimeo thumbnails — redraw default screen once started and thumbnails arrive
  loadVimeoThumbnails(() => {
    if (unlocked && screen.userData.state === 'default') {
      drawDefaultScreen(screen.userData.canvas, false);
      screen.userData.texture.needsUpdate = true;
    }
  });

  const _up = new THREE.Vector3(0, 1, 0);

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    unlockProgress = 0;
    for (const { markerGroup } of globe.userData.billboardData) {
      markerGroup.userData.clickable = true;
    }
    drawDefaultScreen(screen.userData.canvas, false);
    screen.userData.texture.needsUpdate = true;
  }

  function start() {
    screen.userData.state = 'default';
    screen.userData.screenMesh.userData.action = 'openGlobeVideos';
    screen.userData.screenMesh.userData.hotspot = 'screen';
    unlock();
  }

  function selectCountry(country) {
    drawCountryScreen(screen.userData.canvas, country, () => {
      screen.userData.texture.needsUpdate = true;
    });
    screen.userData.texture.needsUpdate = true;
    screen.userData.state = 'country';
    screen.userData.screenMesh.userData.action = 'resetGlobeScreen';
  }

  function reset() {
    if (screen.userData.state === 'default') return;
    drawDefaultScreen(screen.userData.canvas, false);
    screen.userData.texture.needsUpdate = true;
    screen.userData.state = 'default';
    screen.userData.screenMesh.userData.action = 'openGlobeVideos';
  }

  const _grey   = new THREE.Color(0x777777);
  const _white  = new THREE.Color(0xffffff);
  const _tmpCol = new THREE.Color();

  let elapsed = 0;
  function update(delta) {
    elapsed += delta;
    globe.rotation.y += delta * 0.06;

    // Unlock fade animation (0.5s)
    if (unlocked && unlockProgress < 1) {
      unlockProgress = Math.min(1, unlockProgress + delta * 2);
      for (const { lineMat, dotMat, btnMesh } of globe.userData.billboardData) {
        btnMesh.material.opacity = 0.25 + 0.75 * unlockProgress;
        _tmpCol.copy(_grey).lerp(_white, unlockProgress);
        btnMesh.material.color.copy(_tmpCol);
        dotMat.emissiveIntensity = 0.4 + 3.1 * unlockProgress;
      }
    }

    // Billboard: compute each label's world position, face camera
    for (const { dir, labelRadius, lineMesh, lineMat, markerGroup } of globe.userData.billboardData) {
      const worldDir   = dir.clone().applyQuaternion(globe.quaternion);
      const dotWorld   = globe.position.clone().addScaledVector(worldDir, 0.52  * GLOBE_SCALE);
      const lineEndW   = globe.position.clone().addScaledVector(worldDir, (labelRadius - 0.06) * GLOBE_SCALE);
      const labelWorld = globe.position.clone().addScaledVector(worldDir, labelRadius * GLOBE_SCALE);

      lineMesh.position.copy(dotWorld.clone().lerp(lineEndW, 0.5));
      lineMesh.quaternion.setFromUnitVectors(_up, worldDir);
      // Locked: fixed dim opacity. Unlocked: animated pulse
      lineMat.opacity = unlocked
        ? 0.6 + Math.sin(elapsed * 2.5) * 0.35
        : 0.12;

      markerGroup.position.copy(labelWorld);
      markerGroup.lookAt(camera.position);
    }
  }

  const clickables = [
    ...globe.userData.markers,
    screen.userData.screenMesh,
  ];

  return { clickables, selectCountry, reset, unlock, start, update };
}
