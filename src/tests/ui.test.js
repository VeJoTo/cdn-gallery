// src/tests/ui.test.js
import { describe, it, expect } from 'vitest';
import { BOOK_PAGES, getNextPageIndex, getPrevPageIndex } from '../ui.js';

describe('Book overlay', () => {
  it('exposes at least 3 pages', () => {
    expect(BOOK_PAGES.length).toBeGreaterThanOrEqual(3);
  });

  it('each page has left and right HTML', () => {
    for (const page of BOOK_PAGES) {
      expect(typeof page.left).toBe('string');
      expect(typeof page.right).toBe('string');
    }
  });

  it('getNextPageIndex clamps at last page', () => {
    expect(getNextPageIndex(0)).toBe(1);
    expect(getNextPageIndex(BOOK_PAGES.length - 1)).toBe(BOOK_PAGES.length - 1);
  });

  it('getPrevPageIndex clamps at zero', () => {
    expect(getPrevPageIndex(2)).toBe(1);
    expect(getPrevPageIndex(0)).toBe(0);
  });
});

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
