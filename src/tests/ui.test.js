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
