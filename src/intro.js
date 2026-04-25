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

const DEFAULT_CHAR_DELAY_MS = 25;

/**
 * Play the intro dialogue sequence inside #gatekeeper-chat's #chat-messages.
 *
 * Listens on the document for keydown (Space/Enter/Escape) and on #guide-dialog
 * for click. Cleans up all listeners before resolving.
 *
 * Each line's `text` is rendered as HTML via `innerHTML`, so HTML tags in the
 * text (like `<strong>...</strong>`) are rendered as markup. The tokenizer
 * keeps tags atomic during the typewriter reveal.
 *
 * @param {Object} options
 * @param {Array<{text: string}>} options.script - Lines to speak (static trusted HTML).
 * @param {number} [options.charDelayMs=25] - Milliseconds between characters.
 * @returns {Promise<{skipped: boolean}>}
 */
export function playIntro({ script, charDelayMs = DEFAULT_CHAR_DELAY_MS }) {
  const chatMessages = document.getElementById('chat-messages');
  const guideDialog = document.getElementById('guide-dialog');
  if (!chatMessages || !guideDialog) {
    return Promise.resolve({ skipped: false });
  }
  if (!script || !script.length) {
    return Promise.resolve({ skipped: false });
  }

  return new Promise((resolve) => {
    let lineIdx = 0;
    let timer = null;
    let isTyping = false;
    let currentLineFullText = '';

    function typeLine(entry) {
      isTyping = true;
      currentLineFullText = entry.text;
      chatMessages.innerHTML = '';
      const tokens = Array.from(typewriteTokens(entry.text));
      let revealed = '';
      let tokenIdx = 0;

      function tick() {
        revealed += tokens[tokenIdx++];
        chatMessages.innerHTML = revealed;
        if (tokenIdx >= tokens.length) {
          isTyping = false;
          timer = null;
        } else {
          timer = setTimeout(tick, charDelayMs);
        }
      }

      // Schedule first tick so characters appear after charDelayMs (not immediately)
      timer = setTimeout(tick, charDelayMs);
    }

    function completeCurrentLine() {
      if (timer) { clearTimeout(timer); timer = null; }
      isTyping = false;
      chatMessages.innerHTML = currentLineFullText;
    }

    function advance() {
      if (isTyping) {
        completeCurrentLine();
        return;
      }
      lineIdx++;
      if (lineIdx >= script.length) {
        finish({ skipped: false });
      } else {
        typeLine(script[lineIdx]);
      }
    }

    function finish(result) {
      if (timer) { clearTimeout(timer); timer = null; }
      document.removeEventListener('keydown', onKeydown);
      guideDialog.removeEventListener('click', onDialogClick);
      resolve(result);
    }

    function onKeydown(e) {
      if (e.repeat) return;
      if (e.key === 'Escape') {
        finish({ skipped: true });
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advance();
      }
    }

    function onDialogClick(e) {
      // Don't intercept clicks on child buttons (e.g. chat-close) with their own handlers
      if (e.target.closest('button')) return;
      advance();
    }

    document.addEventListener('keydown', onKeydown);
    guideDialog.addEventListener('click', onDialogClick);

    typeLine(script[lineIdx]);
  });
}
