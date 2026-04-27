# Jason Intro Dialogue — Design

**Status:** Approved, ready for implementation plan
**Branch:** `feature/guide`

## Summary

Replace the current multi-bubble intro (four stacked messages dumped into the Guide chat on first spawn) with a Stardew-Valley-style sequential dialogue. Jason (the Guide, now on-screen named "Jason") speaks one line at a time. Each line types on character-by-character; player advances with Space/Enter/Click and can skip the whole sequence with ESC. Visual presentation reuses the existing sci-fi Guide panel — no new wooden-skin UI.

## Scope

**In scope**

- Rewrite the intro sequence inside the existing `#gatekeeper-chat` overlay
- Typewriter text rendering with atomic handling of HTML tags (e.g. `<strong>WASD</strong>` reveals with the tag intact)
- Input handling: Space / Enter / Click to advance, ESC to skip
- New `src/intro.js` module owning the typewriter state machine and input wiring
- Rename the dialogue header from "The Guide" to "Jason" during the intro only (post-intro Q&A keeps "The Guide")
- Footer hint `▸ Space to continue · ESC to skip` visible during intro
- Persist `cdn-gallery:intro-seen` flag when intro completes OR is skipped
- Hide the existing suggested-question chips and text-input row during intro; restore them afterwards

**Out of scope**

- No change to the ongoing Q&A behavior triggered by the `G` key (chips, text input, keyword responses all stay identical)
- No change to the intro script content — the same 4-line `INTRO_SCRIPT` constant is reused verbatim
- No new portrait asset — `public/guide.png` is reused
- No wooden/parchment styling — the existing dark-navy + cyan design tokens stay
- No sound effects (could be a follow-up)

## User flow

### First spawn (localStorage `cdn-gallery:intro-seen` not set)

1. Page loads. The 3D scene renders. `fp-overlay` "Click to explore" is hidden during the intro (existing CSS rule that suppresses fp-overlay while any overlay is open applies to `#gatekeeper-chat`).
2. `main.js` calls `playIntro()` which opens `#gatekeeper-chat` in `intro-mode`:
   - Header shows "Jason" / "Your gallery companion"
   - `#chat-messages` is empty; first line begins typing at ~25ms/char
   - `#chat-chips` and `#chat-input-row` are hidden via the `intro-mode` class
   - `#chat-footer` is visible with the "▸ Space to continue · ESC to skip" hint
3. As Jason speaks, **Space / Enter / left-click** on the dialog area:
   - If the current line is still typing → instantly reveal the rest of the line
   - If the current line is fully revealed → clear it and begin typing the next line
4. After the **final** line is fully revealed and the player advances once more:
   - `#gatekeeper-chat` closes
   - `#chat-chips` and `#chat-input-row` are un-hidden (the `intro-mode` class is removed) so the next time the player presses G, the normal chat is ready
   - The header name is reset to "The Guide" for ongoing Q&A
   - `fp-overlay` "Click to explore" appears
5. Player clicks canvas → pointer lock engages → normal gameplay.

### Skip at any time (ESC)

- The dialog closes immediately
- The `intro-mode` class is removed so the chat is fully restored for future G-key summons
- `fp-overlay` appears

(The `cdn-gallery:intro-seen` flag is already set by `main.js` synchronously right after `ui.playIntro()` is invoked, so skipping doesn't need to set it again — see "Persistence" below.)

### Return visits (localStorage `cdn-gallery:intro-seen === '1'`)

- `main.js` skips the `playIntro()` call entirely (existing guard at the call site)
- Player starts in the normal "click to explore" state with no intro

## Visual design

All styling uses the master design system — no new color tokens introduced.

- Font: `'Pixelify Sans', 'Segoe UI', system-ui, sans-serif` (already global)
- Panel background: `rgba(10,15,26,0.97)` (existing `#guide-dialog`)
- Border / accent: `1px solid #00d4ff`
- Glow: `0 0 24px rgba(0,212,255,0.5)` (existing `#guide-dialog`)
- Header name color: `#e0e8f0`
- Subtitle / footer color: `rgba(0,212,255,0.6)`
- Body text color: same as existing `.chat-msg.gatekeeper`

### `#chat-footer` (new)

```
▸ Space to continue  ·  ESC to skip
```

- Position: inside `#guide-dialog`, below `#chat-messages` and above where the input row/chips used to sit
- `font-size: 11px`
- `color: rgba(0,212,255,0.6)`
- `letter-spacing: 0.05em`
- `text-align: right`
- `margin-top: 8px`
- Only visible when `#gatekeeper-chat` has the `intro-mode` class

### `intro-mode` class on `#gatekeeper-chat`

Adds this variation to the chat panel:

- `#chat-chips` → `display: none`
- `#chat-input-row` → `display: none`
- `#chat-footer` → `display: block` (otherwise `display: none`)

The chat-close button (`#chat-close`) remains visible and clicking it acts as a skip (same as ESC).

## Interaction details

### Typewriter

- Fixed speed: **25ms per visible character**
- HTML tags (`<strong>...</strong>`) are emitted atomically: the typewriter treats each tag as zero-width and reveals the full tag in a single frame, so the typed-so-far string is always valid HTML.
- Emoji in the script (🪄) count as one visible character.

Algorithm:

```js
function* typewriteTokens(text) {
  // Split text into alternating chunks: visible text chars, or whole tags.
  // Yield one visible char at a time; yield whole tags in a single step.
  const tagRe = /<\/?[^>]+>/g;
  let i = 0;
  for (const match of text.matchAll(tagRe)) {
    while (i < match.index) yield text[i++]; // one visible char per yield
    yield match[0];                           // whole tag in one step
    i = match.index + match[0].length;
  }
  while (i < text.length) yield text[i++];
}
```

### Advance / skip handler

```js
function handleAdvanceInput() {
  if (isTyping) {
    completeCurrentLine();      // reveal rest of the line instantly
  } else if (currentLine < INTRO_SCRIPT.length - 1) {
    showNextLine();             // clear, begin typing next line
  } else {
    finishIntro();              // close dialog, markIntroSeen, restore chat, show fp-overlay
  }
}

function handleSkipInput() {
  finishIntro({ skipped: true });
}
```

### Which events count

- Space (`key === ' '`)  → advance
- Enter (`key === 'Enter'`) → advance
- Click on `#guide-dialog` (not on children with their own handlers) → advance
- Click on `#chat-close` → skip
- Escape (`key === 'Escape'`) → skip

Space/Enter are captured with a keydown listener on `document` that's added when the intro starts and removed when `finishIntro` runs. Click is captured with a click listener on `#guide-dialog`. ESC still flows through the existing global Escape handler (`closeGatekeeperChat` is already listed there and will be wrapped to call `finishIntro({ skipped: true })` when the intro is active).

## Code organization

### New: `src/intro.js`

Exports:

```js
/**
 * Play the intro dialogue. Returns a promise that resolves when the intro
 * finishes (advanced past the final line) or is skipped.
 *
 * @param {Object} options
 * @param {HTMLElement} options.chatOverlay    - #gatekeeper-chat root
 * @param {HTMLElement} options.chatHeaderName - #chat-header-name
 * @param {HTMLElement} options.chatMessages   - #chat-messages
 * @param {HTMLElement} options.chatFooter     - #chat-footer
 * @param {Array<{text: string, html?: boolean}>} options.script
 * @returns {Promise<{skipped: boolean}>}
 */
export function playIntro(options);
```

Internal: the typewriter function, the input handlers, the state machine (`idle` → `typing` → `waiting` → `typing-next` → `done`). No knowledge of the wider UI module or the app.

### Modified: `src/ui.js`

- Remove the current `playIntro()`, `appendIntroBubble()`, `renderIntroChips()`, `clearIntroTimers()`, and intro timer state.
- Replace `playIntro` export with a thin wrapper that imports `playIntro` from `./intro.js` and passes in the DOM elements. The wrapper also: sets the header name to "Jason" at start, adds the `intro-mode` class, removes it on completion, resets the header name back to "The Guide", renders the post-intro chips via the existing `renderIntroChips` logic (which stays — it's also used after intro completion).
- The `isIntroPlaying` boolean exposed for the chat-input gating stays, just driven by the wrapper.
- `INTRO_SCRIPT`, `INTRO_FLAG_KEY`, `hasSeenIntro`, `markIntroSeen` stay in `ui.js` unchanged.

### Modified: `src/main.js`

No import changes. The existing first-spawn block at `main.js:426` continues to work:

```js
if (!hasSeenIntro()) {
  ui.playIntro();
  markIntroSeen();
}
```

Note: `markIntroSeen()` is called synchronously right after `ui.playIntro()` — the flag is set as soon as the intro starts, so a mid-intro reload won't re-play the intro. The intro module itself does NOT call `markIntroSeen`; that responsibility stays with `main.js`. This avoids double-writing from two code paths.

### Modified: `index.html`

Add inside `#guide-dialog`, after `#chat-input-row` (so it sits at the bottom of the dialog):

```html
<div id="chat-footer" class="chat-footer">
  <span>▸ Space to continue · ESC to skip</span>
</div>
```

### Modified: `styles/main.css`

New rules (appended):

```css
/* Intro-mode: hide the regular chat chrome, show the "Space / ESC" footer */
#gatekeeper-chat.intro-mode #chat-chips,
#gatekeeper-chat.intro-mode #chat-input-row {
  display: none;
}
#gatekeeper-chat:not(.intro-mode) #chat-footer {
  display: none;
}
#chat-footer {
  font-size: 11px;
  color: rgba(0, 212, 255, 0.6);
  letter-spacing: 0.05em;
  text-align: right;
  margin-top: 8px;
}
```

## Tests (Vitest)

Add `src/tests/intro.test.js` with the new typewriter + input-handler tests. The existing `hasSeenIntro` / `markIntroSeen` / `INTRO_SCRIPT` tests in `src/tests/ui.test.js` stay as-is.

- `typewriteTokens('hello')` yields `'h', 'e', 'l', 'l', 'o'` one per step
- `typewriteTokens('a <strong>bold</strong> word')` yields `'a', ' ', '<strong>', 'b', 'o', 'l', 'd', '</strong>', ' ', 'w', 'o', 'r', 'd'` — the tags are emitted whole, not split
- Advance handler: during typing → reveals full line immediately (single call); after full line → clears and starts next
- Advance handler: at final line with line complete → resolves the `playIntro` promise with `{ skipped: false }`
- Skip handler (ESC or #chat-close click): resolves with `{ skipped: true }`
- `finishIntro` removes the keydown/click listeners it attached (verified by dispatching another keydown and asserting no state change)
- Emoji handling: `typewriteTokens('🪄 hi')` yields the emoji as a single char then space, h, i

Unit tests use fake timers for the 25ms/char timing.

## Persistence

Unchanged from the current implementation:

- Key: `cdn-gallery:intro-seen`
- Value: `"1"` once the intro has been completed or skipped
- Bad/missing values → intro plays (same as first visit)

## Open questions

None.

## References

- Reference image: Stardew Valley dialogue box with portrait + name plate
- Existing Guide chat pattern: `#gatekeeper-chat`, `#guide-portrait`, `#guide-dialog`, `.chat-msg` in `styles/main.css:1297-1400`
- Current intro implementation to replace: `src/ui.js:313-340` (`playIntro()`)
- Intro script + persistence helpers (kept): `src/ui.js:9-36` (`INTRO_SCRIPT`, `hasSeenIntro`, `markIntroSeen`)
- First-spawn call site (kept): `src/main.js:426`
- Design system tokens: `styles/main.css:1-10` (body font, colors), `#guide-dialog` rule for the panel look
