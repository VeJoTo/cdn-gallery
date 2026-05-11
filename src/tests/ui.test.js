// src/tests/ui.test.js
import { describe, it, expect } from 'vitest';
import { answer } from '../ui.js';

describe('Gatekeeper answer()', () => {
  it('returns CDN reply for "cdn" keyword', () => {
    expect(answer('Tell me about CDN')).toMatch(/Centre for Digital Narrative/);
  });

  it('returns XP reply for "xp" keyword', () => {
    expect(answer('how do I earn xp?')).toMatch(/XP/);
  });

  it('returns book reply for "book" keyword', () => {
    expect(answer('what is the book?')).toMatch(/Codex/);
  });

  it('returns fallback for unknown question', () => {
    expect(answer('what colour is the sky?')).toMatch(/still learning/);
  });

  it('is case-insensitive', () => {
    expect(answer('CDN')).toEqual(answer('cdn'));
  });
});

import { INTRO_SCRIPT, INTRO_FLAG_KEY, hasSeenIntro, markIntroSeen } from '../ui.js';

describe('Intro script', () => {
  it('has exactly four bubbles', () => {
    expect(INTRO_SCRIPT.length).toBe(4);
  });

  it('opens with "Welcome kids!"', () => {
    expect(INTRO_SCRIPT[0].text).toMatch(/^Welcome kids!/);
  });

  it('names CDN + UiB in bubble 2', () => {
    expect(INTRO_SCRIPT[1].text).toMatch(/Centre for Digital Narrative/);
    expect(INTRO_SCRIPT[1].text).toMatch(/University of Bergen/);
  });

  it('bubble 4 carries inline kbd markup for the key names', () => {
    const b4 = INTRO_SCRIPT[3];
    expect(b4.html).toBe(true);
    expect(b4.text).toContain('kbd-group');
    expect(b4.text).toContain('<span class="kbd">G</span>');
    expect(b4.text).toContain('<span class="kbd">E</span>');
  });

  it('only bubble 4 uses html markup', () => {
    for (let i = 0; i < 3; i++) {
      expect(INTRO_SCRIPT[i].html).toBeFalsy();
    }
  });
});

describe('Intro flag helpers', () => {
  it('exports a stable key namespace for the flag', () => {
    expect(INTRO_FLAG_KEY).toBe('cdn-gallery:intro-seen');
  });

  it('hasSeenIntro reads the flag from the provided storage', () => {
    const store = { [INTRO_FLAG_KEY]: '1' };
    const storage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = v; }
    };
    expect(hasSeenIntro(storage)).toBe(true);
  });

  it('hasSeenIntro returns false when the flag is absent', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {}
    };
    expect(hasSeenIntro(storage)).toBe(false);
  });

  it('hasSeenIntro returns false if storage throws (private mode, etc.)', () => {
    const storage = {
      getItem: () => { throw new Error('no storage'); },
      setItem: () => {}
    };
    expect(hasSeenIntro(storage)).toBe(false);
  });

  it('markIntroSeen writes "1" to the flag', () => {
    const store = {};
    const storage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; }
    };
    markIntroSeen(storage);
    expect(store[INTRO_FLAG_KEY]).toBe('1');
  });

  it('markIntroSeen swallows errors from storage', () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); }
    };
    expect(() => markIntroSeen(storage)).not.toThrow();
  });
});

describe('renderAchievementsTab', () => {
  it('renders 4 card slots with correct unlocked/locked classes', () => {
    const html = renderAchievementsTab({
      unlockedIds: new Set(['book']),
      xp: 100,
      level: 2,
      recent: [{ id: 'book', ts: Date.now() }],
    });
    expect((html.match(/class="achievement-card /g) || []).length).toBe(4);
    expect((html.match(/achievement-card--unlocked/g) || []).length).toBe(1);
    expect((html.match(/achievement-card--locked/g) || []).length).toBe(3);
  });

  it('shows level number and XP fraction below max', () => {
    const html = renderAchievementsTab({
      unlockedIds: new Set(['book', 'tv']),
      xp: 200,
      level: 3,
      recent: [],
    });
    expect(html).toContain('LV.03');
    expect(html).toContain('200 / 300 XP');
  });

  it('shows MAX label at level cap', () => {
    const html = renderAchievementsTab({
      unlockedIds: new Set(['book', 'tv', 'globe', 'cultureMap']),
      xp: 400,
      level: 5,
      recent: [],
    });
    expect(html).toContain('MAX');
    expect(html).not.toContain('500 XP');
  });

  it('shows description for unlocked, hides for locked', () => {
    const html = renderAchievementsTab({
      unlockedIds: new Set(['book']),
      xp: 100,
      level: 2,
      recent: [],
    });
    expect(html).toContain('You read the AI');
    expect(html).not.toContain('You watched the AI imagine');
  });

  it('hides recent stamps section when empty', () => {
    const html = renderAchievementsTab({
      unlockedIds: new Set(),
      xp: 0, level: 1, recent: [],
    });
    expect(html).not.toContain('RECENT TELEMETRY');
  });
});
