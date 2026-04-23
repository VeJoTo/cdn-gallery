# Jason Intro Dialogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current multi-bubble first-spawn intro with a Stardew-style sequential dialogue: Jason speaks one line at a time, typewriter-animated, advanceable with Space/Enter/Click and skippable with ESC — reusing the existing `#gatekeeper-chat` panel and the master design system (cyan+navy, no wooden skin).

**Architecture:** A new `src/intro.js` module owns the typewriter tokenizer and the `playIntro({ ... }) → Promise` orchestration (state machine, input wiring, line advance/skip). `src/ui.js`'s existing `playIntro()` is rewritten to be a thin wrapper that sets up the `intro-mode` class on the chat panel, swaps the header name to "Jason", invokes `intro.js`, and restores the chat for post-intro Q&A on completion.

**Tech Stack:** Vanilla ES modules, Vitest 1.6 with fake timers, existing DOM/CSS (no new frameworks).

**Spec:** `docs/superpowers/specs/2026-04-23-jason-intro-dialogue-design.md`

---

## File Structure

**New files**

- `src/intro.js` — typewriter tokenizer + `playIntro(options) → Promise<{skipped:boolean}>` orchestration
- `src/tests/intro.test.js` — unit tests for the tokenizer and the state machine

**Modified files**

- `src/ui.js` — rewrite `playIntro()` into a thin wrapper around `intro.js`; remove `appendIntroBubble`, `renderIntroChips`, `clearIntroTimers`, `INTRO_BUBBLE_DELAY_MS`, `introTimer`, `introSkipHandler`. Keep `INTRO_SCRIPT`, `INTRO_FLAG_KEY`, `hasSeenIntro`, `markIntroSeen`, `isIntroPlaying` (driven by wrapper now).
- `index.html` — add `<div id="chat-footer">` inside `#guide-dialog`
- `styles/main.css` — append `#chat-footer` base styles and `#gatekeeper-chat.intro-mode` variant rules

---

## Task 1: Typewriter tokenizer

**Files:**
- Create: `src/intro.js`
- Create: `src/tests/intro.test.js`

- [ ] **Step 1: Write failing tests for `typewriteTokens`**

Create `src/tests/intro.test.js`:

```js
// src/tests/intro.test.js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/intro.test.js`
Expected: FAIL — module `../intro.js` cannot be resolved.

- [ ] **Step 3: Implement `typewriteTokens` in `src/intro.js`**

Create `src/intro.js`:

```js
// src/intro.js

/**
 * Yields one "token" at a time for typewriter rendering.
 * - Each visible character (including multi-byte graphemes like emoji) is one token.
 * - Each HTML tag (e.g. `<strong>`, `</strong>`, `<br/>`) is one atomic token.
 *
 * This lets a typewriter animation reveal text char-by-char while keeping
 * HTML tags intact, so the partial string is always valid HTML.
 */
export function* typewriteTokens(text) {
  const TAG_RE = /<\/?[^>]+>/g;
  // Iterate by tag matches; between matches, walk graphemes (code points) one at a time.
  let cursor = 0;
  for (const match of text.matchAll(TAG_RE)) {
    // Yield visible chars between cursor and the tag
    yield* visibleChars(text.slice(cursor, match.index));
    // Yield the tag whole
    yield match[0];
    cursor = match.index + match[0].length;
  }
  // Remaining visible chars after the last tag
  yield* visibleChars(text.slice(cursor));
}

function* visibleChars(str) {
  // Iterator over code points (handles surrogate pairs and therefore most emoji).
  // Intl.Segmenter would handle ZWJ sequences more accurately, but the intro
  // script only contains simple BMP/astral characters, so [...str] suffices.
  for (const ch of str) yield ch;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/intro.test.js`
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/intro.js src/tests/intro.test.js
git commit -m "feat(intro): typewriter tokenizer with atomic HTML tag handling"
```

---

## Task 2: `playIntro` orchestration (state machine + promise API)

**Files:**
- Modify: `src/intro.js`
- Modify: `src/tests/intro.test.js`

- [ ] **Step 1: Write failing tests for `playIntro`**

Append to `src/tests/intro.test.js`:

```js
import { vi, beforeEach, afterEach } from 'vitest';
import { playIntro } from '../intro.js';

function setupDom() {
  document.body.innerHTML = `
    <div id="gatekeeper-chat" class="hidden">
      <div id="guide-dialog">
        <div id="chat-messages"></div>
        <div id="chat-footer">▸ Space to continue · ESC to skip</div>
      </div>
    </div>
  `;
  return {
    chatOverlay: document.getElementById('gatekeeper-chat'),
    guideDialog: document.getElementById('guide-dialog'),
    chatMessages: document.getElementById('chat-messages'),
  };
}

function press(key) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function clickDialog() {
  document.getElementById('guide-dialog').click();
}

describe('playIntro', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDom();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  const TWO_LINE_SCRIPT = [
    { text: 'hi' },
    { text: 'bye' },
  ];

  it('opens the dialog and types the first line char-by-char', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    // Advance 10ms — one char revealed
    vi.advanceTimersByTime(10);
    expect(chatMessages.textContent).toBe('h');
    vi.advanceTimersByTime(10);
    expect(chatMessages.textContent).toBe('hi');
  });

  it('advance while typing completes the current line immediately', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10); // 'h'
    press(' ');
    expect(chatMessages.textContent).toBe('hi');
  });

  it('advance after a line is complete moves to the next line', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(20); // full 'hi'
    press(' ');
    vi.advanceTimersByTime(10);
    expect(chatMessages.textContent).toBe('b');
  });

  it('click on the dialog advances the same as Space', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    clickDialog();
    expect(chatMessages.textContent).toBe('hi');
  });

  it('Enter advances', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    press('Enter');
    expect(chatMessages.textContent).toBe('hi');
  });

  it('resolves with { skipped: false } after advancing past final line', async () => {
    const promise = playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    // Complete line 1
    vi.advanceTimersByTime(20);
    press(' '); // advance to line 2
    vi.advanceTimersByTime(30); // full "bye"
    press(' '); // final advance closes
    await expect(promise).resolves.toEqual({ skipped: false });
  });

  it('ESC skips and resolves with { skipped: true }', async () => {
    const promise = playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    press('Escape');
    await expect(promise).resolves.toEqual({ skipped: true });
  });

  it('renders HTML tags as HTML, not as text', () => {
    const { chatMessages } = setupDom();
    playIntro({
      script: [{ text: 'a <strong>B</strong>', html: true }],
      charDelayMs: 10,
    });
    vi.advanceTimersByTime(50); // way past the full line
    expect(chatMessages.innerHTML).toContain('<strong>B</strong>');
    expect(chatMessages.textContent).toBe('a B');
  });

  it('removes its keydown listener on completion', async () => {
    const { chatMessages } = setupDom();
    const promise = playIntro({ script: [{ text: 'x' }], charDelayMs: 10 });
    vi.advanceTimersByTime(10);
    press(' '); // final advance → completes
    await promise;
    // After completion, further keypresses should not mutate chatMessages
    const afterHtml = chatMessages.innerHTML;
    press(' ');
    press('Escape');
    expect(chatMessages.innerHTML).toBe(afterHtml);
  });

  it('ignores key-repeat events', () => {
    const { chatMessages } = setupDom();
    playIntro({ script: TWO_LINE_SCRIPT, charDelayMs: 10 });
    vi.advanceTimersByTime(10); // 'h' typed
    // Simulate a held-key repeat: the initial keydown already advanced the line.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true }));
    // Should NOT have jumped past line 1
    expect(chatMessages.textContent).toBe('h');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/intro.test.js`
Expected: FAIL — `playIntro` not exported from `../intro.js`.

- [ ] **Step 3: Implement `playIntro` in `src/intro.js`**

Append to `src/intro.js`:

```js
const DEFAULT_CHAR_DELAY_MS = 25;

/**
 * Play the intro dialogue sequence.
 *
 * @param {Object} options
 * @param {Array<{text: string, html?: boolean}>} options.script - Lines to speak.
 * @param {number} [options.charDelayMs=25] - Milliseconds between characters.
 * @returns {Promise<{skipped: boolean}>}
 */
export function playIntro({ script, charDelayMs = DEFAULT_CHAR_DELAY_MS }) {
  const chatMessages = document.getElementById('chat-messages');
  const guideDialog = document.getElementById('guide-dialog');
  if (!chatMessages || !guideDialog) {
    return Promise.resolve({ skipped: false });
  }

  return new Promise((resolve) => {
    let lineIdx = 0;
    let timer = null;
    let isTyping = false;
    let currentLineFullText = '';

    function renderPartial(partial) {
      // partial is a string containing characters + complete tags
      chatMessages.innerHTML = partial;
    }

    function typeLine(entry) {
      isTyping = true;
      currentLineFullText = entry.text;
      chatMessages.innerHTML = '';
      const tokens = Array.from(typewriteTokens(entry.text));
      let revealed = '';
      let tokenIdx = 0;

      function tick() {
        if (tokenIdx >= tokens.length) {
          isTyping = false;
          timer = null;
          return;
        }
        revealed += tokens[tokenIdx++];
        renderPartial(revealed);
        timer = setTimeout(tick, charDelayMs);
      }
      tick();
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
      // Don't intercept clicks on child buttons (chat-close) that have their own handlers
      if (e.target.closest('button')) return;
      advance();
    }

    document.addEventListener('keydown', onKeydown);
    guideDialog.addEventListener('click', onDialogClick);

    // Start typing the first line
    typeLine(script[lineIdx]);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/intro.test.js`
Expected: all 17 tests PASS (7 from Task 1 + 10 new).

- [ ] **Step 5: Commit**

```bash
git add src/intro.js src/tests/intro.test.js
git commit -m "feat(intro): playIntro orchestration with advance/skip state machine"
```

---

## Task 3: Add `#chat-footer` element to HTML

**Files:**
- Modify: `index.html` (inside `#guide-dialog`)

- [ ] **Step 1: Add the `#chat-footer` element**

Locate the `#guide-dialog` block (currently around line 48 of `index.html`). Inside `#guide-dialog`, AFTER the `<div id="chat-input-row">...</div>` block and BEFORE the closing `</div>` of `#guide-dialog`, insert:

```html
      <div id="chat-footer">▸ Space to continue · ESC to skip</div>
```

The full `#guide-dialog` block should now look like:

```html
    <div id="guide-dialog">
      <button id="chat-close">×</button>
      <div id="chat-header">
        <div>
          <div id="chat-header-name">The Guide</div>
          <div id="chat-header-subtitle">Your gallery companion</div>
        </div>
      </div>
      <div id="chat-messages"></div>
      <div id="chat-chips"></div>
      <div id="chat-input-row">
        <input id="chat-input" type="text" placeholder="Ask me anything…" autocomplete="off" />
        <button id="chat-send">Send</button>
      </div>
      <div id="chat-footer">▸ Space to continue · ESC to skip</div>
    </div>
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(intro): add #chat-footer hint element to guide dialog"
```

---

## Task 4: CSS for intro-mode variant

**Files:**
- Modify: `styles/main.css` (append at end)

- [ ] **Step 1: Append CSS rules**

Append to the end of `styles/main.css`:

```css
/* ── Intro-mode variant on #gatekeeper-chat ───────
   During the first-spawn intro we hide the normal chat chrome (chips + input)
   and show a small "Space / ESC" hint footer instead. */
#chat-footer {
  font-size: 11px;
  color: rgba(0, 212, 255, 0.6);
  letter-spacing: 0.05em;
  text-align: right;
  margin-top: 8px;
}
#gatekeeper-chat:not(.intro-mode) #chat-footer {
  display: none;
}
#gatekeeper-chat.intro-mode #chat-chips,
#gatekeeper-chat.intro-mode #chat-input-row {
  display: none;
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: CSS bundle grows by a few hundred bytes.

- [ ] **Step 3: Commit**

```bash
git add styles/main.css
git commit -m "feat(intro): intro-mode styles — hide chips/input, show hint footer"
```

---

## Task 5: Replace the existing `playIntro()` in `ui.js` with a wrapper

**Files:**
- Modify: `src/ui.js`

- [ ] **Step 1: Import `playIntro` from `intro.js`**

Near the top of `src/ui.js`, after the existing imports (there are none currently — the first lines are `function escapeHtml(...)` and the `INTRO_FLAG_KEY` const). Insert at line 2 (right after the `// src/ui.js` comment):

```js
import { playIntro as runIntroDialogue } from './intro.js';
```

- [ ] **Step 2: Locate and understand what's being replaced**

Inside `createUI()`, the current intro machinery (approximately `src/ui.js:297-362`) consists of:

- `INTRO_BUBBLE_DELAY_MS` constant
- `introTimer`, `introSkipHandler`, `isIntroPlaying` state
- `clearIntroTimers()`
- `appendIntroBubble()`
- `renderIntroChips()`
- `playIntro()` (the existing multi-bubble implementation)

Of these, **only `renderIntroChips()` and `isIntroPlaying` must survive** (the chat input-row gate at line 375 and 381 still uses `isIntroPlaying`, and the post-intro chips are rendered by `renderIntroChips()`).

- [ ] **Step 3: Remove the obsolete intro helpers**

Delete these from `src/ui.js` inside `createUI()`:

- The `INTRO_BUBBLE_DELAY_MS` constant
- `let introTimer = null;`
- `let introSkipHandler = null;`
- The entire `clearIntroTimers()` function body
- The entire `appendIntroBubble()` function
- The entire existing `playIntro()` function (lines approximately 331-362)

Keep `let isIntroPlaying = false;` — the wrapper will set/unset it.

The `clearIntroTimers()` function is called from inside `openGatekeeperChat()` (line 273) and `closeGatekeeperChat()` (line 290). Replace both calls with inline `isIntroPlaying = false;` or remove them entirely — the intro's own `finish()` handles cleanup now. Remove the two `clearIntroTimers()` calls from those functions.

Keep `renderIntroChips()` exactly as-is.

- [ ] **Step 4: Write the new `playIntro()` wrapper**

Where the old `playIntro` was, add this new one:

```js
  async function playIntro() {
    const chatHeaderName = document.getElementById('chat-header-name');
    const originalName = chatHeaderName?.textContent ?? 'The Guide';

    chatMessages.innerHTML = '';
    chatChips.innerHTML = '';
    isIntroPlaying = true;
    gatekeeperChat.classList.add('intro-mode');
    if (chatHeaderName) chatHeaderName.textContent = 'Jason';
    gatekeeperChat.classList.remove('hidden');
    requestAnimationFrame(() => gatekeeperChat.classList.add('open'));

    await runIntroDialogue({ script: INTRO_SCRIPT });

    // Teardown: restore chat to its normal state for future G-key summons
    isIntroPlaying = false;
    gatekeeperChat.classList.remove('intro-mode');
    if (chatHeaderName) chatHeaderName.textContent = originalName;
    gatekeeperChat.classList.remove('open');
    setTimeout(() => gatekeeperChat.classList.add('hidden'), 300);
    // Render the chips so pressing G later shows the suggested questions
    // without having to re-enter openGatekeeperChat.
    renderIntroChips();
  }
```

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: 17 intro tests + the existing sky tests (11) + navigation tests (9) + existing ui tests still pass. Pre-existing book-overlay failures unchanged (should be exactly 2 failures).

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: Success.

- [ ] **Step 7: Commit**

```bash
git add src/ui.js
git commit -m "feat(intro): route ui.playIntro through new intro.js module"
```

---

## Task 6: Manual end-to-end walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Ensure dev server is running**

If not already running:

```bash
npm run dev
```

Open the URL shown (typically `http://localhost:5173/cdn-gallery/` or the port Vite chose).

- [ ] **Step 2: Walk through the happy path**

Open DevTools → Application → Clear site data (to force first-spawn).

Reload page. Expected:

1. Gatekeeper chat slides up with the `intro-mode` class applied
2. Header shows **"Jason"**
3. First line "Welcome kids! 🪄" types char-by-char
4. No input row or chips visible
5. Footer "▸ Space to continue · ESC to skip" visible
6. Press **Space** while typing → line completes instantly
7. Press **Space** again → chat clears, next line starts typing
8. Continue through all 4 lines
9. After the 4th line completes, one more Space → dialog closes, fp-overlay appears

Localstorage should now contain `cdn-gallery:intro-seen: "1"`.

- [ ] **Step 3: Verify the G-key Q&A still works**

Click the canvas to lock pointer. Press **G**. Expected:

- Gatekeeper chat opens WITHOUT `intro-mode` class
- Header name is back to **"The Guide"**
- Greeting message appears
- Chips are visible (What's in this room? / How do I earn XP? / Tell me about CDN)
- Input row + Send button are visible

Click **×** or press ESC → chat closes.

- [ ] **Step 4: Verify skip path**

Clear localStorage again. Reload.

- Intro starts typing
- Press **ESC** → dialog closes immediately, `cdn-gallery:intro-seen` is `"1"` (already set by main.js), fp-overlay appears

Reload again → intro does NOT play (flag is set).

- [ ] **Step 5: Verify click-to-advance**

Clear localStorage. Reload. Click the dialog (not the × button) → same behavior as Space.

- [ ] **Step 6: Verify key-repeat guard**

Clear localStorage. Reload. Hold **Space** down. Expected: no rapid skipping — lines advance one at a time per discrete keypress, not per repeat event.

- [ ] **Step 7: Verify HTML bolding in the 4th line**

Clear localStorage, reload, advance to line 4. Expected: the words **WASD**, **mouse**, and **G** render as bold text. The tags do not appear as visible text.

- [ ] **Step 8: Commit any adjustments**

If the walkthrough revealed a small polish issue, fix it and commit:

```bash
git add -p
git commit -m "fix(intro): <specific issue>"
```

- [ ] **Step 9: Push the branch**

```bash
git push -u origin feature/guide
```

- [ ] **Step 10: Open PR**

```bash
gh pr create --base master --head feature/guide --title "Jason: Stardew-style intro dialogue" --body "$(cat <<'EOF'
## Summary

- Replaces the first-spawn multi-bubble intro with a sequential Stardew-style dialogue: Jason speaks one line at a time, typewriter-animated, advanceable with Space/Enter/Click and skippable with ESC.
- Reuses the existing Guide chat panel (`#gatekeeper-chat`) and the master design system (cyan + navy + Pixelify Sans). No new wooden-skin UI — visual consistency preserved.
- Ongoing Q&A behavior (press G) is unchanged.

Spec: `docs/superpowers/specs/2026-04-23-jason-intro-dialogue-design.md`
Plan: `docs/superpowers/plans/2026-04-23-jason-intro-dialogue.md`

## Test plan

- [ ] Clear localStorage, reload → intro plays, typewriter animates, Space/Click advances, ESC skips
- [ ] After intro completes, press G → normal chat UI with chips + input, header "The Guide"
- [ ] Reload after intro seen → intro does NOT play
- [ ] Held Space does not rapid-skip (key-repeat guard)
- [ ] Line 4 renders WASD / mouse / G in bold

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
