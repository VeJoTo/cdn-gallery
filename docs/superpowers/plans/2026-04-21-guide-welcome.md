# Guide Welcome / Intro Sequence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play a 4-bubble skippable Guide intro the first time a player loads the gallery, introducing CDN and basic navigation. Fires once per browser via localStorage.

**Architecture:** Add a pure, exportable script constant and two localStorage helpers to `src/ui.js`. Inside `createUI()`, add a `playIntro()` function that renders the four bubbles into the existing chat DOM with timed reveals and tap-to-advance skip. `main.js` fires `playIntro()` once on startup if the flag is unset. The manual `G` hotkey also sets the flag to avoid double-intros.

**Tech Stack:** Vanilla ES modules, vitest (node env), existing chat DOM in `index.html`, existing CSS in `styles/main.css`.

---

## Scope Check

Spec is a single self-contained subsystem (Guide first-visit intro). No decomposition needed. Close-chat-re-lock is already implemented in an earlier commit on this branch and is explicitly out of scope for this plan.

## File Structure

| File | Action | Purpose |
|---|---|---|
| `src/ui.js` | Modify | Add pure `INTRO_SCRIPT`, `INTRO_FLAG_KEY`, `hasSeenIntro()`, `markIntroSeen()` at module top. Add `playIntro()` inside `createUI()` and expose it on the returned object. |
| `src/main.js` | Modify | Import the new flag helpers. Fire `ui.playIntro()` on startup if unseen. Mark seen inside the `KeyG` handler so manual opens don't leave the flag unset. |
| `src/tests/ui.test.js` | Modify | Unit tests for the pure helpers (script shape + flag getter/setter). DOM behaviour of `playIntro()` is verified manually in the browser (see Task 4) because the vitest env is `node` and adding jsdom is out of scope. |

Test env is `node` (`vite.config.js`), so pure helpers are testable directly; DOM-heavy behaviour (timed bubble reveals, skip handlers) gets a documented manual-browser checklist.

---

## Task 1: Pure intro helpers in ui.js (script + flag)

**Files:**
- Modify: `src/ui.js` (top of file, after `escapeHtml` and before `BOOK_PAGES`)
- Test: `src/tests/ui.test.js` (append at end of file)

- [ ] **Step 1: Write the failing tests**

Append to `src/tests/ui.test.js`:

```javascript
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

  it('bubble 4 carries inline strong markup for the key names', () => {
    const b4 = INTRO_SCRIPT[3];
    expect(b4.html).toBe(true);
    expect(b4.text).toContain('<strong>WASD</strong>');
    expect(b4.text).toContain('<strong>mouse</strong>');
    expect(b4.text).toContain('<strong>G</strong>');
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/ui.test.js`
Expected: FAIL — `INTRO_SCRIPT is not defined` / `INTRO_FLAG_KEY is not defined` / `hasSeenIntro is not defined` / `markIntroSeen is not defined`.

- [ ] **Step 3: Add the script constant and flag helpers to `src/ui.js`**

Insert at the top of `src/ui.js`, **directly after the `escapeHtml` function and before `export const BOOK_PAGES`**:

```javascript
export const INTRO_FLAG_KEY = 'cdn-gallery:intro-seen';

export const INTRO_SCRIPT = [
  { text: 'Welcome kids! 🪄' },
  { text: "You've just stepped into the home of CDN — the Centre for Digital Narrative at the University of Bergen. Everything you see here is a visualization of the research happening at the centre." },
  { text: "CDN studies how stories work in the digital age — games, AI that writes fiction, virtual worlds, interactive art. I'll be your guide through it." },
  {
    html: true,
    text: 'Go ahead and look around: <strong>WASD</strong> to walk, <strong>mouse</strong> to look. You can call me back any time with the <strong>G</strong> key. Off you pop!'
  }
];

// Safe localStorage readers — browser private mode / quota issues never break the app.
export function hasSeenIntro(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!storage) return false;
  try {
    return storage.getItem(INTRO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!storage) return;
  try {
    storage.setItem(INTRO_FLAG_KEY, '1');
  } catch {
    /* swallow — worst case the player sees the intro again, which is tolerable */
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/ui.test.js`
Expected: PASS — all existing tests plus the 11 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/ui.js src/tests/ui.test.js
git commit -m "feat(guide): intro script constant + localStorage flag helpers"
```

---

## Task 2: `playIntro()` inside `createUI()`

**Files:**
- Modify: `src/ui.js` (inside the `createUI` function, after `openGatekeeperChat` and `closeGatekeeperChat`, and in the returned object)

- [ ] **Step 1: Add the `playIntro` function**

Inside `createUI`, **immediately after the existing `closeGatekeeperChat` block (around line 242, right after `chatClose.addEventListener('click', closeGatekeeperChat);`)**, add:

```javascript
  // ── Intro sequence (first-visit welcome; see docs/superpowers/specs/…) ──
  const INTRO_BUBBLE_DELAY_MS = 1200;
  let introTimer = null;
  let introSkipHandler = null;

  function clearIntroTimers() {
    if (introTimer) { clearTimeout(introTimer); introTimer = null; }
    if (introSkipHandler) {
      document.removeEventListener('keydown', introSkipHandler);
      chatMessages.removeEventListener('click', introSkipHandler);
      introSkipHandler = null;
    }
  }

  function appendIntroBubble(entry) {
    const div = document.createElement('div');
    div.className = 'chat-msg gatekeeper';
    if (entry.html) div.innerHTML = entry.text;
    else            div.textContent = entry.text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderIntroChips() {
    chatChips.innerHTML = SUGGESTED_QUESTIONS.map(q =>
      `<button class="chat-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`
    ).join('');
    chatChips.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => sendChatMessage(chip.dataset.q));
    });
  }

  function playIntro() {
    clearIntroTimers();
    chatMessages.innerHTML = '';
    chatChips.innerHTML = '';  // chips hidden until last bubble lands

    gatekeeperChat.classList.remove('hidden');
    requestAnimationFrame(() => gatekeeperChat.classList.add('open'));

    let idx = 0;
    function showNext() {
      if (idx >= INTRO_SCRIPT.length) {
        clearIntroTimers();
        renderIntroChips();
        return;
      }
      appendIntroBubble(INTRO_SCRIPT[idx]);
      idx++;
      if (idx < INTRO_SCRIPT.length) {
        introTimer = setTimeout(showNext, INTRO_BUBBLE_DELAY_MS);
      } else {
        // Final bubble just landed — reveal chips, drop skip handlers.
        clearIntroTimers();
        renderIntroChips();
      }
    }

    introSkipHandler = (e) => {
      // Keyboard: Space / Enter. Click: anywhere inside #chat-messages.
      if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'Enter') return;
      if (e.type === 'keydown' && e.target && e.target.tagName === 'INPUT') return;
      e.preventDefault && e.preventDefault();
      if (introTimer) { clearTimeout(introTimer); introTimer = null; }
      showNext();
    };
    document.addEventListener('keydown', introSkipHandler);
    chatMessages.addEventListener('click', introSkipHandler);

    // Show the first bubble immediately.
    showNext();
  }
```

- [ ] **Step 2: Expose `playIntro` on the returned UI object**

Find the `return { ... }` block at the bottom of `createUI` (around line 723) and add `playIntro` to the list:

```javascript
  return {
    updateHUD,
    openPanelDrawer,
    openGatekeeperChat,
    playIntro,
    openInventory,
    openBook,
    openRabbitHole,
    openReport,
    openFinDuMonde,
    updateHints
  };
```

- [ ] **Step 3: Ensure `closeGatekeeperChat` cancels an in-flight intro**

Replace the existing `closeGatekeeperChat` body (around line 239) with:

```javascript
  function closeGatekeeperChat() {
    clearIntroTimers();
    gatekeeperChat.classList.remove('open');
    setTimeout(() => gatekeeperChat.classList.add('hidden'), 300);
  }
```

Note: `clearIntroTimers` is defined later in the same scope; function hoisting for `function` declarations makes this safe, but since we're inside `createUI` it runs at call time anyway. Confirm by running the build in Step 5.

- [ ] **Step 4: Build**

Run: `npx vite build`
Expected: `✓ built in …s` with no errors.

- [ ] **Step 5: Manual smoke test in browser**

1. Start dev server if not already: `npm run dev`.
2. Open DevTools → Application → Local Storage → `http://localhost:5173`. Delete the `cdn-gallery:intro-seen` entry if present.
3. Add a temporary one-liner to `src/main.js` (inside the `animate()` function, or right after it) to trigger the intro for testing:
   ```javascript
   window.__playIntro = () => ui.playIntro();
   ```
4. Reload, open DevTools console, run `__playIntro()`.
5. Verify:
   - Four bubbles appear in sequence, one every ~1.2 seconds.
   - Bubble 4 renders `WASD`, `mouse`, and `G` in bold.
   - No chips appear while bubbles are landing. Chips appear after bubble 4.
   - Press Space during bubble 2 → bubble 3 appears immediately. Press again → bubble 4.
   - Click inside the chat area: also advances.
   - Close the chat (X button) → re-opens cleanly on next `__playIntro()` call.
6. Remove the temporary `window.__playIntro = …` line (it'll be obsolete after Task 3 anyway).

- [ ] **Step 6: Commit**

```bash
git add src/ui.js
git commit -m "feat(guide): playIntro() renders 4-bubble skippable welcome sequence"
```

---

## Task 3: Wire first-spawn trigger + G-hotkey flag-marking in main.js

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add the flag helpers to the ui.js import**

Find the existing import near the top of `src/main.js` (around line 8):

```javascript
import { createUI } from './ui.js';
```

Change it to:

```javascript
import { createUI, hasSeenIntro, markIntroSeen } from './ui.js';
```

- [ ] **Step 2: Mark the intro seen whenever the player opens the Guide manually with `G`**

Find the `KeyG` case inside the `keydown` handler (around line 81) and add `markIntroSeen()`:

```javascript
    case 'KeyG':
      controls.unlock();
      ui.openGatekeeperChat();
      markIntroSeen();
      break;
```

- [ ] **Step 3: Fire the intro on first spawn**

Find the `animate()` call at the bottom of `src/main.js` (around line 421) and replace:

```javascript
animate();
```

with:

```javascript
animate();

// First-spawn welcome — fires once per browser. Manual `G` before this
// point sets the flag too, so the player never sees two intros.
if (!hasSeenIntro()) {
  ui.playIntro();
  markIntroSeen();
}
```

- [ ] **Step 4: Build**

Run: `npx vite build`
Expected: `✓ built in …s` with no errors.

- [ ] **Step 5: Manual browser verification**

1. In DevTools Application → Local Storage, delete `cdn-gallery:intro-seen`.
2. Hard-reload the dev page.
3. Verify:
   - Chat opens **before** the fp-overlay can be clicked. The dark "Click to explore" prompt is suppressed (CSS `:has()` rule, already on branch).
   - Four bubbles play. Skip works via Space/click. Chips appear after bubble 4.
   - Close the chat — pointer locks instantly (existing commit on this branch), fp-overlay does not flash in.
   - Reload (soft). Intro does **not** play again; fp-overlay shows on load as normal.
4. Edge case — manual G before intro fires:
   - Delete `cdn-gallery:intro-seen` again.
   - Reload — but immediately press `G` while the first bubble is landing (or before it appears).
   - Verify only the normal one-liner Guide opens. Soft-reload again: intro does **not** play (flag was set by the G handler).

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat(guide): fire welcome intro once per browser on first spawn"
```

---

## Task 4: Run the full test suite + final build

**Files:** (none — verification step)

- [ ] **Step 1: Run vitest**

Run: `npx vitest run`
Expected: all tests pass, including the 11 new ones from Task 1. Output should end with `Tests  29 passed (29)` or similar — verify count went up by 11 from the pre-plan baseline of 18.

- [ ] **Step 2: Run vite build**

Run: `npx vite build`
Expected: `✓ built in …s`, no warnings other than the existing chunk-size advisory.

- [ ] **Step 3: Commit any stray changes / verify git is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

If there are stray changes from the temporary `window.__playIntro` debug line, remove them:

```bash
git diff src/main.js    # inspect
# if the temp line is still there:
# edit src/main.js to remove it, then:
git add src/main.js
git commit -m "chore: drop temporary playIntro debug hook"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| "Welcome kids!" opens the sequence | Task 1 (tested) |
| Says this is where CDN resides + visualization of UiB research | Task 1 (INTRO_SCRIPT bubble 2, tested) |
| Navigation instructions | Task 1 (bubble 4, tested with strong markup) |
| `G` summons Guide | Task 1 (bubble 4, tested) |
| Skip via Space/Enter/click | Task 2, Step 1 (`introSkipHandler`) |
| Chips hidden during sequence | Task 2, Step 1 (`chatChips.innerHTML = ''` + `renderIntroChips` only on final) |
| 1200ms between bubbles | Task 2, Step 1 (`INTRO_BUBBLE_DELAY_MS`) |
| localStorage key `cdn-gallery:intro-seen` | Task 1 (INTRO_FLAG_KEY, tested) |
| Fails safely if storage unavailable | Task 1 (hasSeenIntro/markIntroSeen try/catch, tested) |
| First-spawn trigger after animate() | Task 3, Step 3 |
| Manual `G` before intro fires marks seen | Task 3, Step 2 |
| Reset View does not clear the flag | Not touched — flag lives only on G + first-spawn paths |
| fp-overlay suppressed while chat open | Already on branch (CSS `:has()` rule) |
| Close → instant re-lock | Already on branch (main.js chat-close listener) |

All spec requirements covered.

**Placeholder scan:** No TBD/TODO/vague steps. All code is concrete and complete.

**Type/name consistency:** `INTRO_SCRIPT`, `INTRO_FLAG_KEY`, `hasSeenIntro`, `markIntroSeen`, `playIntro`, `INTRO_BUBBLE_DELAY_MS` are used consistently across tasks. `appendIntroBubble` / `renderIntroChips` / `clearIntroTimers` / `introTimer` / `introSkipHandler` are all defined and used in Task 2 only. The existing `SUGGESTED_QUESTIONS`, `chatMessages`, `chatChips`, `gatekeeperChat`, `escapeHtml`, `sendChatMessage` are referenced where they already exist in `src/ui.js`.
