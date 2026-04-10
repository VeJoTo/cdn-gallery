# Neon Arcade Gaming Room — Design Spec

## Goal

Restyle the CDN 3D gallery gaming room from its current warm-brown placeholder theme to a **Spiritfarer / ocean-night base with neon arcade lighting**, and flesh out the room with **gaming decor** — posters, a desk with monitors and a globe, gaming chair, bookshelf, neon sign, rug, mini fridge, floor lamp.

## Palette

| Role | Hex | Usage |
|---|---|---|
| Void black | `#050d14` | Scene background, fog, ceiling, button hover text |
| Ocean navy | `#0d1b2a` | Floor, bean bag base, desk top |
| Teal-slate | `#0a1a28` | Walls, control panels, fridge body |
| Dark teal | `#1b3a4b` | Table, Gatekeeper robe, message bubbles, chair frame |
| Electric teal | `#00e5ff` | Right screen emissive, neon point light, UI borders/glow, XP bar |
| Neon pink | `#ff006e` | Left screen emissive, neon point light, neon sign, chat chip hover |
| Purple | `#9b00ff` | Centre fill light, bean bag cushion, chat border, user bubbles |
| Gold | `#ffd166` | Key directional light, Gatekeeper stars, UI titles, hotspot hints, XP level |
| Cool teal-white | `#90e0ef` | UI body text, breadcrumb, monitor base tint |

---

## Scene & Room (`src/scene/room.js`)

- **Scene background + fog colour**: `#050d14`
- **Floor** `MeshLambertMaterial`: `#0d1b2a`
- **Walls** `MeshLambertMaterial`: `#0a1a28`
- **Ceiling** `MeshLambertMaterial`: `#050d14`
- **AmbientLight**: colour `#1a3a5c`, intensity `0.2`
- **DirectionalLight**: colour `#ffd166`, intensity `0.6` (warm gold key, casts shadows)
- **PointLight — neon pink**: colour `#ff006e`, intensity `1.5`, distance `8`, position `(-2.5, 1.5, 0.5)`
- **PointLight — electric teal**: colour `#00e5ff`, intensity `1.5`, distance `8`, position `(2.5, 1.5, 0.5)`
- **PointLight — purple fill**: colour `#9b00ff`, intensity `0.8`, distance `12`, position `(0, 2.5, 1.5)`
- **Emissive floor strips**: two `BoxGeometry(7, 0.02, 0.06)` strips along the base of the left and right walls at `y: 0.01`. Left strip `MeshStandardMaterial` colour + emissive `#ff006e` @ `1.0`. Right strip `#00e5ff` @ `1.0`. No shadow casting.

---

## Objects (`src/scene/objects.js`)

### Existing — Arcade cabinets

| Part | Colour | Notes |
|---|---|---|
| Body | `#080f18` | Near-black shell |
| Bezel | `#030810` | Darkest |
| Screen — left cabinet | `#ff006e` + emissive `#ff006e` @ `1.2` | Neon pink |
| Screen — right cabinet | `#00e5ff` + emissive `#00e5ff` @ `1.2` | Electric teal |
| Control panel | `#0d1a28` | |
| Joystick base + stick | `#0a0a0a` | |
| Button 0 | `#ff006e` + emissive @ `0.8` | |
| Button 1 | `#00e5ff` + emissive @ `0.8` | |
| Button 2 | `#ffd166` + emissive @ `0.8` | |

`buildArcadeCabinet(xPos, screenColor)` — second arg is hex int. `createObjects` passes `0xff006e` left, `0x00e5ff` right.

### Existing — Table

| Part | Colour |
|---|---|
| Top | `#1b3a4b` |
| Legs | `#0d1b2a` |
| Cards | `#e0f7ff` |

### Existing — Bean bags

| Part | Colour |
|---|---|
| Base | `#1b3a4b` |
| Cushion | `#9b00ff` |

---

### NEW — Gaming desk + dual monitors + globe

`buildDesk()` returns a `THREE.Group`. Position: against the back wall, right of centre, `(1.8, 0, -2.6)`. Faces forward (toward the room). The back of the desk (`z ≈ -3.05`) sits flush against the back wall at `z = -3.5`.

- **Desk top**: `BoxGeometry(2.4, 0.06, 0.9)`, `#0d1b2a`, position `y: 0.85`.
- **Desk legs**: 4 × `BoxGeometry(0.06, 0.85, 0.06)`, `#0a0a0a`, at the corners.
- **Left monitor**: bezel `BoxGeometry(0.7, 0.45, 0.04)` `#030810` + screen `BoxGeometry(0.66, 0.41, 0.02)` `MeshStandardMaterial` `#9b00ff` emissive `#9b00ff` @ `1.0`. Position `(-0.55, 1.25, -0.2)` (relative to desk group origin), tilted slightly inward `rotation.y = 0.15`.
- **Right monitor**: same geometry, screen colour `#00e5ff` emissive `#00e5ff` @ `1.0`. Position `(0.55, 1.25, -0.2)`, `rotation.y = -0.15`.
- **Monitor stands**: 2 × `BoxGeometry(0.08, 0.18, 0.08)` `#0a0a0a`, under each monitor.
- **Keyboard**: `BoxGeometry(0.55, 0.02, 0.18)` `#0a0a0a` with thin emissive `#ff006e` strip on top edge (`BoxGeometry(0.55, 0.005, 0.005)` emissive @ `0.8`). Position `(0, 0.89, 0.05)`.
- **Mouse**: `BoxGeometry(0.06, 0.02, 0.1)` `#0a0a0a` at `(0.4, 0.89, 0.05)`.
- **Globe** (`buildGlobe()` called as part of desk group):
  - **Stand base**: `CylinderGeometry(0.06, 0.08, 0.04, 12)` `#1b3a4b` at `(-1.0, 0.91, 0.1)` (relative to desk).
  - **Stand arc**: `TorusGeometry(0.13, 0.008, 8, 16, Math.PI)` `#1b3a4b`, rotated to form a half-arc holding the sphere.
  - **Sphere**: `SphereGeometry(0.12, 24, 16)` with a `CanvasTexture` showing simple stylized continents (dark teal `#1b3a4b` ocean, gold `#ffd166` continents drawn as rough blobs). Position centred in the arc.
  - The globe's userData on the parent group sets `clickable: true, action: 'openPanel', panelId: 'globe', panelTitle: 'CDN International Reach'`.
  - The sphere mesh is referenced from the desk group (`group.userData.globeMesh = sphere`) so the update loop can rotate it: `sphere.rotation.y += delta * 0.3`.
- The desk group root sets `userData = { clickable: true, hotspot: 'desk' }`. Camera flies in close to the desk on click. The monitors and globe inside are individually clickable for their actions (handled by the click walker in `navigation.js` finding the nearest `clickable` ancestor — globe wins if clicked directly).
- The left monitor mesh sets `userData = { clickable: true, action: 'openPanel', panelId: 'desk-research', panelTitle: 'Digital Storytelling Research' }`.

### NEW — Gaming chair

`buildGamingChair()`. Position: in front of the desk, `(1.8, 0, -1.7)`, facing the desk (`rotation.y = Math.PI`).

- **Seat base**: `BoxGeometry(0.5, 0.08, 0.5)` `#1b3a4b` at `y: 0.45`.
- **Backrest**: `BoxGeometry(0.5, 0.85, 0.08)` `#1b3a4b` at `(0, 0.92, -0.21)`.
- **Headrest accent**: `BoxGeometry(0.5, 0.12, 0.08)` `#ff006e` at `(0, 1.28, -0.21)` — neon pink stripe.
- **Backrest accent strip**: `BoxGeometry(0.06, 0.85, 0.085)` `#00e5ff` at `(0, 0.92, -0.205)` — vertical teal accent down the centre.
- **Armrests**: 2 × `BoxGeometry(0.08, 0.08, 0.4)` `#0a0a0a` at `(±0.29, 0.6, 0)`.
- **Wheel base**: `CylinderGeometry(0.04, 0.04, 0.4, 6)` `#0a0a0a` at `y: 0.2`.
- **Wheel star**: 5 × `BoxGeometry(0.25, 0.04, 0.04)` `#0a0a0a` rotated around `y: 0.02`, like a chair foot star.

### NEW — Bookshelf

`buildBookshelf()`. Position: against the **left wall**, `(-3.4, 0, -2.5)`, rotated `rotation.y = Math.PI / 2` to face into the room.

- **Frame**: `BoxGeometry(1.2, 1.8, 0.3)` `#1b3a4b` at `y: 0.9`.
- **Shelves**: 3 × `BoxGeometry(1.15, 0.03, 0.28)` `#0a1a28` at heights `y: 0.5, 0.95, 1.4`.
- **Books**: ~12 small `BoxGeometry(0.08, 0.22, 0.18)` boxes per shelf in alternating colours from the palette (`#ff006e`, `#00e5ff`, `#9b00ff`, `#ffd166`, `#1b3a4b`). Stand them upright on each shelf with slight x-spacing variation.

### NEW — Wall posters

3 × `buildPoster(x, y, panelId)`. All on the **back wall** (`z: -3.45`, facing into the room with no rotation).

- Each: `PlaneGeometry(0.8, 1.1)`, `MeshBasicMaterial` with a `CanvasTexture`. Canvas draws a rectangular neon-frame poster (3px stroke, alternating frame colours `#ff006e`, `#00e5ff`, `#9b00ff` per poster), title text in `#ffd166`, simple geometric shapes (circle, triangle) as placeholder game art.
- Positions: `(-2.5, 2.0, -3.45)`, `(-1.4, 2.0, -3.45)`, `(-0.3, 2.0, -3.45)` — three on the left half of the back wall (right half is occupied by the desk and neon sign).
- `userData = { clickable: true, action: 'openPanel', panelId: 'poster-N', panelTitle: 'Game Poster N' }`.

### NEW — Neon sign "GAME ROOM"

`buildNeonSign()`. Position: on the back wall above the desk, `(1.8, 2.9, -3.4)`.

- Build the letters G-A-M-E and R-O-O-M from groups of `BoxGeometry(0.04, 0.18, 0.04)` segments (stick-letter style) using `MeshStandardMaterial` with colour + emissive `#ff006e`, emissiveIntensity `1.4`.
- Two rows: "GAME" on top (`y: 3.0`), "ROOM" below (`y: 2.75`). Total width ~1.6 units, centred.
- Helper `letterSegments` map gives each letter the segment positions (top, middle, bottom, left, right, etc.). Use a small lookup table for the 7 letters G, A, M, E, R, O, M needed.

### NEW — Rug

`buildRug()`. Position: floor centre, `(0, 0.005, 0.5)`.

- `PlaneGeometry(3.5, 2.5)`, rotated `rotation.x = -Math.PI/2`.
- `MeshStandardMaterial` colour `#1b3a4b` + a `CanvasTexture` drawn with concentric neon rings (`#ff006e`, `#00e5ff`, `#9b00ff`) on a dark background. `receiveShadow = true`.

### NEW — Mini fridge

`buildMiniFridge()`. Position: back-left corner, `(-3.0, 0, -2.8)`.

- **Body**: `BoxGeometry(0.7, 1.0, 0.6)` `#0a1a28` at `y: 0.5`.
- **Door split line**: `BoxGeometry(0.72, 0.01, 0.605)` `#030810` at `y: 0.65` (horizontal trim).
- **Handle**: `BoxGeometry(0.04, 0.2, 0.04)` `#00e5ff` emissive @ `0.6` at `(0.3, 0.7, 0.31)`.
- **Top emissive strip**: `BoxGeometry(0.7, 0.02, 0.6)` `MeshStandardMaterial` `#00e5ff` emissive @ `1.0` at `y: 1.01`.
- `castShadow = true`, `receiveShadow = true`.

### NEW — Magical pedestal with book

`buildPedestal()` returns a `THREE.Group` at `(-2.8, 0, 2.6)` (front-left corner).

- **Column**: `CylinderGeometry(0.18, 0.22, 1.0, 12)` `MeshLambertMaterial` `#1b3a4b` at `y: 0.5`. `castShadow = true`.
- **Top plate**: `CylinderGeometry(0.25, 0.25, 0.04, 12)` `MeshLambertMaterial` `#0a1a28` at `y: 1.02`.
- **Glow ring**: `TorusGeometry(0.22, 0.012, 8, 24)` `MeshStandardMaterial` `#9b00ff` emissive `#9b00ff` @ `1.4`, at `y: 1.04`, rotated `rotation.x = -Math.PI / 2`.
- **Pedestal point light**: `#9b00ff`, intensity `0.6`, distance `2.5`, at `y: 1.2` (attached to the pedestal group).
- **Book group** (child of pedestal group, hovers above the top plate):
  - **Left page**: `BoxGeometry(0.18, 0.01, 0.22)` `MeshStandardMaterial` `#f5d0a9` (parchment) emissive `#ffd166` @ `0.4`, position `(-0.095, 1.22, 0)`, rotation `(0, 0, -0.08)` (slight tilt for open-book look).
  - **Right page**: same geometry & material, position `(0.095, 1.22, 0)`, rotation `(0, 0, 0.08)`.
  - **Spine**: `BoxGeometry(0.01, 0.012, 0.22)` `#1b3a4b` at `(0, 1.215, 0)`.
- **Book bobbing**: pedestal group exposes `userData.bookGroup` so the update loop can do `bookGroup.position.y = 0.04 * Math.sin(time * 1.5)` and `bookGroup.rotation.y += delta * 0.2` (slow rotation).
- The pedestal group root sets `userData = { clickable: true, hotspot: 'pedestal', action: 'openBook' }`. The click handler calls `nav.goTo('pedestal')` AND `ui.openBook()` after the camera transition completes (or both immediately — see Click Handling below).

### NEW — Floor lamp

`buildFloorLamp()`. Position: between the bean bags and the right wall, `(2.6, 0, 1.8)`.

- **Base**: `CylinderGeometry(0.15, 0.15, 0.04, 12)` `#0a0a0a` at `y: 0.02`.
- **Pole**: `CylinderGeometry(0.025, 0.025, 1.6, 8)` `#0a0a0a` at `y: 0.84`.
- **Tube shade**: `CylinderGeometry(0.06, 0.06, 0.5, 12)` `MeshStandardMaterial` colour + emissive `#9b00ff` @ `1.2` at `y: 1.7`.
- **Halo PointLight**: colour `#9b00ff`, intensity `0.5`, distance `4`, at `y: 1.7` (attached to the lamp group).

---

### `createObjects(scene)` — updated return

```js
return { arcadeLeft, arcadeRight, desk, posters, pedestal, sceneUpdate };
```

`sceneUpdate(delta, elapsed)` is a single update callback that animates the globe (rotation) and the pedestal book (bobbing + slow rotation). `main.js` registers it with `addUpdateCallback`.

The desk and pedestal groups are added to `clickableObjects` along with all poster meshes. The existing raycaster `intersectObjects(..., true)` recurses into children, and the click walker walks parent chains to find the nearest `clickable` ancestor — so the inner monitor / globe / book meshes can each have their own `userData.action` and they'll dispatch correctly.

Bookshelf, chair, neon sign, rug, fridge, floor lamp — scenery only, not clickable. **Clickable**: arcade cabinets, gatekeeper, wall panels, desk (+monitor +globe), posters, pedestal book.

---

## Navigation (`src/navigation.js`)

Add two new hotspots:

```js
desk:     { position: { x: 1.8,  y: 1.5, z: -0.6 }, target: { x: 1.8,  y: 1.2, z: -2.6 }, label: 'Gaming Desk' },
pedestal: { position: { x: -2.0, y: 1.4, z: 1.6  }, target: { x: -2.8, y: 1.2, z: 2.6  }, label: 'Magic Tome' }
```

The click handler dispatches both `nav.goTo(hotspot)` and any associated `action`. The current implementation already does this — the `action: 'openBook'` will fire on the same click that triggers `hotspot: 'pedestal'`.

---

## Gatekeeper (`src/scene/gatekeeper.js`)

| Part | Colour | Notes |
|---|---|---|
| Head sphere | `#f5d0a9` | Keep warm skin tone |
| Hat (brim + cone) | `#050d14` | Near-black |
| Robe / body cone | `#1b3a4b` | Deep teal |
| Spectacle torus rings | `#00e5ff` + emissive @ `0.6` | Teal glow |
| Star orbs | `#ffd166` + emissive @ `1.0` | Gold glow |

---

## Wall Panels (`src/scene/panels.js`)

Canvas texture colours:

| Element | Colour |
|---|---|
| Panel background | `#0a1a28` |
| Panel title text | `#ffd166` |
| Body text / labels | `#90e0ef` |
| Chart bars | `#00e5ff`, `#ff006e`, `#9b00ff` |
| Timeline line | `#00e5ff` |
| Timeline dots | `#ffd166` |

---

## UI (`src/ui.js` + `index.html`)

### Book overlay (NEW)

Add to `index.html`:

```html
<div id="book-overlay" class="hidden">
  <div id="book-container">
    <div id="book-page-left" class="book-page"></div>
    <div id="book-page-right" class="book-page"></div>
    <button id="book-prev" class="book-nav">‹</button>
    <button id="book-next" class="book-nav">›</button>
    <button id="book-close" class="book-close">×</button>
  </div>
</div>
```

Add to `createUI`:

```js
const BOOK_PAGES = [
  { left: '<h2>The Codex of Digital Narratives</h2><p>In the beginning, stories were carved into stone…</p>', right: '<p>Then came the printing press, and tales spread on paper wings.</p>' },
  { left: '<p>Now, narratives unfurl across screens, weaving through pixels and code.</p>', right: '<p>The Centre for Digital Narrative studies these new storytelling realms.</p>' },
  { left: '<p>Hypertext, interactive fiction, generative AI, virtual worlds…</p>', right: '<p>Every link, every choice, every algorithm shapes the tale.</p><p class="book-end">— Fin —</p>' }
];

let bookPageIndex = 0;

function renderBookPage() {
  document.getElementById('book-page-left').innerHTML  = BOOK_PAGES[bookPageIndex].left;
  document.getElementById('book-page-right').innerHTML = BOOK_PAGES[bookPageIndex].right;
  document.getElementById('book-prev').disabled = bookPageIndex === 0;
  document.getElementById('book-next').disabled = bookPageIndex === BOOK_PAGES.length - 1;
}

function openBook() {
  bookPageIndex = 0;
  renderBookPage();
  document.getElementById('book-overlay').classList.remove('hidden');
}

function closeBook() {
  document.getElementById('book-overlay').classList.add('hidden');
}

document.getElementById('book-prev').addEventListener('click',  () => { if (bookPageIndex > 0) { bookPageIndex--; renderBookPage(); } });
document.getElementById('book-next').addEventListener('click',  () => { if (bookPageIndex < BOOK_PAGES.length - 1) { bookPageIndex++; renderBookPage(); } });
document.getElementById('book-close').addEventListener('click', closeBook);
document.getElementById('book-overlay').addEventListener('click', (e) => { if (e.target.id === 'book-overlay') closeBook(); });
```

Wire `Escape` key to also call `closeBook()`. Export `openBook` from `createUI`.

The click handler in `navigation.js` already supports `action`. Add a new branch for `action === 'openBook'` that calls `ui.openBook()`.

### Wizard chat rework

The chat panel becomes a **floating speech bubble anchored to the wizard's screen-space position**, not a bottom drawer.

- `#gatekeeper-chat` is positioned absolutely with `left` / `top` updated each frame from the wizard's projected world position (similar to `updateHints`). Add the wizard's world position `new THREE.Vector3(0, 2.2, 1.5)` (the gatekeeper hovers there) to the projection list.
- The chat bubble has a CSS `::before` triangle pointing left toward the wizard (or right, depending on which side the wizard is on screen).
- Add a text input row inside `#gatekeeper-chat`:

```html
<div id="chat-input-row">
  <input id="chat-input" type="text" placeholder="Ask me anything…" />
  <button id="chat-send">Send</button>
</div>
```

- New responder logic in `createUI`:

```js
const KEYWORD_RESPONSES = [
  { keys: ['xp', 'level', 'experience'], reply: 'Earn XP by exploring rooms and reading panels. Each discovery counts!' },
  { keys: ['cdn', 'centre', 'narrative'], reply: 'CDN is the Centre for Digital Narrative at UiB — we study how digital tech shapes stories.' },
  { keys: ['arcade', 'game'],             reply: 'The arcades hold interactive CDN research. Click them to fly in!' },
  { keys: ['book', 'tome', 'lore'],       reply: 'Ah, the Codex! Visit the magical pedestal in the corner to read its secrets.' },
  { keys: ['globe', 'world', 'map'],      reply: 'The desk globe shows CDN\'s international research connections.' },
  { keys: ['hi', 'hello', 'hey'],         reply: 'Hello, curious visitor! Ask me anything about this gallery.' }
];

function answer(question) {
  const q = question.toLowerCase();
  for (const { keys, reply } of KEYWORD_RESPONSES) {
    if (keys.some(k => q.includes(k))) return reply;
  }
  return "I'm still learning about that one. Try asking about XP, CDN, the arcades, or the magical book!";
}

function sendChatMessage(text) {
  if (!text.trim()) return;
  chatMessages.innerHTML += `<div class="chat-msg user">${escapeHtml(text)}</div>`;
  chatMessages.innerHTML += `<div class="chat-msg gatekeeper">${escapeHtml(answer(text))}</div>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.getElementById('chat-send').addEventListener('click', () => {
  const input = document.getElementById('chat-input');
  sendChatMessage(input.value);
  input.value = '';
});
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendChatMessage(e.target.value);
    e.target.value = '';
  }
});
```

- The existing chip buttons stay above the input as quick-reply suggestions; clicking a chip calls `sendChatMessage(chip.dataset.q)`.
- The `updateHints` function (or a new sibling `updateChatPosition`) projects the wizard's world position each frame and sets `#gatekeeper-chat.style.left/top` to anchor the speech bubble. Offset the chat by `+80px` x and `-40px` y so it sits beside-and-above the wizard.

Existing `openPanelDrawer(panelId, panelTitle)` continues to handle `desk-research`, `globe`, `poster-N` panels — no changes needed there.

---

## CSS UI (`styles/main.css`)

| Element | Value |
|---|---|
| `body` background | `#050d14` |
| `#hud` background | `rgba(5,13,20,0.88)` |
| Breadcrumb text | `#90e0ef` |
| HUD buttons border + text | `#00e5ff` |
| HUD button hover | bg `#00e5ff`, text `#050d14` |
| `#panel-drawer` background | `rgba(10,26,40,0.97)` |
| Drawer border | `1px solid #00e5ff` + `box-shadow: 0 0 14px rgba(0,229,255,0.35)` |
| Drawer `h2` | `#ffd166` |
| Drawer body text | `#90e0ef` |
| `#gatekeeper-chat` background | `rgba(10,26,40,0.97)` |
| Chat border | `1px solid #9b00ff` + purple glow shadow |
| `.chat-msg.gatekeeper` | bg `#1b3a4b`, text `#90e0ef` |
| `.chat-msg.user` | bg `#9b00ff`, text `#fff` |
| `.chat-chip` | border `#ff006e`, text `#ff006e` |
| Chat chip hover | bg `#ff006e`, text `#050d14` |
| `#inventory-overlay` bg | `rgba(5,13,20,0.93)` |
| Level text | `#ffd166` |
| XP bar fill | `#00e5ff` |
| Earned achievement border | `1px solid #ffd166` + gold glow |
| `.hotspot-hint` colour | `#ffd166` |
| `#book-overlay` background | `rgba(5,13,20,0.9)` (full-screen scrim) |
| `#book-container` | flex centre, `1100px` wide × `700px` tall, with two `.book-page` children |
| `.book-page` background | `linear-gradient(#f5e6c8, #e8d4a8)` (parchment) |
| `.book-page` border + glow | `1px solid #ffd166` + `box-shadow: 0 0 30px rgba(255,209,102,0.4), inset 0 0 40px rgba(255,209,102,0.2)` |
| `.book-page` text colour | `#3a2818` (dark brown ink) |
| `.book-page` font | `'Georgia', serif`, line-height `1.7` |
| `.book-nav` (prev/next) | absolute on left/right of container, gold `#ffd166` arrows, transparent bg |
| `.book-close` | top-right `×`, gold |
| `#chat-input-row` | flex row, padding `8px`, top border `1px solid rgba(0,229,255,0.3)` |
| `#chat-input` | bg `rgba(5,13,20,0.6)`, border `1px solid #00e5ff`, text `#90e0ef`, padding `6px 10px` |
| `#chat-send` | bg `#00e5ff`, text `#050d14`, border none, padding `6px 12px` |
| `#gatekeeper-chat` positioning | `position: absolute` (was bottom drawer) — JS sets `left`/`top` per frame |
| `#gatekeeper-chat::before` | CSS triangle (`border` trick) on the left edge, colour `rgba(10,26,40,0.97)` — speech-bubble tail pointing toward wizard |

---

## `main.js` Wiring Changes

- `createObjects` now returns `{ arcadeLeft, arcadeRight, desk, globeUpdate }`.
- Register: `addUpdateCallback(globeUpdate)`.
- `clickableObjects` includes `...desk.children` (which recursively contains monitors and globe via the click walker — actually the existing walker walks up `parent` chain, so passing the **descendant meshes** is correct). Use `desk.traverse` to collect all meshes, or simply `clickableObjects.push(desk)` and let the raycaster recurse via `intersectObjects([...], true)` — which it already does. So just push `desk` and the new poster meshes.
- New posters returned from `createObjects` as an array: update return signature to `{ arcadeLeft, arcadeRight, desk, posters, globeUpdate }`. Push `...posters` to `clickableObjects`.

---

## Files Changed

| File | Change |
|---|---|
| `src/scene/room.js` | Colours, all lights, neon floor strips |
| `src/scene/objects.js` | Restyle existing objects + add desk, chair, bookshelf, posters, neon sign, rug, fridge, floor lamp, globe, magical pedestal + book; new return shape with `sceneUpdate` |
| `src/scene/gatekeeper.js` | Hat, robe, spectacles, star colours |
| `src/scene/panels.js` | Canvas texture colours |
| `src/navigation.js` | Add `desk` and `pedestal` hotspots; route `action: 'openBook'` to `ui.openBook()` |
| `src/main.js` | Register `sceneUpdate`, push desk + posters + pedestal to `clickableObjects`, register chat-anchor update |
| `src/ui.js` | Book overlay (open/close, page nav), wizard chat rework (text input, keyword answers, screen-anchor positioning), export `openBook` |
| `index.html` | Add `#book-overlay` and `#chat-input-row` markup |
| `styles/main.css` | Full colour restyle + book overlay styles + chat speech-bubble repositioning + chat input styles |

No new files. No changes to tests.
