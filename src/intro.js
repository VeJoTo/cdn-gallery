// src/intro.js

/**
 * Yields one "token" at a time for typewriter rendering.
 * - Each visible character (including most emoji) is one token.
 * - Each HTML tag (e.g. `<strong>`, `</strong>`, `<br/>`) is one atomic token.
 *
 * This lets a typewriter animation reveal text char-by-char while keeping
 * HTML tags intact, so the partial string is always valid HTML.
 *
 * Known limitations (acceptable for the current INTRO_SCRIPT; revisit if extending):
 * - The tag regex stops at the first `>`; attributes containing `>` inside quoted
 *   strings (e.g. `<span title="a>b">`) would mis-tokenize. Current script uses
 *   only bare `<strong>` tags, so safe.
 * - ZWJ emoji sequences (family 👨‍👩‍👧, profession, flags) split into component
 *   code points rather than rendering as a single glyph. Current script uses only
 *   simple emoji (🪄), so safe.
 */
export function* typewriteTokens(text) {
  const TAG_RE = /<\/?[^>]+>/g;
  let cursor = 0;
  for (const match of text.matchAll(TAG_RE)) {
    yield* visibleChars(text.slice(cursor, match.index));
    yield match[0];
    cursor = match.index + match[0].length;
  }
  yield* visibleChars(text.slice(cursor));
}

function* visibleChars(str) {
  // Iterator over code points (handles surrogate pairs, so most emoji count as 1)
  for (const ch of str) yield ch;
}
