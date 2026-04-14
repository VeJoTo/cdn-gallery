// src/ui.js
import * as THREE from 'three';
import { HOTSPOTS } from './navigation.js';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const BOOK_PAGES = [
  {
    left:  '<h2>The Sweetheart in the Forest</h2><p class="book-subtitle">& the Synthetic Storytellers</p><p class="book-meta">Based on research by Anne Sigrid Refsum<br>Centre for Digital Narrative, University of Bergen</p><p>What happens to a Norwegian folktale when it\'s retold by artificial intelligence?</p><p>This is the story of a 200-year-old tale, the woman who kept it alive, and the machines that tried to tell it again.</p>',
    right: '<h2>Once Upon a Time...</h2><p>A young woman was so beautiful that suitors came from across many kingdoms. One man, richer and more handsome than the rest, won her heart.</p><p>One day he invited her to visit his home in the forest. "I\'ll scatter peas along the path so you can find your way," he promised.</p><p>But he scattered them a day too early.</p><p>She arrived before he expected her. The house was beautiful — but empty. Only a strange bird in a cage greeted her.</p>'
  },
  {
    left:  '<p>As she explored the rooms, the bird cried out:</p><p class="book-quote">"Beautiful maiden, be bold — but be not too bold!"</p><p>Each room was more lavish than the last. But then she found one chamber filled with buckets of blood. And the last room...</p><p><em>Was full of the bodies and skeletons of slain women.</em></p><p>The bird told her to hide under the bed. She did — and watched as the man returned with his next victim.</p>',
    right: '<p>But this heroine fought back. She escaped, told the authorities, and in the end:</p><p class="book-quote">"They seized him and killed him and burned both him and the house in the forest."</p><p>This tale was first recorded from <strong>Karen</strong>, a woman in her sixties in 1847. Born a clergyman\'s daughter, her family fell apart — her father died petitioning the king, her mother abandoned her. She married a poor lodger. But she kept these stories alive.</p><p>To Karen and her listeners, this wasn\'t just entertainment. It was a warning, a comfort, and a community ritual.</p>'
  },
  {
    left:  '<h2>Then AI Tried to Tell It</h2><p>Researcher Anne Sigrid Refsum asked ChatGPT, Claude, and Gemini to retell this exact tale. She collected 32 versions.</p><p>The results were... weird.</p><p>The AIs mixed in motifs from <em>Bluebeard</em>. They added modern moral lessons that were never part of the original. They turned the brave heroine into a passive character who "learned a valuable lesson about trusting strangers."</p>',
    right: '<h2>Original vs AI</h2><div class="book-compare"><div class="book-compare-col"><p class="book-compare-label">🧓 Karen\'s version (1847)</p><p>"She was so beautiful that she was renowned across many kingdoms"</p><p><em>The story just begins. No moral setup. The audience knows the rules.</em></p></div><div class="book-compare-col"><p class="book-compare-label">🤖 AI version (2025)</p><p>"In a small village in Norway there lived a kind and curious young woman named Solveig who always believed in seeing the good in people"</p><p><em>The AI adds a name, a personality trait, and a moral setup — none of which existed in the original.</em></p></div></div>'
  },
  {
    left:  '<h2>Floating Motifs</h2><p>Refsum discovered that AI stories have elements that <strong>"float"</strong> away from where they belong — like motifs from one tale drifting into another.</p><p>The AIs would mix in pieces of <em>East of the Sun and West of the Moon</em>, <em>Bluebeard</em>, and <em>Hansel & Gretel</em> — stories that live near each other in the training data.</p><p>It\'s like dreaming: the AI draws from a vast pool of stories, but without understanding which pieces belong together.</p>',
    right: '<h2>The Pool of Tradition</h2><p>Folklorist Lauri Honko described oral storytelling as drawing from a <strong>"pool of tradition"</strong> — a shared reservoir that many contribute to and many draw from.</p><p>AI training data works the same way. But there\'s a crucial difference:</p><p>A human storyteller like Karen <em>knew her audience</em>. She adjusted the tale for her listeners. The story carried cultural weight, personal meaning, and communal purpose.</p><p>An LLM calculates the most likely next word. It has no audience, no intent, no community. The pool is there — but no one is swimming in it.</p>'
  },
  {
    left:  '<h2>Why Does This Matter?</h2><p>As AI generates more and more text, the stories we encounter are increasingly machine-made. Understanding what gets <em>lost</em> in that process matters:</p><ul class="book-list"><li><strong>Cultural specificity</strong> — Norwegian night-courting customs, local geography, the social reality of Karen\'s world</li><li><strong>The storyteller\'s voice</strong> — Karen\'s version reflects her life, her losses, her community</li><li><strong>Communal purpose</strong> — folktales weren\'t just entertainment; they were warnings, comfort, and social bonding</li><li><strong>Audience awareness</strong> — knowing who you\'re telling the story <em>to</em></li></ul>',
    right: '<p>AI can generate <em>text that looks like</em> a folktale. But it cannot generate the human connection that makes a story meaningful.</p><p>The next time you read something — ask yourself: who is telling this story, and why?</p><div class="book-source"><p><strong>Read the full paper:</strong></p><p>Refsum, A.S. (2025). "The Sweetheart in the Forest" and the Synthetic Storytellers. <em>Humanities</em>, 14, 230.</p><p>Centre for Digital Narrative, University of Bergen</p></div><p class="book-end">— End —</p>'
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
    const safeTitle = escapeHtml(title);
    let content = '';

    if (panelId === 'globe') {
      content = `
        <h2>${safeTitle}</h2>
        <p>The CDN globe showcases international research connections. Explore one of our featured works:</p>
        <div style="background:rgba(13,33,55,0.5);border:1px solid #a8d8ea;border-radius:8px;padding:16px;margin:16px 0">
          <h3 style="color:#e84393;font-size:16px;margin-bottom:8px">Fin du Monde</h3>
          <p style="font-size:13px">An interactive digital narrative exploring themes of endings and new beginnings, part of the CDN collection.</p>
          <a href="https://collection.cdn.uib.no/2024/05/10/fin-du-monde/" target="_blank" rel="noopener"
             style="display:inline-block;margin-top:10px;padding:8px 16px;background:#e84393;color:#0d2137;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold">
            Visit CDN Collection →
          </a>
        </div>
        <p>CDN — the Centre for Digital Narrative at UiB — connects researchers across the globe studying digital storytelling.</p>
      `;
    } else if (panelId === 'tv') {
      content = `
        <h2>${safeTitle}</h2>
        <p>This screen shows a video from the Centre for Digital Narrative. Use the YouTube controls to unmute and watch with sound.</p>
        <p>The CDN produces video content showcasing research, events, and creative digital narratives.</p>
      `;
    } else if (panelId === 'ai-cinema') {
      content = `
        <h2>${safeTitle}</h2>
        <p>An Eye for AI Cinema is a CDN event series exploring the intersection of artificial intelligence and filmmaking.</p>
        <p>How is AI changing the way we create, edit, and experience cinema? From deepfakes to generative storytelling, this series examines the frontiers of computational creativity in film.</p>
        <div style="background:rgba(13,33,55,0.5);border:1px solid #a8d8ea;border-radius:8px;padding:16px;margin:16px 0">
          <p style="font-size:13px;margin-bottom:10px">Hosted by the Centre for Digital Narrative at the University of Bergen.</p>
          <a href="https://www4.uib.no/en/research/research-centres/center-for-digital-narrative/events/an-eye-for-ai-cinema" target="_blank" rel="noopener"
             style="display:inline-block;padding:8px 16px;background:#e84393;color:#0d2137;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold">
            View Event Details →
          </a>
        </div>
      `;
    } else {
      content = `
        <h2>${safeTitle}</h2>
        <p>This panel presents CDN research on <strong>${safeTitle}</strong>. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.</p>
        <p>Explore the interactive elements in this room to learn more about this area of CDN research.</p>
      `;
    }

    drawerContent.innerHTML = content;
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
    appendChatMessage("Hey Kids! Welcome to the CDN gallery! What are you curious about?", 'gatekeeper');

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
      <div class="scrapbook">
        <div class="scrapbook-page scrapbook-left">
          <h2 class="scrapbook-title">The Game Room</h2>
          <div class="polaroid">
            <div class="polaroid-img" style="background:#1a1a3e;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:32px">🎮</span>
            </div>
            <div class="polaroid-caption">My exploration so far</div>
          </div>
          <div class="sticky-note">
            <h3>Tasks</h3>
            <ul>
              <li>Explore the game room</li>
              <li>Read the wall panels</li>
              <li>Visit the rabbit hole</li>
              <li>Talk to the Guide</li>
            </ul>
          </div>
          <div class="scrapbook-doodle" style="position:absolute;bottom:20px;right:20px;font-size:24px;transform:rotate(-8deg);opacity:0.5">✨</div>
        </div>
        <div class="scrapbook-spine"></div>
        <div class="scrapbook-page scrapbook-right">
          <h2 class="scrapbook-title">Discoveries</h2>
          <div class="discovery-grid">
            <div class="discovery-item found">
              <div class="discovery-thumb">🏛</div>
              <div class="discovery-label">Game Room</div>
            </div>
            <div class="discovery-item found">
              <div class="discovery-thumb">📺</div>
              <div class="discovery-label">TV Archive</div>
            </div>
            <div class="discovery-item">
              <div class="discovery-thumb">?</div>
              <div class="discovery-label">???</div>
            </div>
            <div class="discovery-item">
              <div class="discovery-thumb">?</div>
              <div class="discovery-label">???</div>
            </div>
          </div>
          <div class="scrapbook-page-num">1 / 20</div>
          <div class="scrapbook-tabs">
            <button class="scrapbook-tab">🏆 Achievements</button>
            <button class="scrapbook-tab">👤 Profile</button>
            <button class="scrapbook-tab">📚 Resources</button>
            <button class="scrapbook-tab">🌐 CDN Website</button>
          </div>
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

  // ── PDF Report viewer ───────────────────────────
  const reportOverlay = document.getElementById('report-overlay');
  const reportClose   = document.getElementById('report-close');

  function openReport() {
    reportOverlay.classList.remove('hidden');
  }

  function closeReport() {
    reportOverlay.classList.add('hidden');
  }

  reportClose.addEventListener('click', closeReport);
  reportOverlay.addEventListener('click', (e) => { if (e.target === reportOverlay) closeReport(); });

  // ── Rabbit hole scrollytelling ──────────────────
  const rhOverlay     = document.getElementById('rabbit-hole-overlay');
  const rhClimbBack   = document.getElementById('rh-climb-back');
  const rhAchievement = document.getElementById('rh-achievement');
  const rhSections    = document.querySelectorAll('.rh-section');
  let rhAchievementUnlocked = false;

  function openRabbitHole() {
    rhOverlay.classList.remove('hidden');
    rhOverlay.scrollTop = 0;
    // Reset section visibility
    rhSections.forEach(s => s.classList.remove('visible'));
    // Start observing sections for scroll-based reveal
    setTimeout(checkRHSections, 100);
  }

  function closeRabbitHole() {
    rhOverlay.classList.add('hidden');
  }

  function checkRHSections() {
    const scrollY = rhOverlay.scrollTop;
    const viewH = rhOverlay.clientHeight;

    rhSections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const overlayRect = rhOverlay.getBoundingClientRect();
      const sectionTop = rect.top - overlayRect.top;
      if (sectionTop < viewH * 0.8) {
        section.classList.add('visible');
      }
    });

    // Check if user scrolled to the final section
    const lastSection = rhSections[rhSections.length - 1];
    if (lastSection && lastSection.classList.contains('visible') && !rhAchievementUnlocked) {
      rhAchievementUnlocked = true;
      rhAchievement.classList.remove('hidden');
    }
  }

  rhOverlay.addEventListener('scroll', checkRHSections);
  rhClimbBack.addEventListener('click', closeRabbitHole);

  // ── Global Escape key ────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanelDrawer();
      closeGatekeeperChat();
      closeInventory();
      closeBook();
      closeRabbitHole();
      closeReport();
    }
  });

  // ── Hotspot hints (screen-space projection) ──────
  const HINT_HOTSPOTS = ['arcade-left', 'arcade-right', 'desk', 'table', 'globe', 'pedestal', 'rabbit-hole', 'tv', 'poster-0', 'poster-1', 'poster-2', 'poster-ai-cinema'];
  const hintWorldPositions = {
    'arcade-left':      new THREE.Vector3(-3.15, 1.3, 0.8),
    'arcade-right':     new THREE.Vector3(-3.15, 1.3, -0.5),
    'desk':             new THREE.Vector3(1.8, 1.0, -2.6),
    'table':            new THREE.Vector3(0, 0.5, 1.5),
    'globe':            new THREE.Vector3(0.2, 0.85, -2.4),
    'pedestal':         new THREE.Vector3(-2.8, 1.2, 2.6),
    'rabbit-hole':      new THREE.Vector3(-0.8, 0.3, -2.4),
    'tv':               new THREE.Vector3(3.4, 2.85, 0),
    'poster-0':         new THREE.Vector3(-2.5, 2.0, -2.9),
    'poster-1':         new THREE.Vector3(-1.4, 2.0, -2.9),
    'poster-2':         new THREE.Vector3(-0.3, 2.0, -2.9),
    'poster-ai-cinema': new THREE.Vector3(3.42, 1.5, 2.2)
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

  return {
    updateHUD,
    openPanelDrawer,
    openGatekeeperChat,
    openInventory,
    openBook,
    openRabbitHole,
    openReport,
    updateHints
  };
}
