# Achievements & XP — Design Spec

**Date:** 2026-04-29
**Branch:** `feature/achievements`
**Status:** Ready for implementation planning

---

## 1. Player Goal & Context

The CDN 3D gallery currently has four interactive exhibits — the **Globe** (hosting the Fin du Monde piece), the **Culture Map**, the **Book**, and the **TV**. Players can wander the gallery in any order, but there is no system that tracks which exhibits they have engaged with, no progression feedback, and no completion signal.

The achievements system gives the player:

1. A small sense of *progression* as they explore (cosmetic level rising in the inventory),
2. A soft *nudge* to visit all four exhibits (greyed-out preview tiles in the Achievements tab),
3. A *moment of reflection* at each unlock (themed copy that ties the achievement to what the exhibit is *about*, not just the act of opening it).

The system is **not** intended to gate content, present challenges, or test skill. It rewards exploration completeness, nothing more.

## 2. Scope

### Achievements (4 total)

| ID | Title (placeholder copy) | Description (placeholder) | Icon | XP |
|---|---|---|---|---|
| `globe` | Doomsday Theorist | "You watched the AI imagine the end of the world." | 🌍 | 100 |
| `cultureMap` | Cultural Cartographer | "You mapped the geography of digital narrative." | 🗺 | 100 |
| `book` | Folklorist | "You read the AI's retelling of a Norwegian folktale." | 📖 | 100 |
| `tv` | Archivist | "You spent time in the CDN broadcast archive." | 📺 | 100 |

> Titles and descriptions are **placeholders**. Final copy is the gallery author's call. The shape baked in: each title is a *role* the player has earned (not a verb); each description is a single quiet sentence in present-perfect tone, fitting the journal/scrapbook voice.

### Trigger semantics

Each achievement unlocks the **first time the player opens the corresponding exhibit overlay**. "Opens" is consistent across all four (chosen during brainstorming as the simplest, most uniform rule).

- Subsequent opens of an already-unlocked exhibit do nothing — no popup, no XP, no event. (Idempotency.)
- Closing an exhibit immediately after opening it still counts. The system does not measure engagement depth.

### XP & levels

- Each achievement awards **+100 XP**.
- The level threshold is **every 100 XP**, so each unlock = exactly +1 level.
- Player starts at **Level 1** with 0 XP. Max attainable is **Level 5** (after all 4 unlocks).
- Levels are **purely cosmetic**. They do not gate anything in the gallery, do not change visuals elsewhere, and do not unlock content.

### Visibility

- **Inventory only.** No HUD bar, no on-screen XP counter during play.
- The level + XP bar lives on the new Achievements tab inside the inventory scrapbook.

### Persistence

- All state persists forever in `localStorage`.
- Once earned, always earned (across page reloads, future visits, etc.).
- localStorage corruption / unavailability falls through to empty state silently.

---

## 3. System Architecture

### Module layout

A new module `src/achievements.js` is the single source of truth for achievement state. Every other file either calls into it or subscribes to its events.

```js
// src/achievements.js — public API

// Static definitions. Order = display order in the Achievements tab.
export const ACHIEVEMENTS = [
  { id: 'globe',       title: 'Doomsday Theorist',     description: 'You watched the AI imagine the end of the world.', icon: '🌍', xp: 100 },
  { id: 'cultureMap',  title: 'Cultural Cartographer', description: 'You mapped the geography of digital narrative.',    icon: '🗺',  xp: 100 },
  { id: 'book',        title: 'Folklorist',            description: 'You read the AI\'s retelling of a Norwegian folktale.', icon: '📖', xp: 100 },
  { id: 'tv',          title: 'Archivist',             description: 'You spent time in the CDN broadcast archive.',         icon: '📺', xp: 100 },
];

// Initialise on app boot — restores state from localStorage.
export function initAchievements();

// Called by scene code at the unlock moment. Idempotent: a second
// call for an already-unlocked id is a no-op (no popup, no XP).
// Suppresses the popup if the inventory is currently open.
export function unlock(id);

// Read-only state for the inventory UI.
// Returns { unlockedIds: Set<string>, xp: number, level: number, recent: Array<{id, ts}> }
export function getState();
export function isUnlocked(id);

// UI subscribes to this; receives CustomEvent with detail
// { id, definition, newXp, newLevel, recent }.
export const achievementEvents; // EventTarget; emits 'unlocked'
```

**Why this shape:**

- `unlock(id)` is the single call sites learn. The module decides whether to fire UI, persist, etc.
- Idempotency means scene code doesn't need a "have I already unlocked?" guard — it can call on every exhibit-open and the second time is a no-op.
- `EventTarget` is built-in (no dependency), works cleanly with vanilla DOM, and fits the codebase's no-framework style.

### Persistence shape

```
key: 'cdn-gallery:achievements'
value: {
  schemaVersion: 1,
  unlocked: { [id]: <timestampMs> }
}
```

- Timestamps power the "recent stamps" list (sort values desc, take top 3).
- `schemaVersion` future-proofs against shape changes.
- On read failure (missing key / parse error / quota exceeded): fall back to `{ unlocked: {} }`, log a `console.warn`, do not throw, do not block app boot.

### Trigger integration

One-line `unlock('<id>')` calls at exhibit-open sites:

| Scene / file | Call site | Achievement id |
|---|---|---|
| `src/scene/globe-screen.js` | When globe screen overlay is shown | `globe` |
| Culture map handler (location TBD during implementation — likely `ui.js` or `src/scene/`) | When map overlay opens | `cultureMap` |
| `src/ui.js` (book overlay handler) | Inside `openBook()` | `book` |
| `src/scene/tv.js` | When TV viewing overlay is shown | `tv` |

> **ASSUMPTION:** Each exhibit has a single, identifiable "open" moment in code. **IMPACT:** If an exhibit lacks one (e.g. open is implicit / always-on), trigger placement is unclear. **IF WRONG:** the achievement may fire incorrectly or never fire. **VALIDATE:** during implementation, locate the open call site for each of the 4 exhibits before writing the unlock call. If no clear site exists for an exhibit, raise it.

---

## 4. Toast UX (live unlock feedback)

### Concept

"A polaroid being added to the scrapbook." Drifts in from the top-right at a slight angle, rotates into a final tilt as it lands, holds, then drifts up-and-out.

### Layout

- Position: fixed, top-right, 16px from top and right.
- Size: 320px wide × 110px tall.
- z-index: above the 3D canvas, below modal overlays (so an open inventory or chat covers it).
- Composition: square polaroid icon block (left) + text block (right).
  - Top header: `Pixelify Sans`, small caps, "✦ Achievement"
  - Title: `Caveat`, ~22px, ink-brown `#3a2818`
  - Description: `Caveat`, ~14px italic
  - XP: `Pixelify Sans`, cyan `#00d4ff`, "+100 XP"
- Polaroid frame: cream `#f5f0e0` background, 8px padding, 2px solid border in aged-ink, soft drop shadow `2px 3px 8px rgba(0,0,0,0.2)`.
- Slight rotation: `rotate(-1.5deg)` final.
- Tiny cyan tape strip overlaid top-left corner of the polaroid icon block.

### Motion

| Phase | Duration | What happens |
|---|---|---|
| Enter | 350ms `cubic-bezier(.2,.8,.2,1.2)` | Slides from `translate(40px,-20px) rotate(-8deg) scale(.92)` → final tilt; tiny "settle" overshoot |
| Hold | 3500ms | Stays at `rotate(-1.5deg)`; barely-perceptible "paper breathing" wobble (±0.3deg, 4s loop) |
| Exit | 500ms ease-in | Drifts up `translateY(-30px)` and fades to opacity 0 |
| **Total** | **~4350ms** | |

> **Numbers Policy:** Enter / Hold / Exit timings above are **starting values**. Test plan: do players finish reading the title before the toast exits? If <80% pass on a quick playtest, increase Hold by +1000ms. If toast feels too long / blocking, decrease Hold by -500ms.

### Sound

- A single `~150ms` paper-flick / soft stamp click sample, peak `~-12dB` so it doesn't startle.
- Not a video-game ding.
- File: `public/sounds/achievement-chime.wav` (or `.ogg`/`.mp3` — final format chosen during implementation).
- If audio playback fails (autoplay blocked, no permissions): fail silently. Visual still fires.

### Queue behavior

- If a second unlock fires while a toast is on screen: queue it. Show one at a time, FIFO, with a ~200ms gap between toasts.
- If the inventory is open when an unlock fires: **suppress the popup entirely.** The polaroid will simply *be there* in the album when the player looks. Avoids competing UI.
- If the page tab is hidden when unlocks fire: hold the queue. On `visibilitychange` to visible, flush pending toasts (one at a time as normal).

### Accessibility

- Toast container has `role="status"` and `aria-live="polite"` so screen readers announce it.
- `prefers-reduced-motion: reduce` → 200ms cross-fade only. No slide, no rotate, no breathing wobble. Chime still plays (audio is independent of motion preference).

---

## 5. Inventory tab UX (Achievements)

### Concept

A double-page spread inside the existing scrapbook. The four pre-existing tab buttons — 🏆 Achievements, 👤 Profile, 📚 Resources, 🌐 CDN Website — become real, switchable tabs. Achievements becomes the new active state. The current "Tasks + Discoveries + Settings" view (which is what the inventory shows today) becomes the **Profile** tab.

> **Consequence:** the existing hardcoded "Discoveries" grid moves to the Profile tab. Its current cyan-bordered "found" tiles for *Game Room* and *TV Archive* remain there; they are not the same thing as achievements (Discoveries are room/feature unlocks; Achievements are exploration completion). They can coexist.

### Layout — Achievements tab

**Left page — "Curator's Notebook" (rank ribbon):**

- Header `Curator's Notebook` in `Caveat`, with the existing `.scrapbook-title` styling (ink-brown, bottom border).
- "✦ Level N" — `Caveat` 32px, level number large; ✦ glyph in cyan.
- Progress bar — 8px tall, cream background, cyan fill, 2px dashed inner border (echoing `.discovery-item` dashed pattern). Width fills the page column with appropriate padding.
  - **Bar math:** At Level N (N < max), fill = `(xp - (N-1)*100) / 100`, so the bar shows progress from current level toward next. At max level (N = total achievements + 1), fill = 100% and the bar carries a "MAX" badge instead.
- "X / Y XP" label below the bar — `Pixelify Sans`, small. **Format:** `<currentXp> / <nextLevelXp> XP` when below max, `<currentXp> XP — MAX` when at max.
- Encouraging subtitle in `Caveat` italic — derived from current level: e.g. *"Three of four exhibits visited"*, *"All exhibits visited"*. Templated by code from `unlocked.size` and `ACHIEVEMENTS.length`.
- "Recent stamps" list at bottom — last 1–3 unlocks with their unlock time formatted as `HH:mm` local. Format: bullet, achievement title, timestamp. `Caveat`. Hidden if list is empty.

**Right page — "Stamps & Souvenirs" (polaroid grid):**

- Header `Stamps & Souvenirs` in `Caveat` with `.scrapbook-title` styling.
- 2×2 grid of polaroids (one per achievement). Layout reuses `.polaroid` styling.
- Each polaroid shows: icon (large), title (small, polaroid-caption styling).
- Tilts alternate ±2deg per slot to suggest hand-placement.
- Hover on an unlocked polaroid (desktop): lifts slightly (`translateY(-3px) rotate(0deg)`), reveals the description as a tooltip below the icon.
- Touch (mobile / tablet): tap an unlocked polaroid to toggle its description; tap elsewhere or another polaroid to dismiss. Detected via `(hover: none)` media query so we don't fight the desktop hover behavior.

### Locked vs unlocked state

| State | Visual |
|---|---|
| **Unlocked** | White polaroid, full color, slight tilt, cyan tape corner overlay, icon crisp, title in `Caveat` ink-brown. Hover reveals description. |
| **Locked** | Same polaroid frame but `filter: grayscale(1) opacity(.55)`. Icon dim, title visible but in pencil-grey `#8a7a60`. **Description hidden.** No tape corner. No hover description. |

(Locked still shows icon + title — chosen during brainstorming as preview/greyed-out, not full mystery. Player can see *what* there is to find before finding it.)

### "New" badge (optional polish — flag for stretch)

If the player earns an achievement and then opens the inventory, the freshly-unlocked polaroid carries a tiny ✦ "new" badge top-right. Badge fades after first view of the Achievements tab. Tracked in localStorage as `seenSinceUnlock` per id.

> Marked optional — implement if time allows, otherwise skip and keep on the backlog.

### Tab switching behavior

- Clicking a tab swaps the page content; tabs themselves stay in place.
- Active tab gets a slight `translateX(8px)` and stronger shadow so it visually "sticks out" from the page.
- The existing `.scrapbook-tab:nth-child(N)` pastel backgrounds remain (yellow / pink / blue / green).
- Default open tab: **Profile** (preserves the current inventory experience).

---

## 6. Edge cases

| Case | Behavior |
|---|---|
| Inventory open when unlock fires | Popup suppressed; polaroid just appears in the album when the player looks. State + XP still update. |
| Page tab hidden when unlocks fire | Queue held; flushed FIFO on `visibilitychange` to visible. |
| Two unlocks within 100ms | Queue, show one at a time, 200ms gap. |
| `Audio` play blocked (autoplay policy) | Chime fails silently; visual still fires. |
| `prefers-reduced-motion: reduce` | 200ms cross-fade replaces slide. Chime unaffected. |
| Player earns 4th achievement | "Recent stamps" list shows latest 3 (older drops off list, still visible as polaroid). |
| localStorage parse error | Fall through to empty state, `console.warn`, no throw. |
| localStorage quota exceeded on write | `console.warn`, in-memory state still updates for the session, do not throw. |
| User clears localStorage | Achievements legitimately reset. (Not abuse — that's user choice.) |
| `unlock('unknown-id')` | `console.warn`, no-op. Defensive — should never happen. |

---

## 7. Testing

### Automated (vitest, follows existing `src/tests/` pattern)

`src/tests/achievements.test.js` covers:

1. `unlock()` is idempotent — second call for same id is no-op (no event emitted, no XP added).
2. Level math — N unlocked = Level N+1, XP = N × 100.
3. Persistence round-trip — `unlock` → reload state → same unlocked set.
4. Schema version handling — unknown future schemaVersion → fall back to empty.
5. Corrupted localStorage recovery — invalid JSON → empty state, no throw.
6. Unknown id passed to `unlock()` → no-op + warn.
7. Event emission — `achievementEvents` fires `unlocked` event with correct detail shape on first unlock only.
8. `getState().recent` returns up to 3 most-recent unlocks ordered by timestamp desc.

### Manual playtest checklist (observational, not automated)

| # | Scenario | Pass criteria |
|---|---|---|
| 1 | New player opens book cold | Can describe what the popup meant in their own words ("I got a sticker / progress thing") |
| 2 | Visit all 4 exhibits in one session | Inventory shows Level 5, all 4 polaroids unlocked, "recent stamps" list shows last 3 |
| 3 | Earn 2 achievements → refresh page → check inventory | Both still unlocked, level still 3 |
| 4 | Set browser `prefers-reduced-motion: reduce`, trigger popup | Toast fades, no slide/rotate/wobble |
| 5 | Open book → close → re-open book | Second open does NOT show popup (idempotency) |
| 6 | Open inventory, then trigger a synthetic unlock | Popup suppressed; polaroid appears in tab when player looks |

---

## 8. Files touched

| File | Change |
|---|---|
| `src/achievements.js` | **NEW** — module + state + events + persistence |
| `src/scene/globe-screen.js` | +1 line (`unlock('globe')` at open site) |
| `src/scene/tv.js` | +1 line (`unlock('tv')` at open site) |
| `src/ui.js` | +1 line (`unlock('book')` in `openBook`); +1 line (`unlock('cultureMap')` at culture map open); tab-switching logic; new Achievements tab content; move existing inventory body to Profile tab |
| `src/main.js` | Call `initAchievements()` at boot; mount toast container |
| `src/hud.js` | Toast component (DOM rendering, subscribe to `achievementEvents`) |
| `styles/main.css` | Toast styles, achievements tab styles, tab switching active states |
| `public/sounds/achievement-chime.wav` | **NEW** — ~150ms paper-flick sample |
| `src/tests/achievements.test.js` | **NEW** — automated tests |

---

## 9. Out of scope

- HUD-style live XP counter during play (deliberately rejected — Question 6 picked inventory-only).
- Levels with gameplay effects / unlocks (deliberately rejected — Question 4 picked cosmetic-only).
- More than 4 achievements (system supports it via the `ACHIEVEMENTS` array, but no design beyond the existing four exhibits).
- Achievement sharing / export / leaderboards.
- Localization of achievement copy.
- Per-exhibit "depth" tracking (e.g. "read all book pages") — current trigger is uniformly "first open."

---

## 10. Open items for implementation phase

- Locate exact open-call sites for the Globe, Culture Map, Book, and TV overlays. The Book is known (`openBook` in `ui.js`). Others to be confirmed.
- Source / record the chime sample. Suggest a public-domain paper-flick or stamp-click sample.
- Decide if the "new" badge polish ships in v1 or stays on backlog.
- Confirm final achievement copy with the gallery author. Placeholders are functional but the author may want different titles/descriptions.
