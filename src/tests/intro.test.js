import { describe, it, expect } from 'vitest';
import { typewriteTokens } from '../intro.js';

function collect(iter) {
  return Array.from(iter);
}

describe('typewriteTokens', () => {
  it('yields each visible character one at a time', () => {
    expect(collect(typewriteTokens('hi'))).toEqual(['h', 'i']);
  });

  it('emits HTML tags as a single atomic token', () => {
    expect(collect(typewriteTokens('a <strong>b</strong>'))).toEqual([
      'a', ' ', '<strong>', 'b', '</strong>'
    ]);
  });

  it('handles self-closing / void tags atomically', () => {
    expect(collect(typewriteTokens('x<br/>y'))).toEqual(['x', '<br/>', 'y']);
  });

  it('treats emoji as a single character', () => {
    // Intro script uses 🪄 in "Welcome kids! 🪄" — must type as one token
    expect(collect(typewriteTokens('🪄 hi'))).toEqual(['🪄', ' ', 'h', 'i']);
  });

  it('yields nothing for empty string', () => {
    expect(collect(typewriteTokens(''))).toEqual([]);
  });

  it('handles text with no tags', () => {
    expect(collect(typewriteTokens('abc'))).toEqual(['a', 'b', 'c']);
  });

  it('handles text that is only a tag', () => {
    expect(collect(typewriteTokens('<em>x</em>'))).toEqual(['<em>', 'x', '</em>']);
  });
});
