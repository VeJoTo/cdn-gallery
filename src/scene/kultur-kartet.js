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
let _flashTimer     = 0;
let _nextRoundTimer = 0;
let _lastCountdown  = 0;
let _textAlpha      = 1.0;
let _activeFade     = null;
let _neonAlpha      = 1.0;
let _neonFlTimer    = 0;

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

function drawTitle() {
  if (!_titleCtx) return;
  const ctx = _titleCtx;
  ctx.clearRect(0, 0, 640, 60);
  ctx.font = `24px 'Octosquares', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.cyan;
  ctx.globalAlpha = _neonAlpha;
  ctx.shadowColor = C.cyan;
  ctx.shadowBlur = 48; ctx.fillText('THE CULTURE MAP', 320, 30);
  ctx.shadowBlur = 24; ctx.fillText('THE CULTURE MAP', 320, 30);
  ctx.shadowBlur = 12; ctx.fillText('THE CULTURE MAP', 320, 30);
  ctx.shadowBlur =  6; ctx.fillText('THE CULTURE MAP', 320, 30);
  ctx.shadowBlur =  0; ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1.0;
  _titleTex.needsUpdate = true;
}

function borderStyle(key) {
  if (_mode === 'guesser') {
    if (_guessResult === 'correct' && _guessTarget === key) return { color: C.mint,  lw: 2.5 };
    if (_guessResult === 'wrong'   && _hovered    === key) return { color: C.coral, lw: 2.5 };
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
    ctx.fillStyle = FILL[key];
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

    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = `12px ${FB}`;
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

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `11px ${FB}`;
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
      ctx.fillText('Correct! Here is the full story:', PAD, 96);

      ctx.fillStyle = C.teal;
      ctx.fillRect(PAD, 110, W - PAD * 2, 2);

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `italic 16px ${FB}`;
      wrapText(ctx, data.fullStory, PAD, 134, W - PAD * 2, 26);

      if (_nextRoundTimer > 0) {
        const secs = Math.ceil(_nextRoundTimer);
        ctx.fillStyle = 'rgba(0,229,255,0.55)';
        ctx.font = `12px ${FB}`;
        ctx.textAlign = 'center';
        ctx.fillText(`↻  Next story in ${secs}s`, W / 2, H - 50);
        ctx.textAlign = 'left';
      }

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
        ctx.font = `13px ${FH}`;
        wrapText(ctx, '✗  Not quite — try another country.', PAD, y, W - PAD * 2, 20);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.font = `12px ${FB}`;
        wrapText(ctx, 'Hover a country to highlight it, then click to submit your guess.', PAD, y, W - PAD * 2, 19);
      }
    }
  }

  ctx.globalAlpha = 1.0;
  _textTex.needsUpdate = true;
}

// ── Button drawing ────────────────────────────────────────────────────────────

const BTN_LABELS = ['Explore the map', 'Story-guesser', 'Step back'];
const BTN_MODES  = ['explore', 'guesser', 'back'];

function drawBtn(canvas, ctx, label, active) {
  ctx.clearRect(0, 0, BTN_W, BTN_H);
  const b = 2, r = 9;
  ctx.fillStyle = active ? 'rgba(0,229,255,0.16)' : 'rgba(0,229,255,0.04)';
  rrect(ctx, b, b, BTN_W - b * 2, BTN_H - b * 2, r);
  ctx.fill();
  ctx.strokeStyle = active ? C.cyan : 'rgba(0,229,255,0.5)';
  ctx.lineWidth = b;
  rrect(ctx, b, b, BTN_W - b * 2, BTN_H - b * 2, r);
  ctx.stroke();
  ctx.fillStyle = active ? C.cyan : 'rgba(255,255,255,0.82)';
  ctx.font = `${active ? 'bold ' : ''}13px Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, BTN_W / 2, BTN_H / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function redrawButtons() {
  for (let i = 0; i < _btnMeshes.length; i++) {
    const { bCanvas, bCtx, bTex } = _btnMeshes[i].userData;
    drawBtn(bCanvas, bCtx, BTN_LABELS[i], BTN_MODES[i] === _mode);
    bTex.needsUpdate = true;
  }
}

// ── Action handlers (called from main.js) ─────────────────────────────────────

export function handleKartetMapClick(uv) {
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
    if (key === _guessTarget) {
      _guessResult    = 'correct';
      _nextRoundTimer = 4.0;
      _lastCountdown  = Math.ceil(_nextRoundTimer);
    } else {
      _guessResult = 'wrong';
      _flashTimer  = 1.4;
    }
    drawMap();
    drawTextPanel();
  }
}

export function handleKartetBtnClick(modeKey) {
  if (modeKey === 'back') {
    fadeAndSwitch(() => {
      _mode = 'explore'; _selected = null; _hovered = null;
      _guessTarget = null; _guessResult = null;
      _flashTimer = 0; _nextRoundTimer = 0;
      drawMap(); redrawButtons();
    });
  } else if (modeKey === 'guesser') {
    fadeAndSwitch(() => {
      _mode = 'guesser'; _selected = null; _hovered = null;
      const keys = Object.keys(storiesData);
      _guessTarget = keys[Math.floor(Math.random() * keys.length)];
      _guessResult = null; _flashTimer = 0; _nextRoundTimer = 0;
      drawMap(); redrawButtons();
    });
  } else {
    fadeAndSwitch(() => {
      _mode = 'explore'; _hovered = null;
      _guessResult = null; _flashTimer = 0; _nextRoundTimer = 0;
      drawMap(); redrawButtons();
    });
  }
}

export function updateKartetHover(uv) {
  if (!_pathGen) return;
  const key = uv ? getCountryAtUV(uv.x, uv.y) : null;
  if (key !== _hovered) {
    _hovered = key;
    drawMap();
  }
}

export function tickKartet(delta) {
  if (_flashTimer > 0) {
    _flashTimer -= delta;
    if (_flashTimer <= 0) {
      _flashTimer = 0; _guessResult = null;
      drawMap(); drawTextPanel();
    }
  }

  if (_nextRoundTimer > 0) {
    _nextRoundTimer -= delta;
    const curr = Math.ceil(Math.max(0, _nextRoundTimer));
    if (curr !== _lastCountdown) { _lastCountdown = curr; drawTextPanel(); }
    if (_nextRoundTimer <= 0) {
      _nextRoundTimer = 0;
      const keys = Object.keys(storiesData);
      let next;
      do { next = keys[Math.floor(Math.random() * keys.length)]; }
      while (next === _guessTarget && keys.length > 1);
      fadeAndSwitch(() => {
        _guessTarget = next; _guessResult = null; _hovered = null;
        drawMap();
      });
    }
  }

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
  _guessTarget = null; _guessResult = null;
  _flashTimer = 0; _nextRoundTimer = 0; _lastCountdown = 0;
  _textAlpha = 1.0; _activeFade = null;
  _neonAlpha = 1.0; _neonFlTimer = 0;
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

  // ── 3D layout – all panels on x = -10.9, rotation.y = π/2
  const WALL_X = -7.9;
  const PW = 1.65, PH = 2.0; // scene units (aspect matches 512×620)

  const mapMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH),
    new THREE.MeshBasicMaterial({ map: _mapTex, side: THREE.DoubleSide })
  );
  mapMesh.position.set(WALL_X, 2.3, 4.3);
  mapMesh.rotation.y = Math.PI / 2;
  mapMesh.userData = { clickable: true, action: 'kulturKartetMap', hotspot: 'kultur-kartet' };
  scene.add(mapMesh);

  const textMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH),
    new THREE.MeshBasicMaterial({ map: _textTex, side: THREE.DoubleSide })
  );
  textMesh.position.set(WALL_X, 2.3, 6.3);
  textMesh.rotation.y = Math.PI / 2;
  scene.add(textMesh);

  // Title label
  _titleCanvas = document.createElement('canvas');
  _titleCanvas.width = 640; _titleCanvas.height = 60;
  _titleCtx = _titleCanvas.getContext('2d');
  _titleTex = new THREE.CanvasTexture(_titleCanvas);
  drawTitle();
  const titleMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.36),
    new THREE.MeshBasicMaterial({ map: _titleTex, transparent: true, side: THREE.DoubleSide })
  );
  titleMesh.position.set(WALL_X, 3.65, 5.3);
  titleMesh.rotation.y = Math.PI / 2;
  scene.add(titleMesh);

  // Thin separator between panels
  const sep = new THREE.Mesh(
    new THREE.PlaneGeometry(0.01, PH),
    new THREE.MeshBasicMaterial({ color: 0x004455 })
  );
  sep.position.set(WALL_X, 2.3, 5.3);
  sep.rotation.y = Math.PI / 2;
  scene.add(sep);

  // ── Buttons (3 × Button 1 style)
  const BTN_SW = 1.1, BTN_SH = 0.28;
  const BTN_ZS = [3.85, 5.25, 6.65];

  for (let i = 0; i < 3; i++) {
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
    bMesh.rotation.y = Math.PI / 2;
    bMesh.userData = {
      clickable: true, action: 'kulturKartetBtn',
      btnMode: BTN_MODES[i], hotspot: 'kultur-kartet',
      bCanvas, bCtx, bTex,
    };
    scene.add(bMesh);
    _btnMeshes.push(bMesh);
  }

  return { clickables: [mapMesh, ..._btnMeshes], mapMesh };
}
