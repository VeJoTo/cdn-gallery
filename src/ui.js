// src/ui.js
import * as THREE from 'three';
import { HOTSPOTS } from './navigation.js';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const BOOK_PAGES = [
  {
    left:  '<h2>The Codex of Digital Narratives</h2><p>In the beginning, stories were carved into stone, etched in clay, whispered around fires.</p>',
    right: '<p>Then came the printing press, and tales spread on paper wings across continents.</p>'
  },
  {
    left:  '<p>Now, narratives unfurl across screens, weaving through pixels and code.</p><p>Every link, every choice, every algorithm shapes the tale.</p>',
    right: '<p>The Centre for Digital Narrative studies these new storytelling realms — where reader becomes co-author, where stories adapt to their audience.</p>'
  },
  {
    left:  '<p>Hypertext, interactive fiction, generative AI, virtual worlds, augmented reality…</p><p>The form keeps shifting, but the human need to tell and hear stories endures.</p>',
    right: '<p>Welcome, traveller, to this gallery of digital tales.</p><p class="book-end">— Fin —</p>'
  }
];

const KEYWORD_RESPONSES = [
  { keys: ['xp', 'level', 'experience'], reply: 'Earn XP by exploring rooms and reading panels. Each discovery counts!' },
  { keys: ['cdn', 'centre', 'narrative'], reply: 'CDN is the Centre for Digital Narrative at UiB — we study how digital tech shapes stories.' },
  { keys: ['arcade', 'game'],             reply: 'The arcades hold interactive CDN research. Click them to fly in!' },
  { keys: ['book', 'tome', 'lore', 'codex'], reply: 'Ah, the Codex! Visit the magical pedestal in the corner to read its secrets.' },
  { keys: ['globe', 'world', 'map'],      reply: 'The desk globe shows CDN\'s international research connections.' },
  { keys: ['hi', 'hello', 'hey'],         reply: 'Hello, curious visitor! Ask me anything about this gallery.' }
];

export function answer(question) {
  const q = question.toLowerCase();
  for (const { keys, reply } of KEYWORD_RESPONSES) {
    if (keys.some(k => q.includes(k))) return reply;
  }
  return "I'm still learning about that one. Try asking about XP, CDN, the arcades, or the magical book!";
}

export function getNextPageIndex(current) {
  return Math.min(current + 1, BOOK_PAGES.length - 1);
}

export function getPrevPageIndex(current) {
  return Math.max(current - 1, 0);
}

export function createUI(camera, renderer) {
  const breadcrumb       = document.getElementById('breadcrumb');
  const backBtn          = document.getElementById('back-btn');
  const panelDrawer      = document.getElementById('panel-drawer');
  const drawerContent    = document.getElementById('drawer-content');
  const drawerClose      = document.getElementById('drawer-close');
  const gatekeeperChat   = document.getElementById('gatekeeper-chat');
  const chatMessages     = document.getElementById('chat-messages');
  const chatChips        = document.getElementById('chat-chips');
  const chatClose        = document.getElementById('chat-close');
  const inventoryOverlay = document.getElementById('inventory-overlay');
  const inventoryClose   = document.getElementById('inventory-close');
  const inventoryContent = document.getElementById('inventory-content');
  const hintsContainer   = document.getElementById('hotspot-hints');

  // ── HUD ──────────────────────────────────────────
  function updateHUD(hotspotId) {
    const label = HOTSPOTS[hotspotId]?.label ?? hotspotId;
    breadcrumb.textContent = label;
    if (hotspotId === 'overview') {
      backBtn.classList.add('hidden');
    } else {
      backBtn.classList.remove('hidden');
    }
  }

  updateHUD('overview');

  // ── Panel drawer ─────────────────────────────────
  function openPanelDrawer(panelId, title) {
    // panelId reserved for real content lookup when placeholder is replaced
    const safeTitle = escapeHtml(title);
    drawerContent.innerHTML = `
      <h2>${safeTitle}</h2>
      <p>This panel presents CDN research on <strong>${safeTitle}</strong>. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.</p>
      <p>Explore the interactive elements in this room to learn more about this area of CDN research.</p>
    `;
    panelDrawer.classList.remove('hidden');
    requestAnimationFrame(() => panelDrawer.classList.add('open'));
  }

  function closePanelDrawer() {
    panelDrawer.classList.remove('open');
    setTimeout(() => panelDrawer.classList.add('hidden'), 350);
  }

  drawerClose.addEventListener('click', closePanelDrawer);

  // ── Gatekeeper chat (speech bubble + free-form input) ──
  const SUGGESTED_QUESTIONS = [
    "What's in this room?",
    "How do I earn XP?",
    "Tell me about CDN"
  ];

  const chatInput = document.getElementById('chat-input');
  const chatSend  = document.getElementById('chat-send');

  function appendChatMessage(text, role) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function sendChatMessage(text) {
    if (!text.trim()) return;
    appendChatMessage(text, 'user');
    appendChatMessage(answer(text), 'gatekeeper');
  }

  function openGatekeeperChat() {
    chatMessages.innerHTML = '';
    appendChatMessage("Hello, curious visitor! I'm your guide. Ask me anything.", 'gatekeeper');

    chatChips.innerHTML = SUGGESTED_QUESTIONS.map(q =>
      `<button class="chat-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`
    ).join('');

    chatChips.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => sendChatMessage(chip.dataset.q));
    });

    gatekeeperChat.classList.remove('hidden');
    requestAnimationFrame(() => gatekeeperChat.classList.add('open'));
  }

  function closeGatekeeperChat() {
    gatekeeperChat.classList.remove('open');
    setTimeout(() => gatekeeperChat.classList.add('hidden'), 300);
  }

  chatClose.addEventListener('click', closeGatekeeperChat);
  chatSend.addEventListener('click', () => {
    sendChatMessage(chatInput.value);
    chatInput.value = '';
  });
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage(chatInput.value);
      chatInput.value = '';
    }
  });

  // ── Inventory overlay ────────────────────────────
  function openInventory() {
    inventoryContent.innerHTML = `
      <h2 style="font-size:20px;margin-bottom:20px">Inventory</h2>
      <div style="margin-bottom:16px">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:rgba(240,236,224,.5);margin-bottom:6px">Level</div>
        <div style="font-size:28px;font-weight:bold">Level 1</div>
      </div>
      <div style="margin-bottom:20px">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:rgba(240,236,224,.5);margin-bottom:6px">XP Progress</div>
        <div style="background:rgba(255,255,255,.1);border-radius:4px;height:10px;width:100%">
          <div style="background:#ccaa55;width:30%;height:100%;border-radius:4px"></div>
        </div>
        <div style="font-size:12px;color:rgba(240,236,224,.5);margin-top:4px">150 / 500 XP</div>
      </div>
      <div>
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:rgba(240,236,224,.5);margin-bottom:10px">Achievements</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${[
            { icon: '🏛', name: 'First Steps', desc: 'Entered the gallery',  earned: true  },
            { icon: '🎮', name: 'Player One',  desc: 'Found an arcade',      earned: true  },
            { icon: '🗝', name: 'Keymaster',   desc: 'Unlock Level 3',       earned: false },
            { icon: '📚', name: 'Scholar',     desc: 'Read 5 panels',        earned: false }
          ].map(a => `
            <div style="background:rgba(255,255,255,.05);border-radius:8px;padding:10px;opacity:${a.earned ? 1 : 0.4}">
              <div style="font-size:22px">${a.icon}</div>
              <div style="font-size:13px;font-weight:bold;margin-top:4px">${a.name}</div>
              <div style="font-size:11px;color:rgba(240,236,224,.6)">${a.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    inventoryOverlay.classList.remove('hidden');
  }

  function closeInventory() {
    inventoryOverlay.classList.add('hidden');
  }

  inventoryClose.addEventListener('click', closeInventory);
  inventoryOverlay.addEventListener('click', (e) => {
    if (e.target === inventoryOverlay) closeInventory();
  });

  // ── Book overlay ─────────────────────────────────
  const bookOverlay  = document.getElementById('book-overlay');
  const bookPageL    = document.getElementById('book-page-left');
  const bookPageR    = document.getElementById('book-page-right');
  const bookPrev     = document.getElementById('book-prev');
  const bookNext     = document.getElementById('book-next');
  const bookClose    = document.getElementById('book-close');

  let bookPageIndex = 0;

  function renderBookPage() {
    bookPageL.innerHTML = BOOK_PAGES[bookPageIndex].left;
    bookPageR.innerHTML = BOOK_PAGES[bookPageIndex].right;
    bookPrev.disabled = bookPageIndex === 0;
    bookNext.disabled = bookPageIndex === BOOK_PAGES.length - 1;
  }

  function openBook() {
    bookPageIndex = 0;
    renderBookPage();
    bookOverlay.classList.remove('hidden');
  }

  function closeBook() {
    bookOverlay.classList.add('hidden');
  }

  bookPrev.addEventListener('click',  () => { bookPageIndex = getPrevPageIndex(bookPageIndex); renderBookPage(); });
  bookNext.addEventListener('click',  () => { bookPageIndex = getNextPageIndex(bookPageIndex); renderBookPage(); });
  bookClose.addEventListener('click', closeBook);
  bookOverlay.addEventListener('click', (e) => { if (e.target === bookOverlay) closeBook(); });

  // ── Global Escape key ────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanelDrawer();
      closeGatekeeperChat();
      closeInventory();
      closeBook();
    }
  });

  // ── Hotspot hints (screen-space projection) ──────
  const HINT_HOTSPOTS = ['arcade-left', 'arcade-right', 'wall-left', 'wall-right'];
  const hintWorldPositions = {
    'arcade-left':  new THREE.Vector3(-2.5, 0.1, 0.2),
    'arcade-right': new THREE.Vector3(2.5,  0.1, 0.2),
    'wall-left':    new THREE.Vector3(-3.4, 1.75, 0),
    'wall-right':   new THREE.Vector3(3.4,  1.75, 0)
  };

  const hintEls = {};
  for (const id of HINT_HOTSPOTS) {
    const el = document.createElement('div');
    el.className = 'hotspot-hint';
    el.dataset.id = id;
    hintsContainer.appendChild(el);
    hintEls[id] = el;
  }

  const _vec = new THREE.Vector3();

  function updateHints() {
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;

    for (const id of HINT_HOTSPOTS) {
      _vec.copy(hintWorldPositions[id]);
      _vec.project(camera);

      const x = (_vec.x + 1) / 2 * w;
      const y = (-_vec.y + 1) / 2 * h;

      const visible = _vec.z < 1 && x > 0 && x < w && y > 0 && y < h;
      hintEls[id].style.display = visible ? 'block' : 'none';
      hintEls[id].style.left = x + 'px';
      hintEls[id].style.top  = y + 'px';
    }
  }

  // Anchor gatekeeper chat to wizard screen position
  const wizardWorldPos = new THREE.Vector3(0.6, 2.4, -2.2);
  const _chatVec = new THREE.Vector3();

  function updateChatAnchor() {
    if (gatekeeperChat.classList.contains('hidden')) return;
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    const margin = 16;
    const rect = gatekeeperChat.getBoundingClientRect();
    const bubbleW = rect.width  || 320;
    const bubbleH = rect.height || 220;

    let left, top;

    _chatVec.copy(wizardWorldPos);
    _chatVec.project(camera);

    if (_chatVec.z >= 1) {
      // Wizard is behind the camera — fall back to top-right safe spot
      left = w - bubbleW - margin;
      top  = margin;
    } else {
      const anchorX = (_chatVec.x + 1) / 2 * w;
      const anchorY = (-_chatVec.y + 1) / 2 * h;
      // CSS transform on the bubble is translate(20px, -100%), so visible top-left is:
      left = anchorX + 20;
      top  = anchorY - bubbleH;
    }

    // Clamp into viewport with margin
    left = Math.max(margin, Math.min(left, w - bubbleW - margin));
    top  = Math.max(margin, Math.min(top,  h - bubbleH - margin));

    // Cancel the CSS transform offset by writing the computed top-left directly,
    // and override the translate so it doesn't double-shift
    gatekeeperChat.style.left = `${left}px`;
    gatekeeperChat.style.top  = `${top}px`;
    gatekeeperChat.style.transform = 'none';
  }

  return {
    updateHUD,
    openPanelDrawer,
    openGatekeeperChat,
    openInventory,
    openBook,
    updateHints,
    updateChatAnchor
  };
}
