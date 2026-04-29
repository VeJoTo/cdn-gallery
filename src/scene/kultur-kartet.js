// src/scene/kultur-kartet.js
import * as THREE from 'three';
import gsap from 'gsap';
import { feature } from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';
import { storiesData } from '../data/storiesData.js';

// ── Design system tokens ──────────────────────────────────────────────────────
const C = {
  navy:    '#0D1F2D',
  teal:    '#4A9B8E',
  cyan:    '#00E5FF',
  white:   '#FFFFFF',
  grey:    '#CCCCCC',
  coral:   '#C45C5C',
  mint:    '#4ABDA0',
  medBlue: '#2D5FA6',
};

// ── Canvas dimensions ─────────────────────────────────────────────────────────
const MAP_W  = 512;
const MAP_H  = 620;
const TEXT_W = 512;
const TEXT_H = 620;
const BTN_W  = 300;
const BTN_H  = 76;
const MAP_MARGIN = 28;

// ── Country ISO numeric codes & lookup tables ─────────────────────────────────
const COUNTRY_IDS = { norway: 578, sweden: 752, denmark: 208, finland: 246 };
const ID_TO_KEY   = Object.fromEntries(
  Object.entries(COUNTRY_IDS).map(([k, v]) => [String(v), k])
);
const LABEL_TEXT    = { norway: 'NORWAY', sweden: 'SWEDEN', denmark: 'DENMARK', finland: 'FINLAND' };
const LABEL_OFFSETS = {
  norway:  { lon:  8.5, lat: 61.5 },
  sweden:  { lon: 15.0, lat: 62.0 },
  finland: { lon: 26.0, lat: 63.5 },
  denmark: { lon:  9.5, lat: 56.3 },
};

// Country fill colors (CDN navy-teal family)
const FILL = {
  norway:  '#1B4B6E',
  sweden:  '#1A5070',
  denmark: '#1E4A6A',
  finland: '#1A5068',
};

// Hit canvas: each country gets a unique R value for color-pick detection
const HIT_ID     = { norway: 1, sweden: 2, denmark: 3, finland: 4 };
const HIT_TO_KEY = ['', 'norway', 'sweden', 'denmark', 'finland'];

// ── Module-level state ────────────────────────────────────────────────────────
let _mode           = 'explore';
let _selected       = null;
let _hovered        = null;
let _guessTarget    = null;
let _guessResult    = null;
let _lastGuessed    = null;
let _textAlpha      = 1.0;
let _activeFade     = null;
let _neonAlpha      = 1.0;
let _neonFlTimer    = 0;
let _hoveredBtn     = -1;
let _nextBtnBounds  = null;   // { x, y, w, h } in canvas pixels when correct; null otherwise
let _nextBtnHovered = false;
let _domCleanup     = null;

// Geo rendering state (populated after async data load)
let _pathGen   = null;   // geoPath generator (no canvas context → returns SVG strings)
let _features  = {};     // key → GeoJSON Feature
let _paths     = {};     // key → Path2D (pre-built, reused every frame)
let _centroids = {};     // key → [cx, cy] canvas pixels

let _mapCanvas, _mapCtx, _mapTex;
let _textCanvas, _textCtx, _textTex;
let _titleCanvas, _titleCtx, _titleTex;
let _hitCanvas, _hitCtx;
let _btnMeshes = [];

// ── Geographic data (async) ───────────────────────────────────────────────────

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';

// Returns a copy of a feature with its MultiPolygon rings filtered by bounding-box centroid.
// Works on both Polygon and MultiPolygon geometry types.
function filterPolygonRings(feat, keep) {
  const geom  = feat.geometry;
  const rings  = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  const kept   = rings.filter(poly => {
    const outer = poly[0];
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lon, lat] of outer) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return keep((minLon + maxLon) / 2, (minLat + maxLat) / 2);
  });
  return { ...feat, geometry: { type: 'MultiPolygon', coordinates: kept } };
}

async function initGeoData() {
  const resp  = await fetch(GEO_URL);
  const world = await resp.json();

  // Decode TopoJSON → GeoJSON, filter to our four countries
  const allCountries = feature(world, world.objects.countries);
  _features = {};
  for (const f of allCountries.features) {
    const key = ID_TO_KEY[String(f.id)];
    if (key) _features[key] = f;
  }

  // Remove non-mainland polygons:
  // Norway (578) MultiPolygon includes Faroe Islands (~7°W) — keep only lon 4–32°E, lat > 57°N
  if (_features.norway) {
    _features.norway = filterPolygonRings(
      _features.norway,
      (lon, lat) => lat > 57 && lat < 72 && lon > 4 && lon < 32
    );
  }
  // Denmark (208) MultiPolygon includes Greenland — keep only lon > 7°E
  if (_features.denmark) {
    _features.denmark = filterPolygonRings(
      _features.denmark,
      (lon, _lat) => lon > 7
    );
  }

  // geoMercator fitted to all four countries — fitExtent handles scale & translate
  const collection = { type: 'FeatureCollection', features: Object.values(_features) };
  const proj = geoMercator().fitExtent(
    [[MAP_MARGIN, MAP_MARGIN], [MAP_W - MAP_MARGIN, MAP_H - MAP_MARGIN]],
    collection
  );
  _pathGen = geoPath().projection(proj);

  // Pre-build Path2D objects and projected centroids once
  _paths     = {};
  _centroids = {};
  for (const key of Object.keys(COUNTRY_IDS)) {
    const f = _features[key];
    if (!f) continue;
    const d = _pathGen(f);
    if (d) _paths[key] = new Path2D(d);
    const off = LABEL_OFFSETS[key];
    const c   = off ? proj([off.lon, off.lat]) : _pathGen.centroid(f);
    if (c && !isNaN(c[0])) _centroids[key] = c;
  }
}

// ── Hit canvas ────────────────────────────────────────────────────────────────

function buildHitCanvas() {
  if (!_hitCanvas) {
    _hitCanvas = document.createElement('canvas');
    _hitCanvas.width  = MAP_W;
    _hitCanvas.height = MAP_H;
    _hitCtx = _hitCanvas.getContext('2d');
  }
  _hitCtx.fillStyle = '#000000';
  _hitCtx.fillRect(0, 0, MAP_W, MAP_H);
  for (const [key, id] of Object.entries(HIT_ID)) {
    const p = _paths[key];
    if (!p) continue;
    _hitCtx.fillStyle = `rgb(${id},0,0)`;
    _hitCtx.fill(p);
  }
}

function getCountryAtUV(u, v) {
  if (!_hitCtx) return null;
  const px = Math.floor(u * MAP_W);
  const py = Math.floor((1 - v) * MAP_H); // Three.js UV: v=0 is bottom
  if (px < 0 || px >= MAP_W || py < 0 || py >= MAP_H) return null;
  const r = _hitCtx.getImageData(px, py, 1, 1).data[0];
  return HIT_TO_KEY[r] || null;
}

function getNextBtnAtUV(u, v) {
  if (!_nextBtnBounds) return false;
  const px = u * TEXT_W;
  const py = (1 - v) * TEXT_H;
  const { x, y, w, h } = _nextBtnBounds;
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '', curY = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY);
      curY += lineH;
      line  = word;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, curY); curY += lineH; }
  return curY;
}

// Measures wrapped text height without rendering (same logic as wrapText)
function wrapTextHeight(ctx, text, maxW, lineH) {
  const words = text.split(' ');
  let line = '', count = 0;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { count++; line = word; }
    else line = test;
  }
  if (line) count++;
  return count * lineH;
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x,     y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

// ── Fade transition ───────────────────────────────────────────────────────────

function fadeAndSwitch(applyFn) {
  if (_activeFade) _activeFade.kill();
  const proxy = { a: _textAlpha };
  const t1 = gsap.to(proxy, {
    a: 0, duration: 0.18, ease: 'power1.in',
    onUpdate()   { _textAlpha = proxy.a; drawTextPanel(); },
    onComplete() {
      applyFn();
      _activeFade = gsap.to(proxy, {
        a: 1, duration: 0.25, ease: 'power1.out',
        onUpdate()   { _textAlpha = proxy.a; drawTextPanel(); },
        onComplete() { _activeFade = null; },
      });
    },
  });
  _activeFade = t1;
}

// ── Map canvas ────────────────────────────────────────────────────────────────

// Neon sign canvas — 4-layer glow matching the Fin du Monde sign approach
function drawTitle() {
  if (!_titleCtx) return;
  const ctx = _titleCtx;
  const W = 1024, H = 140;
  ctx.clearRect(0, 0, W, H);
  const text = 'THE CULTURE MAP';
  ctx.font = `64px 'Octosquares', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [blur, base, fill] of [
    [90, 0.20, '#00d4ff'],
    [50, 0.35, '#00d4ff'],
    [20, 0.60, '#00d4ff'],
    [ 8, 1.00, '#ffffff'],
  ]) {
    ctx.globalAlpha = base * _neonAlpha;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur  = blur;
    ctx.fillStyle   = fill;
    ctx.fillText(text, W / 2, H / 2);
  }
  ctx.globalAlpha = 1.0;
  _titleTex.needsUpdate = true;
}

function borderStyle(key) {
  if (_mode === 'guesser') {
    if (_guessResult === 'correct' && _guessTarget  === key) return { color: '#30c060', lw: 2.5 };
    if (_guessResult === 'wrong'   && _lastGuessed  === key) return { color: '#e03030', lw: 2.5 };
    if (_hovered === key) return { color: C.coral, lw: 2.0 };
  } else {
    if (_selected === key) return { color: C.coral, lw: 2.5 };
    if (_hovered  === key) return { color: C.coral, lw: 2.0 };
  }
  return { color: 'rgba(255,255,255,0.45)', lw: 1.0 };
}

function drawMap() {
  const ctx = _mapCtx;
  const W = MAP_W, H = MAP_H;

  // Ocean background
  ctx.fillStyle = '#091520';
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createRadialGradient(W * 0.4, H * 0.4, 0, W * 0.4, H * 0.4, W * 0.9);
  grad.addColorStop(0, 'rgba(0,90,140,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (!_pathGen) {
    // Shown while TopoJSON is fetching
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '13px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Loading map…', W / 2, H / 2);
    ctx.textAlign = 'left';
    _mapTex.needsUpdate = true;
    return;
  }

  // Country fills (all countries, then borders on top so borders are never occluded)
  for (const key of ['norway', 'sweden', 'denmark', 'finland']) {
    const p = _paths[key];
    if (!p) continue;
    if (_mode === 'guesser' && key === _lastGuessed) {
      ctx.fillStyle = _guessResult === 'correct' ? '#30c060' : '#e03030';
    } else {
      ctx.fillStyle = FILL[key];
    }
    ctx.fill(p);
  }

  // Country borders
  for (const key of ['norway', 'sweden', 'denmark', 'finland']) {
    const p = _paths[key];
    if (!p) continue;
    const { color, lw } = borderStyle(key);
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    ctx.stroke(p);
  }

  // Labels at d3-computed centroids
  ctx.textAlign = 'center';
  for (const key of Object.keys(LABEL_TEXT)) {
    const c = _centroids[key];
    if (!c) continue;
    const active = _selected === key || _hovered === key;
    ctx.font        = `${active ? 'bold ' : ''}10px Roboto, sans-serif`;
    ctx.lineJoin    = 'round';
    ctx.lineWidth   = 3;
    ctx.strokeStyle = '#0a0a0a';
    ctx.strokeText(LABEL_TEXT[key], c[0], c[1]);
    ctx.fillStyle   = active ? C.white : 'rgba(255,255,255,0.55)';
    ctx.fillText(LABEL_TEXT[key], c[0], c[1]);
  }
  ctx.textAlign = 'left';

  // Bottom label bar
  ctx.fillStyle = 'rgba(13,31,45,0.9)';
  ctx.fillRect(0, H - 34, W, 34);
  ctx.fillStyle = C.teal;
  ctx.fillRect(0, H - 34, W, 2);

  // Neon title — stack shadow passes for multi-layer glow
  ctx.font = `12px 'Octosquares', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = C.cyan;
  ctx.globalAlpha = _neonAlpha;
  ctx.shadowColor = C.cyan;
  ctx.shadowBlur = 48; ctx.fillText('THE CULTURE MAP', W / 2, H - 11);
  ctx.shadowBlur = 24; ctx.fillText('THE CULTURE MAP', W / 2, H - 11);
  ctx.shadowBlur = 12; ctx.fillText('THE CULTURE MAP', W / 2, H - 11);
  ctx.shadowBlur =  6; ctx.fillText('THE CULTURE MAP', W / 2, H - 11);
  ctx.shadowBlur =  0; ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1.0;
  ctx.textAlign = 'left';

  _mapTex.needsUpdate = true;
}

// ── Text panel canvas ─────────────────────────────────────────────────────────

function drawTextPanel() {
  const ctx = _textCtx;
  const W = TEXT_W, H = TEXT_H;
  const PAD = 38;
  const FH = "'Octosquares', sans-serif"; // headline font
  const FB = 'Roboto, sans-serif';         // body font

  // Background – always full opacity
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = C.navy;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.teal;
  ctx.fillRect(0, 0, W, 4);
  ctx.fillStyle = C.cyan;
  ctx.fillRect(0, 4, 3, H - 4);

  // Reset next-button hit area; only set when the correct state is drawn
  _nextBtnBounds = null;

  // Content fades during mode transitions
  ctx.globalAlpha = _textAlpha;

  if (_mode === 'explore' && !_selected) {
    // ── Intro state ──
    const HEADLINE   = 'How creative can AI be when it comes to storytelling?';
    const BOX_TOP    = 46;
    const HDL_Y      = 76;  // headline baseline start

    // Measure headline height before rendering so the box fits it exactly
    ctx.font = `24px ${FH}`;
    const hdlH = wrapTextHeight(ctx, HEADLINE, W - PAD * 2, 32);
    const boxH = (HDL_Y - BOX_TOP) + hdlH + 20; // top padding + text block + 20px bottom padding
    const boxBottom = BOX_TOP + boxH;

    ctx.fillStyle = 'rgba(0,229,255,0.12)';
    ctx.fillRect(PAD - 8, BOX_TOP, W - PAD * 2 + 16, boxH);

    ctx.fillStyle = C.cyan;
    let y = HDL_Y;
    y = wrapText(ctx, HEADLINE, PAD, y, W - PAD * 2, 32);

    y = boxBottom + 32; // body always starts 32px below the box bottom, not from headline end
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = `16px ${FB}`;
    y = wrapText(ctx,
      'Researchers asked a large language model — trained predominantly on Anglo-American texts — to generate 50 stories for each of 236 countries.',
      PAD, y, W - PAD * 2, 24);

    y += 12;
    y = wrapText(ctx,
      'Click a country on the map to read an excerpt from one of the AI-generated stories.',
      PAD, y, W - PAD * 2, 24);

    y += 28;
    ctx.fillStyle = 'rgba(0,229,255,0.4)';
    ctx.fillRect(PAD, y, W - PAD * 2, 1);
    y += 18;

    ctx.fillStyle = C.cyan;
    ctx.font = `16px ${FB}`;
    wrapText(ctx, '→  Use "Story-guesser" to test how well you can identify a country from an AI-generated excerpt.', PAD, y, W - PAD * 2, 19);

  } else if (_mode === 'explore' && _selected) {
    // ── Country selected ──
    const data = storiesData[_selected];

    ctx.fillStyle = C.teal;
    ctx.font = `11px ${FH}`;
    ctx.fillText('AN EXCERPT FROM', PAD, 44);

    ctx.fillStyle = C.white;
    ctx.font = `24px ${FH}`;
    ctx.fillText(data.countryName.toUpperCase(), PAD, 80);

    ctx.fillStyle = C.cyan;
    ctx.fillRect(PAD, 104, W - PAD * 2, 2);

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = `italic 16px ${FB}`;
    let y = wrapText(ctx, data.excerpt, PAD, 136, W - PAD * 2, 27);

    y += 30;
    ctx.fillStyle = 'rgba(0,229,255,0.3)';
    ctx.fillRect(PAD, y, W - PAD * 2, 1);
    y += 18;

    ctx.fillStyle = C.cyan;
    ctx.font = `16px ${FB}`;
    wrapText(ctx,
      'AI-generated story. Language model trained predominantly on Anglo-American texts (CDN research, University of Bergen).',
      PAD, y, W - PAD * 2, 17);

  } else if (_mode === 'guesser') {
    // ── Guesser mode ──
    const data = storiesData[_guessTarget];

    if (_guessResult === 'correct') {
      ctx.fillStyle = C.mint;
      ctx.font = `24px ${FH}`;
      ctx.fillText('✓  ' + data.countryName + '!', PAD, 54);

      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `16px ${FB}`;
      ctx.fillText('Here is the full story:', PAD, 96);

      ctx.fillStyle = C.teal;
      ctx.fillRect(PAD, 110, W - PAD * 2, 2);

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `italic 16px ${FB}`;
      let ny = wrapText(ctx, data.fullStory, PAD, 134, W - PAD * 2, 26);

      // "Correct!" — same y-offset from story end as "Not quite" in the wrong branch
      ny += 22;
      ctx.fillStyle = C.mint;
      ctx.font = `16px ${FB}`;
      ny = wrapText(ctx, 'Correct!', PAD, ny, W - PAD * 2, 24);

      // "Next story" button rendered directly into the panel canvas — centred horizontally
      ny += 8;
      const NBW = 220, NBH = 44;
      const NBX = (W - NBW) / 2;
      const nbFilled = _nextBtnHovered;
      ctx.fillStyle = nbFilled ? '#00d4ff' : '#0a0f1a';
      rrect(ctx, NBX, ny, NBW, NBH, 4);
      ctx.fill();
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      rrect(ctx, NBX, ny, NBW, NBH, 4);
      ctx.stroke();
      ctx.fillStyle = nbFilled ? '#0a0f1a' : '#00d4ff';
      ctx.font = '13px Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Next story', W / 2, ny + NBH / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      _nextBtnBounds = { x: NBX, y: ny, w: NBW, h: NBH };

    } else {
      ctx.fillStyle = C.cyan;
      ctx.font = `24px ${FH}`;
      let y = 52;
      y = wrapText(ctx, 'Which country is this story about?', PAD, y, W - PAD * 2, 32);

      y += 4;
      ctx.fillStyle = C.cyan;
      ctx.fillRect(PAD, y, W - PAD * 2, 2);
      y += 20;

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `italic 16px ${FB}`;
      y = wrapText(ctx, data.redactedStory, PAD, y, W - PAD * 2, 26);

      y += 22;
      if (_guessResult === 'wrong') {
        ctx.fillStyle = C.coral;
        ctx.font = `16px ${FB}`;
        wrapText(ctx, '✗  Not quite — try another country.', PAD, y, W - PAD * 2, 24);
      } else {
        ctx.fillStyle = C.cyan;
        ctx.font = `16px ${FB}`;
        wrapText(ctx, 'Hover a country to highlight it, then click to submit your guess.', PAD, y, W - PAD * 2, 19);
      }
    }
  }

  ctx.globalAlpha = 1.0;
  _textTex.needsUpdate = true;
}

// ── Button drawing ────────────────────────────────────────────────────────────

const BTN_LABELS = ['Explore the map', 'Story-guesser'];
const BTN_MODES  = ['explore', 'guesser'];

// Matches the "Reset view" DOM button style exactly:
// normal → dark bg + cyan border + cyan text
// active/hovered → filled cyan + dark text
function drawBtn(canvas, ctx, label, active, hovered) {
  ctx.clearRect(0, 0, BTN_W, BTN_H);
  const b = 2, r = 4;
  const filled = active || hovered;
  ctx.fillStyle = filled ? '#00d4ff' : '#0a0f1a';
  rrect(ctx, b, b, BTN_W - b * 2, BTN_H - b * 2, r);
  ctx.fill();
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = b;
  rrect(ctx, b, b, BTN_W - b * 2, BTN_H - b * 2, r);
  ctx.stroke();
  ctx.fillStyle = filled ? '#0a0f1a' : '#00d4ff';
  ctx.font = '13px Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, BTN_W / 2, BTN_H / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function redrawButtons() {
  for (let i = 0; i < _btnMeshes.length; i++) {
    const { bCanvas, bCtx, bTex } = _btnMeshes[i].userData;
    drawBtn(bCanvas, bCtx, BTN_LABELS[i], BTN_MODES[i] === _mode, i === _hoveredBtn);
    bTex.needsUpdate = true;
  }
  document.querySelectorAll('#kulturkartet-btns [data-kk-btn]').forEach(b => {
    b.classList.toggle('active', b.dataset.kkBtn === _mode);
  });
}

// ── Action handlers (called from main.js) ─────────────────────────────────────

export function handleKartetMapClick(uv) {
  import('../achievements.js').then(m => m.unlock('cultureMap'));
  if (!_pathGen) return; // geo data not yet loaded
  const key = getCountryAtUV(uv.x, uv.y);
  if (!key) return;

  if (_mode === 'explore') {
    if (_selected !== key) {
      drawMap();
      fadeAndSwitch(() => { _selected = key; drawMap(); });
    } else {
      _selected = key;
      drawTextPanel();
    }
  } else if (_mode === 'guesser' && _guessResult !== 'correct') {
    _lastGuessed = key; // track which country was clicked for fill/border colour
    if (key === _guessTarget) {
      _guessResult = 'correct';
    } else {
      _guessResult = 'wrong';
    }
    drawMap();
    drawTextPanel();
  }
}

export function handleKartetBtnClick(modeKey) {
  if (modeKey === 'next') {
    // Advance to a new random story without leaving guesser mode
    const keys = Object.keys(storiesData);
    let next;
    do { next = keys[Math.floor(Math.random() * keys.length)]; }
    while (next === _guessTarget && keys.length > 1);
    _nextBtnHovered = false;
    fadeAndSwitch(() => {
      _guessTarget = next; _guessResult = null; _lastGuessed = null; _hovered = null;
      drawMap();
    });
  } else if (modeKey === 'guesser') {
    _nextBtnHovered = false;
    fadeAndSwitch(() => {
      _mode = 'guesser'; _selected = null; _hovered = null;
      const keys = Object.keys(storiesData);
      _guessTarget = keys[Math.floor(Math.random() * keys.length)];
      _guessResult = null; _lastGuessed = null;
      drawMap(); redrawButtons();
    });
  } else {
    _nextBtnHovered = false;
    fadeAndSwitch(() => {
      _mode = 'explore'; _hovered = null;
      _guessResult = null; _lastGuessed = null;
      drawMap(); redrawButtons();
    });
  }
}

export function updateKartetBtnHover(idx) {
  const prev = _hoveredBtn;
  _hoveredBtn = (idx === 0 || idx === 1) ? idx : -1;
  if (_hoveredBtn !== prev) redrawButtons();
}

export function updateKartetHover(uv) {
  if (!_pathGen) return;
  const key = uv ? getCountryAtUV(uv.x, uv.y) : null;
  if (key !== _hovered) {
    _hovered = key;
    drawMap();
  }
}

export function updateKartetTextHover(uv) {
  const prev = _nextBtnHovered;
  _nextBtnHovered = uv ? getNextBtnAtUV(uv.x, uv.y) : false;
  if (_nextBtnHovered !== prev) drawTextPanel();
}

export function handleKartetTextClick(uv) {
  if (getNextBtnAtUV(uv.x, uv.y)) handleKartetBtnClick('next');
}

export function mountKartetDOMOverlay(mapWrap, textWrap, btnsEl, onClose) {
  mapWrap.appendChild(_mapCanvas);
  textWrap.appendChild(_textCanvas);

  function uvFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: 1 - (e.clientY - rect.top) / rect.height };
  }

  function onMapMove(e)  { updateKartetHover(uvFromEvent(e, _mapCanvas)); }
  function onMapLeave()  { updateKartetHover(null); }
  function onMapClick(e) { handleKartetMapClick(uvFromEvent(e, _mapCanvas)); }
  _mapCanvas.addEventListener('mousemove', onMapMove);
  _mapCanvas.addEventListener('mouseleave', onMapLeave);
  _mapCanvas.addEventListener('click', onMapClick);
  _mapCanvas.style.cursor = 'crosshair';

  function onTextMove(e)  { updateKartetTextHover(uvFromEvent(e, _textCanvas)); }
  function onTextLeave()  { updateKartetTextHover(null); }
  function onTextClick(e) { handleKartetTextClick(uvFromEvent(e, _textCanvas)); }
  _textCanvas.addEventListener('mousemove', onTextMove);
  _textCanvas.addEventListener('mouseleave', onTextLeave);
  _textCanvas.addEventListener('click', onTextClick);

  const domBtnEls = btnsEl.querySelectorAll('[data-kk-btn]');
  function onBtnClick(e) { handleKartetBtnClick(e.currentTarget.dataset.kkBtn); }
  domBtnEls.forEach(b => b.addEventListener('click', onBtnClick));
  domBtnEls.forEach(b => b.classList.toggle('active', b.dataset.kkBtn === _mode));

  function onEsc(e) { if (e.key === 'Escape') onClose(); }
  document.addEventListener('keydown', onEsc);

  _domCleanup = () => {
    _mapCanvas.removeEventListener('mousemove', onMapMove);
    _mapCanvas.removeEventListener('mouseleave', onMapLeave);
    _mapCanvas.removeEventListener('click', onMapClick);
    _mapCanvas.style.cursor = '';
    _textCanvas.removeEventListener('mousemove', onTextMove);
    _textCanvas.removeEventListener('mouseleave', onTextLeave);
    _textCanvas.removeEventListener('click', onTextClick);
    domBtnEls.forEach(b => b.removeEventListener('click', onBtnClick));
    document.removeEventListener('keydown', onEsc);
    if (_mapCanvas.parentNode)  _mapCanvas.parentNode.removeChild(_mapCanvas);
    if (_textCanvas.parentNode) _textCanvas.parentNode.removeChild(_textCanvas);
    updateKartetHover(null);
    updateKartetTextHover(null);
    _domCleanup = null;
  };
}

export function unmountKartetDOMOverlay() {
  if (_domCleanup) _domCleanup();
}

export function tickKartet(delta) {
  // Neon flicker — discrete keyframe steps matching the CSS animation intent
  _neonFlTimer = (_neonFlTimer + delta) % 6.0;
  const _fl = _neonFlTimer / 6.0;
  const _neonTarget = _fl < 0.95 ? 1.0 : _fl < 0.97 ? 0.8 : _fl < 0.99 ? 0.9 : 1.0;
  if (_neonTarget !== _neonAlpha) { _neonAlpha = _neonTarget; drawMap(); drawTitle(); }
}

// ── Main factory ──────────────────────────────────────────────────────────────

export function createKulturKartet(scene) {
  // Reset all state (safe for hot-reload)
  _mode = 'explore'; _selected = null; _hovered = null;
  _guessTarget = null; _guessResult = null; _lastGuessed = null;
  _textAlpha = 1.0; _activeFade = null;
  _neonAlpha = 1.0; _neonFlTimer = 0;
  _hoveredBtn = -1; _nextBtnBounds = null; _nextBtnHovered = false; _domCleanup = null;
  _titleCanvas = null; _titleCtx = null; _titleTex = null;
  _pathGen = null; _features = {}; _paths = {}; _centroids = {};
  _hitCanvas = null; _hitCtx = null;
  _btnMeshes = [];

  // ── Canvases & textures
  _mapCanvas = document.createElement('canvas');
  _mapCanvas.width = MAP_W; _mapCanvas.height = MAP_H;
  _mapCtx = _mapCanvas.getContext('2d');
  _mapTex = new THREE.CanvasTexture(_mapCanvas);

  _textCanvas = document.createElement('canvas');
  _textCanvas.width = TEXT_W; _textCanvas.height = TEXT_H;
  _textCtx = _textCanvas.getContext('2d');
  _textTex = new THREE.CanvasTexture(_textCanvas);

  // Draw initial state immediately (loading indicator on map)
  drawMap();
  drawTextPanel();

  // Async: fetch 50m TopoJSON from jsDelivr, build Path2D objects, re-render
  initGeoData()
    .then(() => { buildHitCanvas(); drawMap(); })
    .catch(err => console.error('[kultur-kartet] map load failed:', err));

  // ── 3D layout – all panels on right wall (x = +7.9), rotation.y = -π/2
  const WALL_X = 7.9;
  const PW = 1.65, PH = 2.0; // scene units (aspect matches 512×620)

  const mapMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH),
    new THREE.MeshBasicMaterial({ map: _mapTex, side: THREE.DoubleSide })
  );
  mapMesh.position.set(WALL_X, 2.3, 4.3);
  mapMesh.rotation.y = -Math.PI / 2;
  mapMesh.userData = { clickable: true, action: 'openKulturKartet' };
  scene.add(mapMesh);

  const textMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH),
    new THREE.MeshBasicMaterial({ map: _textTex, side: THREE.DoubleSide })
  );
  textMesh.position.set(WALL_X, 2.3, 6.3);
  textMesh.rotation.y = -Math.PI / 2;
  textMesh.userData = { clickable: true, action: 'openKulturKartet' };
  scene.add(textMesh);

  // ── Neon sign (Fin du Monde pattern, wall-mounted) ──────────────────────
  const SIGN_W = 3.4;
  const SIGN_H = SIGN_W * (140 / 1024); // preserve canvas aspect ratio ≈ 0.465
  const SIGN_Y = 3.65, SIGN_Z = 5.3;

  // Dark navy backing board — thin box sits flush on the wall, protrudes slightly
  const backingMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f1a, metalness: 0.0, roughness: 0.9,
  });
  const backingBoard = new THREE.Mesh(
    new THREE.BoxGeometry(SIGN_W + 0.22, SIGN_H + 0.14, 0.02),
    backingMat
  );
  backingBoard.position.set(WALL_X - 0.01, SIGN_Y, SIGN_Z);
  backingBoard.rotation.y = -Math.PI / 2;
  scene.add(backingBoard);

  // Neon text canvas — transparent, rendered in front of the backing board
  _titleCanvas = document.createElement('canvas');
  _titleCanvas.width = 1024; _titleCanvas.height = 140;
  _titleCtx = _titleCanvas.getContext('2d');
  _titleTex = new THREE.CanvasTexture(_titleCanvas);
  drawTitle();
  const titleMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(SIGN_W, SIGN_H),
    new THREE.MeshBasicMaterial({ map: _titleTex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  titleMesh.position.set(WALL_X - 0.025, SIGN_Y, SIGN_Z);
  titleMesh.rotation.y = -Math.PI / 2;
  scene.add(titleMesh);

  // Thin separator between panels
  const sep = new THREE.Mesh(
    new THREE.PlaneGeometry(0.01, PH),
    new THREE.MeshBasicMaterial({ color: 0x004455 })
  );
  sep.position.set(WALL_X, 2.3, 5.3);
  sep.rotation.y = -Math.PI / 2;
  scene.add(sep);

  // ── Buttons (2 × Button 1 style, centred across the panel span)
  const BTN_SW = 1.1, BTN_SH = 0.28;
  const BTN_ZS = [4.6, 6.0]; // centred at z=5.3 with 0.3-unit gap

  for (let i = 0; i < BTN_LABELS.length; i++) {
    const bCanvas = document.createElement('canvas');
    bCanvas.width = BTN_W; bCanvas.height = BTN_H;
    const bCtx = bCanvas.getContext('2d');
    const bTex = new THREE.CanvasTexture(bCanvas);
    drawBtn(bCanvas, bCtx, BTN_LABELS[i], BTN_MODES[i] === 'explore');
    bTex.needsUpdate = true;

    const bMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(BTN_SW, BTN_SH),
      new THREE.MeshBasicMaterial({ map: bTex, transparent: true, side: THREE.DoubleSide })
    );
    bMesh.position.set(WALL_X, 0.65, BTN_ZS[i]);
    bMesh.rotation.y = -Math.PI / 2;
    bMesh.userData = {
      clickable: true, action: 'openKulturKartet',
      bCanvas, bCtx, bTex,
    };
    scene.add(bMesh);
    _btnMeshes.push(bMesh);
  }

  return { clickables: [mapMesh, textMesh, ..._btnMeshes], mapMesh, textMesh };
}
