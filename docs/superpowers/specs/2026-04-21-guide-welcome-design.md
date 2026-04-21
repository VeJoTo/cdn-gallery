# Guide welcome / intro sequence — design

## Problem

When a player first enters the gallery experience, there is no orientation. They land in the glasshus exterior with no context for what the place is, who "the Guide" is, how to move, or that CDN (the Centre for Digital Narrative at the University of Bergen) is the subject of the whole experience. The Guide currently only opens on explicit click / `G` keypress, and its first message is a generic one-liner.

## Goals

- On the first spawn (glasshus exterior), the Guide auto-opens and greets the player.
- The intro must open with the line **"Welcome kids!"**
- The intro must establish that this is **where CDN resides** and that the gallery is **a visualization of the Centre for Digital Narrative at UiB's research**.
- The intro must teach basic **navigation** (WASD + mouse-look) and how to **summon the Guide back** (`G` key).
- The intro must honor the player's autonomy: they can skip through at their own pace.
- The intro does not replay on every page load.

## Non-goals

- Redesigning the Guide's persistent chat, chip list, or free-text answer system. Those stay as they are.
- Adding navigation hints to the fp-overlay or HUD. Navigation lives inside the Guide's dialogue only, so the chrome stays quiet.
- A tutorial with quests/checkpoints. Intro is a single short sequence, nothing more.

## Decisions

The brainstorm converged on a single path:

| Question | Choice |
|---|---|
| When does the intro fire? | First spawn (exterior), very first frame after load |
| Persona commitment | Character-driven — consistent wizardly voice |
| Bubble structure | Sequence of 4 bubbles, timed, skip-able |
| Navigation instructions | Inside the Guide's dialogue (not on the HUD) |
| CDN framing angle | "Stories in the digital age" — broad, accessible |
| Ending flourish | "Off you pop!" (wizardly) |
| Persistence | Once ever per browser (localStorage flag) |

## Script

Four bubbles, delivered in order. Exact text:

1. `Welcome kids! 🪄`
2. `You've just stepped into the home of CDN — the Centre for Digital Narrative at the University of Bergen. Everything you see here is a visualization of the research happening at the centre.`
3. `CDN studies how stories work in the digital age — games, AI that writes fiction, virtual worlds, interactive art. I'll be your guide through it.`
4. `Go ahead and look around: WASD to walk, mouse to look. You can call me back any time with the G key. Off you pop!`

Bold emphasis on `WASD`, `mouse`, and `G` in bubble 4 is applied via markup inside the message (the existing `appendChatMessage` sets `textContent`, so we will switch the intro-only path to build inline `<strong>` nodes).

After bubble 4 finishes, the existing chip row renders as normal (no change to chip list).

## Timing + skip behaviour

- Bubbles appear one at a time. Default delay between bubbles is **1200ms**.
- While the sequence is mid-flight, pressing **Space** or **Enter**, or clicking anywhere inside the chat bubble area, immediately reveals the next bubble (no wait).
- Skip is progressive, not all-at-once. One tap / click = one bubble forward. The player can tap through the whole sequence in ~200ms if they want.
- The chip row is hidden until the final bubble has appeared. This prevents the player from sending a question that arrives in the middle of the intro monologue.
- Once the final bubble has rendered, the Guide is in its normal interactive state.

## First-visit detection

- Key: `localStorage['cdn-gallery:intro-seen'] = '1'`.
- On spawn (first frame after `animate()` begins), if the flag is absent, call `ui.playIntro()` and set the flag. Any failure reading/writing localStorage (private mode, full storage) is caught and treated as "intro not seen yet" — the worst case is a returning player getting the intro once extra, which is tolerable.
- The `Reset View` button does not clear the flag. It simply teleports the player back to the exterior spawn; the Guide stays silent on subsequent resets.
- For local development, clearing the flag is done by `localStorage.removeItem('cdn-gallery:intro-seen')` in DevTools. Not exposed in UI.

## Interaction with the rest of the flow

- The intro unlocks the pointer while it plays (consistent with every other UI overlay in the app; the chat is the active UI and the cursor is needed to click chips or the Send button afterward).
- On a fresh load, the intro fires *before* the player has clicked the fp-overlay to lock their pointer. That is the intended ordering: chat appears first → player reads + closes → fp-overlay returns → player clicks to lock + explore. The CSS `:has()` rule added earlier on this branch already suppresses fp-overlay while the chat is open, so the two do not fight.
- If the player presses `G` before the intro has triggered (edge case: they open the Guide manually in the first second), the manual open wins — the intro-sequence state is marked "seen" and subsequent spawns won't replay. No double-intro.
- The Guide is openable manually (via `G`) as usual after the intro finishes. Manually opening the Guide later shows the existing one-liner greeting, not the intro sequence.

## Implementation notes

- New `ui.playIntro()` function in `src/ui.js` next to `openGatekeeperChat`. Encapsulates the 4-bubble sequence + timing + skip handling. Uses the same `chatMessages` container and reveal animation as the normal greeting.
- `ui.playIntro()` reuses `appendChatMessage` for bubbles 1-3 (plain text); bubble 4 uses a small helper that accepts inline `<strong>` markup since we want the key-name emphasis.
- New hook in `main.js` after `animate()` starts: one-shot check of the localStorage flag, calls `ui.playIntro()` if unseen.
- Skip handling: a single document-level `keydown` (Space/Enter) + `click` listener inside the chat container, registered by `playIntro` and removed when the final bubble lands.

## Testing

- Unit (vitest): a new test in `src/tests/ui.test.js` that stubs `document`/`localStorage`, calls `ui.playIntro()`, and asserts:
  - 4 messages land in `#chat-messages` after enough `setTimeout` ticks (use fake timers).
  - Skip via keypress advances bubble index correctly.
  - Flag is set in localStorage.
  - Chips hidden during sequence, visible after final bubble.
- Manual: fresh Chrome incognito → first load should trigger the sequence; reload same session → silent.

## Open questions

None remaining after the brainstorm — all choices locked above.
