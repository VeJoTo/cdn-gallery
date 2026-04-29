// src/tests/tv-integrity.test.js
// Guards the TV / sofa / panel wiring against silent regressions during refactors.
// Tests are intentionally source-level so they catch moved/deleted code immediately.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { HOTSPOTS } from '../navigation.js';

const root = resolve(__dirname, '../..');
const mainSrc = readFileSync(resolve(root, 'src/main.js'),       'utf8');
const sofaSrc = readFileSync(resolve(root, 'src/scene/sofa.js'), 'utf8');
const tvSrc   = readFileSync(resolve(root, 'src/scene/tv.js'),   'utf8');

// ─── Hotspots ────────────────────────────────────────────────────────────────

describe('HOTSPOTS — tv', () => {
  it('exists', () => expect(HOTSPOTS.tv).toBeDefined());
  it('camera position', () => {
    expect(HOTSPOTS.tv.position.x).toBeCloseTo(-5.6);
    expect(HOTSPOTS.tv.position.y).toBeCloseTo(2.05);
    expect(HOTSPOTS.tv.position.z).toBeCloseTo(0);
  });
  it('looks at screen', () => expect(HOTSPOTS.tv.target.x).toBeCloseTo(-7.814));
});

describe('HOTSPOTS — seat-sofa', () => {
  it('exists', () => expect(HOTSPOTS['seat-sofa']).toBeDefined());
  it('target looks toward TV wall', () =>
    expect(HOTSPOTS['seat-sofa'].target.x).toBeLessThan(-5));
});

describe('HOTSPOTS — screen (Fin du Monde)', () => {
  it('exists', () => expect(HOTSPOTS.screen).toBeDefined());
});

// ─── Sofa wiring ─────────────────────────────────────────────────────────────

describe('sofa.js', () => {
  it('is clickable', () =>
    expect(sofaSrc).toMatch(/userData\.clickable\s*=\s*true/));
  it('hotspot points to tv', () =>
    expect(sofaSrc).toMatch(/userData\.hotspot\s*=\s*['"]tv['"]/));
});

// ─── TV mode flags ────────────────────────────────────────────────────────────

describe('main.js — enterTVMode / exitTVMode', () => {
  it('enterTVMode sets atTV = true', () =>
    expect(mainSrc).toMatch(/function enterTVMode[\s\S]{0,200}atTV\s*=\s*true/));
  it('exitTVMode sets atTV = false', () =>
    expect(mainSrc).toMatch(/function exitTVMode[\s\S]{0,200}atTV\s*=\s*false/));
  it('updateHUD calls enterTVMode for tv', () =>
    expect(mainSrc).toMatch(/id\s*===\s*['"]tv['"]\s*\)\s*enterTVMode\(\)/));
  it('updateHUD clears _freeCursorAfterTV for non-tv', () =>
    expect(mainSrc).toMatch(/exitTVMode\(\)[\s\S]{0,50}_freeCursorAfterTV\s*=\s*false/));
});

// ─── TV zoom mousedown guards ─────────────────────────────────────────────────

describe('main.js — TV zoom mousedown handler', () => {
  it('overlay guard exists', () =>
    expect(mainSrc).toContain('[id$="-overlay"]:not(.hidden)'));
  it('panel rect check is inside !controls.isLocked', () => {
    const lockIdx = mainSrc.indexOf('!controls.isLocked');
    const rectIdx = mainSrc.indexOf('getBoundingClientRect');
    expect(lockIdx).toBeGreaterThan(-1);
    expect(rectIdx).toBeGreaterThan(lockIdx);
  });
});

// ─── Holographic button actions ───────────────────────────────────────────────

describe('tv.js — button actions', () => {
  for (const action of ['toggleTV', 'nextVideo', 'prevVideo', 'showInfo',
                        'toggleMagnifier', 'toggleSound', 'togglePlaylist']) {
    it(`defines "${action}"`, () => expect(tvSrc).toContain(`'${action}'`));
  }
});

// ─── Room visibility ──────────────────────────────────────────────────────────

describe('main.js — room visibility', () => {
  it('hides hologram and playlist when leaving AI room', () =>
    expect(mainSrc).toMatch(/hideHologram\(\)[\s\S]{0,50}hidePlaylist\(\)/));
  it('uses opacity not display:none for iframe', () =>
    expect(mainSrc).toMatch(/tvVideoIframe\.style\.opacity/));
});
